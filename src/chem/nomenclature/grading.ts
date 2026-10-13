// Correction « chimique » d'un nom saisi : on ne compare pas seulement deux chaînes
// de caractères, on reconstruit la molécule décrite par la réponse et on la compare
// à la molécule attendue. Cela permet de distinguer :
//  - une réponse correcte (y compris une écriture équivalente acceptée) ;
//  - une réponse qui décrit la bonne molécule mais avec un nom non conforme
//    (mauvaise numérotation, mauvaise chaîne, ordre alphabétique…) → partiellement correcte ;
//  - une réponse qui décrit une autre molécule → incorrecte (on montre laquelle) ;
//  - une réponse impossible à analyser → « non évaluable » (on ne prétend pas qu'elle est fausse).
import { type Molecule, molecularFormula, formulaToString } from '../molecule';
import { isSameMolecule, uniqueMolecules } from '../isomorphism';
import { assembleName, stripAccents, type PrefixGroup, TERMINAL_SUFFIXES } from './assemble';
import {
  type NamingResult,
  type Criterion,
  compareCandidates,
  nameMolecule,
  nameOfCandidate,
  candidateParts,
  GROUP_LABEL,
} from './namer';
import {
  type ParsedName,
  type FormatIssue,
  NameParseError,
  buildMolecule,
  missingLocantGroups,
  nameKey,
  normalizeName,
  parseName,
  usualNameMolecule,
} from './parser';

export type GradeStatus = 'correct' | 'partial' | 'incorrect' | 'unknown';

export type ErrorCode =
  | 'chain-length'
  | 'chain-unsat'
  | 'chain-function'
  | 'chain-substituents'
  | 'chain-ring'
  | 'numbering'
  | 'numbering-alpha'
  | 'alpha-order'
  | 'multiplier'
  | 'locant-missing'
  | 'locant-order'
  | 'hyphen'
  | 'elision'
  | 'euphony'
  | 'old-notation'
  | 'usual-name'
  | 'position'
  | 'priority'
  | 'carbon-count'
  | 'function'
  | 'unsaturation'
  | 'wrong-molecule'
  | 'impossible'
  | 'unreadable'
  | 'format'
  | 'accents'
  | 'empty'
  | 'other';

export interface ErrorInfo {
  label: string;
  rule: string;
  lesson: string;
}

/** Règle associée à chaque type d'erreur (affichée dans le carnet d'erreurs). */
export const ERROR_INFO: Record<ErrorCode, ErrorInfo> = {
  'chain-length': {
    label: 'Chaîne principale trop courte',
    rule: 'La chaîne principale est la chaîne carbonée la plus longue (en tenant compte d’abord du groupe principal et des liaisons multiples).',
    lesson: 'm1-chaine-principale',
  },
  'chain-unsat': {
    label: 'Chaîne principale sans les liaisons multiples',
    rule: 'Dans les cours classiques, la chaîne principale doit contenir le maximum de liaisons doubles et triples.',
    lesson: 'm2-alcenes-ramifies',
  },
  'chain-function': {
    label: 'Chaîne principale sans le groupe principal',
    rule: 'La chaîne principale doit contenir le carbone qui porte le groupe caractéristique principal.',
    lesson: 'm4-polyfonctionnels',
  },
  'chain-substituents': {
    label: 'Mauvais choix entre deux chaînes de même longueur',
    rule: 'Entre deux chaînes de même longueur, on choisit celle qui porte le plus de substituants.',
    lesson: 'm1-chaine-principale',
  },
  'chain-ring': {
    label: 'Cycle ou chaîne : mauvais choix',
    rule: 'Le cycle est la structure principale, sauf si une chaîne porte le groupe principal.',
    lesson: 'm3-cycles-substitues',
  },
  numbering: {
    label: 'Mauvais sens de numérotation',
    rule: 'On numérote pour donner les plus petits indices : d’abord au groupe principal, puis aux liaisons multiples, puis à l’ensemble des substituants (premier point de différence).',
    lesson: 'm1-numerotation',
  },
  'numbering-alpha': {
    label: 'Égalité d’indices mal départagée',
    rule: 'Si les deux sens donnent les mêmes indices, le plus petit indice va au substituant cité en premier dans l’ordre alphabétique.',
    lesson: 'm1-ordre-alphabetique',
  },
  'alpha-order': {
    label: 'Ordre alphabétique non respecté',
    rule: 'Les préfixes sont classés par ordre alphabétique, sans tenir compte des multiplicateurs di, tri, tétra.',
    lesson: 'm1-ordre-alphabetique',
  },
  multiplier: {
    label: 'Multiplicateur (di, tri…) manquant ou incorrect',
    rule: 'Quand un même substituant apparaît plusieurs fois, on le cite une seule fois avec di-, tri-, tétra- et tous ses indices.',
    lesson: 'm1-multiplicateurs',
  },
  'locant-missing': {
    label: 'Indice de position manquant',
    rule: 'Chaque substituant, insaturation ou groupe doit avoir un indice, sauf s’il n’existe qu’une seule position possible.',
    lesson: 'm1-numerotation',
  },
  'locant-order': {
    label: 'Indices dans le désordre',
    rule: 'Les indices d’un même groupe s’écrivent dans l’ordre croissant, séparés par des virgules : 2,3-diméthyl.',
    lesson: 'm1-multiplicateurs',
  },
  hyphen: {
    label: 'Tirets mal placés',
    rule: 'On sépare un chiffre d’une lettre par un tiret (2-méthyl) et deux chiffres par une virgule (2,3). Le préfixe est collé à la racine : 2-méthylbutane.',
    lesson: 'm1-multiplicateurs',
  },
  elision: {
    label: 'Élision du « e » incorrecte',
    rule: 'Le « e » final de -ane, -ène, -yne disparaît devant une voyelle (propan-2-ol, butanal) mais reste devant une consonne (propane-1,2-diol, butanenitrile).',
    lesson: 'm4-alcools',
  },
  euphony: {
    label: '« a » euphonique oublié ou en trop',
    rule: 'On ajoute un « a » à la racine devant di-, tri- d’une insaturation : buta-1,3-diène.',
    lesson: 'm2-plusieurs-insaturations',
  },
  'old-notation': {
    label: 'Ancienne notation',
    rule: 'Les règles actuelles placent l’indice juste devant le suffixe : butan-2-ol (et non 2-butanol).',
    lesson: 'm4-alcools',
  },
  'usual-name': {
    label: 'Nom usuel au lieu du nom systématique',
    rule: 'Les exercices demandent le nom systématique (IUPAC) ; le nom usuel est à connaître mais ne le remplace pas.',
    lesson: 'm5-noms-usuels',
  },
  position: {
    label: 'Mauvaise position',
    rule: 'Les indices doivent correspondre aux carbones réellement substitués dans la molécule.',
    lesson: 'm1-numerotation',
  },
  priority: {
    label: 'Mauvais choix de la fonction principale',
    rule: 'Ordre de priorité : acide > ester > amide > nitrile > aldéhyde > cétone > alcool > amine. Seule la fonction prioritaire donne le suffixe ; les autres deviennent des préfixes (oxo-, hydroxy-, amino-…).',
    lesson: 'm4-polyfonctionnels',
  },
  'carbon-count': {
    label: 'Nombre de carbones incorrect',
    rule: 'Compte soigneusement les carbones : chaque sommet et chaque extrémité de la formule topologique est un carbone.',
    lesson: 'm0-topologique',
  },
  function: {
    label: 'Mauvaise fonction chimique',
    rule: 'Identifie le groupe caractéristique avant de nommer : –OH alcool, C=O en bout de chaîne aldéhyde, C=O dans la chaîne cétone…',
    lesson: 'm4-identifier-fonctions',
  },
  unsaturation: {
    label: 'Liaisons multiples oubliées ou en trop',
    rule: 'Une double liaison donne la terminaison -ène, une triple -yne ; sans liaison multiple : -ane.',
    lesson: 'm2-alcenes',
  },
  'wrong-molecule': {
    label: 'Le nom désigne une autre molécule',
    rule: 'Relis la structure : le nom doit décrire exactement la molécule (chaîne, positions, groupes).',
    lesson: 'm1-alcanes-ramifies',
  },
  impossible: {
    label: 'Nom décrivant une structure impossible',
    rule: 'Le carbone forme toujours 4 liaisons : un nom qui en impose davantage est impossible.',
    lesson: 'm0-valence',
  },
  unreadable: {
    label: 'Nom non reconnu',
    rule: 'Vérifie l’orthographe des préfixes, de la racine et du suffixe.',
    lesson: 'm1-racines',
  },
  format: {
    label: 'Forme du nom incorrecte',
    rule: 'Respecte la forme du nom : préfixes – racine – insaturation – suffixe.',
    lesson: 'm1-multiplicateurs',
  },
  accents: {
    label: 'Accents',
    rule: 'En français, on écrit méthyl, éthyl, butène, propanoïque… (accents à respecter).',
    lesson: 'm1-racines',
  },
  empty: { label: 'Pas de réponse', rule: 'Propose toujours une réponse, même incomplète.', lesson: 'm1-racines' },
  other: { label: 'Autre erreur', rule: 'Reprends la méthode pas à pas.', lesson: 'm1-alcanes-ramifies' },
};

export interface NameGrade {
  status: GradeStatus;
  headline: string;
  details: string[];
  errorCodes: ErrorCode[];
  expected: string;
  accepted: string[];
  /** Molécule décrite par la réponse (si différente de la molécule attendue). */
  userMolecule?: Molecule;
  userMoleculeName?: string | null;
}

// ---------------------------------------------------------------------------
// Interprétation d'un nom

export interface Interpretation {
  status: 'ok' | 'ambiguous' | 'none' | 'error';
  molecules: Molecule[];
  parsed?: ParsedName;
  error?: NameParseError;
  missingLocants: boolean;
  usualLabel?: string;
}

function* combos(options: number[], count: number, repeat: boolean, start = 0): Generator<number[]> {
  if (count === 0) {
    yield [];
    return;
  }
  for (let i = start; i < options.length; i++) {
    for (const rest of combos(options, count - 1, repeat, repeat ? i : i + 1)) yield [options[i], ...rest];
  }
}

export function acceptedNames(mol: Molecule): string[] {
  try {
    const r = nameMolecule(mol);
    return [r.name, ...r.variants];
  } catch {
    return [];
  }
}

/** Reformate un nom analysé (tous les indices écrits). */
export function assembleParsed(p: ParsedName, fill: Map<string, number[]> = new Map()): string {
  const L = p.parent.length;
  const prefixMap = new Map<string, PrefixGroup>();
  p.prefixes.forEach((pr, i) => {
    const locs = pr.locants ?? fill.get(`p${i}`) ?? Array(pr.mult).fill(1);
    const g = prefixMap.get(pr.raw);
    if (g) g.locants.push(...locs);
    else
      prefixMap.set(pr.raw, {
        name: pr.raw,
        locants: [...locs],
        complex: pr.raw.startsWith('('),
        sortKey: pr.raw.startsWith('(') ? pr.raw.replace(/[^a-z]/g, '') : pr.raw.replace(/^(tert|sec)-/, '').replace(/[^a-z]/g, ''),
        showLocants: L > 1 || locs.includes('N'),
      });
  });
  const terminal = p.suffix && TERMINAL_SUFFIXES.includes(p.suffix.type);
  const suffixLocs = p.suffix
    ? (p.suffix.locants ?? fill.get('suffix') ?? (p.suffix.count === 1 ? [1] : [1, L]))
    : [];
  const name = assembleName({
    prefixes: [...prefixMap.values()],
    parent: {
      kind: p.parent.kind,
      length: L,
      enes: p.parent.enes ?? fill.get('ene') ?? (L === 2 && p.parent.enesCount ? [1] : []),
      ynes: p.parent.ynes ?? fill.get('yne') ?? (L === 2 && p.parent.ynesCount ? [1] : []),
      showUnsatLocants: L > 2,
    },
    suffix: p.suffix ? { type: p.suffix.type, locants: suffixLocs, showLocants: !terminal && L > 1 } : null,
    esterAlkyl: p.esterAlkyl ? (p.esterAlkyl.raw.startsWith('(') ? p.esterAlkyl.raw.slice(1, -1) : p.esterAlkyl.raw) + 'e' : undefined,
  });
  return name;
}

export function interpretName(answer: string): Interpretation {
  const usual = usualNameMolecule(answer);
  if (usual) return { status: 'ok', molecules: [usual.mol], missingLocants: false, usualLabel: usual.label };
  let parsed: ParsedName;
  try {
    parsed = parseName(answer);
  } catch (e) {
    if (e instanceof NameParseError) return { status: 'error', molecules: [], error: e, missingLocants: false };
    throw e;
  }
  const missing = missingLocantGroups(parsed);
  if (!missing.length) {
    try {
      return { status: 'ok', molecules: [buildMolecule(parsed)], parsed, missingLocants: false };
    } catch (e) {
      if (e instanceof NameParseError) return { status: 'error', molecules: [], parsed, error: e, missingLocants: false };
      throw e;
    }
  }
  // indices omis : on essaie toutes les possibilités et on garde les lectures « correctes »
  const lists = missing.map((g) => [...combos(g.options, g.count, g.repeat)]);
  const total = lists.reduce((n, l) => n * l.length, 1);
  if (total > 4000) {
    return {
      status: 'error',
      molecules: [],
      parsed,
      error: new NameParseError('Il manque trop d’indices pour interpréter ce nom.', 'format'),
      missingLocants: true,
    };
  }
  const built: Molecule[] = [];
  const valid: Molecule[] = [];
  const key = nameKey(answer);
  let lastError: NameParseError | undefined;
  const idx = lists.map(() => 0);
  for (let n = 0; n < total; n++) {
    const fill = new Map<string, number[]>();
    missing.forEach((g, i) => fill.set(g.key, lists[i][idx[i]]));
    try {
      const mol = buildMolecule(parsed, { fill });
      built.push(mol);
      const acc = acceptedNames(mol).map(nameKey);
      if (acc.includes(key) || acc.includes(nameKey(assembleParsed(parsed, fill)))) valid.push(mol);
    } catch (e) {
      if (e instanceof NameParseError) lastError = e;
      else throw e;
    }
    // incrément « odomètre »
    for (let i = idx.length - 1; i >= 0; i--) {
      idx[i]++;
      if (idx[i] < lists[i].length) break;
      idx[i] = 0;
    }
  }
  const uniqueValid = uniqueMolecules(valid, (m) => m);
  if (uniqueValid.length === 1) return { status: 'ok', molecules: uniqueValid, parsed, missingLocants: true };
  if (uniqueValid.length > 1) return { status: 'ambiguous', molecules: uniqueValid, parsed, missingLocants: true };
  const uniqueBuilt = uniqueMolecules(built, (m) => m);
  if (!uniqueBuilt.length)
    return { status: 'error', molecules: [], parsed, error: lastError, missingLocants: true };
  return { status: 'none', molecules: uniqueBuilt, parsed, missingLocants: true };
}

// ---------------------------------------------------------------------------
// Messages

const ISSUE_TEXT: Record<FormatIssue, { code: ErrorCode; text: string }> = {
  hyphen: { code: 'hyphen', text: 'Tirets : on écrit un tiret entre un chiffre et une lettre (2-méthyl) et on colle le dernier préfixe à la racine (2-méthylbutane).' },
  elision: { code: 'elision', text: 'Élision : le « e » de -ane/-ène/-yne tombe devant une voyelle (propan-2-ol) mais reste devant une consonne (propane-1,2-diol).' },
  euphony: { code: 'euphony', text: '« a » euphonique : on écrit buta-1,3-diène (avec un « a » devant di-, tri-).' },
  multiplier: { code: 'multiplier', text: 'Multiplicateur : plusieurs indices pour un même substituant imposent di-, tri-… (2,3-diméthyl).' },
  'alpha-order': { code: 'alpha-order', text: 'Ordre alphabétique : les préfixes se classent par ordre alphabétique (di, tri, tétra ne comptent pas).' },
  'locant-order': { code: 'locant-order', text: 'Les indices s’écrivent dans l’ordre croissant : 2,3 et non 3,2.' },
  'old-notation': { code: 'old-notation', text: 'Ancienne notation : on place aujourd’hui l’indice devant le suffixe (butan-2-ol et non 2-butanol).' },
  spaces: { code: 'hyphen', text: 'Pas d’espace dans un nom (sauf « acide … » et « … de …yle ») : 2-méthylbutane.' },
  'repeated-prefix': { code: 'multiplier', text: 'Un même substituant ne se répète pas : on le regroupe avec di-, tri- (2,3-diméthyl et non 2-méthyl-3-méthyl).' },
};

const CRITERION_ERROR: Partial<Record<Criterion, { code: ErrorCode; text: (exp: string) => string }>> = {
  principalCount: {
    code: 'chain-function',
    text: () => 'La chaîne principale doit contenir le carbone portant le groupe principal (ou le maximum de groupes principaux).',
  },
  ring: { code: 'chain-ring', text: () => 'Ici, c’est le cycle qui constitue la structure principale.' },
  multipleCount: {
    code: 'chain-unsat',
    text: () => 'La chaîne principale doit contenir les liaisons multiples (doubles ou triples).',
  },
  length: { code: 'chain-length', text: () => 'Tu n’as pas choisi la chaîne la plus longue.' },
  doubleCount: { code: 'chain-unsat', text: () => 'À longueur égale, la chaîne principale doit contenir le plus de doubles liaisons.' },
  principalLocs: {
    code: 'numbering',
    text: () => 'Numérotation : le groupe principal (suffixe) doit avoir le plus petit indice possible.',
  },
  multipleLocs: {
    code: 'numbering',
    text: () => 'Numérotation : les liaisons multiples doivent avoir les plus petits indices possibles.',
  },
  doubleLocs: {
    code: 'numbering',
    text: () => 'Numérotation : à égalité, la double liaison reçoit le plus petit indice (avant la triple).',
  },
  prefixCount: {
    code: 'chain-substituents',
    text: () => 'Deux chaînes ont la même longueur : il faut choisir celle qui porte le plus de substituants.',
  },
  prefixLocs: {
    code: 'numbering',
    text: () => 'Numérotation dans le mauvais sens : les substituants doivent avoir les plus petits indices (on compare au premier point de différence).',
  },
  alpha: {
    code: 'numbering-alpha',
    text: () => 'Les deux sens donnent les mêmes indices : le plus petit indice revient au substituant cité en premier dans l’ordre alphabétique.',
  },
};

function describeFormula(m: Molecule) {
  return formulaToString(molecularFormula(m));
}

function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

/** Correction d'un nom saisi pour une molécule donnée. */
export function gradeName(answer: string, target: Molecule, naming?: NamingResult): NameGrade {
  const T = naming ?? nameMolecule(target);
  const accepted = [T.name, ...T.variants];
  const base = { expected: T.name, accepted };
  const ans = answer.trim();
  if (!ans)
    return { ...base, status: 'incorrect', headline: 'Pas de réponse', details: [], errorCodes: ['empty'] };

  const norm = normalizeName(ans);
  if (norm === normalizeName(T.name))
    return { ...base, status: 'correct', headline: 'Bonne réponse !', details: [], errorCodes: [] };
  if (accepted.some((a) => normalizeName(a) === norm))
    return {
      ...base,
      status: 'correct',
      headline: 'Bonne réponse !',
      details: [`Ton écriture est correcte. La forme la plus utilisée en cours est : ${T.name}.`],
      errorCodes: [],
    };
  if (accepted.some((a) => nameKey(a) === nameKey(ans))) {
    const accentOnly = accepted.some((a) => stripAccents(normalizeName(a)) === stripAccents(norm));
    return {
      ...base,
      status: 'correct',
      headline: accentOnly ? 'Bonne réponse (attention aux accents)' : 'Bonne réponse',
      details: [
        accentOnly
          ? `On écrit : ${T.name}. En français, les accents font partie du nom (méthyl, éthyl, -ène, -oïque…).`
          : `On écrit plutôt : ${T.name} (élision : « d’éthyle » et non « de éthyle »).`,
      ],
      errorCodes: accentOnly ? ['accents'] : [],
    };
  }

  const interp = interpretName(ans);
  if (interp.usualLabel) {
    if (isSameMolecule(interp.molecules[0], target))
      return {
        ...base,
        status: 'partial',
        headline: 'Bonne molécule, mais nom usuel',
        details: [
          `« ${interp.usualLabel} » est le nom usuel de cette molécule. Le nom systématique attendu est : ${T.name}.`,
        ],
        errorCodes: ['usual-name'],
      };
    return {
      ...base,
      status: 'incorrect',
      headline: 'Ce nom usuel désigne une autre molécule',
      details: [`« ${interp.usualLabel} » ne correspond pas à cette molécule.`],
      errorCodes: ['wrong-molecule'],
      userMolecule: interp.molecules[0],
    };
  }

  if (interp.status === 'error') {
    const e = interp.error;
    if (!e || e.kind === 'unknown-word') {
      return {
        ...base,
        status: 'unknown',
        headline: 'Réponse non évaluable automatiquement',
        details: [
          e?.message ?? 'Je ne reconnais pas ce nom.',
          'Je ne peux pas affirmer que ta réponse est fausse : compare-la avec la réponse attendue et indique toi-même si tu avais juste.',
        ],
        errorCodes: ['unreadable'],
      };
    }
    if (e.kind === 'structure')
      return {
        ...base,
        status: 'incorrect',
        headline: 'Ce nom décrit une structure impossible',
        details: [e.message],
        errorCodes: ['impossible'],
      };
    return {
      ...base,
      status: 'incorrect',
      headline: 'Nom mal construit',
      details: [e.message],
      errorCodes: interp.missingLocants ? ['locant-missing'] : ['format'],
    };
  }

  const parsed = interp.parsed!;
  const issueCodes = parsed.issues.map((i) => ISSUE_TEXT[i].code);
  const issueTexts = parsed.issues.map((i) => ISSUE_TEXT[i].text);

  if (interp.status === 'ambiguous') {
    const hasTarget = interp.molecules.some((m) => isSameMolecule(m, target));
    return {
      ...base,
      status: hasTarget ? 'partial' : 'incorrect',
      headline: hasTarget ? 'Presque : il manque un indice' : 'Indice manquant et molécule incorrecte',
      details: [
        `Sans indice, ce nom peut désigner ${interp.molecules.length} molécules différentes. Il faut préciser les positions.`,
        ...issueTexts,
      ],
      errorCodes: unique(['locant-missing', ...issueCodes]),
    };
  }

  const matching = interp.molecules.find((m) => isSameMolecule(m, target));
  if (matching) {
    const details: string[] = [];
    const codes: ErrorCode[] = [...issueCodes];
    if (interp.status === 'none') {
      codes.push('locant-missing');
      details.push('Un indice manque et le nom obtenu n’est pas correct pour cette molécule.');
    }
    if (interp.missingLocants && interp.status === 'ok') {
      if (!codes.length)
        return {
          ...base,
          status: 'correct',
          headline: 'Bonne réponse !',
          details: [`Indice sous-entendu accepté (une seule position possible). En cours, on écrit souvent : ${T.name}.`],
          errorCodes: [],
        };
      details.push(...issueTexts);
      return {
        ...base,
        status: 'partial',
        headline: 'Bonne molécule, mais écriture à corriger',
        details: unique(details),
        errorCodes: unique(codes),
      };
    }
    if (parsed.prefixes.some((p) => p.raw.endsWith('ylidene'))) {
      return {
        ...base,
        status: 'correct',
        headline: 'Bonne réponse (règles IUPAC 2013)',
        details: [
          `Ton nom suit les recommandations IUPAC de 2013 (chaîne la plus longue d’abord). En cours, on applique souvent la règle classique (chaîne contenant la liaison multiple) : ${T.name}.`,
        ],
        errorCodes: [],
      };
    }
    const userSuffix = parsed.suffix?.type ?? null;
    const expectedSuffix = T.parts.suffix?.type ?? null;
    // retrouver le candidat (chaîne + sens) correspondant à la réponse
    const assembled = nameKey(assembleParsed(parsed));
    const best = T.candidates[0];
    const cand = T.candidates.find((c) => {
      if (c.unsupported) return false;
      const names = [nameOfCandidate(c, T.principal), assembleName(candidateParts(c, { principal: T.principal }, 'full'))];
      return names.some((n) => nameKey(n) === assembled);
    });
    if (userSuffix !== expectedSuffix) {
      codes.push('priority');
      details.push(
        T.principal
          ? `Le groupe prioritaire est : ${GROUP_LABEL[T.principal]}. C’est lui qui donne le suffixe ; les autres groupes s’écrivent en préfixe.`
          : 'Cette molécule n’a pas de fonction nommée par un suffixe.',
      );
    } else if (cand && compareCandidates(best, cand).cmp !== 0) {
      const { criterion } = compareCandidates(best, cand);
      const ce = criterion ? CRITERION_ERROR[criterion] : undefined;
      if (ce) {
        codes.push(ce.code);
        details.push(ce.text(T.name));
      }
    } else if (!cand && !codes.length) {
      codes.push('other');
      details.push('Ton nom décrit bien la bonne molécule, mais il n’est pas construit selon les règles (chaîne principale, numérotation ou forme du nom).');
    }
    details.push(...issueTexts);
    if (interp.missingLocants && interp.status === 'ok' && codes.length === 0) {
      return {
        ...base,
        status: 'correct',
        headline: 'Bonne réponse !',
        details: [`Indice sous-entendu accepté (une seule position possible). En cours, on écrit souvent : ${T.name}.`],
        errorCodes: [],
      };
    }
    if (!codes.length) {
      return {
        ...base,
        status: 'correct',
        headline: 'Bonne réponse !',
        details: [`Ton nom est juste ; on écrit plus simplement : ${T.name}.`],
        errorCodes: [],
      };
    }
    const onlyFormat = codes.every((c) =>
      ['hyphen', 'elision', 'euphony', 'locant-order', 'old-notation', 'accents'].includes(c),
    );
    return {
      ...base,
      status: 'partial',
      headline: onlyFormat ? 'Bonne molécule, mais écriture à corriger' : 'Bonne molécule, mais le nom ne respecte pas les règles',
      details: unique(details),
      errorCodes: unique(codes),
    };
  }

  // la réponse décrit une autre molécule
  const user = interp.molecules[0];
  let userName: string | null = null;
  try {
    userName = nameMolecule(user).name;
  } catch {
    userName = null;
  }
  const details: string[] = [];
  const codes: ErrorCode[] = [];
  const fu = molecularFormula(user);
  const ft = molecularFormula(target);
  let tPrincipal: string | null = T.principal;
  let uPrincipal: string | null = null;
  try {
    uPrincipal = nameMolecule(user).principal;
  } catch {
    uPrincipal = null;
  }
  if (uPrincipal !== tPrincipal) {
    codes.push('function');
    details.push(
      `Fonction : la molécule est ${tPrincipal ? 'un(e) ' + GROUP_LABEL[tPrincipal as keyof typeof GROUP_LABEL] : 'sans fonction en suffixe'} ; ton nom décrit ${uPrincipal ? 'un(e) ' + GROUP_LABEL[uPrincipal as keyof typeof GROUP_LABEL] : 'une molécule sans fonction en suffixe'}.`,
    );
  }
  if ((fu.C ?? 0) !== (ft.C ?? 0)) {
    codes.push('carbon-count');
    details.push(`Ton nom décrit une molécule à ${fu.C ?? 0} carbones, alors que la molécule en compte ${ft.C ?? 0}.`);
  } else if (describeFormula(user) === describeFormula(target)) {
    codes.push('position');
    details.push(
      `Ton nom décrit un isomère (même formule brute ${describeFormula(target)}) : un groupe, un substituant ou une liaison multiple n’est pas à la bonne position, ou la chaîne est différente.`,
    );
  } else if ((fu.H ?? 0) !== (ft.H ?? 0)) {
    codes.push('unsaturation');
    details.push(`Ta molécule a ${fu.H ?? 0} H au lieu de ${ft.H ?? 0} : vérifie les liaisons doubles/triples et les cycles.`);
  }
  if (userName && (nameKey(userName) === nameKey(ans) || acceptedNames(user).some((a) => nameKey(a) === nameKey(ans))))
    details.unshift('Ton nom est bien construit… mais il correspond à une autre molécule (dessinée ci-dessous).');
  else details.unshift('Ton nom correspond à une autre molécule (dessinée ci-dessous).');
  details.push(...issueTexts);
  if (!codes.length) codes.push('wrong-molecule');
  return {
    ...base,
    status: 'incorrect',
    headline: 'Ce n’est pas le bon nom',
    details: unique(details),
    errorCodes: unique([...codes, ...issueCodes]),
    userMolecule: user,
    userMoleculeName: userName,
  };
}

// ---------------------------------------------------------------------------
// Formule brute

export function parseFormula(input: string): Record<string, number> | null {
  const sub = '₀₁₂₃₄₅₆₇₈₉';
  let s = input.replace(/[₀-₉]/g, (d) => String(sub.indexOf(d))).replace(/\s/g, '');
  if (!s) return null;
  // tolérance sur la casse : c4h10 → C4H10, cl → Cl, br → Br
  s = s.replace(/cl/gi, 'Cl').replace(/br/gi, 'Br').replace(/[chnosfi](?![lr])/g, (c) => c.toUpperCase());
  const re = /(Cl|Br|C|H|N|O|S|F|I)(\d*)/y;
  const out: Record<string, number> = {};
  let i = 0;
  while (i < s.length) {
    re.lastIndex = i;
    const m = re.exec(s);
    if (!m) return null;
    out[m[1]] = (out[m[1]] ?? 0) + (m[2] ? Number(m[2]) : 1);
    i = re.lastIndex;
  }
  return out;
}

export function gradeFormula(answer: string, mol: Molecule): { status: GradeStatus; message: string; expected: string } {
  const exp = molecularFormula(mol);
  const expected = formulaToString(exp);
  const got = parseFormula(answer);
  if (!got) return { status: 'unknown', message: 'Je ne reconnais pas cette formule (exemple attendu : C4H10).', expected };
  const keys = new Set([...Object.keys(exp), ...Object.keys(got)]);
  const diffs = [...keys].filter((k) => (exp[k] ?? 0) !== (got[k] ?? 0));
  if (!diffs.length) return { status: 'correct', message: 'Formule brute correcte.', expected };
  if (diffs.length === 1 && diffs[0] === 'H')
    return {
      status: 'partial',
      message: `Les atomes lourds sont justes mais pas le nombre d’hydrogènes : ${got.H ?? 0} au lieu de ${exp.H}. Rappel : chaque carbone complète ses 4 liaisons avec des H.`,
      expected,
    };
  return {
    status: 'incorrect',
    message: `Différences : ${diffs.map((k) => `${k} : ${got[k] ?? 0} au lieu de ${exp[k] ?? 0}`).join(' ; ')}.`,
    expected,
  };
}

/** Utilitaire : comparaison insensible aux accents. */
export function sameText(a: string, b: string): boolean {
  return stripAccents(a.toLowerCase().trim()) === stripAccents(b.toLowerCase().trim());
}
