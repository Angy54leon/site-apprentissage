// Carte molécule : choix de la représentation + mode « Comprendre la molécule ».
import { useMemo, useState } from 'react';
import { analyse } from '../exercises/generate';
import type { ShowOption } from '../content/lessons';
import { MoleculeView, type MolMode, type MoleculeViewProps } from './MoleculeView';
import { Button, Rich, cx } from './kit';

export function ModeSwitch({ mode, setMode, available = ['topo', 'semi', 'dev'] }: { mode: MolMode; setMode: (m: MolMode) => void; available?: MolMode[] }) {
  const labels: Record<MolMode, string> = { topo: 'Topologique', semi: 'Semi-développée', dev: 'Développée' };
  return (
    <div className="inline-flex rounded-xl bg-surface-2 border border-line p-0.5 text-xs font-bold" role="group" aria-label="Représentation">
      {available.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          className={cx('px-2.5 py-1 rounded-lg transition', mode === m ? 'bg-surface text-brand shadow-sm' : 'text-ink-2 hover:text-ink')}
          aria-pressed={mode === m}
        >
          {labels[m]}
        </button>
      ))}
    </div>
  );
}

export function MoleculeCard(
  props: MoleculeViewProps & { caption?: string; allowModes?: boolean; initialMode?: MolMode; toggles?: boolean; className?: string },
) {
  const [mode, setMode] = useState<MolMode>(props.initialMode ?? props.mode ?? 'topo');
  const [extra, setExtra] = useState<ShowOption[]>([]);
  const show = [...(props.show ?? []), ...extra];
  const toggle = (o: ShowOption) => setExtra((x) => (x.includes(o) ? x.filter((y) => y !== o) : [...x, o]));
  const allowModes = props.allowModes ?? true;
  const cyclic = useMemo(() => (props.smiles ? /\d/.test(props.smiles) : false), [props.smiles]);
  return (
    <figure className={cx('rounded-2xl bg-surface border border-line p-3 relative', props.className)}>
      <span className="decor absolute right-3 top-2 text-xs opacity-60" aria-hidden>
        💗
      </span>
      {(allowModes || props.toggles) && (
        <div className="flex flex-wrap gap-2 items-center justify-between mb-2 pr-5">
          {allowModes && !cyclic && <ModeSwitch mode={mode} setMode={setMode} />}
          {props.toggles && (
            <div className="flex flex-wrap gap-1 text-xs">
              {(
                [
                  ['chain', 'Chaîne'],
                  ['numbers', 'Numéros'],
                  ['subs', 'Ramifications'],
                  ['groups', 'Fonctions'],
                  ['carbons', 'Carbones'],
                ] as [ShowOption, string][]
              ).map(([o, l]) => (
                <button
                  type="button"
                  key={o}
                  onClick={() => toggle(o)}
                  aria-pressed={show.includes(o)}
                  className={cx('rounded-lg px-2 py-1 border font-bold', show.includes(o) ? 'bg-brand-soft/60 border-brand-2 text-brand' : 'border-line text-ink-2')}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <MoleculeView {...props} mode={cyclic ? 'topo' : mode} show={show} />
      {props.caption && <figcaption className="text-center text-sm text-ink-2 mt-1">{props.caption}</figcaption>}
    </figure>
  );
}

/** « Comprendre la molécule » : on dévoile pas à pas chaîne, numéros, ramifications, insaturations, fonctions, nom. */
export function MoleculeExplorer({ smiles, startAt = 0, compact }: { smiles: string; startAt?: number; compact?: boolean }) {
  const { naming } = analyse(smiles);
  const [step, setStep] = useState(startAt);
  const [mode, setMode] = useState<MolMode>('topo');
  if (!naming)
    return <p className="text-sm text-ink-2">Le moteur de nomenclature ne prend pas en charge cette molécule (hors du programme couvert).</p>;
  const find = (t: string) => naming.steps.find((s) => s.title.startsWith(t))?.text;
  const hasUnsat = naming.parts.parent.enes.length + naming.parts.parent.ynes.length > 0;
  const steps: { title: string; text: string; show: ShowOption[] }[] = [
    {
      title: naming.isRing ? '1. La structure principale' : '1. La chaîne principale',
      text: (find('Choisir') ?? '') + (naming.principal ? ' (Elle contient le carbone de la fonction principale : voir l’étape 5.)' : ''),
      show: ['chain'],
    },
    { title: '2. La numérotation', text: find('Numéroter') ?? '', show: ['chain', 'numbers'] },
    {
      title: '3. Les ramifications',
      text: (find('Nommer et classer') ?? '') + (find('Nommer la partie alkyle') ? ' ' + find('Nommer la partie alkyle') : '') || (naming.esterAlkylAtoms.length ? '' : 'Aucune ramification : pas de préfixe de substituant.'),
      show: ['chain', 'numbers', 'subs'],
    },
    {
      title: '4. Les insaturations',
      text: hasUnsat ? (find('Placer les insaturations') ?? '') : naming.aromatic ? 'Les trois doubles liaisons du benzène sont comprises dans le nom « benzène ».' : 'Aucune double ou triple liaison dans la structure principale : terminaison « -an- ».',
      show: ['chain', 'numbers', 'subs'],
    },
    { title: '5. Les fonctions', text: naming.steps[0].text, show: ['chain', 'numbers', 'subs', 'groups'] },
    { title: '6. Le nom final', text: `**${naming.name}**${naming.variants.length ? ` — également accepté : ${naming.variants.join(' ; ')}` : ''}`, show: ['chain', 'numbers', 'subs', 'groups'] },
  ];
  const cur = steps[Math.min(step, steps.length - 1)];
  const cyclic = /\d/.test(smiles);
  return (
    <div className={cx('grid gap-3', compact ? '' : 'md:grid-cols-[1.1fr_1fr]')}>
      <div className="rounded-2xl bg-surface border border-line p-3">
        {!cyclic && (
          <div className="mb-2">
            <ModeSwitch mode={mode} setMode={setMode} />
          </div>
        )}
        <MoleculeView smiles={smiles} mode={cyclic ? 'topo' : mode} show={cur.show} size="lg" />
        <Legend show={cur.show} />
      </div>
      <div className="flex flex-col gap-2">
        <ol className="flex flex-col gap-1.5">
          {steps.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => setStep(i)}
                className={cx(
                  'w-full text-left rounded-xl border px-3 py-2 transition',
                  i === step ? 'border-brand-2 bg-brand-soft/30' : i < step ? 'border-line bg-surface' : 'border-dashed border-line text-ink-3',
                )}
              >
                <div className="font-bold text-sm">{s.title}</div>
                {i <= step && <div className="text-sm text-ink-2 mt-0.5"><Rich text={s.text} /></div>}
              </button>
            </li>
          ))}
        </ol>
        <div className="flex gap-2">
          <Button variant="soft" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            ← Étape précédente
          </Button>
          <Button size="sm" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} disabled={step >= steps.length - 1}>
            Étape suivante →
          </Button>
        </div>
        {naming.notes.map((n) => (
          <p key={n} className="text-xs rounded-xl bg-warn-soft text-warn p-2">
            {n}
          </p>
        ))}
      </div>
    </div>
  );
}

export function Legend({ show }: { show: ShowOption[] }) {
  const items: [string, string][] = [];
  if (show.includes('chain')) items.push(['var(--mol-chain)', 'chaîne / structure principale']);
  if (show.includes('subs')) items.push(['var(--sub-1)', 'ramifications (une couleur par substituant)']);
  if (show.includes('groups')) items.push(['var(--mol-group)', 'groupes fonctionnels']);
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-3 justify-center mt-1 text-xs text-ink-2">
      {items.map(([c, l]) => (
        <span key={l} className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: c }} /> {l}
        </span>
      ))}
    </div>
  );
}
