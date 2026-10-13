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
    if (m[1]) parts.push(<strong key={k++} className="font-semibold text-ink">{m[1]}</strong>);
    else parts.push(<em key={k++}>{m[2]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span className={className}>{parts}</span>;
}

export function Card({ children, className, as = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  const C = as;
  return <C className={cx('rounded-xl bg-surface border border-line shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5', className)}>{children}</C>;
}

type BtnVariant = 'primary' | 'soft' | 'ghost' | 'outline' | 'ok';
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-strong dark:text-navy',
  soft: 'bg-surface text-ink hover:bg-surface-2 border border-line',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  outline: 'border border-brand text-brand hover:bg-brand-soft',
  ok: 'bg-ok text-white hover:brightness-110',
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
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none',
    size === 'sm' ? 'px-3 py-1.5 text-sm' : size === 'lg' ? 'px-5 py-3 text-base' : 'px-4 py-2 text-[15px]',
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
    <div className={cx('h-2 rounded-full bg-surface-2 overflow-hidden', className)} role="progressbar" aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${v * 100}%`, background: color }} />
    </div>
  );
}

/** Indicateur circulaire de progression. */
export function RingProgress({ value, size = 112, label, sub }: { value: number; size?: number; label?: string; sub?: string }) {
  const v = Math.max(0, Math.min(1, value));
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={label ?? `Progression ${Math.round(v * 100)} %`}>
        <circle cx={50} cy={50} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={9} />
        <circle
          cx={50}
          cy={50}
          r={r}
          fill="none"
          stroke="var(--brand)"
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`}
          transform="rotate(-90 50 50)"
          className="transition-[stroke-dasharray] duration-500"
        />
      </svg>
      <div className="absolute text-center leading-tight">
        <div className="text-xl font-bold tabular-nums">{Math.round(v * 100)} %</div>
        {sub && <div className="text-[11px] text-ink-2">{sub}</div>}
      </div>
    </div>
  );
}

/** Encadré pédagogique sobre : définition, règle, méthode, attention, astuce. */
export function Callout({ kind, title, children }: { kind: 'definition' | 'rule' | 'method' | 'warning' | 'tip'; title?: string; children: ReactNode }) {
  const style: Record<string, string> = {
    definition: 'border-l-navy bg-surface-2',
    rule: 'border-l-brand bg-brand-soft',
    method: 'border-l-ok bg-ok-soft',
    warning: 'border-l-warn bg-warn-soft',
    tip: 'border-l-ink-3 bg-surface-2',
  };
  const label: Record<string, string> = { definition: 'Définition', rule: 'Règle', method: 'Méthode', warning: 'Attention', tip: 'À retenir' };
  return (
    <div className={cx('rounded-r-lg border-l-4 px-4 py-3', style[kind])}>
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-2 mb-0.5">{title ?? label[kind]}</div>
      <div className="text-ink">{children}</div>
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
    brand: 'bg-brand-soft text-brand border-transparent',
  };
  return <span className={cx('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold', t[tone], className)}>{children}</span>;
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-[rgba(15,23,42,0.45)]" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className={cx('anim-fade w-full max-h-[90vh] overflow-auto rounded-xl bg-surface border border-line p-5 sm:p-6 shadow-xl', wide ? 'max-w-2xl' : 'max-w-md')} onClick={(e) => e.stopPropagation()}>
        {title && <h2 className="text-lg font-semibold mb-3 pr-8">{title}</h2>}
        <button type="button" onClick={onClose} className="absolute hidden" aria-hidden />
        {children}
      </div>
    </div>
  );
}

export function PageTitle({ children, sub, actions }: { children: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">{children}</h1>
        {sub && <p className="text-ink-2 mt-1 max-w-3xl">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <h2 className="text-base font-semibold text-ink">{children}</h2>
      {actions}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl bg-surface border border-line p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-2">{label}</div>
      <div className="text-2xl font-bold mt-1 tabular-nums">{value}</div>
      {hint && <div className="text-xs text-ink-2 mt-0.5">{hint}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-line p-5 text-center text-sm text-ink-2">{children}</div>;
}

export const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)} %`);
