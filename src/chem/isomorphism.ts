// Comparaison de molécules : deux graphes décrivent-ils la même molécule ?
import { type Molecule, adjacency, bondOrder as rawOrder, findRings, hydrogenCount } from './molecule';

// Les deux formes de Kekulé d'un cycle benzénique décrivent la même molécule :
// les liaisons du cycle reçoivent une étiquette « aromatique » commune (4).
const aromaticCache = new WeakMap<Molecule, Set<string>>();
function aromaticBonds(mol: Molecule): Set<string> {
  let s = aromaticCache.get(mol);
  if (s) return s;
  s = new Set();
  for (const r of findRings(mol)) {
    if (r.length !== 6) continue;
    const orders = r.map((a, i) => rawOrder(mol, a, r[(i + 1) % 6])).join('');
    if (orders === '212121' || orders === '121212')
      r.forEach((a, i) => {
        const b = r[(i + 1) % 6];
        s!.add(a < b ? `${a}-${b}` : `${b}-${a}`);
      });
  }
  aromaticCache.set(mol, s);
  return s;
}
function bondOrder(mol: Molecule, a: number, b: number): number {
  if (aromaticBonds(mol).has(a < b ? `${a}-${b}` : `${b}-${a}`)) return 4;
  return rawOrder(mol, a, b);
}

function hash(s: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c, 2246822519) >>> 0;
  }
  return h1.toString(36) + h2.toString(36);
}

/** Étiquettes raffinées (Weisfeiler-Lehman), comparables entre molécules. */
export function atomInvariants(mol: Molecule): string[] {
  const adj = adjacency(mol);
  let labels = mol.atoms.map((a, i) => `${a.el}|${adj[i].length}|${hydrogenCount(mol, i)}`);
  const n = mol.atoms.length;
  for (let iter = 0; iter < n; iter++) {
    const next = labels.map((l, i) =>
      hash(
        l +
          '[' +
          adj[i]
            .map((j) => `${bondOrder(mol, i, j)}${labels[j]}`)
            .sort()
            .join(',') +
          ']',
      ),
    );
    const before = new Set(labels).size;
    labels = next;
    if (new Set(next).size === before && iter > 1) break;
  }
  return labels;
}

/** Clé faible (identique pour deux molécules identiques). */
export function moleculeKey(mol: Molecule): string {
  return hash(atomInvariants(mol).slice().sort().join(';')) + ':' + mol.atoms.length + ':' + mol.bonds.length;
}

export function isSameMolecule(a: Molecule, b: Molecule): boolean {
  if (a.atoms.length !== b.atoms.length || a.bonds.length !== b.bonds.length) return false;
  const la = atomInvariants(a);
  const lb = atomInvariants(b);
  if (la.slice().sort().join(';') !== lb.slice().sort().join(';')) return false;
  return findMapping(a, b, la, lb) !== null;
}

/** Recherche d'une correspondance atome à atome (retour arrière). */
export function findMapping(
  a: Molecule,
  b: Molecule,
  la = atomInvariants(a),
  lb = atomInvariants(b),
): number[] | null {
  const n = a.atoms.length;
  const adjA = adjacency(a);
  const adjB = adjacency(b);
  const map = new Array<number>(n).fill(-1);
  const used = new Array<boolean>(n).fill(false);
  // ordre de parcours : BFS pour profiter des contraintes de voisinage
  const order: number[] = [];
  const seen = new Set<number>();
  for (let s = 0; s < n; s++) {
    if (seen.has(s)) continue;
    const q = [s];
    seen.add(s);
    while (q.length) {
      const x = q.shift()!;
      order.push(x);
      for (const y of adjA[x]) if (!seen.has(y)) {
        seen.add(y);
        q.push(y);
      }
    }
  }
  const rec = (k: number): boolean => {
    if (k === n) return true;
    const x = order[k];
    for (let y = 0; y < n; y++) {
      if (used[y] || lb[y] !== la[x]) continue;
      let ok = true;
      for (const xn of adjA[x]) {
        const yn = map[xn];
        if (yn === -1) continue;
        if (!adjB[y].includes(yn) || bondOrder(a, x, xn) !== bondOrder(b, y, yn)) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      map[x] = y;
      used[y] = true;
      if (rec(k + 1)) return true;
      map[x] = -1;
      used[y] = false;
    }
    return false;
  };
  return rec(0) ? map : null;
}

/** Supprime les doublons d'une liste de molécules. */
export function uniqueMolecules<T>(items: T[], get: (t: T) => Molecule): T[] {
  const out: T[] = [];
  const keys: string[] = [];
  for (const it of items) {
    const m = get(it);
    const k = moleculeKey(m);
    let dup = false;
    for (let i = 0; i < out.length; i++) {
      if (keys[i] === k && isSameMolecule(get(out[i]), m)) {
        dup = true;
        break;
      }
    }
    if (!dup) {
      out.push(it);
      keys.push(k);
    }
  }
  return out;
}
