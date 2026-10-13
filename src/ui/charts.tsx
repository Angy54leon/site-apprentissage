// Petits graphiques sobres (une seule série par graphique, info-bulle au survol).
import { useState } from 'react';

export interface BarDatum {
  label: string;
  value: number | null;
  /** Texte de l'info-bulle. */
  tip: string;
}

export function BarChart({ data, max, height = 140, format = (v: number) => String(v), title }: { data: BarDatum[]; max?: number; height?: number; format?: (v: number) => string; title: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 600;
  const H = height;
  const top = 12;
  const bottom = 22;
  const n = data.length;
  const gap = 2;
  const bw = (W - gap * (n - 1)) / n;
  const m = max ?? Math.max(1, ...data.map((d) => d.value ?? 0));
  const y = (v: number) => top + (H - top - bottom) * (1 - v / m);
  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title} onMouseLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={0} x2={W} y1={y(m * f)} y2={y(m * f)} stroke="var(--line)" strokeWidth={1} />
            <text x={2} y={y(m * f) - 3} fontSize={10} fill="var(--ink-3)">
              {format(m * f)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = i * (bw + gap);
          const v = d.value ?? 0;
          const h = Math.max(0, H - bottom - y(v));
          const r = Math.min(4, bw / 2, h);
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={d.tip}>
              <rect x={x} y={top} width={bw} height={H - top - bottom} fill="transparent" />
              {d.value !== null && h > 0 && (
                <path
                  d={`M${x},${H - bottom} V${y(v) + r} Q${x},${y(v)} ${x + r},${y(v)} H${x + bw - r} Q${x + bw},${y(v)} ${x + bw},${y(v) + r} V${H - bottom} Z`}
                  fill={hover === i ? 'var(--brand)' : 'var(--brand-2)'}
                />
              )}
              {(i % Math.ceil(n / 8) === 0 || i === n - 1) && (
                <text x={x + bw / 2} y={H - 6} fontSize={10} textAnchor="middle" fill="var(--ink-3)">
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-xl bg-surface border border-line px-2 py-1 text-xs font-semibold shadow"
          style={{ left: `${((hover + 0.5) / n) * 100}%`, top: 0 }}
        >
          {data[hover].tip}
        </div>
      )}
    </figure>
  );
}

export function HBar({ label, value, sub }: { label: string; value: number | null; sub?: string }) {
  return (
    <div className="grid grid-cols-[8rem_1fr_3.5rem] items-center gap-2 text-sm">
      <span className="font-semibold truncate" title={label}>
        {label}
      </span>
      <div className="h-3 rounded-full bg-surface-2 border border-line overflow-hidden" role="img" aria-label={`${label} : ${value === null ? 'pas de données' : Math.round(value * 100) + ' %'}`}>
        {value !== null && <div className="h-full rounded-full bg-brand-2" style={{ width: `${value * 100}%` }} />}
      </div>
      <span className="text-right tabular-nums text-ink-2" title={sub}>
        {value === null ? '—' : `${Math.round(value * 100)} %`}
      </span>
    </div>
  );
}
