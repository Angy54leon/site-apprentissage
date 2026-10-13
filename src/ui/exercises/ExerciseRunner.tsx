// Enchaînement d'une série d'exercices : progression, chrono, enregistrement, bilan.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Exercise, ExerciseResult } from '../../exercises/types';
import { similarExercise } from '../../exercises/generate';
import { recordAttempt, pickMessage, type AttemptMeta } from '../../state/store';
import type { AttemptContext } from '../../state/types';
import { useActiveTimer } from '../useActiveTimer';
import { ExerciseView } from './ExerciseView';
import { Button, Card, ProgressBar, cx } from '../kit';
import { burst, Mimi } from '../love';

export interface RunResult {
  ex: Exercise;
  res: ExerciseResult;
}

interface Props {
  exercises: Exercise[];
  context: AttemptContext;
  mode?: 'learn' | 'exam';
  noHints?: boolean;
  /** Secondes par question (mode chronométré). */
  secondsPerQuestion?: number;
  /** Durée totale (examen blanc). */
  totalSeconds?: number;
  timeKind?: 'exercise' | 'review';
  onFinish: (results: RunResult[]) => void;
  /** Contenu affiché à la place du bilan par défaut. */
  renderSummary?: (results: RunResult[]) => ReactNode;
  title?: string;
}

export function ExerciseRunner({ exercises, context, mode = 'learn', noHints, secondsPerQuestion, totalSeconds, timeKind = 'exercise', onFinish, renderSummary, title }: Props) {
  const [list, setList] = useState<Exercise[]>(exercises);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<RunResult[]>([]);
  const [finished, setFinished] = useState(false);
  const [left, setLeft] = useState<number | null>(secondsPerQuestion ?? totalSeconds ?? null);
  const [timeUp, setTimeUp] = useState(false);
  const firstResult = useRef(new Map<string, ExerciseResult>());
  const [endMsg, setEndMsg] = useState('');
  useActiveTimer(timeKind, !finished);

  useEffect(() => {
    setList(exercises);
    setIdx(0);
    setResults([]);
    setFinished(false);
    firstResult.current = new Map();
  }, [exercises]);

  // chronomètre
  useEffect(() => {
    if (finished || left === null) return;
    if (left <= 0) {
      if (totalSeconds) finish(results);
      else setTimeUp(true);
      return;
    }
    const t = setTimeout(() => setLeft((l) => (l === null ? null : l - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, finished]);

  const ex = list[idx];

  const finish = (all: RunResult[]) => {
    setFinished(true);
    setEndMsg(pickMessage('setDone'));
    const good = all.filter((r) => r.res.status === 'correct').length;
    if (all.length && good / all.length >= 0.7) burst('confetti');
    onFinish(all);
  };

  const onSubmit = (res: ExerciseResult, meta: { hintsUsed: number; retry: boolean; durationMs: number }) => {
    const m: AttemptMeta = { context, hintsUsed: meta.hintsUsed, retry: meta.retry, durationMs: meta.durationMs };
    recordAttempt(ex, res, m);
    if (!firstResult.current.has(ex.uid)) {
      firstResult.current.set(ex.uid, res);
      const next = [...results, { ex, res }];
      setResults(next);
      if (mode === 'exam') {
        if (idx + 1 >= list.length) finish(next);
        else setIdx(idx + 1);
      }
    }
  };

  const next = () => {
    setTimeUp(false);
    if (secondsPerQuestion) setLeft(secondsPerQuestion);
    if (idx + 1 >= list.length) finish(results);
    else setIdx(idx + 1);
  };

  const similar = () => {
    const s = similarExercise(ex);
    if (!s) return;
    setList((l) => [...l.slice(0, idx + 1), s, ...l.slice(idx + 1)]);
    next();
  };

  if (!list.length)
    return (
      <Card>
        <p className="text-ink-2">Aucun exercice disponible pour cette sélection.</p>
      </Card>
    );

  if (finished) {
    if (renderSummary) return <>{renderSummary(results)}</>;
    return <RunSummary results={results} message={endMsg} />;
  }

  const timerColor = left !== null && left <= 10 ? 'text-bad' : 'text-ink-2';
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          {title && <div className="text-xs font-bold uppercase tracking-wide text-ink-3 mb-1">{title}</div>}
          <ProgressBar value={idx / list.length} label="Progression de la série" />
        </div>
        <span className="text-sm font-bold text-ink-2 tabular-nums">
          {idx + 1}/{list.length}
        </span>
        {left !== null && (
          <span className={cx('text-sm font-extrabold tabular-nums', timerColor)} aria-live="off">
            ⏱ {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
          </span>
        )}
      </div>
      <Card>
        <ExerciseView
          key={ex.uid}
          ex={ex}
          mode={mode}
          noHints={noHints}
          onSubmit={onSubmit}
          onNext={next}
          onSimilar={mode === 'learn' ? similar : undefined}
          nextLabel={idx + 1 >= list.length ? 'Voir le bilan' : 'Exercice suivant'}
          timeUp={timeUp}
        />
      </Card>
    </div>
  );
}

export function RunSummary({ results, message, children }: { results: RunResult[]; message?: string; children?: ReactNode }) {
  const good = results.filter((r) => r.res.status === 'correct').length;
  const partial = results.filter((r) => r.res.status === 'partial').length;
  return (
    <Card className="max-w-2xl mx-auto text-center anim-pop">
      <Mimi size={90} mood={good >= results.length * 0.7 ? 'cheer' : 'happy'} className="mx-auto decor" />
      <h2 className="text-2xl font-extrabold mt-2">Bilan de la série</h2>
      <p className="text-4xl font-black mt-2 text-brand">
        {good}/{results.length}
      </p>
      <p className="text-ink-2">
        {good} réussite{good > 1 ? 's' : ''}
        {partial ? `, ${partial} presque` : ''}
        {results.length - good - partial ? `, ${results.length - good - partial} à revoir (ajoutée${results.length - good - partial > 1 ? 's' : ''} au carnet d’erreurs)` : ''}.
      </p>
      {message && <p className="decor font-hand text-2xl text-brand mt-3">{message}</p>}
      <ul className="text-left mt-4 space-y-1 text-sm">
        {results.map((r, i) => (
          <li key={i} className="flex gap-2 items-start rounded-xl bg-surface-2 px-3 py-2">
            <span className={cx('font-black', r.res.status === 'correct' ? 'text-ok' : r.res.status === 'partial' ? 'text-warn' : 'text-bad')}>
              {r.res.status === 'correct' ? '✓' : r.res.status === 'partial' ? '≈' : '✗'}
            </span>
            <span className="flex-1">
              {r.ex.prompt.length > 90 ? r.ex.prompt.slice(0, 90) + '…' : r.ex.prompt}
              {r.res.status !== 'correct' && r.res.expected && <span className="block text-ink-2">Attendu : {r.res.expected}</span>}
            </span>
          </li>
        ))}
      </ul>
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
      {!children && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button to="/tableau-de-bord" variant="soft">
            Tableau de bord
          </Button>
          <Button to="/erreurs" variant="outline">
            Carnet d’erreurs
          </Button>
        </div>
      )}
    </Card>
  );
}
