// Analyseur SMILES restreint : suffisant pour décrire toutes les molécules
// utilisées dans les cours et les exercices (forme de Kekulé pour le benzène).
import { type Element, type Molecule, valenceProblems } from './molecule';

const ORGANIC: Element[] = ['Cl', 'Br', 'C', 'N', 'O', 'S', 'F', 'I'];

export class SmilesError extends Error {}

export function parseSmiles(smiles: string): Molecule {
  const mol: Molecule = { atoms: [], bonds: [] };
  const stack: number[] = [];
  const rings = new Map<number, { atom: number; order: number | null }>();
  let prev = -1;
  let pendingOrder: number | null = null;
  let pendingDir: '/' | '\\' | null = null;
  let i = 0;
  const s = smiles.trim();

  const connect = (atom: number) => {
    if (prev >= 0) {
      const bond: Molecule['bonds'][number] = { a: prev, b: atom, order: (pendingOrder ?? 1) as 1 | 2 | 3 };
      if (pendingDir) bond.dir = pendingDir;
      mol.bonds.push(bond);
    }
    pendingOrder = null;
    pendingDir = null;
    prev = atom;
  };

  while (i < s.length) {
    const ch = s[i];
    if (ch === '(') {
      if (prev < 0) throw new SmilesError('Parenthèse ouvrante sans atome');
      stack.push(prev);
      i++;
    } else if (ch === ')') {
      const p = stack.pop();
      if (p === undefined) throw new SmilesError('Parenthèse fermante sans ouvrante');
      prev = p;
      i++;
    } else if (ch === '-' || ch === '/' || ch === '\\') {
      pendingOrder = 1;
      if (ch !== '-') pendingDir = ch as '/' | '\\';
      i++;
    } else if (ch === '=') {
      pendingOrder = 2;
      i++;
    } else if (ch === '#') {
      pendingOrder = 3;
      i++;
    } else if (/[0-9%]/.test(ch)) {
      let num: number;
      if (ch === '%') {
        num = Number(s.slice(i + 1, i + 3));
        i += 3;
      } else {
        num = Number(ch);
        i++;
      }
      if (prev < 0) throw new SmilesError('Fermeture de cycle sans atome');
      const open = rings.get(num);
      if (open) {
        const order = (pendingOrder ?? open.order ?? 1) as 1 | 2 | 3;
        mol.bonds.push({ a: open.atom, b: prev, order });
        rings.delete(num);
      } else {
        rings.set(num, { atom: prev, order: pendingOrder });
      }
      pendingOrder = null;
      pendingDir = null;
    } else if (ch === '[') {
      const end = s.indexOf(']', i);
      if (end < 0) throw new SmilesError('Crochet non fermé');
      const inside = s.slice(i + 1, end).replace(/@+/g, '');
      const m = /^(Cl|Br|C|N|O|S|F|I)(H(\d?))?$/.exec(inside);
      if (!m) throw new SmilesError(`Atome non pris en charge : [${inside}]`);
      const el = m[1] as Element;
      const h = m[2] ? (m[3] ? Number(m[3]) : 1) : 0;
      mol.atoms.push({ el, explicitH: h });
      connect(mol.atoms.length - 1);
      i = end + 1;
    } else {
      const el = ORGANIC.find((e) => s.startsWith(e, i));
      if (!el) throw new SmilesError(`Caractère inattendu « ${ch} » dans ${smiles}`);
      mol.atoms.push({ el });
      connect(mol.atoms.length - 1);
      i += el.length;
    }
  }
  if (stack.length) throw new SmilesError('Parenthèse non fermée');
  if (rings.size) throw new SmilesError('Cycle non fermé');
  const pb = valenceProblems(mol);
  if (pb.length) throw new SmilesError(`Valence impossible : ${pb[0].message}`);
  return mol;
}

/** Écrit un SMILES (non canonique) — utile pour le débogage et l'export. */
export function toSmiles(mol: Molecule): string {
  const n = mol.atoms.length;
  if (!n) return '';
  const adj: number[][] = mol.atoms.map(() => []);
  for (const b of mol.bonds) {
    adj[b.a].push(b.b);
    adj[b.b].push(b.a);
  }
  const order = (a: number, b: number) =>
    mol.bonds.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a))!.order;
  const sym = (o: number) => (o === 2 ? '=' : o === 3 ? '#' : '');
  const visited = new Array(n).fill(false);
  const ringLabels = new Map<string, number>();
  let nextLabel = 1;
  // repérer les liaisons de fermeture de cycle via un premier DFS
  const treeEdge = new Set<string>();
  const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const dfs1 = (x: number, p: number) => {
    visited[x] = true;
    for (const y of adj[x]) {
      if (y === p) continue;
      if (!visited[y]) {
        treeEdge.add(key(x, y));
        dfs1(y, x);
      }
    }
  };
  dfs1(0, -1);
  visited.fill(false);
  const out: string[] = [];
  const write = (x: number, p: number) => {
    visited[x] = true;
    out.push(mol.atoms[x].el);
    for (const y of adj[x]) {
      if (y === p || treeEdge.has(key(x, y))) continue;
      const k = key(x, y);
      if (!ringLabels.has(k)) {
        ringLabels.set(k, nextLabel);
        out.push(sym(order(x, y)) + String(nextLabel++));
      } else {
        out.push(String(ringLabels.get(k)));
      }
    }
    const children = adj[x].filter((y) => y !== p && treeEdge.has(key(x, y)) && !visited[y]);
    children.forEach((y, idx) => {
      const last = idx === children.length - 1;
      if (!last) out.push('(');
      out.push(sym(order(x, y)));
      write(y, x);
      if (!last) out.push(')');
    });
  };
  write(0, -1);
  return out.join('');
}
