// Génération des exercices à partir de structures valides.
import { type Molecule, cloneMolecule, hydrogenCount, adjacency, bondOrderSum, VALENCE, isConnected, valenceProblems, molecularFormula, formulaToString } from '../chem/molecule';
import { parseSmiles, toSmiles } from '../chem/smiles';
import { isSameMolecule, uniqueMolecules } from '../chem/isomorphism';
import {
  type NamingResult,
  type Candidate,
  compareCandidates,
  nameMolecule,
  nameOfCandidate,
  GROUP_LABEL,
  type GroupClass,
} from '../chem/nomenclature/namer';
import { type ErrorCode, ERROR_INFO } from '../chem/nomenclature/grading';
import { prefixGroupText, parentWithSuffix, sortPrefixGroups } from '../chem/nomenclature/assemble';
import { doubleBondStereo, stereocenters, rsFromDrawing, cipRanking } from '../chem/stereo';
import { layoutSkeletal } from '../chem/layout';
import { MOLECULES, type MoleculeEntry, EZ_MOLECULES, RS_MOLECULES } from '../content/molecules';
import { QUESTIONS, QUESTION_BY_ID } from '../content/questions';
import type { Exercise, ExerciseKind, ExerciseSpec, AuthoredQuestion } from './types';

export type Rng = () => number;

export const pick = <T,>(xs: T[], rng: Rng): T => xs[Math.floor(rng() * xs.length)];
export function shuffle<T>(xs: T[], rng: Rng): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let uidCounter = 0;
const uid = () => `ex${Date.now().toString(36)}${(uidCounter++).toString(36)}`;

// ---------------------------------------------------------------------------
// Cache des analyses

const cache = new Map<string, { mol: Molecule; naming: NamingResult | null }>();
export function analyse(smiles: string): { mol: Molecule; naming: NamingResult | null } {
  let c = cache.get(smiles);
  if (!c) {
    const mol = parseSmiles(smiles);
    let naming: NamingResult | null = null;
    try {
      naming = nameMolecule(mol);
    } catch {
      naming = null;
    }
    c = { mol, naming };
    cache.set(smiles, c);
  }
  return c;
}

export const ENTRY_BY_SMILES = new Map(MOLECULES.map((e) => [e.smiles, e]));

function entryFor(smiles: string): MoleculeEntry | undefined {
  return ENTRY_BY_SMILES.get(smiles);
}

// ---------------------------------------------------------------------------
// Indices automatiques

const SUFFIX_HINT: Record<GroupClass, string> = {
  acid: 'acide carboxylique → « acide …oïque »',
  ester: 'ester → « …oate de …yle »',
  amide: 'amide → suffixe « -amide »',
  nitrile: 'nitrile → suffixe « -nitrile »',
  aldehyde: 'aldéhyde → suffixe « -al »',
  ketone: 'cétone → suffixe « -one »',
  alcohol: 'alcool → suffixe « -ol »',
  amine: 'amine → suffixe « -amine »',
};

export function autoHints(n: NamingResult): string[] {
  const hints: string[] = [];
  if (n.principal) hints.push(`Fonction principale : ${SUFFIX_HINT[n.principal]}.`);
  else hints.push(n.steps[0].text);
  const L = n.parentAtoms.length;
  if (n.aromatic) hints.push('La structure principale est le cycle benzénique : le nom se termine par « benzène » (ou « phénol » si un –OH est porté par le cycle).');
  else hints.push(`${n.isRing ? 'Le cycle' : 'La chaîne principale'} compte ${L} carbone${L > 1 ? 's' : ''}.`);
  const num = n.steps.find((s) => s.title === 'Numéroter');
  if (num) hints.push(num.text);
  return hints;
}

// ---------------------------------------------------------------------------
// Distracteurs (structures voisines et valides)

function freeValence(mol: Molecule, i: number) {
  return VALENCE[mol.atoms[i].el] - bondOrderSum(mol, i);
}

export function mutations(mol: Molecule): Molecule[] {
  const out: Molecule[] = [];
  const adj = adjacency(mol);
  const n = mol.atoms.length;
  // a) déplacer un atome terminal (substituant) vers un autre carbone
  for (let x = 0; x < n; x++) {
    if (adj[x].length !== 1) continue;
    const p = adj[x][0];
    const order = mol.bonds.find((b) => (b.a === x && b.b === p) || (b.a === p && b.b === x))!.order;
    for (let t = 0; t < n; t++) {
      if (t === x || t === p || mol.atoms[t].el !== 'C') continue;
      if (freeValence(mol, t) < order) continue;
      const m = cloneMolecule(mol);
      const bd = m.bonds.find((b) => (b.a === x && b.b === p) || (b.a === p && b.b === x))!;
      if (bd.a === x) bd.b = t;
      else bd.a = t;
      out.push(m);
    }
  }
  // b) déplacer une double ou triple liaison C=C
  for (const bd of mol.bonds) {
    if (bd.order === 1) continue;
    if (mol.atoms[bd.a].el !== 'C' || mol.atoms[bd.b].el !== 'C') continue;
    for (const other of mol.bonds) {
      if (other === bd || other.order !== 1) continue;
      if (mol.atoms[other.a].el !== 'C' || mol.atoms[other.b].el !== 'C') continue;
      const m = cloneMolecule(mol);
      const i = mol.bonds.indexOf(bd);
      const j = mol.bonds.indexOf(other);
      m.bonds[i].order = 1;
      m.bonds[j].order = bd.order;
      if (valenceProblems(m).length === 0) out.push(m);
    }
  }
  // c) allonger / raccourcir la chaîne
  for (let x = 0; x < n; x++) {
    if (mol.atoms[x].el !== 'C') continue;
    if (adj[x].length === 1 && mol.atoms[adj[x][0]].el === 'C' && n > 2) {
      const m: Molecule = { atoms: mol.atoms.filter((_, i) => i !== x).map((a) => ({ ...a })), bonds: [] };
      const map = (i: number) => (i > x ? i - 1 : i);
      for (const b of mol.bonds) if (b.a !== x && b.b !== x) m.bonds.push({ a: map(b.a), b: map(b.b), order: b.order });
      if (isConnected(m)) out.push(m);
    }
    if (hydrogenCount(mol, x) > 0 && adj[x].length <= 1) {
      const m = cloneMolecule(mol);
      m.atoms.push({ el: 'C' });
      m.bonds.push({ a: x, b: m.atoms.length - 1, order: 1 });
      out.push(m);
    }
  }
  return out.map((m) => {
    const c = cloneMolecule(m);
    c.bonds.forEach((b) => {
      delete b.dir;
      delete b.stereo;
    });
    return c;
  });
}

export function structureDistractors(target: Molecule, count: number, rng: Rng): Molecule[] {
  const muts = uniqueMolecules(
    mutations(target).filter((m) => valenceProblems(m).length === 0 && !isSameMolecule(m, target)),
    (m) => m,
  ).filter((m) => {
    try {
      nameMolecule(m);
      return true;
    } catch {
      return false;
    }
  });
  const f = formulaToString(molecularFormula(target));
  const isomers = shuffle(
    muts.filter((m) => formulaToString(molecularFormula(m)) === f),
    rng,
  );
  const others = shuffle(
    muts.filter((m) => formulaToString(molecularFormula(m)) !== f),
    rng,
  );
  const chosen = [...isomers, ...others].slice(0, count);
  if (chosen.length < count) {
    // compléter avec des molécules de la banque proches (même nombre de carbones, même famille)
    const nC = target.atoms.filter((a) => a.el === 'C').length;
    const els = new Set(target.atoms.map((a) => a.el));
    const pool = shuffle(MOLECULES, rng).sort((a, b) => {
      const score = (e: MoleculeEntry) => {
        const m = analyse(e.smiles).mol;
        const c = m.atoms.filter((x) => x.el === 'C').length;
        const sameEls = [...new Set(m.atoms.map((x) => x.el))].every((x) => els.has(x)) ? 0 : 3;
        return Math.abs(c - nC) + sameEls;
      };
      return score(a) - score(b);
    });
    for (const e of pool) {
      if (chosen.length >= count) break;
      const m = analyse(e.smiles).mol;
      if (!isSameMolecule(m, target) && !chosen.some((c) => isSameMolecule(c, m))) chosen.push(m);
    }
  }
  return chosen;
}

// ---------------------------------------------------------------------------
// Noms erronés plausibles

export interface WrongName {
  name: string;
  code: ErrorCode;
}

const CRIT_CODE: Partial<Record<string, ErrorCode>> = {
  principalCount: 'chain-function',
  multipleCount: 'chain-unsat',
  length: 'chain-length',
  doubleCount: 'chain-unsat',
  principalLocs: 'numbering',
  multipleLocs: 'numbering',
  doubleLocs: 'numbering',
  prefixCount: 'chain-substituents',
  prefixLocs: 'numbering',
  alpha: 'numbering-alpha',
  ring: 'chain-ring',
};

export function wrongNames(n: NamingResult): WrongName[] {
  const out: WrongName[] = [];
  const seen = new Set<string>([n.name, ...n.variants]);
  const best = n.candidates[0];
  const add = (name: string, code: ErrorCode) => {
    if (seen.has(name)) return;
    seen.add(name);
    out.push({ name, code });
  };
  const cands: Candidate[] = n.candidates.filter((c) => !c.unsupported);
  for (const c of cands.slice(1, 60)) {
    const { cmp, criterion } = compareCandidates(best, c);
    if (cmp === 0 || !criterion) continue;
    const code = CRIT_CODE[criterion];
    if (!code) continue;
    // on évite les « chaînes » ridicules (un seul carbone pour une grosse molécule)
    if (!c.isRing && c.atoms.length < Math.max(2, best.atoms.length - 2)) continue;
    add(nameOfCandidate(c, n.principal), code);
  }
  const groups = n.parts.prefixes;
  const parentPart = parentWithSuffix(n.parts.parent, n.parts.suffix);
  const wrap = (core: string) => {
    if (n.parts.suffix?.type === 'oic') return 'acide ' + core;
    if (n.parts.suffix?.type === 'oate' && n.parts.esterAlkyl) {
      const alk = n.parts.esterAlkyl;
      return core + (/^[aeiouyéè]/i.test(alk) ? ' d’' : ' de ') + alk;
    }
    return core;
  };
  // ordre alphabétique inversé
  if (groups.length >= 2) {
    const sorted = sortPrefixGroups(groups);
    const rev = [...sorted].reverse();
    const txt = rev.map((g, i) => (i > 0 && /^[\dN]/.test(prefixGroupText(g)) ? '-' : '') + prefixGroupText(g)).join('');
    add(wrap(txt + parentPart), 'alpha-order');
  }
  // multiplicateur oublié : « 2-méthyl-3-méthyl… »
  const multi = groups.find((g) => g.locants.length >= 2 && !g.complex && g.showLocants);
  if (multi) {
    const sorted = sortPrefixGroups(groups);
    const parts: string[] = [];
    for (const g of sorted) {
      if (g === multi) for (const l of g.locants) parts.push(`${l}-${g.name}`);
      else parts.push(prefixGroupText(g));
    }
    add(wrap(parts.map((p, i) => (i > 0 && /^[\dN]/.test(p) ? '-' : '') + p).join('') + parentPart), 'multiplier');
  }
  return out;
}

// ---------------------------------------------------------------------------
// Construction des exercices

export interface BuildContext {
  skills?: string[];
  level?: number;
}

const FUNCTION_CHOICES = [
  'Alcane / alcène / alcyne (pas de fonction)',
  'Dérivé halogéné',
  'Alcool',
  'Éther-oxyde',
  'Aldéhyde',
  'Cétone',
  'Acide carboxylique',
  'Ester',
  'Amine',
  'Amide',
  'Nitrile',
];

function functionLabel(n: NamingResult): string {
  if (n.principal) {
    const map: Record<GroupClass, string> = {
      acid: 'Acide carboxylique',
      ester: 'Ester',
      amide: 'Amide',
      nitrile: 'Nitrile',
      aldehyde: 'Aldéhyde',
      ketone: 'Cétone',
      alcohol: 'Alcool',
      amine: 'Amine',
    };
    return map[n.principal];
  }
  const cls = new Set(n.groups.map((g) => g.cls));
  if (cls.has('ether')) return 'Éther-oxyde';
  if (cls.has('halogen')) return 'Dérivé halogéné';
  return FUNCTION_CHOICES[0];
}

function fromQuestion(q: AuthoredQuestion): Exercise {
  const ex: Exercise = {
    uid: uid(),
    key: `q:${q.id}`,
    kind: q.kind,
    skills: q.skills,
    level: q.level,
    prompt: q.prompt,
    smiles: q.smiles,
    hints: q.hints ?? [],
    explanation: q.explanation,
  };
  if (q.kind === 'mcq') {
    ex.choices = (q.choices ?? []).map((label) => ({ label }));
    ex.answer = q.answer as number[];
    ex.multi = (q.answer as number[]).length > 1;
  } else ex.truth = q.answer as boolean;
  return ex;
}

export function buildExercise(spec: ExerciseSpec, rng: Rng = Math.random, ctx: BuildContext = {}): Exercise | null {
  if (spec.kind === 'q') {
    const q = QUESTION_BY_ID[spec.id];
    return q ? fromQuestion(q) : null;
  }
  if (spec.kind === 'match') {
    const items = spec.smiles.map((s) => ({ smiles: s, name: analyse(s).naming?.name ?? '' })).filter((x) => x.name);
    const skills = [...new Set(spec.smiles.flatMap((s) => entryFor(s)?.skills ?? []))];
    return {
      uid: uid(),
      key: `match:${spec.smiles.join('|')}`,
      kind: 'match',
      skills: ctx.skills ?? skills,
      level: Math.max(...spec.smiles.map((s) => entryFor(s)?.level ?? 2)),
      prompt: 'Associe chaque structure à son nom.',
      hints: ['Commence par compter les carbones de la chaîne principale de chaque molécule.', 'Repère ensuite les fonctions et les positions des substituants.'],
      items: shuffle(items, rng),
    };
  }
  const { smiles } = spec;
  const { mol, naming } = analyse(smiles);
  const entry = entryFor(smiles);
  const skills = ctx.skills ?? entry?.skills ?? [];
  const level = entry?.level ?? ctx.level ?? 2;
  const base = {
    uid: uid(),
    key: `${spec.kind}:${smiles}`,
    kind: spec.kind as ExerciseKind,
    skills,
    level,
    smiles,
  };
  switch (spec.kind) {
    case 'name': {
      if (!naming) return null;
      return { ...base, prompt: 'Donne le nom de cette molécule.', hints: spec.hints ?? autoHints(naming) };
    }
    case 'structure': {
      if (!naming) return null;
      const opts = [mol, ...structureDistractors(mol, 3, rng)];
      const order = shuffle(opts.map((_, i) => i), rng);
      return {
        ...base,
        prompt: `Quelle structure correspond à : « ${naming.name} » ?`,
        name: naming.name,
        hints: spec.hints ?? [
          `Dessine d’abord la chaîne principale : ${naming.parentAtoms.length} carbones${naming.isRing ? ' en cycle' : ''}.`,
          'Place ensuite les insaturations, la fonction et les substituants aux positions indiquées par les indices.',
        ],
        choices: order.map((i) => ({ label: `Structure ${'ABCD'[order.indexOf(i)]}`, smiles: toSmiles(opts[i]) })),
        answer: [order.indexOf(0)],
      };
    }
    case 'mainChain': {
      if (!naming || naming.aromatic) return null;
      return {
        ...base,
        prompt: naming.isRing
          ? 'Clique sur tous les carbones de la structure principale (le cycle).'
          : 'Clique sur tous les carbones de la chaîne principale.',
        hints: spec.hints ?? [
          naming.principal
            ? 'La chaîne principale doit contenir le carbone qui porte la fonction principale.'
            : naming.parts.parent.enes.length || naming.parts.parent.ynes.length
              ? 'La chaîne principale doit contenir les liaisons multiples.'
              : 'Cherche la chaîne de carbones la plus longue, même si elle « tourne ».',
          `Elle compte ${naming.parentAtoms.length} carbones.`,
        ],
        items: naming.validMainChains.map((c) => ({ smiles: c.join(','), name: '' })),
      };
    }
    case 'numbering': {
      if (!naming || naming.parentAtoms.length < 2) return null;
      const firsts = [...new Set(naming.equivalentNumberings.map((c) => c[0]))];
      return {
        ...base,
        prompt: 'La structure principale est surlignée. Clique sur le carbone qui porte le numéro 1.',
        hints: spec.hints ?? [
          naming.principal
            ? 'Le groupe principal (suffixe) doit recevoir le plus petit numéro possible.'
            : 'Les substituants (ou liaisons multiples) doivent recevoir les plus petits numéros possibles.',
          naming.steps.find((s) => s.title === 'Numéroter')?.text ?? '',
        ].filter(Boolean),
        answer: firsts,
      };
    }
    case 'function': {
      if (!naming) return null;
      const label = functionLabel(naming);
      const others = shuffle(FUNCTION_CHOICES.filter((c) => c !== label), rng).slice(0, 3);
      const choices = shuffle([label, ...others], rng);
      const several = new Set(naming.groups.map((g) => g.cls).filter((c) => c !== 'halogen' && c !== 'ether')).size > 1;
      return {
        ...base,
        prompt: several
          ? 'Cette molécule porte plusieurs fonctions. Laquelle est prioritaire (nommée en suffixe) ?'
          : 'Quelle est la famille (fonction) de cette molécule ?',
        hints: spec.hints ?? [
          'Repère les atomes autres que C et H (O, N, halogènes) et leurs liaisons.',
          'C=O en bout de chaîne : aldéhyde ; C=O entre deux carbones : cétone ; C=O + OH sur le même carbone : acide.',
        ],
        choices: choices.map((c) => ({ label: c })),
        answer: [choices.indexOf(label)],
        explanation: naming.steps[0].text,
      };
    }
    case 'complete': {
      if (!naming || !/\d/.test(naming.name)) return null;
      const template: { text?: string; blank?: string }[] = [];
      const re = /\d+(?:,\d+)*/g;
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(naming.name))) {
        if (m.index > last) template.push({ text: naming.name.slice(last, m.index) });
        template.push({ blank: m[0] });
        last = m.index + m[0].length;
      }
      if (last < naming.name.length) template.push({ text: naming.name.slice(last) });
      return {
        ...base,
        prompt: 'Complète le nom avec les bons indices de position.',
        hints: spec.hints ?? autoHints(naming).slice(1),
        template,
      };
    }
    case 'judge': {
      if (!naming) return null;
      const wrongs = wrongNames(naming);
      const useWrong = spec.proposed ? spec.proposed !== naming.name : wrongs.length > 0 && rng() < 0.6;
      const w = spec.proposed ? null : useWrong ? pick(wrongs, rng) : null;
      const proposed = spec.proposed ?? (w ? w.name : naming.name);
      return {
        ...base,
        key: `judge:${smiles}:${proposed}`,
        prompt: `Le nom « ${proposed} » est-il correct pour cette molécule ?`,
        proposed,
        truth: proposed === naming.name || naming.variants.includes(proposed),
        wrongCode: w?.code,
        hints: spec.hints ?? ['Refais la démarche : fonction, chaîne principale, numérotation, ordre alphabétique.'],
      };
    }
    case 'findError': {
      if (!naming) return null;
      const wrongs = wrongNames(naming);
      if (!wrongs.length) return null;
      const w = pick(wrongs, rng);
      const allCodes: ErrorCode[] = ['chain-length', 'numbering', 'alpha-order', 'multiplier', 'chain-unsat', 'chain-function', 'numbering-alpha', 'chain-substituents'];
      const distract = shuffle(allCodes.filter((c) => c !== w.code), rng).slice(0, 3);
      const codes = shuffle([w.code, ...distract], rng);
      return {
        ...base,
        key: `findError:${smiles}:${w.code}`,
        prompt: `Un élève a proposé « ${w.name} ». Quelle est son erreur ?`,
        proposed: w.name,
        wrongCode: w.code,
        choices: codes.map((c) => ({ label: ERROR_INFO[c].label })),
        answer: [codes.indexOf(w.code)],
        explanation: ERROR_INFO[w.code].rule,
        hints: spec.hints ?? ['Nomme toi-même la molécule, puis compare ton nom avec celui de l’élève.'],
      };
    }
    case 'formula': {
      const fromName = !!spec.fromName && !!naming;
      return {
        ...base,
        key: `formula:${fromName ? 'n' : 's'}:${smiles}`,
        prompt: fromName
          ? `Quelle est la formule brute de « ${naming!.name} » ? (exemple d’écriture : C4H10)`
          : 'Quelle est la formule brute de cette molécule ? (exemple d’écriture : C4H10)',
        fromName,
        name: naming?.name,
        hints: spec.hints ?? [
          'Compte d’abord les carbones (chaque sommet et chaque extrémité de la formule topologique).',
          'Chaque carbone fait 4 liaisons : complète avec des H. Ajoute les autres atomes (O, N, halogènes).',
        ],
      };
    }
    case 'countC': {
      return {
        ...base,
        prompt: 'Combien d’atomes de carbone cette molécule contient-elle ?',
        hints: spec.hints ?? ['Chaque sommet (coin) et chaque extrémité de trait est un carbone, sauf si un autre symbole y est écrit.'],
        answer: [mol.atoms.filter((a) => a.el === 'C').length],
      };
    }
    case 'implicitH': {
      const carbons = mol.atoms.map((a, i) => (a.el === 'C' ? i : -1)).filter((i) => i >= 0);
      const atom = spec.atom ?? pick(carbons, rng);
      return {
        ...base,
        key: `implicitH:${smiles}:${atom}`,
        prompt: 'Combien d’atomes d’hydrogène porte le carbone entouré ?',
        atom,
        hints: spec.hints ?? [
          'Compte les liaisons déjà dessinées sur ce carbone (une double liaison compte pour 2).',
          'Le carbone fait 4 liaisons : les liaisons manquantes sont des liaisons C–H.',
        ],
        answer: [hydrogenCount(mol, atom)],
      };
    }
    case 'ez': {
      const st = doubleBondStereo(mol).find((d) => d.config !== null) ?? doubleBondStereo(mol)[0];
      const config = st?.config ?? 'none';
      const choices = ['Z', 'E', 'Pas d’isomérie Z/E'];
      return {
        ...base,
        skills: ['ez'],
        level: 3,
        prompt: 'Quelle est la configuration de la double liaison C=C ?',
        hints: spec.hints ?? [
          'Sur chaque carbone de la double liaison, cherche le substituant prioritaire (numéro atomique le plus grand).',
          'Prioritaires du même côté : Z (« zusammen », ensemble). De part et d’autre : E (« entgegen », opposés).',
        ],
        choices: choices.map((label) => ({ label })),
        answer: [config === 'Z' ? 0 : config === 'E' ? 1 : 2],
        stereo: { config },
      };
    }
    case 'rs': {
      const centers = stereocenters(mol);
      if (!centers.length) return null;
      const center = centers[0];
      const pos = layoutSkeletal(mol);
      const candidates = mol.bonds
        .map((b, i) => ({ b, i }))
        .filter(({ b }) => b.a === center || b.b === center);
      const chosen = pick(candidates, rng);
      const type: 'wedge' | 'hash' = rng() < 0.5 ? 'wedge' : 'hash';
      const m2 = cloneMolecule(mol);
      const bd = m2.bonds[chosen.i];
      if (bd.a !== center) [bd.a, bd.b] = [bd.b, bd.a];
      bd.stereo = type;
      const config = rsFromDrawing(m2, pos, center);
      if (!config) return null;
      const rank = cipRanking(mol, center) ?? [];
      const label = (x: number) => (x < 0 ? 'H' : describeBranch(mol, x, center));
      return {
        ...base,
        key: `rs:${smiles}:${chosen.i}:${type}`,
        skills: ['rs'],
        level: 4,
        prompt: 'Le carbone asymétrique est entouré. Quelle est sa configuration ?',
        hints: spec.hints ?? [
          'Classe les 4 substituants par numéro atomique décroissant (règles CIP). En cas d’égalité, regarde les atomes suivants.',
          'Le substituant n°4 (souvent H) doit pointer vers l’arrière. Si ce n’est pas le cas, la réponse lue est à inverser.',
          'Sens des aiguilles d’une montre 1 → 2 → 3 : R ; sens inverse : S.',
        ],
        atom: center,
        choices: [{ label: 'R' }, { label: 'S' }],
        answer: [config === 'R' ? 0 : 1],
        stereo: { center, bond: chosen.i, type, config },
        coords: pos,
        explanation: `Ordre de priorité autour du carbone : ${rank.map(label).join(' > ')}.`,
      };
    }
  }
  return null;
}

/** Description courte d'un substituant pour les explications CIP (–OH, –CH₃, –C₂H₅…). */
function describeBranch(mol: Molecule, x: number, from: number): string {
  const adj = adjacency(mol);
  const seen = new Set([from, x]);
  const st = [x];
  while (st.length) {
    const a = st.pop()!;
    for (const y of adj[a]) if (!seen.has(y)) {
      seen.add(y);
      st.push(y);
    }
  }
  seen.delete(from);
  const atoms = [...seen];
  const sub: Molecule = { atoms: [], bonds: [] };
  const idx = new Map<number, number>();
  atoms.forEach((a) => {
    idx.set(a, sub.atoms.length);
    sub.atoms.push({ el: mol.atoms[a].el, explicitH: hydrogenCount(mol, a) });
  });
  for (const b of mol.bonds) if (idx.has(b.a) && idx.has(b.b)) sub.bonds.push({ a: idx.get(b.a)!, b: idx.get(b.b)!, order: b.order });
  const f = formulaToString(molecularFormula(sub));
  const known: Record<string, string> = { 'CH₃': 'CH₃', 'C₂H₅': 'C₂H₅', HO: 'OH', 'CHO': 'CHO', 'CHO₂': 'COOH', 'H₂N': 'NH₂', 'CH₃O': 'CH₂OH' };
  return '–' + (known[f] ?? f);
}

// ---------------------------------------------------------------------------
// Sélection d'exercices pour une notion

/** Types d'exercices pertinents pour chaque notion. */
export const SKILL_KINDS: Record<string, ExerciseKind[]> = {
  'b-intro': ['formula', 'mcq', 'tf'],
  'b-atomes': ['mcq', 'tf'],
  'b-valence': ['implicitH', 'mcq', 'tf'],
  'b-formules': ['formula', 'mcq', 'tf'],
  'b-topo': ['countC', 'implicitH', 'formula'],
  'b-chaines': ['countC', 'mainChain', 'mcq', 'tf'],
  'alc-racines': ['name', 'structure', 'formula'],
  'alc-alkyles': ['name', 'mcq'],
  'alc-chaine': ['mainChain', 'name'],
  'alc-numerotation': ['numbering', 'complete', 'name', 'judge'],
  'alc-multiplicateurs': ['complete', 'name', 'findError', 'judge'],
  'alc-alpha': ['name', 'findError', 'judge'],
  'alc-ramifies': ['name', 'structure', 'match', 'findError', 'mainChain'],
  ene: ['name', 'structure', 'numbering', 'complete'],
  yne: ['name', 'structure', 'complete'],
  'insat-multiples': ['name', 'complete', 'judge'],
  'insat-ramifies': ['name', 'mainChain', 'structure', 'judge'],
  ez: ['ez'],
  'cyc-alcanes': ['name', 'structure', 'formula'],
  'cyc-substitues': ['name', 'numbering', 'structure', 'judge'],
  'cyc-alcenes': ['name', 'numbering', 'complete'],
  benzene: ['name', 'structure', 'mcq'],
  'f-identifier': ['function', 'mcq'],
  'f-halogeno': ['name', 'structure', 'complete'],
  'f-alcools': ['name', 'structure', 'function', 'complete', 'judge'],
  'f-ethers': ['name', 'function', 'structure'],
  'f-aldehydes': ['name', 'function', 'structure', 'judge'],
  'f-cetones': ['name', 'function', 'structure', 'complete'],
  'f-acides': ['name', 'function', 'structure', 'judge'],
  'f-esters': ['name', 'function', 'structure', 'mcq'],
  'f-amines': ['name', 'function', 'structure'],
  'f-amides': ['name', 'function', 'structure'],
  'f-nitriles': ['name', 'function', 'structure'],
  'f-priorite': ['name', 'function', 'findError', 'judge', 'mcq'],
  'cx-synthese': ['name', 'structure', 'match', 'findError'],
  'cx-usuels': ['mcq'],
  rs: ['rs', 'mcq'],
};

const MOLECULE_KINDS: ExerciseKind[] = ['name', 'structure', 'mainChain', 'numbering', 'function', 'complete', 'judge', 'findError', 'formula', 'countC', 'implicitH', 'match'];

/** Molécules simples utilisables pour les exercices de base (module 0). */
const BASICS_POOL = ['CCC', 'CCCC', 'CC(C)C', 'CCC(C)C', 'CC=CC', 'C=CCC', 'CC#CC', 'CCO', 'CC(C)O', 'CC(C)=O', 'CC=O', 'CC(=O)O', 'C1CCCCC1', 'CC1CCCCC1', 'CCCCCC', 'CC(C)CC(C)C', 'CCN', 'CCCl', 'C=CC=C', 'CCC(C)(C)C', 'CC(C)C=C', 'OCCO'];

export interface PickOptions {
  skills: string[];
  count: number;
  minLevel?: number;
  maxLevel?: number;
  kinds?: ExerciseKind[];
  exclude?: Set<string>;
  rng?: Rng;
}

export function moleculesFor(skill: string, minLevel = 1, maxLevel = 5): string[] {
  if (skill.startsWith('b-')) return BASICS_POOL;
  if (skill === 'ez') return EZ_MOLECULES.map((e) => e.smiles);
  if (skill === 'rs') return RS_MOLECULES.map((e) => e.smiles);
  return MOLECULES.filter((e) => e.skills.includes(skill) && e.level >= minLevel && e.level <= maxLevel).map((e) => e.smiles);
}

export function questionsFor(skill: string, maxLevel = 5): AuthoredQuestion[] {
  return QUESTIONS.filter((q) => q.skills.includes(skill) && q.level <= maxLevel);
}

/** Construit une série d'exercices variés pour un ensemble de notions. */
export function pickExercises(opts: PickOptions): Exercise[] {
  const rng = opts.rng ?? Math.random;
  const out: Exercise[] = [];
  const used = new Set<string>(opts.exclude ?? []);
  let guard = 0;
  while (out.length < opts.count && guard++ < opts.count * 25) {
    const skill = pick(opts.skills, rng);
    let kinds = SKILL_KINDS[skill] ?? ['name'];
    if (opts.kinds) kinds = kinds.filter((k) => opts.kinds!.includes(k));
    if (!kinds.length) continue;
    const kind = pick(kinds, rng);
    let ex: Exercise | null = null;
    if (kind === 'mcq' || kind === 'tf') {
      const qs = questionsFor(skill, opts.maxLevel ?? 5).filter((q) => q.kind === kind && !used.has(`q:${q.id}`));
      if (!qs.length) continue;
      ex = fromQuestion(pick(qs, rng));
    } else if (MOLECULE_KINDS.includes(kind) || kind === 'ez' || kind === 'rs') {
      let pool = moleculesFor(skill, opts.minLevel ?? 1, opts.maxLevel ?? 5);
      if (!pool.length) pool = moleculesFor(skill);
      if (!pool.length) continue;
      if (kind === 'match') {
        const sm = shuffle(pool, rng).slice(0, 4);
        if (sm.length < 3) continue;
        ex = buildExercise({ kind: 'match', smiles: sm }, rng, { skills: [skill] });
      } else {
        const smiles = pick(pool, rng);
        ex = buildExercise({ kind: kind as Exclude<ExerciseKind, 'match' | 'mcq' | 'tf'>, smiles }, rng, {
          skills: skill.startsWith('b-') ? [skill] : undefined,
        });
      }
    }
    if (!ex || used.has(ex.key)) continue;
    if (!ex.skills.includes(skill)) ex.skills = [skill, ...ex.skills];
    used.add(ex.key);
    out.push(ex);
  }
  return out;
}

/** Exercice semblable (même type, notion commune, autre molécule). */
export function similarExercise(ex: Exercise, rng: Rng = Math.random): Exercise | null {
  if (ex.kind === 'mcq' || ex.kind === 'tf') {
    const others = QUESTIONS.filter((q) => q.id !== ex.key.slice(2) && q.skills.some((s) => ex.skills.includes(s)));
    return others.length ? fromQuestion(pick(others, rng)) : null;
  }
  const skill = ex.skills[0];
  const pool = moleculesFor(skill, Math.max(1, ex.level - 1), Math.min(5, ex.level + 1)).filter((s) => s !== ex.smiles);
  for (const smiles of shuffle(pool, rng).slice(0, 8)) {
    const built =
      ex.kind === 'match'
        ? buildExercise({ kind: 'match', smiles: shuffle(pool, rng).slice(0, 4) }, rng)
        : buildExercise({ kind: ex.kind as Exclude<ExerciseKind, 'match' | 'mcq' | 'tf'>, smiles }, rng, {
            skills: skill.startsWith('b-') ? [skill] : undefined,
          });
    if (built) return built;
  }
  return null;
}

export { GROUP_LABEL };
