// Représentation d'une molécule sous forme de graphe (atomes lourds uniquement,
// hydrogènes implicites calculés à partir de la valence).

export type Element = 'C' | 'N' | 'O' | 'S' | 'F' | 'Cl' | 'Br' | 'I';

export interface Atom {
  el: Element;
  /** Nombre d'hydrogènes fixé explicitement (atome entre crochets en SMILES). */
  explicitH?: number;
}

export interface Bond {
  a: number;
  b: number;
  order: 1 | 2 | 3;
  /** Représentation stéréo (coin plein / coin hachuré) partant de l'atome a. */
  stereo?: 'wedge' | 'hash';
  /** Symbole directionnel SMILES (« / » ou « \\ »), l'atome a précédant b dans l'écriture. */
  dir?: '/' | '\\';
}

export interface Molecule {
  atoms: Atom[];
  bonds: Bond[];
  /** Coordonnées 2D facultatives fournies par l'auteur (stéréochimie). */
  coords?: [number, number][];
}

export const VALENCE: Record<Element, number> = {
  C: 4,
  N: 3,
  O: 2,
  S: 2,
  F: 1,
  Cl: 1,
  Br: 1,
  I: 1,
};

export const ATOMIC_NUMBER: Record<Element | 'H', number> = {
  H: 1,
  C: 6,
  N: 7,
  O: 8,
  F: 9,
  S: 16,
  Cl: 17,
  Br: 35,
  I: 53,
};

export const HALOGENS: Element[] = ['F', 'Cl', 'Br', 'I'];

export function createMolecule(): Molecule {
  return { atoms: [], bonds: [] };
}

export function addAtom(mol: Molecule, el: Element): number {
  mol.atoms.push({ el });
  return mol.atoms.length - 1;
}

export function addBond(mol: Molecule, a: number, b: number, order: 1 | 2 | 3 = 1): void {
  if (a === b) throw new Error('Liaison d’un atome avec lui-même');
  if (findBond(mol, a, b)) throw new Error('Liaison déjà présente');
  mol.bonds.push({ a, b, order });
}

export function findBond(mol: Molecule, a: number, b: number): Bond | undefined {
  return mol.bonds.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
}

export function bondOrder(mol: Molecule, a: number, b: number): number {
  return findBond(mol, a, b)?.order ?? 0;
}

/** Liste d'adjacence (indices des voisins). */
export function neighbors(mol: Molecule, i: number): number[] {
  const out: number[] = [];
  for (const b of mol.bonds) {
    if (b.a === i) out.push(b.b);
    else if (b.b === i) out.push(b.a);
  }
  return out;
}

export function adjacency(mol: Molecule): number[][] {
  const adj: number[][] = mol.atoms.map(() => []);
  for (const b of mol.bonds) {
    adj[b.a].push(b.b);
    adj[b.b].push(b.a);
  }
  return adj;
}

export function bondOrderSum(mol: Molecule, i: number): number {
  let s = 0;
  for (const b of mol.bonds) if (b.a === i || b.b === i) s += b.order;
  return s;
}

export function hydrogenCount(mol: Molecule, i: number): number {
  const atom = mol.atoms[i];
  if (atom.explicitH !== undefined) return atom.explicitH;
  return Math.max(0, VALENCE[atom.el] - bondOrderSum(mol, i));
}

/** Vérifie qu'aucun atome ne dépasse sa valence. Renvoie la liste des problèmes. */
export function valenceProblems(mol: Molecule): { atom: number; message: string }[] {
  const problems: { atom: number; message: string }[] = [];
  mol.atoms.forEach((a, i) => {
    const s = bondOrderSum(mol, i) + (a.explicitH ?? 0);
    if (s > VALENCE[a.el]) {
      problems.push({
        atom: i,
        message: `l'atome ${a.el} n°${i + 1} formerait ${s} liaisons alors qu'il n'en forme que ${VALENCE[a.el]}`,
      });
    }
  });
  return problems;
}

export function cloneMolecule(mol: Molecule): Molecule {
  return {
    atoms: mol.atoms.map((a) => ({ ...a })),
    bonds: mol.bonds.map((b) => ({ ...b })),
    coords: mol.coords?.map((c) => [c[0], c[1]] as [number, number]),
  };
}

export function isConnected(mol: Molecule): boolean {
  if (mol.atoms.length === 0) return false;
  const adj = adjacency(mol);
  const seen = new Set<number>([0]);
  const stack = [0];
  while (stack.length) {
    const x = stack.pop()!;
    for (const y of adj[x]) if (!seen.has(y)) {
      seen.add(y);
      stack.push(y);
    }
  }
  return seen.size === mol.atoms.length;
}

/** Cycles élémentaires (base de cycles) — suffisant pour des cycles isolés. */
export function findRings(mol: Molecule): number[][] {
  const adj = adjacency(mol);
  const n = mol.atoms.length;
  const parent = new Array<number>(n).fill(-1);
  const depth = new Array<number>(n).fill(-1);
  const rings: number[][] = [];
  const seenEdge = new Set<string>();
  for (let root = 0; root < n; root++) {
    if (depth[root] !== -1) continue;
    depth[root] = 0;
    const stack = [root];
    while (stack.length) {
      const x = stack.pop()!;
      for (const y of adj[x]) {
        if (depth[y] === -1) {
          depth[y] = depth[x] + 1;
          parent[y] = x;
          stack.push(y);
        } else if (y !== parent[x]) {
          const key = x < y ? `${x}-${y}` : `${y}-${x}`;
          if (seenEdge.has(key)) continue;
          seenEdge.add(key);
          // remonter jusqu'à l'ancêtre commun
          const pathX: number[] = [x];
          const pathY: number[] = [y];
          let a = x;
          let b = y;
          while (a !== b) {
            if (depth[a] >= depth[b]) {
              a = parent[a];
              if (a === -1) break;
              pathX.push(a);
            } else {
              b = parent[b];
              if (b === -1) break;
              pathY.push(b);
            }
          }
          if (a !== b || a === -1) continue;
          pathY.pop(); // l'ancêtre commun est déjà dans pathX
          const ring = [...pathX, ...pathY.reverse()];
          if (ring.length >= 3) rings.push(normalizeRing(ring, adj));
        }
      }
    }
  }
  return rings;
}

/** Ordonne les atomes d'un cycle de façon à ce qu'ils se suivent. */
function normalizeRing(ring: number[], adj: number[][]): number[] {
  const set = new Set(ring);
  const ordered = [ring[0]];
  const used = new Set([ring[0]]);
  while (ordered.length < ring.length) {
    const last = ordered[ordered.length - 1];
    const next = adj[last].find((y) => set.has(y) && !used.has(y));
    if (next === undefined) return ring;
    ordered.push(next);
    used.add(next);
  }
  return ordered;
}

/** Formule brute en notation de Hill (C, H puis ordre alphabétique). */
export function molecularFormula(mol: Molecule): Record<string, number> {
  const counts: Record<string, number> = {};
  mol.atoms.forEach((a, i) => {
    counts[a.el] = (counts[a.el] ?? 0) + 1;
    const h = hydrogenCount(mol, i);
    if (h) counts.H = (counts.H ?? 0) + h;
  });
  return counts;
}

export function formulaToString(counts: Record<string, number>, unicode = true): string {
  const sub = (n: number) =>
    unicode ? String(n).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]) : String(n);
  const keys = Object.keys(counts).filter((k) => counts[k] > 0);
  const order: string[] = [];
  if (keys.includes('C')) {
    order.push('C');
    if (keys.includes('H')) order.push('H');
    order.push(...keys.filter((k) => k !== 'C' && k !== 'H').sort());
  } else {
    order.push(...keys.sort());
  }
  return order.map((k) => k + (counts[k] > 1 ? sub(counts[k]) : '')).join('');
}

export function formulaOf(mol: Molecule, unicode = true): string {
  return formulaToString(molecularFormula(mol), unicode);
}

/** Indice d'insaturation (nombre de cycles + liaisons π). */
export function unsaturationDegree(counts: Record<string, number>): number {
  const C = counts.C ?? 0;
  const H = counts.H ?? 0;
  const N = counts.N ?? 0;
  const X = (counts.F ?? 0) + (counts.Cl ?? 0) + (counts.Br ?? 0) + (counts.I ?? 0);
  return (2 * C + 2 + N - H - X) / 2;
}
