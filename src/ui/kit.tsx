// Petits composants réutilisables.
import { type ReactNode, useEffect } from 'react';
import { Link } from 'react-router-dom';

export function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ');
}

/** Texte avec **gras** et *italique*. */
export function Rich({ text, className }: { text: string; className?: string }) {
  const parts: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={k++} className="font-bold text-ink">{m[1]}</strong>);
    else parts.push(<em key={k++}>{m[2]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span className={className}>{parts}</span>;
}

export function Card({ children, className, as = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  const C = as;
  return <C className={cx('rounded-3xl bg-surface border border-line shadow-[0_6px_24px_-12px_rgba(73,52,68,0.25)] p-5', className)}>{children}</C>;
}

type BtnVariant = 'primary' | 'soft' | 'ghost' | 'outline' | 'ok';
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-brand text-white hover:brightness-105 shadow-[0_6px_16px_-8px_var(--brand)]',
  soft: 'bg-surface-2 text-ink hover:bg-brand-soft/60 border border-line',
  ghost: 'text-ink-2 hover:bg-surface-2',
  outline: 'border-2 border-brand-2 text-brand hover:bg-surface-2',
  ok: 'bg-ok text-white hover:brightness-105',
};

export function Button({
  children,
  variant = 'primary',
  className,
  to,
  size = 'md',
  ...rest
}: {
  children: ReactNode;
  variant?: BtnVariant;
  className?: string;
  to?: string;
  size?: 'sm' | 'md' | 'lg';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = cx(
    'inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
    size === 'sm' ? 'px-3 py-1.5 text-sm' : size === 'lg' ? 'px-6 py-3.5 text-lg' : 'px-4 py-2.5',
    BTN[variant],
    className,
  );
  if (to)
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}

export function ProgressBar({ value, className, color = 'var(--brand)', label }: { value: number; className?: string; color?: string; label?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className={cx('h-2.5 rounded-full bg-surface-2 border border-line overflow-hidden', className)} role="progressbar" aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${v * 100}%`, background: color }} />
    </div>
  );
}

/** Compteur de progression en forme de cœur. */
export function HeartProgress({ value, size = 120, label }: { value: number; size?: number; label?: string }) {
  const v = Math.max(0, Math.min(1, value));
  const id = `hp${Math.round(size)}`;
  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg viewBox="0 0 100 92" width={size} height={size * 0.92} aria-label={label ?? `Progression ${Math.round(v * 100)} %`} role="img">
        <defs>
          <clipPath id={id}>
            <path d="M50 88 C20 66 4 50 4 30 C4 14 16 4 30 4 C40 4 46 9 50 16 C54 9 60 4 70 4 C84 4 96 14 96 30 C96 50 80 66 50 88 Z" />
          </clipPath>
        </defs>
        <path d="M50 88 C20 66 4 50 4 30 C4 14 16 4 30 4 C40 4 46 9 50 16 C54 9 60 4 70 4 C84 4 96 14 96 30 C96 50 80 66 50 88 Z" fill="var(--surface-2)" stroke="var(--brand-2)" strokeWidth={3} />
        <g clipPath={`url(#${id})`}>
          <rect x={0} y={92 - 92 * v} width={100} height={92 * v} fill="var(--brand-2)" className="transition-all duration-700" />
          <rect x={0} y={92 - 92 * v} width={100} height={4} fill="var(--brand)" opacity={v > 0 && v < 1 ? 0.5 : 0} />
        </g>
        <text x={50} y={50} textAnchor="middle" fontSize={20} fontWeight={800} fill="var(--ink)">
          {Math.round(v * 100)}%
        </text>
      </svg>
    </div>
  );
}

export function Pill({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'ok' | 'warn' | 'bad' | 'info' | 'brand'; className?: string }) {
  const t: Record<string, string> = {
    neutral: 'bg-surface-2 text-ink-2 border-line',
    ok: 'bg-ok-soft text-ok border-transparent',
    warn: 'bg-warn-soft text-warn border-transparent',
    bad: 'bg-bad-soft text-bad border-transparent',
    info: 'bg-info-soft text-info border-transparent',
    brand: 'bg-brand-soft/60 text-brand border-transparent',
  };
  return <span className={cx('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold', t[tone], className)}>{children}</span>;
}

export function Modal({ open, onClose, children, title, wide }: { open: boolean; onClose: () => void; children: ReactNode; title?: string; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-[rgba(73,52,68,0.35)] backdrop-blur-[2px]" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className={cx('anim-pop w-full max-h-[90vh] overflow-auto rounded-3xl bg-surface border border-line p-5 sm:p-6 shadow-2xl', wide ? 'max-w-2xl' : 'max-w-md')} onClick={(e) => e.stopPropagation()}>
        {title && <h2 className="text-xl font-extrabold mb-3 pr-8">{title}</h2>}
        <button type="button" onClick={onClose} className="absolute hidden" aria-hidden />
        {children}
      </div>
    </div>
  );
}

export function PageTitle({ children, sub, emoji }: { children: ReactNode; sub?: ReactNode; emoji?: string }) {
  return (
    <header className="mb-5 anim-fade">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
        {children} {emoji && <span className="decor">{emoji}</span>}
      </h1>
      {sub && <p className="text-ink-2 mt-1">{sub}</p>}
    </header>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 border border-line p-3">
      <div className="text-xs font-bold uppercase tracking-wide text-ink-3">{label}</div>
      <div className="text-2xl font-extrabold mt-0.5">{value}</div>
      {hint && <div className="text-xs text-ink-2 mt-0.5">{hint}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line p-6 text-center text-ink-2">{children}</div>;
}

export const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)} %`);
