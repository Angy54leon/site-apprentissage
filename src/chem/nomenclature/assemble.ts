// Assemblage d'un nom à partir de ses composants (préfixes, racine, insaturations,
// suffixe). Utilisé à la fois par le moteur de nomenclature (structure → nom) et
// par l'analyse des réponses (pour reformater correctement un nom saisi).

export const STEMS = [
  '',
  'méth',
  'éth',
  'prop',
  'but',
  'pent',
  'hex',
  'hept',
  'oct',
  'non',
  'déc',
  'undéc',
  'dodéc',
  'tridéc',
  'tétradéc',
  'pentadéc',
  'hexadéc',
  'heptadéc',
  'octadéc',
  'nonadéc',
  'icos',
];

export const MULT = ['', '', 'di', 'tri', 'tétra', 'penta', 'hexa', 'hepta', 'octa', 'nona', 'déca'];
export const MULT_COMPLEX = ['', '', 'bis', 'tris', 'tétrakis', 'pentakis', 'hexakis'];

export type SuffixType = 'oic' | 'oate' | 'amide' | 'nitrile' | 'al' | 'one' | 'ol' | 'amine';

export const SUFFIX_WORD: Record<SuffixType, string> = {
  oic: 'oïque',
  oate: 'oate',
  amide: 'amide',
  nitrile: 'nitrile',
  al: 'al',
  one: 'one',
  ol: 'ol',
  amine: 'amine',
};

/** Suffixes portés par un carbone de bout de chaîne (indice 1 sous-entendu). */
export const TERMINAL_SUFFIXES: SuffixType[] = ['oic', 'oate', 'amide', 'nitrile', 'al'];

export type Locant = number | 'N';

export interface PrefixGroup {
  /** Nom du substituant sans indice ni multiplicateur : « méthyl », « (1-méthyléthyl) ». */
  name: string;
  locants: Locant[];
  /** Substituant complexe (entre parenthèses, multiplicateurs bis/tris). */
  complex: boolean;
  /** Clé de tri alphabétique. */
  sortKey: string;
  showLocants: boolean;
}

export interface ParentSpec {
  kind: 'chain' | 'ring' | 'benzene';
  length: number;
  enes: number[];
  ynes: number[];
  showUnsatLocants: boolean;
}

export interface SuffixSpec {
  type: SuffixType;
  locants: number[];
  showLocants: boolean;
}

export interface NameParts {
  prefixes: PrefixGroup[];
  parent: ParentSpec;
  suffix: SuffixSpec | null;
  /** Partie « alkyle » d'un ester : « méthyle », « 1-méthyléthyle »… */
  esterAlkyl?: string;
}

export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Clé de tri alphabétique d'un substituant (règles IUPAC). */
export function prefixSortKey(name: string, complex: boolean): string {
  let s = stripAccents(name.toLowerCase());
  if (complex) {
    // Pour un substituant complexe, on prend le nom complet (y compris di, tri…).
    return s.replace(/[^a-z]/g, '');
  }
  s = s.replace(/^(tert|sec)-/, '');
  return s.replace(/[^a-z]/g, '');
}

export function compareLocants(a: Locant, b: Locant): number {
  if (a === b) return 0;
  if (a === 'N') return -1;
  if (b === 'N') return 1;
  return a - b;
}

export function formatLocantList(locs: Locant[]): string {
  return [...locs].sort(compareLocants).join(',');
}

const VOWEL_START = /^[aeiouyàâéèêëîïôöûüh]/i;

/** Élision du « e » final devant une voyelle : propane → propan, butène → butén. */
export function elide(base: string): string {
  if (base.endsWith('ène')) return base.slice(0, -3) + 'én';
  if (base.endsWith('yne')) return base.slice(0, -3) + 'yn';
  if (base.endsWith('ane')) return base.slice(0, -1);
  if (base.endsWith('e')) return base.slice(0, -1);
  return base;
}

export function sortPrefixGroups(groups: PrefixGroup[]): PrefixGroup[] {
  return [...groups].sort((x, y) => {
    if (x.sortKey !== y.sortKey) return x.sortKey < y.sortKey ? -1 : 1;
    // même nom : celui qui a le plus petit indice d'abord
    const lx = x.locants.slice().sort(compareLocants);
    const ly = y.locants.slice().sort(compareLocants);
    return compareLocants(lx[0] ?? 0, ly[0] ?? 0);
  });
}

export function prefixGroupText(g: PrefixGroup): string {
  const n = g.locants.length;
  const mult = n > 1 ? (g.complex ? MULT_COMPLEX[n] : MULT[n]) : '';
  const locs = g.showLocants && n ? formatLocantList(g.locants) + '-' : '';
  return locs + mult + g.name;
}

export function prefixString(groups: PrefixGroup[]): string {
  const sorted = sortPrefixGroups(groups);
  let out = '';
  sorted.forEach((g, i) => {
    const t = prefixGroupText(g);
    if (i > 0) {
      // Un tiret sépare un indice du terme précédent : « 2-chloro-3-méthyl ».
      out += /^[\dN]/.test(t) ? '-' : '';
    }
    out += t;
  });
  return out;
}

function locantText(locs: number[], show: boolean): string {
  return show && locs.length ? `-${[...locs].sort((a, b) => a - b).join(',')}-` : '';
}

/** Nom de l'hydrocarbure parent : « butane », « but-2-ène », « buta-1,3-diène »… */
export function hydrocarbonBase(p: ParentSpec): string {
  if (p.kind === 'benzene') return 'benzène';
  const stem = (p.kind === 'ring' ? 'cyclo' : '') + STEMS[p.length];
  const e = p.enes;
  const y = p.ynes;
  if (!e.length && !y.length) return stem + 'ane';
  let s = stem;
  const firstCount = e.length || y.length;
  if (firstCount > 1) s += 'a';
  if (e.length) {
    s += locantText(e, p.showUnsatLocants) + (e.length > 1 ? MULT[e.length] : '') + 'ène';
    if (y.length) s = elide(s);
  }
  if (y.length) {
    s += locantText(y, p.showUnsatLocants) + (y.length > 1 ? MULT[y.length] : '') + 'yne';
  }
  return s;
}

export function parentWithSuffix(p: ParentSpec, sfx: SuffixSpec | null): string {
  const base = hydrocarbonBase(p);
  if (!sfx) return base;
  const n = sfx.locants.length;
  if (p.kind === 'benzene' && sfx.type === 'ol' && n === 1) return 'phénol';
  const word = (n > 1 ? MULT[n] : '') + SUFFIX_WORD[sfx.type];
  const b = VOWEL_START.test(word) ? elide(base) : base;
  return b + locantText(sfx.locants, sfx.showLocants) + word;
}

export function assembleName(parts: NameParts): string {
  // Phénol substitué : les indices des préfixes restent, le OH est en position 1.
  const core = prefixString(parts.prefixes) + parentWithSuffix(parts.parent, parts.suffix);
  if (parts.suffix?.type === 'oic') return 'acide ' + core;
  if (parts.suffix?.type === 'oate' && parts.esterAlkyl) {
    const alkyl = parts.esterAlkyl;
    return core + (VOWEL_START.test(alkyl) ? ' d’' : ' de ') + alkyl;
  }
  return core;
}
