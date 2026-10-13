// Analyse d'un nom (français) → structure.
//
// Le parseur est volontairement tolérant : il comprend des noms mal formatés
// (tiret manquant, élision incorrecte, ordre alphabétique non respecté,
// ancienne notation « 2-butanol »…) afin que la correction puisse expliquer
// l'erreur précise au lieu de simplement dire « faux ».
import { type Molecule, type Element, bondOrder, valenceProblems } from '../molecule';
import { parseSmiles } from '../smiles';
import { STEMS, stripAccents, type SuffixType } from './assemble';

export type FormatIssue =
  | 'hyphen'
  | 'elision'
  | 'euphony'
  | 'multiplier'
  | 'alpha-order'
  | 'locant-order'
  | 'old-notation'
  | 'spaces'
  | 'repeated-prefix';

export interface AlkylSpec {
  length: number;
  ring?: 'benzene' | 'cyclo';
  prefixes: ParsedPrefix[];
  /** Carbone d'attache (2 pour « propan-2-yl »). */
  attach: number;
  /** Écriture saisie (pour le diagnostic). */
  raw: string;
}

export type SubSpec =
  | { kind: 'halo'; el: Element }
  | { kind: 'hydroxy' }
  | { kind: 'oxo' }
  | { kind: 'amino' }
  | { kind: 'cyano' }
  | { kind: 'alkyl'; spec: AlkylSpec }
  | { kind: 'alkoxy'; spec: AlkylSpec }
  | { kind: 'ylidene'; length: number };

export interface ParsedPrefix {
  locants: (number | 'N')[] | null;
  mult: number;
  sub: SubSpec;
  /** Nom du substituant tel qu'écrit, sans indice ni multiplicateur. */
  raw: string;
}

export interface ParsedName {
  prefixes: ParsedPrefix[];
  parent: {
    kind: 'chain' | 'ring' | 'benzene';
    length: number;
    enes: number[] | null;
    enesCount: number;
    ynes: number[] | null;
    ynesCount: number;
  };
  suffix: { type: SuffixType; locants: number[] | null; count: number } | null;
  esterAlkyl?: AlkylSpec;
  issues: FormatIssue[];
}

export class NameParseError extends Error {
  constructor(
    message: string,
    public kind: 'unknown-word' | 'structure' | 'format' = 'unknown-word',
  ) {
    super(message);
  }
}

/** Normalisation commune : minuscules, apostrophes et tirets unifiés, espaces nettoyés. */
export function normalizeName(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[‐‑‒–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\s*([-,()'])\s*/g, '$1')
    .replace(/'\s+/g, "'")
    .trim();
}

/** Clé de comparaison insensible aux accents. */
export function nameKey(s: string): string {
  return stripAccents(normalizeName(s))
    .replace(/\bd'/g, "d'")
    .replace(/ de (?=[aeiouy])/g, " d'");
}

const PLAIN_STEMS = STEMS.map((s) => stripAccents(s));
// alternance : les racines les plus longues d'abord
const STEM_ALT = PLAIN_STEMS.map((s, i) => ({ s, i }))
  .filter((x) => x.s)
  .sort((a, b) => b.s.length - a.s.length);
const STEM_RE = `(${STEM_ALT.map((x) => x.s).join('|')})`;
const stemLength = (s: string) => PLAIN_STEMS.indexOf(s);

const MULTS: Record<string, number> = { di: 2, tri: 3, tetra: 4, penta: 5, hexa: 6, bis: 2, tris: 3, tetrakis: 4 };
const MULT_RE = '(di|tri|tetra|penta|hexa)?';
const LOC = '\\d+(?:,\\d+)*';

const SUFFIX_MAP: Record<string, SuffixType> = {
  ol: 'ol',
  one: 'one',
  al: 'al',
  amine: 'amine',
  amide: 'amide',
  nitrile: 'nitrile',
  oique: 'oic',
  oate: 'oate',
};

const M = 'di|tri|tetra|penta|hexa';
const PARENT_TAIL_RE = new RegExp(
  `^(?:(?<an>an)` +
    `|(?<ea>a)?(?:-(?<eLoc>${LOC})-)?(?<eMult>${M})?(?<en>en)(?<enE>e)?(?:(?:-(?<yLoc>${LOC})-)?(?<yMult>${M})?(?<yn>yn))?` +
    `|(?<ya>a)?(?:-(?<yLoc2>${LOC})-)?(?<yMult2>${M})?(?<yn2>yn))` +
    `(?<fe>e)?(?:-(?<sLoc>${LOC})-)?(?<sMult>${M})?(?<sfx>ol|one|al|amine|amide|nitrile|oique|oate)?$`,
);
const STEM_START_RE = new RegExp(`^(cyclo)?${STEM_RE}`);

const locList = (s: string | undefined): number[] | null =>
  s ? s.split(',').map((x) => Number(x)) : null;

function parseParent(s: string, issues: FormatIssue[]): Omit<ParsedName, 'prefixes' | 'issues' | 'esterAlkyl'> | null {
  if (s === 'benzene') {
    return { parent: { kind: 'benzene', length: 6, enes: [], enesCount: 0, ynes: [], ynesCount: 0 }, suffix: null };
  }
  if (s === 'phenol') {
    return {
      parent: { kind: 'benzene', length: 6, enes: [], enesCount: 0, ynes: [], ynesCount: 0 },
      suffix: { type: 'ol', locants: [1], count: 1 },
    };
  }
  const sm = STEM_START_RE.exec(s);
  if (!sm) return null;
  // plusieurs racines peuvent commencer la chaîne (« pent » / « pentadéc ») : on les essaie toutes
  const stems = STEM_ALT.filter((x) => s.startsWith((sm[1] ?? '') + x.s));
  for (const stemOpt of stems) {
    const r = parseParentTail(s.slice((sm[1] ?? '').length + stemOpt.s.length), !!sm[1], stemOpt.i, issues);
    if (r) return r;
  }
  return null;
}

function parseParentTail(
  rest: string,
  cyclo: boolean,
  length: number,
  issues: FormatIssue[],
): Omit<ParsedName, 'prefixes' | 'issues' | 'esterAlkyl'> | null {
  const m = PARENT_TAIL_RE.exec(rest);
  if (!m || !m.groups) return null;
  const g = m.groups;
  const en = !!g.en;
  const yn = !!(g.yn || g.yn2);
  const a = !!(g.ea || g.ya);
  const enesCount = en ? (g.eMult ? MULTS[g.eMult] : 1) : 0;
  const ynesCount = yn ? ((g.yMult ?? g.yMult2) ? MULTS[(g.yMult ?? g.yMult2)!] : 1) : 0;
  const enes = en ? locList(g.eLoc) : [];
  const ynes = yn ? locList(g.yLoc ?? g.yLoc2) : [];
  if (enes && enes.length !== enesCount)
    throw new NameParseError('Nombre d’indices incohérent pour les doubles liaisons', 'format');
  if (ynes && ynes.length !== ynesCount)
    throw new NameParseError('Nombre d’indices incohérent pour les triples liaisons', 'format');
  const firstCount = enesCount || ynesCount;
  const localIssues: FormatIssue[] = [];
  if (g.an && a) return null;
  if ((firstCount > 1) !== a) {
    if (a && firstCount <= 1) return null;
    localIssues.push('euphony');
  }
  if (en && yn && g.enE) localIssues.push('elision');
  // « e » final de la partie hydrocarbure (butane, butène, butyne)
  const finalE = en && !yn ? !!(g.enE || g.fe) : !!g.fe;
  if (en && !yn && g.enE && g.fe) return null;
  let suffix: ParsedName['suffix'] = null;
  if (g.sfx) {
    const type = SUFFIX_MAP[g.sfx];
    const count = g.sMult ? MULTS[g.sMult] : 1;
    const locants = locList(g.sLoc);
    if (locants && locants.length !== count)
      throw new NameParseError('Nombre d’indices incohérent pour le suffixe', 'format');
    suffix = { type, locants, count };
    const word = (g.sMult ?? '') + g.sfx;
    const vowel = /^[aeiouy]/.test(word);
    if (vowel === finalE) localIssues.push('elision');
  } else {
    if (!finalE) return null;
    if (g.sLoc) return null;
  }
  issues.push(...localIssues);
  return {
    parent: { kind: cyclo ? 'ring' : 'chain', length, enes, enesCount, ynes, ynesCount },
    suffix,
  };
}

// ---------------------------------------------------------------------------
// Préfixes

const HALO: Record<string, Element> = { fluoro: 'F', chloro: 'Cl', bromo: 'Br', iodo: 'I' };

function usualAlkyl(name: string): AlkylSpec | null {
  const methylAt = (locs: number[]): ParsedPrefix => ({
    locants: locs,
    mult: locs.length,
    sub: { kind: 'alkyl', spec: { length: 1, prefixes: [], attach: 1, raw: 'methyl' } },
    raw: 'methyl',
  });
  switch (name) {
    case 'isopropyl':
      return { length: 2, prefixes: [methylAt([1])], attach: 1, raw: name };
    case 'isobutyl':
      return { length: 3, prefixes: [methylAt([2])], attach: 1, raw: name };
    case 'sec-butyl':
    case 'secbutyl':
      return { length: 3, prefixes: [methylAt([1])], attach: 1, raw: name };
    case 'tert-butyl':
    case 'tertbutyl':
    case 't-butyl':
      return { length: 2, prefixes: [methylAt([1, 1])], attach: 1, raw: name };
    case 'benzyl':
      return {
        length: 1,
        prefixes: [
          {
            locants: [1],
            mult: 1,
            sub: { kind: 'alkyl', spec: { length: 6, ring: 'benzene', prefixes: [], attach: 1, raw: 'phenyl' } },
            raw: 'phenyl',
          },
        ],
        attach: 1,
        raw: name,
      };
    case 'phenyl':
      return { length: 6, ring: 'benzene', prefixes: [], attach: 1, raw: name };
  }
  const cyc = /^cyclo(prop|but|pent|hex|hept|oct)yl$/.exec(name);
  if (cyc) return { length: stemLength(cyc[1]), ring: 'cyclo', prefixes: [], attach: 1, raw: name };
  const simple = new RegExp(`^${STEM_RE}yl$`).exec(name);
  if (simple) return { length: stemLength(simple[1]), prefixes: [], attach: 1, raw: name };
  return null;
}

/** Mots simples reconnus en préfixe (sans parenthèses). */
function simplePrefix(word: string): SubSpec | null {
  if (HALO[word]) return { kind: 'halo', el: HALO[word] };
  if (word === 'hydroxy') return { kind: 'hydroxy' };
  if (word === 'oxo') return { kind: 'oxo' };
  if (word === 'amino') return { kind: 'amino' };
  if (word === 'cyano') return { kind: 'cyano' };
  if (word === 'methylidene') return { kind: 'ylidene', length: 1 };
  if (word === 'ethylidene') return { kind: 'ylidene', length: 2 };
  const alk = usualAlkyl(word);
  if (alk) return { kind: 'alkyl', spec: alk };
  // alkoxy
  if (word === 'phenoxy') return { kind: 'alkoxy', spec: { length: 6, ring: 'benzene', prefixes: [], attach: 1, raw: word } };
  const usualOxy: Record<string, string> = {
    isopropoxy: 'isopropyl',
    'tert-butoxy': 'tert-butyl',
    'sec-butoxy': 'sec-butyl',
    isobutoxy: 'isobutyl',
  };
  if (usualOxy[word]) return { kind: 'alkoxy', spec: { ...usualAlkyl(usualOxy[word])!, raw: word } };
  const ox = new RegExp(`^${STEM_RE}(yl)?oxy$`).exec(word);
  if (ox) return { kind: 'alkoxy', spec: { length: stemLength(ox[1]), prefixes: [], attach: 1, raw: word } };
  return null;
}

// Mots-clés possibles, du plus long au plus court, pour découper « bromochlorométhyl… ».
const PREFIX_WORDS: string[] = (() => {
  const words = new Set<string>([
    'fluoro',
    'chloro',
    'bromo',
    'iodo',
    'hydroxy',
    'oxo',
    'amino',
    'cyano',
    'methylidene',
    'ethylidene',
    'phenyl',
    'phenoxy',
    'benzyl',
    'isopropyl',
    'isobutyl',
    'sec-butyl',
    'tert-butyl',
    'isopropoxy',
    'tert-butoxy',
    'sec-butoxy',
    'isobutoxy',
  ]);
  for (const x of STEM_ALT) {
    words.add(x.s + 'yl');
    words.add(x.s + 'oxy');
    words.add(x.s + 'yloxy');
  }
  for (const r of ['prop', 'but', 'pent', 'hex', 'hept', 'oct']) words.add(`cyclo${r}yl`);
  return [...words].sort((a, b) => b.length - a.length);
})();

interface PState {
  s: string;
  issues: FormatIssue[];
}

/** Analyse d'une section de préfixes entière ; renvoie null si impossible. */
function parsePrefixSection(st: PState, s: string): ParsedPrefix[] | null {
  const out: ParsedPrefix[] = [];
  const rec = (pos: number, first: boolean, issues: FormatIssue[]): FormatIssue[] | null => {
    if (pos === s.length) return issues;
    let p = pos;
    const localIssues = [...issues];
    if (!first && s[p] === '-') p++;
    // indices
    let locants: (number | 'N')[] | null = null;
    const lm = /^((?:\d+|n)(?:,(?:\d+|n))*)(-?)/.exec(s.slice(p));
    if (lm && (lm[2] === '-' || /^\d/.test(lm[1]))) {
      locants = lm[1].split(',').map((x) => (x === 'n' ? 'N' : Number(x)));
      if (!lm[2]) localIssues.push('hyphen');
      p += lm[0].length;
      if (!first && s[pos] !== '-' && /^\d/.test(s.slice(pos))) localIssues.push('hyphen');
    }
    // multiplicateur + nom
    const tries: { mult: number; len: number; sub: SubSpec; raw: string; extra?: FormatIssue }[] = [];
    const rest = s.slice(p);
    const multOptions: [string, number][] = [['', 1], ...Object.entries(MULTS)];
    for (const [mw, mv] of multOptions) {
      if (!rest.startsWith(mw)) continue;
      const after = rest.slice(mw.length);
      if (after.startsWith('(')) {
        const close = matchParen(after);
        if (close > 0) {
          const inner = after.slice(1, close);
          let len = mw.length + close + 1;
          let isOxy = false;
          if (after.slice(close + 1).startsWith('oxy')) {
            isOxy = true;
            len += 3;
          }
          const spec = parseComplexSubstituent(inner, isOxy);
          if (spec) tries.push({ mult: mv, len, sub: spec, raw: '(' + inner + ')' + (isOxy ? 'oxy' : '') });
        }
      } else {
        for (const w of PREFIX_WORDS) {
          if (after.startsWith(w)) {
            const sub = simplePrefix(w);
            if (sub) tries.push({ mult: mv, len: mw.length + w.length, sub, raw: w });
          }
        }
      }
    }
    for (const t of tries) {
      const li = [...localIssues];
      if (locants && locants.length !== t.mult) {
        if (t.mult === 1 && locants.length > 1) li.push('multiplier');
        else continue;
      }
      out.push({ locants, mult: locants ? locants.length : t.mult, sub: t.sub, raw: t.raw });
      const r = rec(p + t.len, false, li);
      if (r) return r;
      out.pop();
    }
    return null;
  };
  const issues = rec(0, true, []);
  if (!issues) return null;
  st.issues.push(...issues);
  return out;
}

function matchParen(s: string): number {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** « 1-méthyléthyl », « propan-2-yl », « 1-méthyléthoxy », « 2-chloroéthyl »… */
function parseComplexSubstituent(inner: string, outerOxy: boolean): SubSpec | null {
  // forme 2013 : propan-2-yl, 2-méthylpropan-2-yl
  const iu = new RegExp(`^(.*?)${STEM_RE}an-(\\d+)-yl$`).exec(inner);
  const tryBuild = (prefixStr: string, stem: string, attach: number, oxy: boolean): SubSpec | null => {
    const st: PState = { s: prefixStr, issues: [] };
    const prefixes = prefixStr ? parsePrefixSection(st, prefixStr) : [];
    if (!prefixes) return null;
    const spec: AlkylSpec = { length: stemLength(stem), prefixes, attach, raw: inner };
    return oxy ? { kind: 'alkoxy', spec } : { kind: 'alkyl', spec };
  };
  if (iu) return tryBuild(iu[1], iu[2], Number(iu[3]), outerOxy);
  if (outerOxy) {
    const simple = simplePrefix(inner);
    if (simple && simple.kind === 'alkyl') return { kind: 'alkoxy', spec: simple.spec };
  }
  const yl = new RegExp(`^(.*?)${STEM_RE}(yl|oxy|yloxy)$`).exec(inner);
  if (yl) {
    // essayer toutes les coupures possibles entre préfixes et racine
    for (let k = 0; k <= inner.length; k++) {
      const m = new RegExp(`^${STEM_RE}(yl|oxy|yloxy)$`).exec(inner.slice(k));
      if (!m) continue;
      const r = tryBuild(inner.slice(0, k), m[1], 1, m[2] !== 'yl' || outerOxy);
      if (r) return r;
    }
  }
  const simple = simplePrefix(inner);
  if (simple) return simple;
  return null;
}

// ---------------------------------------------------------------------------
// Nom complet

export function parseName(input: string): ParsedName {
  let s = stripAccents(normalizeName(input));
  const issues: FormatIssue[] = [];
  let acid = false;
  let esterAlkyl: AlkylSpec | undefined;
  const ac = /^acide\s*/.exec(s);
  if (ac) {
    acid = true;
    s = s.slice(ac[0].length);
  }
  const est = /^(.*oate)\s*(?:de\s+|de(?=[a-z(\d])|d')(.+)$/.exec(s);
  if (est && !acid) {
    s = est[1];
    let alk = est[2].replace(/\s/g, '');
    if (alk.endsWith('yle')) alk = alk.slice(0, -1);
    else throw new NameParseError('La partie alkyle d’un ester se termine par « -yle » (ex. : de méthyle)', 'format');
    let spec: AlkylSpec | null = usualAlkyl(alk);
    if (!spec) {
      const cs = parseComplexSubstituent(alk, false);
      if (cs && cs.kind === 'alkyl') spec = cs.spec;
    }
    if (!spec) throw new NameParseError(`Je ne reconnais pas le groupe « ${est[2]} »`);
    esterAlkyl = spec;
  }
  if (/\s/.test(s)) {
    issues.push('spaces');
    s = s.replace(/\s/g, '');
  }

  let result: ParsedName | null = null;
  let lastError: NameParseError | null = null;
  for (let k = 0; k < s.length && !result; k++) {
    const parentStr = s.slice(k);
    const pIssues: FormatIssue[] = [];
    let parent: ReturnType<typeof parseParent>;
    try {
      parent = parseParent(parentStr, pIssues);
    } catch (e) {
      lastError = e as NameParseError;
      continue;
    }
    if (!parent) continue;
    let prefixStr = s.slice(0, k);
    if (prefixStr.endsWith('-') && /[a-z)]-$/.test(prefixStr)) {
      prefixStr = prefixStr.slice(0, -1);
      pIssues.push('hyphen');
    }
    const st: PState = { s: prefixStr, issues: [] };
    const prefixes = prefixStr ? parsePrefixSection(st, prefixStr) : [];
    if (!prefixes) {
      // ancienne notation : « 2-butanol », « 1-butène »
      const old = /^(\d+(?:,\d+)*)-$/.exec(prefixStr);
      if (old) {
        const locs = old[1].split(',').map(Number);
        if (parent.suffix && !parent.suffix.locants && parent.suffix.count === locs.length) {
          parent.suffix.locants = locs;
        } else if (!parent.suffix && parent.parent.enes === null && parent.parent.enesCount === locs.length) {
          parent.parent.enes = locs;
        } else if (!parent.suffix && parent.parent.ynes === null && parent.parent.ynesCount === locs.length) {
          parent.parent.ynes = locs;
        } else continue;
        result = { prefixes: [], ...parent, esterAlkyl, issues: [...issues, ...pIssues, 'old-notation'] };
      }
      continue;
    }
    result = { prefixes, ...parent, esterAlkyl, issues: [...issues, ...pIssues, ...st.issues] };
  }
  if (!result) {
    throw lastError ?? new NameParseError('Je ne reconnais pas ce nom (vérifie l’orthographe et la forme du nom).');
  }
  if (acid !== (result.suffix?.type === 'oic')) {
    if (acid) throw new NameParseError('Un acide carboxylique se termine par « -oïque » (acide …oïque).', 'format');
    throw new NameParseError('Le nom d’un acide carboxylique commence par « acide » (ex. : acide éthanoïque).', 'format');
  }
  if (result.suffix?.type === 'oate' && !esterAlkyl)
    throw new NameParseError('Un ester se nomme « …oate de …yle » (ex. : éthanoate de méthyle).', 'format');
  // ordre alphabétique et répétitions
  const keys = result.prefixes.map((p) => prefixKey(p));
  for (let i = 1; i < keys.length; i++) if (keys[i] < keys[i - 1]) result.issues.push('alpha-order');
  if (new Set(result.prefixes.map((p) => p.raw)).size !== result.prefixes.length) result.issues.push('repeated-prefix');
  for (const p of result.prefixes) {
    const nums = (p.locants ?? []).filter((l): l is number => l !== 'N');
    for (let i = 1; i < nums.length; i++) if (nums[i] < nums[i - 1]) result.issues.push('locant-order');
  }
  result.issues = [...new Set(result.issues)];
  return result;
}

function prefixKey(p: ParsedPrefix): string {
  if (p.raw.startsWith('(')) return p.raw.replace(/[^a-z]/g, '');
  return p.raw.replace(/^(tert|sec)-/, '').replace(/[^a-z]/g, '');
}

// ---------------------------------------------------------------------------
// Construction de la molécule

export interface BuildOptions {
  /** Indices à utiliser pour les groupes dont l'indice a été omis. */
  fill?: Map<string, number[]>;
}

/** Groupes dont les indices manquent (clé → nombre d'indices et valeurs possibles). */
export function missingLocantGroups(p: ParsedName): { key: string; count: number; options: number[]; repeat: boolean }[] {
  const L = p.parent.length;
  const all = Array.from({ length: L }, (_, i) => i + 1);
  const out: { key: string; count: number; options: number[]; repeat: boolean }[] = [];
  const bondPositions = p.parent.kind === 'ring' ? all : all.slice(0, -1);
  if (L === 1) return out;
  if (p.parent.enes === null) out.push({ key: 'ene', count: p.parent.enesCount, options: bondPositions, repeat: false });
  if (p.parent.ynes === null) out.push({ key: 'yne', count: p.parent.ynesCount, options: bondPositions, repeat: false });
  if (p.suffix && p.suffix.locants === null && !isTerminalDefault(p)) {
    out.push({ key: 'suffix', count: p.suffix.count, options: all, repeat: false });
  }
  p.prefixes.forEach((pr, i) => {
    if (pr.locants === null) out.push({ key: `p${i}`, count: pr.mult, options: all, repeat: true });
  });
  return out;
}

function isTerminalDefault(p: ParsedName): boolean {
  return !!p.suffix && ['al', 'oic', 'nitrile', 'amide', 'oate'].includes(p.suffix.type) && p.suffix.count <= 2;
}

export function buildMolecule(p: ParsedName, opts: BuildOptions = {}): Molecule {
  const mol: Molecule = { atoms: [], bonds: [] };
  const add = (el: Element) => {
    mol.atoms.push({ el });
    return mol.atoms.length - 1;
  };
  const bond = (a: number, b: number, order: 1 | 2 | 3 = 1) => {
    const ex = mol.bonds.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
    if (ex) throw new NameParseError('Deux groupes placés au même endroit de façon impossible', 'structure');
    mol.bonds.push({ a, b, order });
  };
  const L = p.parent.length;
  const fill = opts.fill ?? new Map();
  if (L < 1) throw new NameParseError('Racine inconnue');

  // squelette
  const chain: number[] = [];
  if (p.parent.kind === 'benzene') {
    for (let i = 0; i < 6; i++) chain.push(add('C'));
    for (let i = 0; i < 6; i++) bond(chain[i], chain[(i + 1) % 6], i % 2 === 0 ? 2 : 1);
  } else {
    for (let i = 0; i < L; i++) chain.push(add('C'));
    for (let i = 0; i < L - 1; i++) bond(chain[i], chain[i + 1]);
    if (p.parent.kind === 'ring') {
      if (L < 3) throw new NameParseError('Un cycle compte au moins 3 carbones', 'structure');
      bond(chain[L - 1], chain[0]);
    }
  }
  const atLocant = (loc: number, what: string) => {
    if (!Number.isInteger(loc) || loc < 1 || loc > L)
      throw new NameParseError(`L’indice ${loc} (${what}) n’existe pas : la chaîne principale n’a que ${L} carbone${L > 1 ? 's' : ''}.`, 'structure');
    return chain[loc - 1];
  };
  const setOrder = (loc: number, order: 2 | 3, what: string) => {
    const a = atLocant(loc, what);
    const nextLoc = loc === L && p.parent.kind === 'ring' ? 1 : loc + 1;
    if (nextLoc > L) throw new NameParseError(`Une ${what} en position ${loc} sortirait de la chaîne.`, 'structure');
    const b = chain[nextLoc - 1];
    const bd = mol.bonds.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a))!;
    if (bd.order !== 1) throw new NameParseError('Deux liaisons multiples au même endroit', 'structure');
    bd.order = order;
  };
  if (p.parent.kind !== 'benzene') {
    const enes = p.parent.enes ?? fill.get('ene') ?? (L === 2 ? [1] : null);
    const ynes = p.parent.ynes ?? fill.get('yne') ?? (L === 2 ? [1] : null);
    if (enes === null || ynes === null) throw new NameParseError('Indice manquant', 'format');
    enes.forEach((l) => setOrder(l, 2, 'double liaison'));
    ynes.forEach((l) => setOrder(l, 3, 'triple liaison'));
  }

  // suffixe
  let suffixN: number | null = null;
  if (p.suffix) {
    let locs = p.suffix.locants ?? fill.get('suffix') ?? null;
    if (!locs) {
      if (L === 1) locs = [1];
      else if (isTerminalDefault(p)) locs = p.suffix.count === 1 ? [1] : [1, L];
      else throw new NameParseError('Indice manquant', 'format');
    }
    for (const loc of locs) {
      const c = atLocant(loc, 'groupe principal');
      const terminal = loc === 1 || loc === L;
      switch (p.suffix.type) {
        case 'ol':
          bond(c, add('O'));
          break;
        case 'one':
          bond(c, add('O'), 2);
          break;
        case 'amine': {
          const N = add('N');
          bond(c, N);
          suffixN = N;
          break;
        }
        case 'al':
        case 'oic':
        case 'nitrile':
        case 'amide':
        case 'oate': {
          if (!terminal || p.parent.kind !== 'chain')
            throw new NameParseError(
              'Ce groupe (aldéhyde, acide, ester, amide, nitrile) est toujours en bout de chaîne : son carbone porte le n°1.',
              'structure',
            );
          if (p.suffix.type === 'nitrile') bond(c, add('N'), 3);
          else {
            bond(c, add('O'), 2);
            if (p.suffix.type === 'oic') bond(c, add('O'));
            if (p.suffix.type === 'amide') {
              const N = add('N');
              bond(c, N);
              suffixN = N;
            }
            if (p.suffix.type === 'oate') {
              const O = add('O');
              bond(c, O);
              if (!p.esterAlkyl) throw new NameParseError('Partie alkyle de l’ester manquante', 'format');
              attachAlkyl(mol, O, p.esterAlkyl);
            }
          }
          break;
        }
      }
    }
  }

  // préfixes
  p.prefixes.forEach((pr, i) => {
    const locs = pr.locants ?? fill.get(`p${i}`) ?? (L === 1 ? Array(pr.mult).fill(1) : null);
    if (!locs) throw new NameParseError('Indice manquant', 'format');
    for (const l of locs) {
      let target: number;
      if (l === 'N') {
        if (suffixN === null)
          throw new NameParseError('L’indice N ne s’utilise que pour les amines et les amides.', 'structure');
        target = suffixN;
      } else target = atLocant(l, pr.raw);
      attachSub(mol, target, pr.sub);
    }
  });

  const pb = valenceProblems(mol);
  if (pb.length) {
    const atom = pb[0].atom;
    const loc = chain.indexOf(atom);
    throw new NameParseError(
      loc >= 0
        ? `Structure impossible : le carbone n°${loc + 1} aurait plus de 4 liaisons.`
        : `Structure impossible : ${pb[0].message}.`,
      'structure',
    );
  }
  return mol;
}

function addAtomTo(mol: Molecule, el: Element): number {
  mol.atoms.push({ el });
  return mol.atoms.length - 1;
}

function addBondTo(mol: Molecule, a: number, b: number, order: 1 | 2 | 3 = 1) {
  mol.bonds.push({ a, b, order });
}

function attachSub(mol: Molecule, target: number, sub: SubSpec) {
  switch (sub.kind) {
    case 'halo':
      addBondTo(mol, target, addAtomTo(mol, sub.el));
      return;
    case 'hydroxy':
      addBondTo(mol, target, addAtomTo(mol, 'O'));
      return;
    case 'oxo':
      addBondTo(mol, target, addAtomTo(mol, 'O'), 2);
      return;
    case 'amino':
      addBondTo(mol, target, addAtomTo(mol, 'N'));
      return;
    case 'cyano': {
      const c = addAtomTo(mol, 'C');
      addBondTo(mol, target, c);
      addBondTo(mol, c, addAtomTo(mol, 'N'), 3);
      return;
    }
    case 'alkyl':
      attachAlkyl(mol, target, sub.spec);
      return;
    case 'ylidene': {
      const c = addAtomTo(mol, 'C');
      addBondTo(mol, target, c, 2);
      if (sub.length === 2) addBondTo(mol, c, addAtomTo(mol, 'C'));
      return;
    }
    case 'alkoxy': {
      const o = addAtomTo(mol, 'O');
      addBondTo(mol, target, o);
      attachAlkyl(mol, o, sub.spec);
      return;
    }
  }
}

function attachAlkyl(mol: Molecule, target: number, spec: AlkylSpec) {
  const L = spec.length;
  const atoms: number[] = [];
  for (let i = 0; i < L; i++) atoms.push(addAtomTo(mol, 'C'));
  if (spec.ring === 'benzene') {
    for (let i = 0; i < 6; i++) addBondTo(mol, atoms[i], atoms[(i + 1) % 6], i % 2 === 0 ? 2 : 1);
  } else {
    for (let i = 0; i < L - 1; i++) addBondTo(mol, atoms[i], atoms[i + 1]);
    if (spec.ring === 'cyclo') addBondTo(mol, atoms[L - 1], atoms[0]);
  }
  if (spec.attach < 1 || spec.attach > L) throw new NameParseError('Point d’attache impossible', 'structure');
  addBondTo(mol, target, atoms[spec.attach - 1]);
  for (const pr of spec.prefixes) {
    const locs = pr.locants ?? (L === 1 ? Array(pr.mult).fill(1) : null);
    if (!locs) throw new NameParseError('Indice manquant dans un substituant', 'format');
    for (const l of locs) {
      if (l === 'N' || l < 1 || l > L) throw new NameParseError('Indice impossible dans un substituant', 'structure');
      attachSub(mol, atoms[l - 1], pr.sub);
    }
  }
}

// ---------------------------------------------------------------------------
// Noms usuels

export const USUAL_NAMES: Record<string, { smiles: string; label: string }> = {
  acetone: { smiles: 'CC(C)=O', label: 'acétone' },
  'acide acetique': { smiles: 'CC(=O)O', label: 'acide acétique' },
  'acide formique': { smiles: 'OC=O', label: 'acide formique' },
  'acide propionique': { smiles: 'CCC(=O)O', label: 'acide propionique' },
  'acide butyrique': { smiles: 'CCCC(=O)O', label: 'acide butyrique' },
  'acide lactique': { smiles: 'CC(O)C(=O)O', label: 'acide lactique' },
  'acide oxalique': { smiles: 'OC(=O)C(=O)O', label: 'acide oxalique' },
  'acide succinique': { smiles: 'OC(=O)CCC(=O)O', label: 'acide succinique' },
  formaldehyde: { smiles: 'C=O', label: 'formaldéhyde' },
  acetaldehyde: { smiles: 'CC=O', label: 'acétaldéhyde' },
  toluene: { smiles: 'CC1=CC=CC=C1', label: 'toluène' },
  ethylene: { smiles: 'C=C', label: 'éthylène' },
  propylene: { smiles: 'CC=C', label: 'propylène' },
  acetylene: { smiles: 'C#C', label: 'acétylène' },
  chloroforme: { smiles: 'ClC(Cl)Cl', label: 'chloroforme' },
  ether: { smiles: 'CCOCC', label: 'éther (diéthylique)' },
  'ether diethylique': { smiles: 'CCOCC', label: 'éther diéthylique' },
  'diethylether': { smiles: 'CCOCC', label: 'diéthyléther' },
  glycerol: { smiles: 'OCC(O)CO', label: 'glycérol' },
  glycol: { smiles: 'OCCO', label: 'glycol' },
  "acetate d'ethyle": { smiles: 'CCOC(C)=O', label: 'acétate d’éthyle' },
  'acetate de methyle': { smiles: 'COC(C)=O', label: 'acétate de méthyle' },
  acetonitrile: { smiles: 'CC#N', label: 'acétonitrile' },
  acetamide: { smiles: 'CC(N)=O', label: 'acétamide' },
  isobutane: { smiles: 'CC(C)C', label: 'isobutane' },
  isopentane: { smiles: 'CC(C)CC', label: 'isopentane' },
  neopentane: { smiles: 'CC(C)(C)C', label: 'néopentane' },
  'alcool ethylique': { smiles: 'CCO', label: 'alcool éthylique' },
  'alcool methylique': { smiles: 'CO', label: 'alcool méthylique' },
  'alcool isopropylique': { smiles: 'CC(C)O', label: 'alcool isopropylique' },
  isoprene: { smiles: 'C=CC(C)=C', label: 'isoprène' },
  glycine: { smiles: 'NCC(=O)O', label: 'glycine' },
  alanine: { smiles: 'CC(N)C(=O)O', label: 'alanine' },
  'ortho-xylene': { smiles: 'CC1=CC=CC=C1C', label: 'ortho-xylène' },
  'meta-xylene': { smiles: 'CC1=CC(C)=CC=C1', label: 'méta-xylène' },
  'para-xylene': { smiles: 'CC1=CC=C(C)C=C1', label: 'para-xylène' },
  'o-xylene': { smiles: 'CC1=CC=CC=C1C', label: 'o-xylène' },
  'm-xylene': { smiles: 'CC1=CC(C)=CC=C1', label: 'm-xylène' },
  'p-xylene': { smiles: 'CC1=CC=C(C)C=C1', label: 'p-xylène' },
};

export function usualNameMolecule(input: string): { mol: Molecule; label: string } | null {
  const k = stripAccents(normalizeName(input));
  const e = USUAL_NAMES[k];
  return e ? { mol: parseSmiles(e.smiles), label: e.label } : null;
}

/** Vérifie qu'une liaison donnée existe (utilitaire de test). */
export function hasBond(mol: Molecule, a: number, b: number): boolean {
  return bondOrder(mol, a, b) > 0;
}
