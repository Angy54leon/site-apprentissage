// Stéréochimie : priorités de Cahn-Ingold-Prelog (CIP), configurations Z/E et R/S.
import { type Molecule, ATOMIC_NUMBER, adjacency, bondOrder, findBond, hydrogenCount } from './molecule';
import type { Point } from './layout';

interface CipNode {
  z: number;
  atom: number; // -1 pour H implicite, -2 pour atome dupliqué / fantôme
  from: number;
  path: Set<number>;
  duplicate: boolean;
}

function childrenOf(mol: Molecule, adj: number[][], node: CipNode): CipNode[] {
  if (node.atom < 0 || node.duplicate) {
    // atome dupliqué : trois substituants fantômes (Z = 0)
    if (node.duplicate) return [0, 0, 0].map(() => ({ z: 0, atom: -2, from: -1, path: node.path, duplicate: true }));
    return [];
  }
  const a = node.atom;
  const out: CipNode[] = [];
  for (const y of adj[a]) {
    const order = bondOrder(mol, a, y);
    if (y === node.from) {
      for (let k = 1; k < order; k++)
        out.push({ z: ATOMIC_NUMBER[mol.atoms[y].el], atom: y, from: a, path: node.path, duplicate: true });
      continue;
    }
    if (node.path.has(y)) {
      out.push({ z: ATOMIC_NUMBER[mol.atoms[y].el], atom: y, from: a, path: node.path, duplicate: true });
      continue;
    }
    const path = new Set(node.path);
    path.add(y);
    out.push({ z: ATOMIC_NUMBER[mol.atoms[y].el], atom: y, from: a, path, duplicate: false });
    for (let k = 1; k < order; k++)
      out.push({ z: ATOMIC_NUMBER[mol.atoms[y].el], atom: y, from: a, path, duplicate: true });
  }
  for (let h = 0; h < hydrogenCount(mol, a); h++) out.push({ z: 1, atom: -1, from: a, path: node.path, duplicate: false });
  return out;
}

/** Comparaison hiérarchique, sphère par sphère (règle 1 des règles CIP). */
function compareNodes(mol: Molecule, adj: number[][], A: CipNode, B: CipNode): number {
  if (A.z !== B.z) return A.z - B.z;
  const order = (nodes: CipNode[]) =>
    nodes
      .map((n) => ({ n, kids: childrenOf(mol, adj, n).map((c) => c.z).sort((x, y) => y - x) }))
      .sort((x, y) => {
        if (x.n.z !== y.n.z) return y.n.z - x.n.z;
        for (let i = 0; i < Math.max(x.kids.length, y.kids.length); i++) {
          const d = (y.kids[i] ?? 0) - (x.kids[i] ?? 0);
          if (d) return d;
        }
        return 0;
      })
      .map((x) => x.n);
  let la: CipNode[] = [A];
  let lb: CipNode[] = [B];
  for (let depth = 0; depth < 12; depth++) {
    const ga = la.map((n) => order(childrenOf(mol, adj, n)));
    const gb = lb.map((n) => order(childrenOf(mol, adj, n)));
    for (let i = 0; i < Math.max(ga.length, gb.length); i++) {
      const xa = ga[i] ?? [];
      const xb = gb[i] ?? [];
      for (let j = 0; j < Math.max(xa.length, xb.length, 3); j++) {
        const d = (xa[j]?.z ?? 0) - (xb[j]?.z ?? 0);
        if (d) return d;
      }
    }
    la = ga.flat();
    lb = gb.flat();
    if (!la.length && !lb.length) return 0;
  }
  return 0;
}

/**
 * Classe les substituants d'un atome central par priorité CIP décroissante.
 * Les H implicites sont représentés par l'indice -1.
 * Renvoie null si deux substituants sont de même priorité.
 */
export function cipRanking(mol: Molecule, center: number, subs?: number[]): number[] | null {
  const adj = adjacency(mol);
  const neighbours = subs ?? adj[center];
  const nodes: CipNode[] = neighbours.map((y) => ({
    z: y < 0 ? 1 : ATOMIC_NUMBER[mol.atoms[y].el],
    atom: y,
    from: center,
    path: new Set([center, y]),
    duplicate: false,
  }));
  if (!subs) {
    for (let h = 0; h < hydrogenCount(mol, center); h++)
      nodes.push({ z: 1, atom: -1, from: center, path: new Set([center]), duplicate: false });
  }
  const sorted = [...nodes].sort((x, y) => -compareNodes(mol, adj, x, y));
  for (let i = 1; i < sorted.length; i++) if (compareNodes(mol, adj, sorted[i - 1], sorted[i]) === 0) return null;
  return sorted.map((n) => n.atom);
}

// ---------------------------------------------------------------------------
// Doubles liaisons Z/E

/** Position (« haut »/« bas ») d'un substituant d'après les symboles / \ du SMILES. */
function smilesSide(mol: Molecule, dblAtom: number, sub: number): 'up' | 'down' | null {
  const b = findBond(mol, dblAtom, sub);
  if (!b || !b.dir) return null;
  const up = b.dir === '/';
  // écrit « dblAtom / sub » : le substituant est en haut ; « sub / dblAtom » : en bas
  if (b.a === dblAtom) return up ? 'up' : 'down';
  return up ? 'down' : 'up';
}

/** Relation cis/trans entre x (voisin de a) et y (voisin de b), d'après le SMILES. */
export function smilesRelation(mol: Molecule, a: number, b: number, x: number, y: number): 'cis' | 'trans' | null {
  const adj = adjacency(mol);
  const side = (dbl: number, other: number, sub: number): 'up' | 'down' | null => {
    const direct = smilesSide(mol, dbl, sub);
    if (direct) return direct;
    const ref = adj[dbl].find((n) => n !== other && n !== sub && smilesSide(mol, dbl, n));
    if (ref === undefined) return null;
    return smilesSide(mol, dbl, ref) === 'up' ? 'down' : 'up';
  };
  const sx = side(a, b, x);
  const sy = side(b, a, y);
  if (!sx || !sy) return null;
  return sx === sy ? 'cis' : 'trans';
}

export interface DoubleBondStereo {
  a: number;
  b: number;
  config: 'E' | 'Z' | null;
  /** Substituant prioritaire de chaque côté. */
  hiA: number;
  hiB: number;
}

/** Substituants d'un carbone de la double liaison (H implicite = -1). */
function endSubs(mol: Molecule, adj: number[][], a: number, b: number): number[] {
  const subs = adj[a].filter((n) => n !== b);
  for (let h = 0; h < hydrogenCount(mol, a); h++) subs.push(-1);
  return subs;
}

export function doubleBondStereo(mol: Molecule, coords?: Point[]): DoubleBondStereo[] {
  const adj = adjacency(mol);
  const out: DoubleBondStereo[] = [];
  for (const bd of mol.bonds) {
    if (bd.order !== 2) continue;
    const { a, b } = bd;
    if (mol.atoms[a].el !== 'C' || mol.atoms[b].el !== 'C') continue;
    const sa = endSubs(mol, adj, a, b);
    const sb = endSubs(mol, adj, b, a);
    if (sa.length !== 2 || sb.length !== 2) continue;
    const rankA = cipRanking(mol, a, sa);
    const rankB = cipRanking(mol, b, sb);
    if (!rankA || !rankB) {
      out.push({ a, b, config: null, hiA: -1, hiB: -1 });
      continue;
    }
    const hiA = rankA[0];
    const hiB = rankB[0];
    let rel: 'cis' | 'trans' | null = null;
    if (coords && hiA >= 0 && hiB >= 0) {
      const side = (p: Point) =>
        Math.sign(
          (coords[b][0] - coords[a][0]) * (p[1] - coords[a][1]) - (coords[b][1] - coords[a][1]) * (p[0] - coords[a][0]),
        );
      rel = side(coords[hiA]) === side(coords[hiB]) ? 'cis' : 'trans';
    } else if (hiA >= 0 && hiB >= 0) {
      rel = smilesRelation(mol, a, b, hiA, hiB);
    }
    out.push({ a, b, config: rel ? (rel === 'cis' ? 'Z' : 'E') : null, hiA, hiB });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Carbones asymétriques R/S

export function stereocenters(mol: Molecule): number[] {
  const adj = adjacency(mol);
  const out: number[] = [];
  mol.atoms.forEach((at, i) => {
    if (at.el !== 'C') return;
    const total = adj[i].length + hydrogenCount(mol, i);
    if (total !== 4 || hydrogenCount(mol, i) > 1) return;
    if (adj[i].some((y) => bondOrder(mol, i, y) > 1)) return;
    if (cipRanking(mol, i)) out.push(i);
  });
  return out;
}

/**
 * Configuration R/S d'un centre à partir du dessin (coin plein = vers l'observateur,
 * coin hachuré = vers l'arrière). Coordonnées « mathématiques » (y vers le haut).
 */
export function rsFromDrawing(mol: Molecule, coords: Point[], center: number): 'R' | 'S' | null {
  const rank = cipRanking(mol, center);
  if (!rank) return null;
  const adj = adjacency(mol);
  const vec = new Map<number, [number, number, number]>();
  let hasDepth = false;
  for (const y of adj[center]) {
    const b = findBond(mol, center, y)!;
    let z = 0;
    if (b.stereo && b.a === center) {
      z = b.stereo === 'wedge' ? 0.8 : -0.8;
      hasDepth = true;
    }
    const dx = coords[y][0] - coords[center][0];
    const dy = coords[y][1] - coords[center][1];
    const len = Math.hypot(dx, dy) || 1;
    vec.set(y, [dx / len, dy / len, z]);
  }
  if (!hasDepth) return null;
  if (rank.includes(-1)) {
    const s = [...vec.values()].reduce((acc, v) => [acc[0] + v[0], acc[1] + v[1], acc[2] + v[2]], [0, 0, 0]);
    vec.set(-1, [-s[0], -s[1], -s[2]]);
  }
  const [va, vb, vc, vd] = rank.map((r) => vec.get(r)!);
  const sub = (p: number[], q: number[]) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
  const A = sub(va, vd);
  const B = sub(vb, vd);
  const C = sub(vc, vd);
  const cross = [B[1] * C[2] - B[2] * C[1], B[2] * C[0] - B[0] * C[2], B[0] * C[1] - B[1] * C[0]];
  const V = A[0] * cross[0] + A[1] * cross[1] + A[2] * cross[2];
  if (Math.abs(V) < 1e-6) return null;
  return V < 0 ? 'R' : 'S';
}
