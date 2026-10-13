// Calcul des coordonnées 2D des atomes.
//  - layoutSkeletal : formule topologique (zigzag à 120°, cycles réguliers, alignement
//    des liaisons triples).
//  - layoutGrid : formules développées et semi-développées (molécules acycliques),
//    sur une grille : chaîne principale horizontale, ramifications verticales.
import { type Molecule, adjacency, bondOrder, findBond, findRings, hydrogenCount } from './molecule';
import { smilesRelation } from './stereo';

export type Point = [number, number];

const DEG = Math.PI / 180;

function longestCarbonPath(mol: Molecule, allowed: (i: number) => boolean): number[] {
  const adj = adjacency(mol);
  const nodes = mol.atoms.map((_, i) => i).filter(allowed);
  if (!nodes.length) return [];
  const bfs = (s: number) => {
    const dist = new Map<number, number>([[s, 0]]);
    const prev = new Map<number, number>();
    const q = [s];
    while (q.length) {
      const x = q.shift()!;
      for (const y of adj[x]) {
        if (!allowed(y) || dist.has(y)) continue;
        dist.set(y, dist.get(x)! + 1);
        prev.set(y, x);
        q.push(y);
      }
    }
    let far = s;
    for (const [k, v] of dist) if (v > dist.get(far)!) far = k;
    return { far, prev };
  };
  const a = bfs(nodes[0]).far;
  const { far: b, prev } = bfs(a);
  const path = [b];
  while (path[path.length - 1] !== a) path.push(prev.get(path[path.length - 1])!);
  return path.reverse();
}

function isSp(mol: Molecule, i: number): boolean {
  let doubles = 0;
  for (const b of mol.bonds) {
    if (b.a !== i && b.b !== i) continue;
    if (b.order === 3) return true;
    if (b.order === 2) doubles++;
  }
  return doubles >= 2;
}

const norm = (a: number) => ((a % 360) + 360) % 360;

export function layoutSkeletal(mol: Molecule, mainChain?: number[], mainIsRing = false): Point[] {
  if (mol.coords && mol.coords.length === mol.atoms.length) return mol.coords.map((c) => [c[0], c[1]]);
  const n = mol.atoms.length;
  const pos: (Point | null)[] = new Array(n).fill(null);
  const turn: number[] = new Array(n).fill(1);
  const adj = adjacency(mol);
  const rings = findRings(mol);
  const ringOf = new Array<number>(n).fill(-1);
  rings.forEach((r, ri) => r.forEach((a) => (ringOf[a] = ri)));
  const placedRing = new Set<number>();
  const queue: number[] = [];

  const placeRing = (ri: number, entry: number, dirDeg: number | null, center?: Point) => {
    const ring = rings[ri];
    const k = ring.length;
    const R = 1 / (2 * Math.sin(Math.PI / k));
    const start = ring.indexOf(entry);
    // ordre de parcours à partir de l'atome d'entrée
    const ordered = Array.from({ length: k }, (_, j) => ring[(start + j) % k]);
    let c: Point;
    let a0: number;
    if (center) {
      c = center;
      a0 = 90;
    } else {
      const p = pos[entry]!;
      c = [p[0] + R * Math.cos(dirDeg! * DEG), p[1] + R * Math.sin(dirDeg! * DEG)];
      a0 = dirDeg! + 180;
    }
    ordered.forEach((atom, j) => {
      const ang = (a0 - (360 / k) * j) * DEG;
      if (!pos[atom]) pos[atom] = [c[0] + R * Math.cos(ang), c[1] + R * Math.sin(ang)];
      queue.push(atom);
    });
    placedRing.add(ri);
  };

  // 1. structure principale
  if (!mainChain || !mainChain.length) {
    if (rings.length) {
      mainChain = rings[0];
      mainIsRing = true;
    } else {
      mainChain = longestCarbonPath(mol, (i) => mol.atoms[i].el === 'C');
      if (!mainChain.length) mainChain = [0];
    }
  }
  if (mainIsRing) {
    const ri = ringOf[mainChain[0]];
    // respecter l'ordre de numérotation (sens horaire)
    const ring = rings[ri];
    const k = ring.length;
    const R = 1 / (2 * Math.sin(Math.PI / k));
    mainChain.forEach((atom, j) => {
      const ang = (90 - (360 / k) * j) * DEG;
      pos[atom] = [R * Math.cos(ang), R * Math.sin(ang)];
      queue.push(atom);
    });
    placedRing.add(ri);
  } else {
    // zigzag : on tourne alternativement de ±60° ; pas de virage sur un carbone sp ;
    // même sens de virage pour une double liaison Z (substituants du même côté).
    let dir = 30;
    let lastTurn = 60;
    let x = 0;
    let y = 0;
    pos[mainChain[0]] = [0, 0];
    for (let k = 1; k < mainChain.length; k++) {
      if (k > 1) {
        const m = mainChain[k - 1];
        let t: number;
        if (isSp(mol, m)) t = 0;
        else {
          t = -lastTurn;
          const p = mainChain[k - 2];
          if (k >= 3 && findBond(mol, p, m)?.order === 2) {
            const rel = smilesRelation(mol, p, m, mainChain[k - 3], mainChain[k]);
            if (rel === 'cis') t = lastTurn;
          }
          lastTurn = t;
        }
        dir += t;
        turn[m] = t > 0 ? 1 : t < 0 ? -1 : turn[mainChain[k - 2]];
      }
      x += Math.cos(dir * DEG);
      y += Math.sin(dir * DEG);
      pos[mainChain[k]] = [x, y];
    }
    mainChain.forEach((a) => queue.push(a));
    // un cycle traversé par la chaîne (rare) sera placé lors de l'expansion
  }

  // 2. expansion depuis les atomes placés
  const dist2 = (p: Point, q: Point) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
  const crowding = (p: Point, skip: number) => {
    let m = Infinity;
    pos.forEach((q, i) => {
      if (q && i !== skip) m = Math.min(m, dist2(p, q));
    });
    return m;
  };
  // Choix de l'angle respectant une double liaison Z/E décrite dans le SMILES.
  const stereoChoice = (a: number, child: number, options: number[]): number | null => {
    const pa = pos[a]!;
    for (const b of adj[a]) {
      if (!pos[b] || findBond(mol, a, b)?.order !== 2) continue;
      const ref = adj[b].find((z) => z !== a && pos[z]);
      if (ref === undefined) continue;
      const rel = smilesRelation(mol, a, b, child, ref);
      if (!rel) continue;
      const pb = pos[b]!;
      const side = (p: Point) => Math.sign((pb[0] - pa[0]) * (p[1] - pa[1]) - (pb[1] - pa[1]) * (p[0] - pa[0]));
      const refSide = side(pos[ref]!);
      for (const ang of options) {
        const p: Point = [pa[0] + Math.cos(ang * DEG), pa[1] + Math.sin(ang * DEG)];
        if ((side(p) === refSide) === (rel === 'cis')) return ang;
      }
    }
    return null;
  };
  const guard = n * 8;
  let steps = 0;
  while (queue.length && steps++ < guard * 4) {
    const a = queue.shift()!;
    const pa = pos[a]!;
    const unplaced = adj[a].filter((y) => !pos[y]);
    if (!unplaced.length) continue;
    const placedDirs = adj[a]
      .filter((y) => pos[y])
      .map((y) => norm(Math.atan2(pos[y]![1] - pa[1], pos[y]![0] - pa[0]) / DEG));
    // les atomes de cycle non placés seront posés avec leur cycle
    let angles: number[] = [];
    const k = unplaced.length;
    if (placedDirs.length === 1) {
      const inc = norm(placedDirs[0] + 180);
      if (k === 1) {
        if (isSp(mol, a)) angles = [inc];
        else {
          const pref = -turn[a] || -1;
          const opt1 = norm(inc + 60 * pref);
          const opt2 = norm(inc - 60 * pref);
          const test = (ang: number): Point => [pa[0] + Math.cos(ang * DEG), pa[1] + Math.sin(ang * DEG)];
          const c1 = crowding(test(opt1), a);
          const c2 = crowding(test(opt2), a);
          angles = [c2 > c1 + 0.3 ? opt2 : opt1];
          const forced = stereoChoice(a, unplaced[0], [opt1, opt2]);
          if (forced !== null) angles = [forced];
        }
      } else if (k === 2) {
        angles = [norm(inc + 60), norm(inc - 60)];
        const forced = stereoChoice(a, unplaced[0], angles);
        if (forced !== null && forced !== angles[0]) angles.reverse();
      }
      else angles = [norm(inc + 90), inc, norm(inc - 90)].slice(0, k);
    } else if (placedDirs.length === 0) {
      angles = Array.from({ length: k }, (_, j) => norm(30 + (360 / k) * j));
    } else if (placedDirs.length === 2 && k === 2) {
      // carbone quaternaire dans une chaîne : un substituant de chaque côté (en croix)
      const [d1, d2] = [...placedDirs].sort((x, y) => x - y);
      const midSmall = d2 - d1 <= 180 ? (d1 + d2) / 2 : norm((d1 + d2) / 2 + 180);
      angles = [norm(midSmall + 180), midSmall];
    } else {
      const sorted = [...placedDirs].sort((x, y) => x - y);
      let bestGap = -1;
      let gapStart = 0;
      sorted.forEach((d, i) => {
        const next = i === sorted.length - 1 ? sorted[0] + 360 : sorted[i + 1];
        if (next - d > bestGap) {
          bestGap = next - d;
          gapStart = d;
        }
      });
      angles = Array.from({ length: k }, (_, j) => norm(gapStart + (bestGap * (j + 1)) / (k + 1)));
    }
    unplaced.forEach((y, j) => {
      const ang = angles[j] ?? angles[0];
      if (ringOf[y] !== -1 && !placedRing.has(ringOf[y])) {
        pos[y] = [pa[0] + Math.cos(ang * DEG), pa[1] + Math.sin(ang * DEG)];
        placeRing(ringOf[y], y, ang);
        return;
      }
      if (pos[y]) return;
      pos[y] = [pa[0] + Math.cos(ang * DEG), pa[1] + Math.sin(ang * DEG)];
      const parentDir = placedDirs.length === 1 ? norm(placedDirs[0] + 180) : ang;
      const diff = norm(ang - parentDir);
      turn[y] = diff === 0 ? turn[a] : diff < 180 ? 1 : -1;
      queue.push(y);
    });
  }
  pos.forEach((p, i) => {
    if (!p) pos[i] = [i * 0.5, -3];
  });
  return resolveCollisions(mol, pos as Point[], mainChain);
}

/** Si deux atomes non liés se chevauchent, on retourne (miroir) une ramification. */
function resolveCollisions(mol: Molecule, pos: Point[], main: number[]): Point[] {
  const adj = adjacency(mol);
  const mainSet = new Set(main);
  const tooClose = () => {
    for (let i = 0; i < pos.length; i++)
      for (let j = i + 1; j < pos.length; j++) {
        if (adj[i].includes(j)) continue;
        const d = Math.hypot(pos[i][0] - pos[j][0], pos[i][1] - pos[j][1]);
        if (d < 0.55) return [i, j];
      }
    return null;
  };
  const subtree = (root: number, from: number) => {
    const seen = new Set([root]);
    const st = [root];
    while (st.length) {
      const x = st.pop()!;
      for (const y of adj[x]) if (y !== from && !seen.has(y) && !(x === root && y === from)) {
        if (mainSet.has(y)) continue;
        seen.add(y);
        st.push(y);
      }
    }
    return [...seen];
  };
  for (let iter = 0; iter < 6; iter++) {
    const c = tooClose();
    if (!c) break;
    let fixed = false;
    for (const atom of c) {
      if (mainSet.has(atom)) continue;
      // remonter jusqu'à la racine de la ramification (voisin de la chaîne principale)
      let x = atom;
      let parent = -1;
      const visited = new Set<number>();
      while (!visited.has(x)) {
        visited.add(x);
        const p = adj[x].find((y) => mainSet.has(y));
        if (p !== undefined) {
          parent = p;
          break;
        }
        const up = adj[x].find((y) => !visited.has(y));
        if (up === undefined) break;
        x = up;
      }
      if (parent < 0) continue;
      const atoms = subtree(x, parent);
      const [ox, oy] = pos[parent];
      const [rx, ry] = pos[x];
      const dx = rx - ox;
      const dy = ry - oy;
      const len2 = dx * dx + dy * dy;
      for (const a of atoms) {
        if (a === x) continue;
        const px = pos[a][0] - ox;
        const py = pos[a][1] - oy;
        const t = (px * dx + py * dy) / len2;
        const fx = t * dx;
        const fy = t * dy;
        pos[a] = [ox + 2 * fx - px, oy + 2 * fy - py];
      }
      fixed = true;
      break;
    }
    if (!fixed) break;
  }
  return pos;
}

export function hasOverlaps(mol: Molecule, pos: Point[], minDist = 0.5): boolean {
  const adj = adjacency(mol);
  for (let i = 0; i < pos.length; i++)
    for (let j = i + 1; j < pos.length; j++) {
      if (adj[i].includes(j)) continue;
      if (Math.hypot(pos[i][0] - pos[j][0], pos[i][1] - pos[j][1]) < minDist) return true;
    }
  return false;
}

// ---------------------------------------------------------------------------
// Grille (formules développée et semi-développée)

export interface GridLayout {
  /** Position (colonne, ligne) de chaque atome lourd. */
  cells: Point[];
  /** Positions des H explicites (formule développée) : [atome, colonne, ligne]. */
  hydrogens: { atom: number; cell: Point }[];
}

const DIRS: Record<string, Point> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export function layoutGrid(mol: Molecule, mainChain?: number[], spacing = 1): GridLayout | null {
  if (findRings(mol).length) return null;
  const adj = adjacency(mol);
  let chain = mainChain && mainChain.length ? [...mainChain] : longestCarbonPath(mol, (i) => mol.atoms[i].el === 'C');
  if (!chain.length) chain = [0];
  // groupe terminal (COOH, CHO…) écrit à droite : CH3–CH2–COOH
  const first = chain[0];
  const terminalGroup = adj[first].some((y) => mol.atoms[y].el !== 'C' && bondOrder(mol, first, y) >= 2);
  if (terminalGroup && chain.length > 1) chain.reverse();

  const cells: (Point | null)[] = mol.atoms.map(() => null);
  const occupied = new Map<string, number>();
  const key = (p: Point) => `${p[0]},${p[1]}`;
  const put = (atom: number, p: Point) => {
    if (occupied.has(key(p))) return false;
    cells[atom] = p;
    occupied.set(key(p), atom);
    return true;
  };
  chain.forEach((a, i) => put(a, [i * spacing, 0]));
  const queue: { atom: number; from: number; dir: string | null }[] = chain.map((a) => ({ atom: a, from: -1, dir: null }));
  const chainSet = new Set(chain);
  while (queue.length) {
    const { atom, dir } = queue.shift()!;
    const p = cells[atom]!;
    const kids = adj[atom].filter((y) => !cells[y]);
    // O doublement lié en haut en priorité
    kids.sort((x, y) => bondOrder(mol, atom, y) - bondOrder(mol, atom, x));
    for (const kid of kids) {
      let prefs: string[];
      const isDoubleO = mol.atoms[kid].el !== 'C' && bondOrder(mol, atom, kid) >= 2;
      if (chainSet.has(atom)) {
        const idx = chain.indexOf(atom);
        const end = idx === 0 ? 'left' : idx === chain.length - 1 ? 'right' : null;
        if (chain.length === 1) prefs = isDoubleO ? ['up', 'down', 'right', 'left'] : ['right', 'up', 'down', 'left'];
        else if (isDoubleO) prefs = ['up', 'down', ...(end ? [end] : [])];
        else prefs = end ? [end, 'up', 'down'] : ['up', 'down'];
      } else {
        const perp = dir === 'up' || dir === 'down' ? ['right', 'left'] : ['up', 'down'];
        prefs = dir ? [dir, ...perp] : ['up', 'down', 'right', 'left'];
      }
      let ok = false;
      for (const d of prefs) {
        const np: Point = [p[0] + DIRS[d][0] * spacing, p[1] + DIRS[d][1] * spacing];
        if (put(kid, np)) {
          queue.push({ atom: kid, from: atom, dir: d });
          ok = true;
          break;
        }
      }
      if (!ok) return null;
    }
  }
  return { cells: cells as Point[], hydrogens: [] };
}

/** Formule développée : grille espacée de 2 et hydrogènes explicites à distance 1. */
export function layoutDeveloped(mol: Molecule, mainChain?: number[]): GridLayout | null {
  const g = layoutGrid(mol, mainChain, 2);
  if (!g) return null;
  const occupied = new Set(g.cells.map((c) => `${c[0]},${c[1]}`));
  const adj = adjacency(mol);
  const hydrogens: { atom: number; cell: Point }[] = [];
  for (let i = 0; i < mol.atoms.length; i++) {
    const h = hydrogenCount(mol, i);
    if (!h) continue;
    const c = g.cells[i];
    const used = new Set(
      adj[i].map((y) => {
        const d = g.cells[y];
        return `${Math.sign(d[0] - c[0])},${Math.sign(d[1] - c[1])}`;
      }),
    );
    const free = (['left', 'right', 'up', 'down'] as const)
      .map((d) => DIRS[d])
      .filter((d) => !used.has(`${d[0]},${d[1]}`));
    // pour un atome lié à droite seulement, on commence par la gauche, etc.
    let placed = 0;
    for (const d of free) {
      if (placed >= h) break;
      const cell: Point = [c[0] + d[0], c[1] + d[1]];
      const k = `${cell[0]},${cell[1]}`;
      if (occupied.has(k)) return null;
      occupied.add(k);
      hydrogens.push({ atom: i, cell });
      placed++;
    }
    if (placed < h) return null;
  }
  return { cells: g.cells, hydrogens };
}
