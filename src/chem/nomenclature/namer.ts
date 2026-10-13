// Moteur de nomenclature : structure (graphe) → nom systématique en français.
//
// Périmètre (volontairement limité, mais vérifié par des tests) :
//  - chaînes acycliques et cycles carbonés isolés (cycloalcanes, cycloalcènes, benzène) ;
//  - alcanes, alcènes, alcynes (y compris plusieurs insaturations) ;
//  - substituants alkyles simples ou ramifiés, halogènes, hydroxy, oxo, amino,
//    alkoxy, cyano, cycloalkyles, phényle ;
//  - fonctions : acide carboxylique, ester, amide, nitrile, aldéhyde, cétone, alcool, amine.
//
// Règles de choix de la chaîne principale : celles enseignées en cours (IUPAC 1979/1993,
// règle C-13.11) — la chaîne principale contient d'abord le maximum de groupes principaux,
// puis le maximum de liaisons multiples, puis est la plus longue. Les recommandations
// IUPAC 2013 font passer la longueur avant les insaturations : la différence est signalée
// dans les cours et les rares molécules concernées sont évitées dans les exercices.
import {
  type Molecule,
  type Element,
  adjacency,
  bondOrder,
  findRings,
  hydrogenCount,
  isConnected,
  valenceProblems,
  HALOGENS,
} from '../molecule';
import {
  type Locant,
  type NameParts,
  type PrefixGroup,
  type SuffixType,
  STEMS,
  TERMINAL_SUFFIXES,
  assembleName,
  compareLocants,
  prefixSortKey,
  prefixString,
  sortPrefixGroups,
} from './assemble';

export class NamingUnsupported extends Error {}

export type GroupClass =
  | 'acid'
  | 'ester'
  | 'amide'
  | 'nitrile'
  | 'aldehyde'
  | 'ketone'
  | 'alcohol'
  | 'amine';

/** Ordre de priorité des fonctions (de la plus prioritaire à la moins prioritaire). */
export const PRIORITY: GroupClass[] = [
  'acid',
  'ester',
  'amide',
  'nitrile',
  'aldehyde',
  'ketone',
  'alcohol',
  'amine',
];

export const SUFFIX_OF: Record<GroupClass, SuffixType> = {
  acid: 'oic',
  ester: 'oate',
  amide: 'amide',
  nitrile: 'nitrile',
  aldehyde: 'al',
  ketone: 'one',
  alcohol: 'ol',
  amine: 'amine',
};

export const GROUP_LABEL: Record<GroupClass | 'halogen' | 'ether', string> = {
  acid: 'acide carboxylique',
  ester: 'ester',
  amide: 'amide',
  nitrile: 'nitrile',
  aldehyde: 'aldéhyde',
  ketone: 'cétone',
  alcohol: 'alcool',
  amine: 'amine',
  halogen: 'dérivé halogéné',
  ether: 'éther-oxyde',
};

export const SUFFIX_LABEL: Record<GroupClass, string> = {
  acid: '« acide …oïque »',
  ester: '« …oate de …yle »',
  amide: '« -amide »',
  nitrile: '« -nitrile »',
  aldehyde: '« -al »',
  ketone: '« -one »',
  alcohol: '« -ol »',
  amine: '« -amine »',
};

export const PREFIX_LABEL: Partial<Record<GroupClass, string>> = {
  ketone: '« oxo- »',
  aldehyde: '« oxo- »',
  alcohol: '« hydroxy- »',
  amine: '« amino- »',
  nitrile: '« cyano- »',
};

const HALO_NAME: Partial<Record<Element, string>> = {
  F: 'fluoro',
  Cl: 'chloro',
  Br: 'bromo',
  I: 'iodo',
};

export interface FunctionalGroup {
  cls: GroupClass | 'halogen' | 'ether';
  /** Carbone portant (ou constituant) le groupe. */
  carbon: number;
  /** Hétéroatomes appartenant au groupe. */
  atoms: number[];
}

interface Ctx {
  mol: Molecule;
  adj: number[][];
  rings: number[][];
  ringOf: number[];
  benzene: boolean[];
  groups: FunctionalGroup[];
  principal: GroupClass | null;
  principalGroups: FunctionalGroup[];
  excluded: Set<number>;
  memo: Map<string, AlkylDesc>;
}

/** Description d'un substituant carboné (chaîne ou cycle). */
interface AlkylDesc {
  ring?: { name: string };
  length: number;
  prefixes: PrefixGroup[];
  chain: number[];
}

export interface SubstOcc {
  name: string;
  complex: boolean;
  sortKey: string;
  locant: Locant;
  atoms: number[];
  /** Autres écritures acceptées (isopropyl, propan-2-yl…). */
  alts: { name: string; complex: boolean; sortKey: string }[];
  kind: 'alkyl' | 'halo' | 'hetero' | 'ring' | 'N';
}

export interface Candidate {
  atoms: number[];
  isRing: boolean;
  aromatic: boolean;
  nPrincipal: number;
  principalLocs: number[];
  enes: number[];
  ynes: number[];
  prefixes: SubstOcc[];
  nPrefixes: number;
  prefixLocs: number[];
  alphaLocs: number[];
  esterAlkyl?: { name: string; alts: string[]; atoms: number[] };
  unsupported?: string;
}

export interface NamingStep {
  title: string;
  text: string;
}

export interface NamingResult {
  name: string;
  /** Écritures également correctes (indices explicites, noms de substituants usuels…). */
  variants: string[];
  parts: NameParts;
  principal: GroupClass | null;
  groups: FunctionalGroup[];
  /** Atomes de la chaîne (ou du cycle) principale, dans l'ordre de numérotation. */
  parentAtoms: number[];
  isRing: boolean;
  aromatic: boolean;
  locantOf: Map<number, number>;
  substituents: SubstOcc[];
  esterAlkylAtoms: number[];
  steps: NamingStep[];
  /** Toutes les numérotations optimales (symétrie). */
  equivalentNumberings: number[][];
  /** Ensemble des chaînes principales acceptables (ensembles d'atomes). */
  validMainChains: number[][];
  candidates: Candidate[];
  notes: string[];
}

// ---------------------------------------------------------------------------
// Analyse des groupes fonctionnels

function buildContext(mol: Molecule): Ctx {
  if (!mol.atoms.length) throw new NamingUnsupported('Molécule vide');
  if (!isConnected(mol)) throw new NamingUnsupported('Plusieurs molécules séparées');
  const pb = valenceProblems(mol);
  if (pb.length) throw new NamingUnsupported(`Structure impossible : ${pb[0].message}`);
  if (!mol.atoms.some((a) => a.el === 'C')) throw new NamingUnsupported('Aucun atome de carbone');
  if (mol.atoms.some((a) => a.el === 'S'))
    throw new NamingUnsupported('Les composés soufrés ne sont pas pris en charge par le moteur');

  const adj = adjacency(mol);
  const n = mol.atoms.length;
  const el = (i: number) => mol.atoms[i].el;

  const rings = findRings(mol);
  const ringOf = new Array<number>(n).fill(-1);
  rings.forEach((r, ri) => {
    for (const a of r) {
      if (ringOf[a] !== -1)
        throw new NamingUnsupported('Cycles accolés ou pontés : hors du périmètre du moteur');
      ringOf[a] = ri;
    }
    if (r.some((a) => el(a) !== 'C'))
      throw new NamingUnsupported('Hétérocycles : hors du périmètre du moteur');
  });
  const benzene = rings.map((r) => {
    if (r.length !== 6) return false;
    const orders = r.map((a, i) => bondOrder(mol, a, r[(i + 1) % 6]));
    return orders.join('') === '212121' || orders.join('') === '121212';
  });
  rings.forEach((r, ri) => {
    if (!benzene[ri] && r.some((a, i) => bondOrder(mol, a, r[(i + 1) % r.length]) === 3))
      throw new NamingUnsupported('Triple liaison dans un cycle : hors périmètre');
  });

  const groups: FunctionalGroup[] = [];
  const isCarbonyl = (c: number) =>
    el(c) === 'C' && adj[c].some((o) => el(o) === 'O' && bondOrder(mol, c, o) === 2);

  for (let c = 0; c < n; c++) {
    if (el(c) !== 'C') continue;
    const nb = adj[c];
    const dblO = nb.find((o) => el(o) === 'O' && bondOrder(mol, c, o) === 2);
    const tripleN = nb.find((x) => el(x) === 'N' && bondOrder(mol, c, x) === 3);
    if (nb.some((x) => el(x) === 'N' && bondOrder(mol, c, x) === 2))
      throw new NamingUnsupported('Imines : hors du périmètre du moteur');
    if (tripleN !== undefined) {
      groups.push({ cls: 'nitrile', carbon: c, atoms: [tripleN] });
      continue;
    }
    if (dblO === undefined) continue;
    if (ringOf[c] !== -1 && nb.some((x) => el(x) !== 'C' && x !== dblO))
      throw new NamingUnsupported('Lactones / lactames : hors périmètre');
    if (nb.some((x) => HALOGENS.includes(el(x))))
      throw new NamingUnsupported('Halogénures d’acyle : hors du périmètre du moteur');
    const sglO = nb.filter((o) => el(o) === 'O' && bondOrder(mol, c, o) === 1);
    const sglN = nb.filter((x) => el(x) === 'N' && bondOrder(mol, c, x) === 1);
    const oh = sglO.find((o) => adj[o].length === 1);
    const or = sglO.find((o) => adj[o].length === 2);
    if (oh !== undefined) groups.push({ cls: 'acid', carbon: c, atoms: [dblO, oh] });
    else if (or !== undefined) {
      const other = adj[or].find((x) => x !== c)!;
      if (el(other) !== 'C' || isCarbonyl(other))
        throw new NamingUnsupported('Anhydrides / peroxydes : hors du périmètre du moteur');
      groups.push({ cls: 'ester', carbon: c, atoms: [dblO, or] });
    } else if (sglN.length) {
      const N = sglN[0];
      if (adj[N].some((x) => x !== c && isCarbonyl(x)))
        throw new NamingUnsupported('Imides : hors du périmètre du moteur');
      groups.push({ cls: 'amide', carbon: c, atoms: [dblO, N] });
    } else {
      const nC = nb.filter((x) => el(x) === 'C').length;
      groups.push({ cls: nC >= 2 ? 'ketone' : 'aldehyde', carbon: c, atoms: [dblO] });
    }
  }

  const amideN = new Set(groups.filter((g) => g.cls === 'amide').map((g) => g.atoms[1]));
  const esterO = new Set(groups.filter((g) => g.cls === 'ester').map((g) => g.atoms[1]));
  const acidO = new Set(groups.filter((g) => g.cls === 'acid').map((g) => g.atoms[1]));

  for (let x = 0; x < n; x++) {
    const e = el(x);
    if (e === 'O') {
      if (adj[x].some((y) => el(y) === 'O' || el(y) === 'N'))
        throw new NamingUnsupported('Liaison O–O ou O–N : hors périmètre');
      if (esterO.has(x) || acidO.has(x)) continue;
      if (adj[x].length === 1 && bondOrder(mol, x, adj[x][0]) === 1) {
        const c = adj[x][0];
        const cHasDouble = adj[c].some((y) => el(y) === 'C' && bondOrder(mol, c, y) === 2);
        if (cHasDouble && ringOf[c] === -1)
          throw new NamingUnsupported('Énols : hors du périmètre du moteur');
        if (cHasDouble && ringOf[c] !== -1 && !benzene[ringOf[c]])
          throw new NamingUnsupported('Énols : hors du périmètre du moteur');
        groups.push({ cls: 'alcohol', carbon: c, atoms: [x] });
      } else if (adj[x].length === 2) {
        if (ringOf[x] !== -1) throw new NamingUnsupported('Hétérocycles : hors périmètre');
        const [a, b] = adj[x];
        if (isCarbonyl(a) || isCarbonyl(b)) continue;
        groups.push({ cls: 'ether', carbon: a, atoms: [x] });
      }
    } else if (e === 'N') {
      if (amideN.has(x)) continue;
      if (adj[x].some((y) => bondOrder(mol, x, y) > 1)) continue; // nitrile
      if (adj[x].some((y) => el(y) === 'N'))
        throw new NamingUnsupported('Liaison N–N : hors périmètre');
      for (const c of adj[x]) {
        if (ringOf[c] !== -1 && benzene[ringOf[c]])
          throw new NamingUnsupported('Amines aromatiques (aniline) : hors du périmètre du moteur');
        groups.push({ cls: 'amine', carbon: c, atoms: [x] });
      }
    } else if (HALOGENS.includes(e)) {
      groups.push({ cls: 'halogen', carbon: adj[x][0], atoms: [x] });
    }
  }

  const present = new Set(groups.map((g) => g.cls));
  const principal = PRIORITY.find((p) => present.has(p)) ?? null;
  const principalGroups = groups.filter((g) => g.cls === principal);

  if (principal && ['acid', 'ester', 'amide', 'nitrile', 'aldehyde'].includes(principal)) {
    for (const g of principalGroups) {
      if (adj[g.carbon].some((y) => ringOf[y] !== -1))
        throw new NamingUnsupported(
          'Groupe porté directement par un cycle (suffixes -carboxylique, -carbaldéhyde…) : hors périmètre',
        );
    }
  }
  if (principal === 'ester' && principalGroups.length > 1)
    throw new NamingUnsupported('Diesters : hors du périmètre du moteur');
  if (principal === 'amide' && principalGroups.length > 1)
    throw new NamingUnsupported('Diamides : hors du périmètre du moteur');
  // Esters et amides ne peuvent pas être nommés en préfixe ici.
  for (const cls of ['ester', 'amide'] as GroupClass[]) {
    if (present.has(cls) && principal !== cls)
      throw new NamingUnsupported(`${GROUP_LABEL[cls]} non prioritaire : hors périmètre`);
  }

  const excluded = new Set<number>();
  if (principal !== 'nitrile')
    for (const g of groups) if (g.cls === 'nitrile') excluded.add(g.carbon);

  return {
    mol,
    adj,
    rings,
    ringOf,
    benzene,
    groups,
    principal,
    principalGroups,
    excluded,
    memo: new Map(),
  };
}

// ---------------------------------------------------------------------------
// Noms des substituants

const ALIASES: Record<string, { usual: string; usualKey: string; iupac?: string }> = {
  '1-méthyléth': { usual: 'isopropyl', usualKey: 'isopropyl', iupac: 'propan-2-' },
  '1,1-diméthyléth': { usual: 'tert-butyl', usualKey: 'butyl', iupac: '2-méthylpropan-2-' },
  '1-méthylprop': { usual: 'sec-butyl', usualKey: 'butyl', iupac: 'butan-2-' },
  '2-méthylprop': { usual: 'isobutyl', usualKey: 'isobutyl' },
};

type Ending = 'yl' | 'yle' | 'oxy';

interface FormattedSubst {
  name: string;
  complex: boolean;
  sortKey: string;
  alts: { name: string; complex: boolean; sortKey: string }[];
}

function formatAlkyl(d: AlkylDesc, ending: Ending): FormattedSubst {
  if (d.ring) {
    const base = d.ring.name; // « phén », « cyclohex »
    if (ending === 'oxy') {
      const nm = base === 'phén' ? 'phénoxy' : `(${base}yloxy)`;
      return { name: nm, complex: base !== 'phén', sortKey: prefixSortKey(nm, false), alts: [] };
    }
    const nm = base + ending;
    return { name: nm, complex: false, sortKey: prefixSortKey(nm, false), alts: [] };
  }
  const stem = STEMS[d.length];
  if (!d.prefixes.length) {
    let nm: string;
    if (ending === 'oxy') nm = d.length <= 4 ? stem + 'oxy' : stem + 'yloxy';
    else nm = stem + ending;
    return { name: nm, complex: false, sortKey: prefixSortKey(nm, false), alts: [] };
  }
  const inner = prefixString(
    d.prefixes.map((p) => ({ ...p, showLocants: d.length > 1 })),
  );
  const core = inner + stem;
  const coreEnding = ending === 'oxy' ? (d.length <= 4 ? 'oxy' : 'yloxy') : ending;
  const full = core + coreEnding;
  const alts: FormattedSubst['alts'] = [];
  const al = ALIASES[core];
  if (al) {
    if (ending === 'yl') {
      alts.push({ name: al.usual, complex: false, sortKey: al.usualKey });
      if (al.iupac) {
        const nm = `(${al.iupac}yl)`;
        alts.push({ name: nm, complex: true, sortKey: prefixSortKey(nm, true) });
      }
    } else if (ending === 'yle') {
      alts.push({ name: al.usual + 'e', complex: false, sortKey: al.usualKey });
      if (al.iupac) alts.push({ name: al.iupac + 'yle', complex: true, sortKey: '' });
    } else {
      const usualOxy = al.usual.replace(/yl$/, 'oxy');
      alts.push({ name: usualOxy, complex: false, sortKey: prefixSortKey(usualOxy, false) });
      if (al.iupac) {
        const nm = `(${al.iupac}yl)oxy`;
        alts.push({ name: nm, complex: true, sortKey: prefixSortKey(nm, true) });
      }
    }
  }
  if (ending === 'yle') return { name: full, complex: true, sortKey: '', alts };
  const nm = `(${full})`;
  return { name: nm, complex: true, sortKey: prefixSortKey(nm, true), alts };
}

function branchAtoms(ctx: Ctx, root: number, from: number): number[] {
  const seen = new Set<number>([root]);
  const stack = [root];
  while (stack.length) {
    const x = stack.pop()!;
    for (const y of ctx.adj[x]) {
      if ((x === root && y === from) || seen.has(y)) continue;
      seen.add(y);
      stack.push(y);
    }
  }
  return [...seen];
}

function describeCarbonSubstituent(ctx: Ctx, root: number, from: number): AlkylDesc {
  const key = `${root}<${from}`;
  const cached = ctx.memo.get(key);
  if (cached) return cached;
  const { mol, adj, ringOf } = ctx;
  let result: AlkylDesc;
  if (ringOf[root] !== -1) {
    const ri = ringOf[root];
    const ring = ctx.rings[ri];
    for (const a of ring) {
      for (const y of adj[a]) {
        if (ringOf[y] === ri) continue;
        if (a === root && y === from) continue;
        throw new NamingUnsupported('Cycle substitué utilisé comme substituant : hors périmètre');
      }
    }
    if (ctx.benzene[ri]) result = { ring: { name: 'phén' }, length: 6, prefixes: [], chain: ring };
    else {
      if (ring.some((a, i) => bondOrder(mol, a, ring[(i + 1) % ring.length]) > 1))
        throw new NamingUnsupported('Substituant cycloalcényle : hors périmètre');
      result = { ring: { name: 'cyclo' + STEMS[ring.length] }, length: ring.length, prefixes: [], chain: ring };
    }
  } else {
    // chemins partant de root dans la partie carbonée acyclique
    const isChainC = (x: number) =>
      mol.atoms[x].el === 'C' && ringOf[x] === -1 && !ctx.excluded.has(x);
    const paths: number[][] = [];
    const walk = (path: number[]) => {
      paths.push(path);
      const last = path[path.length - 1];
      for (const y of adj[last]) {
        if (y === from || path.includes(y) || !isChainC(y)) continue;
        if (bondOrder(mol, last, y) !== 1)
          throw new NamingUnsupported('Substituant insaturé (alcényle, alcynyle) : hors périmètre');
        walk([...path, y]);
      }
    };
    walk([root]);
    let best: AlkylDesc | null = null;
    let bestVec: number[][] = [];
    for (const p of paths) {
      const occ: SubstOcc[] = [];
      p.forEach((a, i) => {
        for (const y of adj[a]) {
          if (p.includes(y) || (a === root && y === from)) continue;
          occ.push(nameSubstituent(ctx, y, a, i + 1));
        }
      });
      const groups = groupOccurrences(occ);
      const locs = occ.map((o) => o.locant as number).sort((x, y) => x - y);
      const alpha = sortPrefixGroups(groups).flatMap((g) =>
        (g.locants as number[]).slice().sort((x, y) => x - y),
      );
      const vec = [[-p.length], [-occ.length], locs, alpha];
      if (!best || compareVec(vec, bestVec) < 0) {
        best = { length: p.length, prefixes: groups, chain: p };
        bestVec = vec;
      }
    }
    result = best!;
  }
  ctx.memo.set(key, result);
  return result;
}

function compareArrays(a: number[], b: number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
  return a.length - b.length;
}

function compareVec(a: number[][], b: number[][]): number {
  for (let i = 0; i < a.length; i++) {
    const c = compareArrays(a[i], b[i]);
    if (c) return c;
  }
  return 0;
}

function nameSubstituent(ctx: Ctx, x: number, from: number, locant: Locant): SubstOcc {
  const { mol, adj } = ctx;
  const e = mol.atoms[x].el;
  const bo = bondOrder(mol, from, x);
  const atoms = branchAtoms(ctx, x, from);
  const simple = (name: string, kind: SubstOcc['kind']): SubstOcc => ({
    name,
    complex: false,
    sortKey: prefixSortKey(name, false),
    locant,
    atoms,
    alts: [],
    kind,
  });
  if (HALO_NAME[e]) return simple(HALO_NAME[e]!, 'halo');
  if (e === 'O') {
    if (bo === 2) return simple('oxo', 'hetero');
    if (adj[x].length === 1) return simple('hydroxy', 'hetero');
    const other = adj[x].find((y) => y !== from)!;
    if (mol.atoms[other].el !== 'C') throw new NamingUnsupported('Groupe oxygéné non pris en charge');
    const f = formatAlkyl(describeCarbonSubstituent(ctx, other, x), 'oxy');
    return { ...f, locant, atoms, kind: 'hetero' };
  }
  if (e === 'N') {
    if (bo === 1 && adj[x].length === 1) return simple('amino', 'hetero');
    throw new NamingUnsupported('Groupe azoté substitué en préfixe (alkylamino) : hors périmètre');
  }
  if (e === 'C') {
    if (bo !== 1)
      throw new NamingUnsupported(
        'Liaison multiple entre la chaîne principale et un substituant : hors périmètre',
      );
    if (adj[x].some((y) => mol.atoms[y].el === 'N' && bondOrder(mol, x, y) === 3))
      return simple('cyano', 'hetero');
    if (adj[x].some((y) => mol.atoms[y].el === 'O' && bondOrder(mol, x, y) === 2) && adj[x].length === 2)
      throw new NamingUnsupported('Groupe formyle (–CHO non inclus dans la chaîne) : hors périmètre');
    const d = describeCarbonSubstituent(ctx, x, from);
    const f = formatAlkyl(d, 'yl');
    return { ...f, locant, atoms, kind: d.ring ? 'ring' : 'alkyl' };
  }
  throw new NamingUnsupported(`Élément ${e} non pris en charge en substituant`);
}

function groupOccurrences(occ: SubstOcc[]): PrefixGroup[] {
  const map = new Map<string, PrefixGroup>();
  for (const o of occ) {
    const g = map.get(o.name);
    if (g) g.locants.push(o.locant);
    else
      map.set(o.name, {
        name: o.name,
        locants: [o.locant],
        complex: o.complex,
        sortKey: o.sortKey,
        showLocants: true,
      });
  }
  for (const g of map.values()) g.locants.sort(compareLocants);
  return [...map.values()];
}

// ---------------------------------------------------------------------------
// Candidats (chaînes et cycles) et critères de choix

function enumerateCandidates(ctx: Ctx): { atoms: number[]; isRing: boolean; ring?: number }[] {
  const { mol, adj, ringOf, rings } = ctx;
  const out: { atoms: number[]; isRing: boolean; ring?: number }[] = [];
  const isChainC = (x: number) =>
    mol.atoms[x].el === 'C' && ringOf[x] === -1 && !ctx.excluded.has(x);
  const chainCarbons = mol.atoms.map((_, i) => i).filter(isChainC);
  for (const u of chainCarbons) {
    // parcours en profondeur : chemins uniques dans la forêt acyclique
    const walk = (path: number[]) => {
      out.push({ atoms: path, isRing: false });
      const last = path[path.length - 1];
      for (const y of adj[last]) {
        if (!isChainC(y) || path.includes(y)) continue;
        walk([...path, y]);
      }
    };
    walk([u]);
  }
  rings.forEach((r, ri) => {
    const n = r.length;
    for (let s = 0; s < n; s++) {
      for (const dir of [1, -1]) {
        const atoms = Array.from({ length: n }, (_, k) => r[(s + dir * k + n * 2) % n]);
        out.push({ atoms, isRing: true, ring: ri });
      }
    }
  });
  return out;
}

function evaluate(ctx: Ctx, atoms: number[], isRing: boolean, ringIdx?: number): Candidate {
  const { mol, adj } = ctx;
  const L = atoms.length;
  const pos = new Map<number, number>();
  atoms.forEach((a, i) => pos.set(a, i + 1));
  const aromatic = isRing && ringIdx !== undefined && ctx.benzene[ringIdx];

  // groupes principaux portés par la chaîne
  const principalLocs: number[] = [];
  const principalHetero = new Set<number>();
  const countedN = new Set<number>();
  const principalCarbons = new Set<number>();
  for (const g of ctx.principalGroups) {
    if (!pos.has(g.carbon)) continue;
    if (g.cls === 'amine') {
      if (countedN.has(g.atoms[0])) continue;
      countedN.add(g.atoms[0]);
    }
    principalLocs.push(pos.get(g.carbon)!);
    g.atoms.forEach((a) => principalHetero.add(a));
    principalCarbons.add(g.carbon);
  }
  principalLocs.sort((a, b) => a - b);

  // insaturations dans la chaîne
  const enes: number[] = [];
  const ynes: number[] = [];
  if (!aromatic) {
    const nb = isRing ? L : L - 1;
    for (let i = 0; i < nb; i++) {
      const o = bondOrder(mol, atoms[i], atoms[(i + 1) % L]);
      if (o === 2) enes.push(i + 1);
      if (o === 3) ynes.push(i + 1);
    }
  }

  // substituants
  const prefixes: SubstOcc[] = [];
  let unsupported: string | undefined;
  let esterAlkyl: Candidate['esterAlkyl'];
  const attachLocs: Locant[] = [];
  for (let i = 0; i < L; i++) {
    const p = atoms[i];
    for (const x of adj[p]) {
      if (pos.has(x)) continue;
      if (principalHetero.has(x) && principalCarbons.has(p)) {
        const el = mol.atoms[x].el;
        if (ctx.principal === 'ester' && el === 'O' && adj[x].length === 2) {
          const other = adj[x].find((y) => y !== p)!;
          try {
            const f = formatAlkyl(describeCarbonSubstituent(ctx, other, x), 'yle');
            esterAlkyl = { name: f.name, alts: f.alts.map((a) => a.name), atoms: branchAtoms(ctx, other, x) };
          } catch (e) {
            unsupported = (e as Error).message;
          }
        }
        if (el === 'N' && (ctx.principal === 'amide' || ctx.principal === 'amine')) {
          for (const y of adj[x]) {
            if (y === p || pos.has(y)) continue;
            attachLocs.push('N');
            try {
              prefixes.push(nameSubstituent(ctx, y, x, 'N'));
            } catch (e) {
              unsupported = (e as Error).message;
            }
          }
        }
        continue;
      }
      attachLocs.push(i + 1);
      try {
        prefixes.push(nameSubstituent(ctx, x, p, i + 1));
      } catch (e) {
        unsupported = (e as Error).message;
      }
    }
  }
  const prefixLocs = attachLocs.filter((l): l is number => l !== 'N').sort((a, b) => a - b);
  const groups = groupOccurrences(prefixes);
  const alphaLocs = sortPrefixGroups(groups).flatMap((g) =>
    g.locants.filter((l): l is number => l !== 'N').sort((a, b) => a - b),
  );
  return {
    atoms,
    isRing,
    aromatic,
    nPrincipal: principalLocs.length,
    principalLocs,
    enes,
    ynes,
    prefixes,
    nPrefixes: attachLocs.length,
    prefixLocs,
    alphaLocs,
    esterAlkyl,
    unsupported,
  };
}

/** Index des critères (pour les explications et le diagnostic des erreurs). */
export const CRITERIA = [
  'principalCount',
  'ring',
  'multipleCount',
  'length',
  'doubleCount',
  'principalLocs',
  'multipleLocs',
  'doubleLocs',
  'prefixCount',
  'prefixLocs',
  'alpha',
] as const;
export type Criterion = (typeof CRITERIA)[number];

function vector(c: Candidate): number[][] {
  const multiple = [...c.enes, ...c.ynes].sort((a, b) => a - b);
  return [
    [-c.nPrincipal],
    [c.isRing ? 0 : 1],
    [-(c.enes.length + c.ynes.length)],
    [-c.atoms.length],
    [-c.enes.length],
    c.principalLocs,
    multiple,
    c.enes,
    [-c.nPrefixes],
    c.prefixLocs,
    c.alphaLocs,
  ];
}

/** Compare deux candidats ; renvoie le signe et le premier critère discriminant. */
export function compareCandidates(a: Candidate, b: Candidate): { cmp: number; criterion: Criterion | null } {
  const va = vector(a);
  const vb = vector(b);
  for (let i = 0; i < va.length; i++) {
    const c = compareArrays(va[i], vb[i]);
    if (c) return { cmp: c, criterion: CRITERIA[i] };
  }
  return { cmp: 0, criterion: null };
}

// ---------------------------------------------------------------------------
// Construction du nom

type Style = 'conventional' | 'full';

export function candidateParts(c: Candidate, ctx: { principal: GroupClass | null }, style: Style = 'conventional'): NameParts {
  const L = c.atoms.length;
  const groups = groupOccurrences(c.prefixes);
  const suffixType = ctx.principal ? SUFFIX_OF[ctx.principal] : null;
  const suffix =
    suffixType && c.principalLocs.length
      ? { type: suffixType, locants: c.principalLocs, showLocants: true }
      : null;
  const kind: 'chain' | 'ring' | 'benzene' = c.aromatic ? 'benzene' : c.isRing ? 'ring' : 'chain';
  const parent = { kind, length: L, enes: c.enes, ynes: c.ynes, showUnsatLocants: true };
  const numericPrefixCount = c.prefixes.filter((p) => p.locant !== 'N').length;
  const terminal = suffix && TERMINAL_SUFFIXES.includes(suffix.type);
  const unsat = c.enes.length + c.ynes.length;
  const occurrences = numericPrefixCount + (suffix && !terminal ? suffix.locants.length : 0);

  let hideNumeric = false;
  if (kind === 'chain' && L === 1) hideNumeric = true;
  if (kind === 'chain' && L === 2 && numericPrefixCount + (suffix ? suffix.locants.length : 0) <= 1)
    hideNumeric = true;
  if (kind === 'ring' && occurrences === 1 && unsat === 0) hideNumeric = true;
  // benzène : « chlorobenzène », « phénol » ; mais « 1,2-diméthylbenzène », « 2-méthylphénol »
  if (kind === 'benzene' && (suffix ? numericPrefixCount === 0 : numericPrefixCount <= 1)) hideNumeric = true;
  if (kind === 'chain' && L === 2) parent.showUnsatLocants = false;
  if (kind === 'ring' && unsat === 1 && c.enes[0] === 1 && (style === 'conventional' || occurrences === 0))
    parent.showUnsatLocants = false;
  if (
    style === 'conventional' &&
    kind === 'chain' &&
    L === 3 &&
    numericPrefixCount === 0 &&
    ((unsat === 1 && !suffix) || (unsat === 0 && suffix?.type === 'one' && suffix.locants.length === 1))
  ) {
    hideNumeric = true;
    parent.showUnsatLocants = false;
  }
  if (hideNumeric) {
    if (suffix) suffix.showLocants = false;
  }
  if (suffix && terminal) suffix.showLocants = false;
  for (const g of groups) {
    g.showLocants = !(hideNumeric && g.locants.every((l) => l !== 'N'));
  }
  return { prefixes: groups, parent, suffix, esterAlkyl: c.esterAlkyl?.name };
}

function variantsFor(c: Candidate, principal: GroupClass | null): string[] {
  const base = candidateParts(c, { principal }, 'conventional');
  const full = candidateParts(c, { principal }, 'full');
  const names = new Set<string>([assembleName(full)]);
  // écritures avec les noms usuels ou 2013 des substituants ramifiés
  const altOptions = c.prefixes.filter((p) => p.alts.length);
  for (const parts of [base, full]) {
    for (let k = 0; k < 2; k++) {
      if (!altOptions.length && !c.esterAlkyl?.alts.length) break;
      const replaced = c.prefixes.map((p) => {
        const alt = p.alts[k];
        return alt ? { ...p, name: alt.name, complex: alt.complex, sortKey: alt.sortKey } : p;
      });
      const groups = groupOccurrences(replaced).map((g) => ({
        ...g,
        showLocants: parts.prefixes.some((pg) => pg.showLocants) || g.locants.includes('N'),
      }));
      names.add(
        assembleName({
          ...parts,
          prefixes: groups,
          esterAlkyl: c.esterAlkyl?.alts[k] ?? parts.esterAlkyl,
        }),
      );
    }
  }
  names.delete(assembleName(base));
  return [...names];
}

export interface Analysis {
  ctx: Ctx;
  candidates: Candidate[];
}

function analyse(mol: Molecule): Analysis {
  const ctx = buildContext(mol);
  const raw = enumerateCandidates(ctx);
  const candidates = raw.map((r) => evaluate(ctx, r.atoms, r.isRing, r.ring));
  candidates.sort((a, b) => compareCandidates(a, b).cmp);
  return { ctx, candidates };
}

export function nameOfCandidate(c: Candidate, principal: GroupClass | null): string {
  return assembleName(candidateParts(c, { principal }));
}

export function nameMolecule(mol: Molecule): NamingResult {
  const { ctx, candidates } = analyse(mol);
  const best = candidates[0];
  if (best.unsupported) throw new NamingUnsupported(best.unsupported);
  const notes: string[] = [];
  const name = nameOfCandidate(best, ctx.principal);
  const tied = candidates.filter((c) => compareCandidates(c, best).cmp === 0);
  for (const t of tied) {
    if (t.unsupported) continue;
    if (nameOfCandidate(t, ctx.principal) !== name) {
      notes.push(
        'Cas d’égalité non tranché par les règles implémentées : le nom proposé est l’un des noms possibles.',
      );
      break;
    }
  }
  // Signalement des cas où les conventions divergent.
  if (best.isRing) {
    const longestChain = candidates.find((c) => !c.isRing && c.nPrincipal === best.nPrincipal);
    if (longestChain && longestChain.atoms.length > best.atoms.length)
      notes.push(
        'Convention : selon les règles IUPAC 2013, le cycle est prioritaire sur la chaîne. Certains cours choisissent la structure qui a le plus de carbones.',
      );
  } else if (best.enes.length + best.ynes.length > 0) {
    const longer = candidates.find(
      (c) => !c.isRing && c.nPrincipal === best.nPrincipal && c.atoms.length > best.atoms.length,
    );
    if (longer)
      notes.push(
        'Convention : depuis 2013, l’IUPAC choisit d’abord la chaîne la plus longue (même sans la liaison multiple). Ce nom suit la règle encore enseignée dans la plupart des cours (chaîne contenant le maximum de liaisons multiples).',
      );
  }
  const equivalent = tied.filter((t) => !t.unsupported && nameOfCandidate(t, ctx.principal) === name);
  const chainKeys = new Set<string>();
  const validMainChains: number[][] = [];
  for (const t of equivalent) {
    const key = [...t.atoms].sort((a, b) => a - b).join(',');
    if (!chainKeys.has(key)) {
      chainKeys.add(key);
      validMainChains.push(t.atoms);
    }
  }
  const locantOf = new Map<number, number>();
  best.atoms.forEach((a, i) => locantOf.set(a, i + 1));
  return {
    name,
    variants: variantsFor(best, ctx.principal),
    parts: candidateParts(best, ctx),
    principal: ctx.principal,
    groups: ctx.groups,
    parentAtoms: best.atoms,
    isRing: best.isRing,
    aromatic: best.aromatic,
    locantOf,
    substituents: best.prefixes,
    esterAlkylAtoms: best.esterAlkyl?.atoms ?? [],
    steps: buildSteps(ctx, candidates, best, name),
    equivalentNumberings: equivalent.map((t) => t.atoms),
    validMainChains,
    candidates,
    notes,
  };
}

/** Nom simple, ou null si la molécule sort du périmètre du moteur. */
export function tryName(mol: Molecule): string | null {
  try {
    return nameMolecule(mol).name;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Explications pas à pas

const list = (xs: (string | number)[]) => xs.join(',');

function describeLocants(c: Candidate): string {
  const parts: string[] = [];
  if (c.principalLocs.length) parts.push(`groupe principal en ${list(c.principalLocs)}`);
  const m = [...c.enes, ...c.ynes].sort((a, b) => a - b);
  if (m.length) parts.push(`liaison(s) multiple(s) en ${list(m)}`);
  if (c.prefixLocs.length) parts.push(`substituants en ${list(c.prefixLocs)}`);
  return parts.join(', ') || 'aucun indice';
}

function buildSteps(ctx: Ctx, candidates: Candidate[], best: Candidate, name: string): NamingStep[] {
  const steps: NamingStep[] = [];
  const principal = ctx.principal;
  const present = [...new Set(ctx.groups.map((g) => g.cls))];

  // 1. Fonction principale
  if (principal) {
    const others = present.filter((p) => p !== principal && p !== 'halogen' && p !== 'ether') as GroupClass[];
    let text = `La molécule contient un groupe ${GROUP_LABEL[principal]}`;
    if (others.length) {
      text += `, mais aussi : ${others.map((o) => GROUP_LABEL[o]).join(', ')}. `;
      text += `D’après l’ordre de priorité, c’est le groupe ${GROUP_LABEL[principal]} qui est prioritaire : il donne le suffixe ${SUFFIX_LABEL[principal]}. `;
      text += `Les autres groupes sont nommés en préfixe (${others
        .map((o) => PREFIX_LABEL[o] ?? GROUP_LABEL[o])
        .join(', ')}).`;
    } else {
      text += ` : la fonction principale donne le suffixe ${SUFFIX_LABEL[principal]}.`;
    }
    steps.push({ title: 'Repérer la fonction principale', text });
  } else {
    const extra: string[] = [];
    if (present.includes('halogen')) extra.push('les halogènes sont toujours nommés en préfixe (chloro-, bromo-…)');
    if (present.includes('ether')) extra.push('un groupe –O–R est nommé en préfixe alkoxy- (méthoxy-, éthoxy-…)');
    const hydro = best.aromatic
      ? 'un dérivé du benzène'
      : best.ynes.length && best.enes.length
        ? 'un hydrocarbure avec des doubles et triples liaisons'
        : best.ynes.length
          ? 'un alcyne (triple liaison C≡C)'
          : best.enes.length
            ? 'un alcène (double liaison C=C)'
            : best.isRing
              ? 'un cycloalcane'
              : 'un alcane (uniquement des liaisons simples)';
    steps.push({
      title: 'Identifier la famille',
      text: `Pas de fonction nommée par un suffixe : la molécule se nomme comme ${hydro}${
        extra.length ? ' ; ' + extra.join(' ; ') : ''
      }.`,
    });
  }

  // 2. Chaîne principale
  const L = best.atoms.length;
  const rootName = best.aromatic ? 'benzène' : `${best.isRing ? 'cyclo' : ''}${STEMS[L]}-`;
  let chainText: string;
  if (best.aromatic) chainText = 'Le cycle benzénique (6 carbones, 3 doubles liaisons alternées) est la structure principale : le nom se termine par « benzène ».';
  else if (best.isRing) chainText = `Le cycle de ${L} carbones est la structure principale → racine « ${rootName} ».`;
  else chainText = `La chaîne principale compte ${L} carbone${L > 1 ? 's' : ''} → racine « ${rootName} ».`;
  const bestKey = [...best.atoms].sort((a, b) => a - b).join(',');
  const rival = candidates.find(
    (c) => !c.unsupported && [...c.atoms].sort((a, b) => a - b).join(',') !== bestKey,
  );
  if (rival) {
    const { criterion } = compareCandidates(best, rival);
    const why: Partial<Record<Criterion, string>> = {
      principalCount: 'Elle doit contenir le carbone portant le groupe principal (ou le maximum de groupes principaux).',
      ring: 'Le cycle est choisi comme structure principale (règle des recommandations IUPAC actuelles).',
      multipleCount: 'Elle doit contenir le maximum de liaisons multiples (doubles ou triples).',
      length: best.isRing ? '' : 'C’est la chaîne carbonée la plus longue possible.',
      doubleCount: 'À égalité, on choisit la chaîne qui contient le plus de doubles liaisons.',
      principalLocs: 'À égalité de longueur, on choisit la chaîne qui donne le plus petit indice au groupe principal.',
      multipleLocs: 'À égalité de longueur, on choisit la chaîne qui donne les plus petits indices aux liaisons multiples.',
      prefixCount: `Plusieurs chaînes ont ${L} carbones : on choisit celle qui porte le plus de substituants (${best.nPrefixes} au lieu de ${rival.nPrefixes}).`,
      prefixLocs: `Plusieurs chaînes ont ${L} carbones et autant de substituants : on choisit celle qui donne les plus petits indices.`,
      alpha: 'À égalité, on départage par l’ordre alphabétique des substituants.',
    };
    if (criterion && why[criterion]) chainText += ' ' + why[criterion];
  }
  if (!best.isRing && (best.enes.length || best.ynes.length))
    chainText += ' Elle contient toutes les liaisons multiples.';
  steps.push({ title: best.isRing ? 'Choisir la structure principale' : 'Choisir la chaîne principale', text: chainText });

  // 3. Numérotation
  const sameAtoms = candidates.filter(
    (c) => c !== best && !c.unsupported && [...c.atoms].sort((a, b) => a - b).join(',') === bestKey,
  );
  let numText = '';
  const other = sameAtoms.find((c) => compareCandidates(best, c).cmp < 0);
  if (L === 1) numText = 'Un seul carbone : pas de numérotation nécessaire.';
  else if (!other) numText = 'La molécule est symétrique : les deux sens de numérotation donnent le même nom.';
  else {
    const { criterion } = compareCandidates(best, other);
    const fmt = (xs: number[]) => `{${list(xs)}}`;
    const multB = [...best.enes, ...best.ynes].sort((a, b) => a - b);
    const multO = [...other.enes, ...other.ynes].sort((a, b) => a - b);
    switch (criterion) {
      case 'principalLocs':
        numText = `On numérote pour donner au groupe principal le plus petit indice possible : ${fmt(best.principalLocs)} et non ${fmt(other.principalLocs)}.`;
        break;
      case 'multipleLocs':
        numText = `On numérote pour donner aux liaisons multiples les plus petits indices : ${fmt(multB)} et non ${fmt(multO)}.`;
        break;
      case 'doubleLocs':
        numText = `Égalité pour les liaisons multiples : la double liaison est prioritaire et reçoit le plus petit indice (${fmt(best.enes)} au lieu de ${fmt(other.enes)}).`;
        break;
      case 'prefixLocs':
        numText = `On numérote pour que les substituants aient les plus petits indices : ${fmt(best.prefixLocs)} plutôt que ${fmt(other.prefixLocs)} (on compare au premier point de différence).`;
        break;
      case 'alpha':
        numText = `Les deux sens donnent les mêmes indices ${fmt(best.prefixLocs)} : on donne le plus petit indice au substituant cité en premier dans l’ordre alphabétique.`;
        break;
      default:
        numText = `Sens retenu : ${describeLocants(best)} (l’autre sens donnerait : ${describeLocants(other)}).`;
    }
    if (best.isRing) numText = 'Dans un cycle, on choisit le carbone n°1 et le sens de rotation. ' + numText;
  }
  steps.push({ title: 'Numéroter', text: numText });

  // 4. Insaturations
  if (best.enes.length || best.ynes.length) {
    const t: string[] = [];
    if (best.enes.length)
      t.push(`double(s) liaison(s) commençant aux carbones ${list(best.enes)} → « ${best.enes.length > 1 ? 'di' : ''}ène »`);
    if (best.ynes.length)
      t.push(`triple(s) liaison(s) commençant aux carbones ${list(best.ynes)} → « ${best.ynes.length > 1 ? 'di' : ''}yne »`);
    steps.push({
      title: 'Placer les insaturations',
      text: t.join(' ; ') + '. On indique le plus petit des deux numéros des carbones de la liaison.',
    });
  }

  // 5. Substituants
  const groups = sortPrefixGroups(groupOccurrences(best.prefixes));
  if (groups.length) {
    const lines = groups.map((g) => {
      const n = g.locants.length;
      return `${g.name} en ${g.locants.join(' et ')}${n > 1 ? ` → ${n} fois : « ${n === 2 ? 'di' : n === 3 ? 'tri' : 'tétra'}${g.name} »` : ''}`;
    });
    let txt = 'Substituants : ' + lines.join(' ; ') + '.';
    if (groups.length > 1)
      txt += ` Ordre alphabétique (sans tenir compte de di, tri, tétra) : ${groups.map((g) => g.name).join(', ')}.`;
    steps.push({ title: 'Nommer et classer les substituants', text: txt });
  }
  if (best.esterAlkyl) {
    steps.push({
      title: 'Nommer la partie alkyle de l’ester',
      text: `Le groupe lié à l’oxygène de l’ester est « ${best.esterAlkyl.name} » : il est cité à la fin, après « de ».`,
    });
  }
  steps.push({ title: 'Assembler le nom', text: `Nom complet : ${name}` });
  return steps;
}
