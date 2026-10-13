import { useSearchParams } from 'react-router-dom';
import { cx } from './kit';

/** Onglets synchronisés avec le paramètre d'URL « vue ». */
export function useTab(defaultTab: string): [string, (t: string) => void] {
  const [params, setParams] = useSearchParams();
  const tab = params.get('vue') ?? defaultTab;
  const set = (t: string) => {
    const p = new URLSearchParams(params);
    if (t === defaultTab) p.delete('vue');
    else p.set('vue', t);
    setParams(p, { replace: true });
  };
  return [tab, set];
}

export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: string }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div className="mb-6 flex gap-1 border-b border-line overflow-x-auto thin-scroll" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cx('-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors', value === t.id ? 'border-brand text-brand' : 'border-transparent text-ink-2 hover:text-ink')}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
