import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MODULES, SKILLS } from '../content/skills';
import { pickExercises } from '../exercises/generate';
import { buildPracticeSet, learnedSkills } from '../exercises/sessions';
import type { Exercise } from '../exercises/types';
import { getState, useAppState } from '../state/store';
import { ExerciseRunner, RunSummary } from '../ui/exercises/ExerciseRunner';
import { Button, Card, PageTitle, cx } from '../ui/kit';
import { Chip } from './OnboardingPage';

const LEVELS = [
  [0, 'Adaptatif (selon mes résultats)'],
  [1, 'Débutant'],
  [2, 'Facile'],
  [3, 'Intermédiaire'],
  [4, 'Difficile'],
  [5, 'Niveau examen'],
] as const;

export function PracticePage({ embedded = false }: { embedded?: boolean }) {
  const st = useAppState();
  const [params] = useSearchParams();
  const [skills, setSkills] = useState<string[]>(() => (params.get('mix') || params.get('chrono') ? SKILLS.filter((s) => !s.advanced).map((s) => s.id) : learnedSkills(st).slice(0, 6)));
  const [level, setLevel] = useState<number>(params.get('mix') ? 3 : 0);
  const [count, setCount] = useState(10);
  const [chrono, setChrono] = useState(!!params.get('chrono'));
  const [noHints, setNoHints] = useState(!!params.get('mix') || !!params.get('chrono'));
  const [run, setRun] = useState<Exercise[] | null>(null);
  const [runId, setRunId] = useState(0);

  const toggle = (id: string) => setSkills((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));
  const start = () => {
    const s = getState();
    const list = level === 0 ? buildPracticeSet(s, skills, count) : pickExercises({ skills, count, minLevel: level, maxLevel: level });
    const filled = list.length < count && level ? [...list, ...pickExercises({ skills, count: count - list.length, maxLevel: level, exclude: new Set(list.map((e) => e.key)) })] : list;
    setRun(filled);
    setRunId((x) => x + 1);
  };

  if (run)
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => setRun(null)} className="mb-3">
          ← Modifier la sélection
        </Button>
        <ExerciseRunner
          key={runId}
          exercises={run}
          context={chrono ? 'timed' : 'practice'}
          noHints={noHints}
          secondsPerQuestion={chrono ? 90 : undefined}
          title={chrono ? 'Entraînement chronométré (90 s par question)' : 'Entraînement libre'}
          onFinish={() => {}}
          renderSummary={(results) => (
            <RunSummary results={results}>
              <Button variant="soft" onClick={() => setRun(null)}>
                Changer de sélection
              </Button>
              <Button onClick={start}>Nouvelle série</Button>
            </RunSummary>
          )}
        />
      </div>
    );

  return (
    <div>
      {!embedded && <PageTitle sub="Choisis les notions et le niveau. En mode adaptatif, la difficulté monte quand tu réussis et redescend quand ça coince.">
        Entraînement libre
      </PageTitle>}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold">Notions ({skills.length})</h2>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setSkills(learnedSkills(st))}>
                Notions vues
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSkills(SKILLS.map((s) => s.id))}>
                Tout
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSkills([])}>
                Aucune
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {MODULES.filter((m) => m.id !== 'm6').map((m) => (
              <div key={m.id}>
                <div className="text-xs font-bold uppercase text-ink-3 mb-1">{m.short}</div>
                <div className="flex flex-wrap gap-1.5">
                  {SKILLS.filter((s) => s.module === m.id).map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => toggle(s.id)}
                      aria-pressed={skills.includes(s.id)}
                      className={cx('rounded-xl border px-2.5 py-1 text-sm font-semibold', skills.includes(s.id) ? 'border-brand bg-brand-soft' : 'border-line hover:border-brand-2')}
                    >
                      {s.label}
                      {s.advanced ? ' (avancé)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="space-y-4">
          <div>
            <h2 className="font-semibold mb-2">Niveau</h2>
            <div className="grid gap-1.5">
              {LEVELS.map(([v, l]) => (
                <Chip key={v} on={level === v} onClick={() => setLevel(v)} block>
                  {l}
                </Chip>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="font-semibold">Nombre d’exercices : {count}</span>
            <input type="range" min={5} max={30} step={5} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full accent-[var(--brand)]" />
          </label>
          <div className="flex flex-col gap-2">
            <Chip on={chrono} onClick={() => setChrono(!chrono)} block>
              Chronométré (90 s par question)
            </Chip>
            <Chip on={noHints} onClick={() => setNoHints(!noHints)} block>
              Sans indice (exercices de synthèse)
            </Chip>
          </div>
          <Button size="lg" className="w-full" onClick={start} disabled={!skills.length}>
            Lancer la série
          </Button>
        </Card>
      </div>
    </div>
  );
}
