// Rendu SVG des molécules (formule topologique, semi-développée, développée).
// Les dessins sont calculés à partir de la structure réelle utilisée par l'exercice.
import { useMemo } from 'react';
import { type Molecule, adjacency, bondOrder, findRings, hydrogenCount } from '../chem/molecule';
import { layoutSkeletal, layoutGrid, layoutDeveloped, type Point } from '../chem/layout';
import type { NamingResult } from '../chem/nomenclature/namer';
import { analyse } from '../exercises/generate';
import { parseSmiles } from '../chem/smiles';
import type { ShowOption } from '../content/lessons';

export type MolMode = 'topo' | 'semi' | 'dev';

export interface MoleculeViewProps {
  smiles?: string;
  mol?: Molecule;
  mode?: MolMode;
  show?: ShowOption[];
  naming?: NamingResult | null;
  selectable?: boolean;
  selected?: number[];
  onAtomClick?: (atom: number) => void;
  marked?: number[];
  /** Atomes à surligner en vert (correction). */
  goodAtoms?: number[];
  stereo?: { bond?: number; type?: 'wedge' | 'hash' };
  coords?: Point[];
  size?: 'sm' | 'md' | 'lg';
  title?: string;
}

const EL_COLOR: Record<string, string> = {
  O: 'var(--el-o)',
  N: 'var(--el-n)',
  Cl: 'var(--el-cl)',
  Br: 'var(--el-br)',
  I: 'var(--el-i)',
  F: 'var(--el-f)',
  S: 'var(--el-s)',
  C: 'var(--mol-ink)',
};

export const SUB_COLORS = ['var(--sub-1)', 'var(--sub-2)', 'var(--sub-3)', 'var(--sub-4)', 'var(--sub-5)'];

const SUBSCRIPT = '₀₁₂₃₄₅₆₇₈₉';
const sub = (n: number) => (n > 1 ? String(n).replace(/\d/g, (d) => SUBSCRIPT[Number(d)]) : '');

function heteroLabel(mol: Molecule, i: number, hFirst: boolean): string {
  const el = mol.atoms[i].el;
  const h = hydrogenCount(mol, i);
  if (!h) return el;
  const hs = 'H' + sub(h);
  return hFirst ? hs + el : el + hs;
}

function carbonLabel(mol: Molecule, i: number, withH: boolean): string {
  const h = hydrogenCount(mol, i);
  return withH && h ? 'CH' + sub(h) : 'C';
}

/** Groupes de couleurs pour les substituants et fonctions. */
function highlightSets(naming: NamingResult | null | undefined) {
  const subs: { atoms: number[]; color: string; attach: number | null }[] = [];
  const groups: number[] = [];
  if (!naming) return { subs, groups };
  const parent = new Set(naming.parentAtoms);
  naming.substituents.forEach((s, i) => {
    const color = SUB_COLORS[i % SUB_COLORS.length];
    subs.push({ atoms: s.atoms, color, attach: null });
  });
  for (const g of naming.groups) {
    if (g.cls === 'ether' || g.cls === 'halogen') {
      groups.push(...g.atoms);
      continue;
    }
    groups.push(...g.atoms);
    if (parent.has(g.carbon) || g.cls === 'acid' || g.cls === 'ester' || g.cls === 'aldehyde' || g.cls === 'ketone' || g.cls === 'nitrile' || g.cls === 'amide')
      groups.push(g.carbon);
  }
  return { subs, groups: [...new Set(groups)] };
}

export function MoleculeView(props: MoleculeViewProps) {
  const { mode = 'topo' } = props;
  const data = useMemo(() => {
    if (props.mol) return { mol: props.mol, naming: props.naming ?? null };
    const a = analyse(props.smiles!);
    return { mol: a.mol, naming: props.naming === undefined ? a.naming : props.naming };
  }, [props.smiles, props.mol, props.naming]);
  if (mode !== 'topo') {
    const grid = mode === 'semi' ? layoutGrid(data.mol, data.naming?.parentAtoms) : layoutDeveloped(data.mol, data.naming?.parentAtoms);
    if (grid) return <GridView {...props} mol={data.mol} naming={data.naming} grid={grid} dev={mode === 'dev'} />;
    return (
      <div className="text-sm text-ink-2 italic p-3 text-center">
        La formule {mode === 'semi' ? 'semi-développée' : 'développée'} n’est pas proposée pour cette molécule (cycle ou dessin trop encombré) : utilise la formule topologique.
      </div>
    );
  }
  return <SkeletalView {...props} mol={data.mol} naming={data.naming} />;
}

// ---------------------------------------------------------------------------
// Formule topologique

function SkeletalView(props: MoleculeViewProps & { mol: Molecule; naming: NamingResult | null }) {
  const { mol, naming, show = [], selectable, selected = [], onAtomClick, marked = [], goodAtoms = [], stereo, size = 'md' } = props;
  const pos = useMemo(
    () => props.coords ?? layoutSkeletal(mol, naming?.parentAtoms, naming?.isRing),
    [mol, naming, props.coords],
  );
  const adj = useMemo(() => adjacency(mol), [mol]);
  const rings = useMemo(() => findRings(mol), [mol]);
  const S = 38;
  const P = (p: Point): [number, number] => [p[0] * S, -p[1] * S];
  const pts = pos.map(P);
  const showCarbons = show.includes('carbons') || show.includes('hydrogens');
  const onlyOneCarbon = mol.atoms.length === 1;
  const labelOf = (i: number): string | null => {
    const el = mol.atoms[i].el;
    if (el === 'C') {
      if (onlyOneCarbon) return 'CH' + sub(hydrogenCount(mol, i));
      return null;
    }
    const nb = adj[i];
    const avgDx = nb.reduce((s, j) => s + (pos[j][0] - pos[i][0]), 0) / Math.max(1, nb.length);
    return heteroLabel(mol, i, avgDx > 0.3);
  };
  const labels = mol.atoms.map((_, i) => labelOf(i));
  const shrink = (i: number) => (labels[i] ? 0.3 * S : showCarbons ? 0.22 * S : 0);
  const { subs, groups } = highlightSets(naming);
  const parentAtoms = naming?.parentAtoms ?? [];

  // boîte englobante
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const pad = 30;
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad;
  const w = Math.max(maxX - minX, 60);
  const h = Math.max(maxY - minY, 50);
  const maxH = size === 'sm' ? 120 : size === 'lg' ? 300 : 210;

  const segment = (a: number, b: number, offset = 0, trim = 0) => {
    let [x1, y1] = pts[a];
    let [x2, y2] = pts[b];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const s1 = shrink(a) + trim;
    const s2 = shrink(b) + trim;
    x1 += ux * s1;
    y1 += uy * s1;
    x2 -= ux * s2;
    y2 -= uy * s2;
    const nx = -uy * offset;
    const ny = ux * offset;
    return { x1: x1 + nx, y1: y1 + ny, x2: x2 + nx, y2: y2 + ny };
  };

  const ringCenter = (a: number, b: number): [number, number] | null => {
    const r = rings.find((rr) => rr.includes(a) && rr.includes(b));
    if (!r) return null;
    const cx = r.reduce((s, i) => s + pts[i][0], 0) / r.length;
    const cy = r.reduce((s, i) => s + pts[i][1], 0) / r.length;
    return [cx, cy];
  };

  const bondEls = mol.bonds.map((bd, idx) => {
    const { a, b, order } = bd;
    const isStereo = stereo?.bond === idx && stereo.type;
    if (isStereo) {
      const from = bd.a;
      const to = bd.b;
      const [x1, y1] = pts[from];
      const s = segment(from, to);
      const dx = s.x2 - x1;
      const dy = s.y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = (-dy / len) * 5;
      const ny = (dx / len) * 5;
      if (stereo!.type === 'wedge')
        return <polygon key={idx} points={`${x1},${y1} ${s.x2 + nx},${s.y2 + ny} ${s.x2 - nx},${s.y2 - ny}`} fill="var(--mol-ink)" />;
      const lines = [];
      for (let k = 1; k <= 6; k++) {
        const t = k / 6;
        const cx = x1 + dx * t;
        const cy = y1 + dy * t;
        lines.push(<line key={k} x1={cx - nx * t} y1={cy - ny * t} x2={cx + nx * t} y2={cy + ny * t} stroke="var(--mol-ink)" strokeWidth={1.4} />);
      }
      return <g key={idx}>{lines}</g>;
    }
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    if (order === 1) lines.push(segment(a, b));
    else if (order === 2) {
      const rc = ringCenter(a, b);
      if (rc) {
        lines.push(segment(a, b));
        const base = segment(a, b);
        const mx = (base.x1 + base.x2) / 2;
        const my = (base.y1 + base.y2) / 2;
        const side = Math.sign((base.x2 - base.x1) * (rc[1] - my) - (base.y2 - base.y1) * (rc[0] - mx)) || 1;
        lines.push(segment(a, b, side * 6, 6));
      } else {
        lines.push(segment(a, b, 3.2), segment(a, b, -3.2));
      }
    } else {
      lines.push(segment(a, b), segment(a, b, 4.6), segment(a, b, -4.6));
    }
    return (
      <g key={idx}>
        {lines.map((l, k) => (
          <line key={k} {...l} stroke="var(--mol-ink)" strokeWidth={1.8} strokeLinecap="round" />
        ))}
      </g>
    );
  });

  // surlignages
  const halos: React.ReactNode[] = [];
  if (show.includes('chain') && parentAtoms.length) {
    const seq = [...parentAtoms];
    if (naming?.isRing) seq.push(parentAtoms[0]);
    for (let k = 0; k < seq.length - 1; k++) {
      const [x1, y1] = pts[seq[k]];
      const [x2, y2] = pts[seq[k + 1]];
      halos.push(<line key={`c${k}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--mol-chain)" strokeWidth={13} strokeLinecap="round" />);
    }
    if (parentAtoms.length === 1) {
      const [x, y] = pts[parentAtoms[0]];
      halos.push(<circle key="c1" cx={x} cy={y} r={9} fill="var(--mol-chain)" />);
    }
  }
  if (show.includes('subs')) {
    subs.forEach((s, si) => {
      const set = new Set(s.atoms);
      mol.bonds.forEach((bd, k) => {
        const inA = set.has(bd.a);
        const inB = set.has(bd.b);
        if (!inA && !inB) return;
        const [x1, y1] = pts[bd.a];
        const [x2, y2] = pts[bd.b];
        halos.push(<line key={`s${si}-${k}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={s.color} strokeWidth={inA && inB ? 10 : 6} strokeLinecap="round" opacity={inA && inB ? 0.75 : 0.45} />);
      });
      s.atoms.forEach((a) => {
        const [x, y] = pts[a];
        halos.push(<circle key={`sa${si}-${a}`} cx={x} cy={y} r={6} fill={s.color} opacity={0.75} />);
      });
    });
  }
  if (show.includes('groups')) {
    groups.forEach((a) => {
      const [x, y] = pts[a];
      halos.push(<circle key={`g${a}`} cx={x} cy={y} r={13} fill="var(--mol-group)" />);
    });
  }
  goodAtoms.forEach((a) => {
    const [x, y] = pts[a];
    halos.push(<circle key={`ok${a}`} cx={x} cy={y} r={11} fill="var(--ok-soft-strong)" />);
  });
  selected.forEach((a) => {
    const [x, y] = pts[a];
    halos.push(<circle key={`sel${a}`} cx={x} cy={y} r={10} fill="var(--brand-soft)" stroke="var(--brand)" strokeWidth={2} />);
  });

  // numéros
  const numberEls: React.ReactNode[] = [];
  if (show.includes('numbers') && naming) {
    naming.parentAtoms.forEach((a, i) => {
      const dirs = adj[a].map((j) => Math.atan2(pts[j][1] - pts[a][1], pts[j][0] - pts[a][0]));
      let ang: number;
      if (!dirs.length) ang = -Math.PI / 2;
      else {
        const sorted = [...dirs].sort((x, y) => x - y);
        let best = -1;
        ang = 0;
        sorted.forEach((d, k) => {
          const next = k === sorted.length - 1 ? sorted[0] + 2 * Math.PI : sorted[k + 1];
          if (next - d > best) {
            best = next - d;
            ang = d + (next - d) / 2;
          }
        });
      }
      const r = labels[a] ? 20 : 15;
      const x = pts[a][0] + Math.cos(ang) * r;
      const y = pts[a][1] + Math.sin(ang) * r;
      numberEls.push(
        <g key={`n${a}`}>
          <circle cx={x} cy={y} r={7.5} fill="var(--num-bg)" />
          <text x={x} y={y + 3.4} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--num-ink)">
            {i + 1}
          </text>
        </g>,
      );
    });
  }

  const labelEls = mol.atoms.map((at, i) => {
    const [x, y] = pts[i];
    let text = labels[i];
    let color = EL_COLOR[at.el] ?? 'var(--mol-ink)';
    let small = false;
    if (!text && showCarbons) {
      text = carbonLabel(mol, i, show.includes('hydrogens'));
      color = 'var(--ink-3)';
      small = true;
    }
    if (!text) return null;
    return (
      <g key={`l${i}`}>
        <rect x={x - text.length * 4.6} y={y - 9} width={text.length * 9.2} height={18} rx={6} fill="var(--mol-bg)" />
        <text x={x} y={y + 5} textAnchor="middle" fontSize={small ? 12 : 14.5} fontWeight={small ? 500 : 650} fill={color}>
          {text}
        </text>
      </g>
    );
  });

  const markEls = marked.map((a) => {
    const [x, y] = pts[a];
    return <circle key={`m${a}`} cx={x} cy={y} r={12} fill="none" stroke="var(--brand)" strokeWidth={2.4} strokeDasharray="4 3" />;
  });

  const hitEls = selectable
    ? mol.atoms.map((at, i) => {
        const [x, y] = pts[i];
        return (
          <g key={`h${i}`} className="cursor-pointer" onClick={() => onAtomClick?.(i)} role="button" aria-label={`Atome ${at.el} ${i + 1}`}>
            {at.el === 'C' && !selected.includes(i) && <circle cx={x} cy={y} r={3.2} fill="var(--ink-3)" opacity={0.5} />}
            <circle cx={x} cy={y} r={15} fill="transparent" />
          </g>
        );
      })
    : null;

  return (
    <svg
      viewBox={`${minX} ${minY} ${w} ${h}`}
      style={{ maxHeight: maxH, width: '100%' }}
      className="block mx-auto select-none"
      role="img"
      aria-label={props.title ?? 'Formule topologique'}
    >
      <g>{halos}</g>
      <g>{bondEls}</g>
      <g>{labelEls}</g>
      <g>{markEls}</g>
      <g>{numberEls}</g>
      <g>{hitEls}</g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Formules sur grille

function GridView(props: MoleculeViewProps & { mol: Molecule; naming: NamingResult | null; grid: NonNullable<ReturnType<typeof layoutGrid>>; dev: boolean }) {
  const { mol, naming, grid, dev, show = [] } = props;
  const adj = adjacency(mol);
  const U = dev ? 26 : 1;
  const DX = dev ? U : 62;
  const DY = dev ? U : 46;
  const pos = (c: Point): [number, number] => [c[0] * DX, c[1] * DY];
  const label = (i: number) => {
    const el = mol.atoms[i].el;
    if (dev) return el;
    const h = hydrogenCount(mol, i);
    // H à gauche si l'atome n'a qu'un voisin, situé à sa droite
    const nb = adj[i];
    const hFirst = nb.length === 1 && grid.cells[nb[0]][0] > grid.cells[i][0] && el !== 'C';
    if (el === 'C') return h ? 'CH' + sub(h) : 'C';
    if (!h) return el;
    return hFirst ? 'H' + sub(h) + el : el + 'H' + sub(h);
  };
  const cells = grid.cells.map(pos);
  const hs = grid.hydrogens.map((h) => ({ atom: h.atom, p: pos(h.cell) }));
  const all = [...cells, ...hs.map((h) => h.p)];
  const pad = 26;
  const minX = Math.min(...all.map((p) => p[0])) - pad - 10;
  const maxX = Math.max(...all.map((p) => p[0])) + pad + 10;
  const minY = Math.min(...all.map((p) => p[1])) - pad;
  const maxY = Math.max(...all.map((p) => p[1])) + pad;
  const labelW = (t: string) => Math.max(10, t.replace(/[₀-₉]/g, '').length * 9 + (t.match(/[₀-₉]/g)?.length ?? 0) * 5);
  const { subs, groups } = highlightSets(naming);
  const subColor = new Map<number, string>();
  if (show.includes('subs')) subs.forEach((s) => s.atoms.forEach((a) => subColor.set(a, s.color)));
  const parent = naming?.parentAtoms ?? [];

  const bondLine = (a: [number, number], b: [number, number], ta: string, tb: string, order: number, key: string) => {
    const horizontal = Math.abs(a[1] - b[1]) < 1;
    const ra = horizontal ? labelW(ta) / 2 + 3 : 10;
    const rb = horizontal ? labelW(tb) / 2 + 3 : 10;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const x1 = a[0] + ux * ra;
    const y1 = a[1] + uy * ra;
    const x2 = b[0] - ux * rb;
    const y2 = b[1] - uy * rb;
    const offs = order === 1 ? [0] : order === 2 ? [-2.6, 2.6] : [-4, 0, 4];
    return (
      <g key={key}>
        {offs.map((o, k) => (
          <line key={k} x1={x1 - uy * o} y1={y1 + ux * o} x2={x2 - uy * o} y2={y2 + ux * o} stroke="var(--mol-ink)" strokeWidth={1.6} strokeLinecap="round" />
        ))}
      </g>
    );
  };

  return (
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} style={{ maxHeight: props.size === 'sm' ? 140 : 240, width: '100%' }} className="block mx-auto" role="img" aria-label={dev ? 'Formule développée' : 'Formule semi-développée'}>
      {show.includes('chain') &&
        parent.map((a) => {
          const [x, y] = cells[a];
          const w = labelW(label(a)) + 10;
          return <rect key={`ch${a}`} x={x - w / 2} y={y - 13} width={w} height={26} rx={10} fill="var(--mol-chain)" />;
        })}
      {show.includes('groups') &&
        groups.map((a) => {
          const [x, y] = cells[a];
          const w = labelW(label(a)) + 12;
          return <rect key={`gr${a}`} x={x - w / 2} y={y - 14} width={w} height={28} rx={12} fill="var(--mol-group)" />;
        })}
      {mol.bonds.map((b, k) => bondLine(cells[b.a], cells[b.b], label(b.a), label(b.b), b.order, `b${k}`))}
      {hs.map((h, k) => bondLine(cells[h.atom], h.p, label(h.atom), 'H', 1, `h${k}`))}
      {mol.atoms.map((at, i) => {
        const [x, y] = cells[i];
        const t = label(i);
        return (
          <text key={`t${i}`} x={x} y={y + 5} textAnchor="middle" fontSize={15} fontWeight={650} fill={subColor.get(i) ?? EL_COLOR[at.el] ?? 'var(--mol-ink)'}>
            {t}
          </text>
        );
      })}
      {hs.map((h, k) => (
        <text key={`ht${k}`} x={h.p[0]} y={h.p[1] + 5} textAnchor="middle" fontSize={13} fill="var(--ink-2)">
          H
        </text>
      ))}
      {show.includes('numbers') &&
        parent.map((a, i) => {
          const [x, y] = cells[a];
          const below = !adj[a].some((j) => grid.cells[j][1] > grid.cells[a][1]);
          return (
            <text key={`n${a}`} x={x} y={y + (below ? 26 : -18)} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="var(--num-ink-strong)">
              {i + 1}
            </text>
          );
        })}
    </svg>
  );
}

/** Raccourci : dessin à partir d'un SMILES, sans analyse du nom. */
export function moleculeFromSmiles(s: string): Molecule {
  return parseSmiles(s);
}

export { bondOrder };
