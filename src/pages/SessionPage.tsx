import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LESSON_BY_ID } from '../content/lessons';
import { SKILL_BY_ID } from '../content/skills';
import type { Exercise } from '../exercises/types';
import { buildMistakesSet, buildPracticeSet, buildReviewSet, learnedSkills, skillScores } from '../exercises/sessions';
import { markTaskDone, recordReview, snapshotTodayPlan, useAppState, getState } from '../state/store';
import { todaysTasks, isRestDay } from '../state/planner';
import { formatDate, today } from '../state/dates';
import type { PlanTaskSnapshot } from '../state/types';
import { ExerciseRunner, RunSummary, type RunResult } from '../ui/exercises/ExerciseRunner';
import { Button, Card, PageTitle, Pill, cx } from '../ui/kit';
import { MimiSays, LoveNote } from '../ui/love';
import { MESSAGES } from '../config/love';

export function SessionPage() {
  const st = useAppState();
  const t = today();
  const tasks = todaysTasks(st);
  useEffect(() => {
    snapshotTodayPlan(tasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const log = st.days[t];
  const done = log?.tasksDone ?? [];
  const [running, setRunning] = useState<{ task: PlanTaskSnapshot; exercises: Exercise[]; info?: string } | null>(null);
  const [finished, setFinished] = useState<{ task: PlanTaskSnapshot; results: RunResult[] } | null>(null);
  const sessionMsg = useMemo(() => MESSAGES.sessionDone[Math.floor(Math.random() * MESSAGES.sessionDone.length)], []);

  const start = (task: PlanTaskSnapshot) => {
    const s = getState();
    let exercises: Exercise[] = [];
    let info: string | undefined;
    if (task.kind === 'review') {
      const r = buildReviewSet(s, t, task.count ?? 5);
      exercises = r.exercises;
      if (r.memoryQuiz) info = 'Aucune notion n’est due aujourd’hui : petit test de mémorisation sur des notions déjà vues.';
      if (!exercises.length) {
        markTaskDone(task.id);
        return;
      }
    } else if (task.kind === 'practice') {
      const skills = task.skills?.length ? task.skills : learnedSkills(s);
      exercises = buildPracticeSet(s, skills.length ? skills : ['alc-racines'], task.count ?? 8);
    } else if (task.kind === 'mistakes') {
      exercises = buildMistakesSet(s, task.count ?? 5);
      if (!exercises.length) {
        markTaskDone(task.id);
        return;
      }
    }
    setFinished(null);
    setRunning({ task, exercises, info });
  };

  const onFinish = (results: RunResult[]) => {
    if (!running) return;
    if (running.task.kind === 'review') recordReview(skillScores(results));
    markTaskDone(running.task.id);
    setFinished({ task: running.task, results });
  };

  if (running && !finished)
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="sm" onClick={() => setRunning(null)}>
            ← Retour à la séance
          </Button>
          {running.info && <Pill tone="info">{running.info}</Pill>}
        </div>
        <ExerciseRunner
          exercises={running.exercises}
          context={running.task.kind === 'review' ? 'review' : running.task.kind === 'mistakes' ? 'mistakes' : 'session'}
          timeKind={running.task.kind === 'review' || running.task.kind === 'mistakes' ? 'review' : 'exercise'}
          title={running.task.title}
          onFinish={onFinish}
          renderSummary={() => null}
        />
      </div>
    );

  if (finished)
    return (
      <RunSummary results={finished.results}>
        {finished.task.kind === 'review' && (
          <p className="w-full text-sm text-ink-2">
            Les notions révisées ont changé de boîte : réussies, elles reviendront plus tard ; ratées, elles reviendront dès demain.
          </p>
        )}
        <Button onClick={() => { setFinished(null); setRunning(null); }}>Retour à ma séance</Button>
      </RunSummary>
    );

  return (
    <div className="max-w-3xl">
      <PageTitle emoji="💕" sub={`${formatDate(t)}${isRestDay(st) ? ' · jour de repos prévu (séance facultative)' : ''}`}>
        Ma séance du jour
      </PageTitle>
      {log?.sessionDone && (
        <Card className="mb-4 bg-ok-soft border-ok/30">
          <LoveNote>{sessionMsg}</LoveNote>
        </Card>
      )}
      <div className="space-y-3">
        {tasks.map((task, i) => {
          const isDone = done.includes(task.id);
          return (
            <Card key={task.id} className={cx('flex flex-col sm:flex-row sm:items-center gap-3', isDone && 'opacity-80')}>
              <div className={cx('w-10 h-10 shrink-0 rounded-2xl grid place-items-center text-lg font-black', isDone ? 'bg-ok text-white' : 'bg-surface-2')}>{isDone ? '✓' : i + 1}</div>
              <div className="flex-1">
                <div className="font-extrabold">{task.title}</div>
                <div className="text-sm text-ink-2">
                  ~{task.minutes} min
                  {task.count ? ` · ${task.count} exercices` : ''}
                  {task.skills?.length ? ` · ${task.skills.map((s) => SKILL_BY_ID[s]?.label).join(', ')}` : ''}
                </div>
              </div>
              {task.kind === 'lesson' && task.lessonId ? (
                <Button to={`/lecon/${task.lessonId}`} variant={isDone ? 'soft' : 'primary'}>
                  {isDone ? 'Relire' : st.lessons[task.lessonId]?.status === 'in-progress' ? 'Reprendre la leçon' : 'Commencer la leçon'}
                </Button>
              ) : task.kind === 'exam' ? (
                <Button to="/examens" variant={isDone ? 'soft' : 'primary'}>
                  {isDone ? 'Voir' : 'Passer l’examen blanc'}
                </Button>
              ) : (
                <Button onClick={() => start(task)} variant={isDone ? 'soft' : 'primary'}>
                  {isDone ? 'Refaire' : 'Commencer'}
                </Button>
              )}
            </Card>
          );
        })}
        {!tasks.length && (
          <Card>
            <p className="text-ink-2">Aucune tâche aujourd’hui. Tu peux faire de l’<Link className="underline font-bold" to="/entrainement">entraînement libre</Link> ou réviser tes <Link className="underline font-bold" to="/erreurs">erreurs</Link>.</p>
          </Card>
        )}
      </div>
      <MimiSays className="mt-6">
        La séance est terminée quand toutes les tâches sont cochées (ou quand tes trois durées d’objectif sont atteintes). Une leçon est cochée quand son mini-test est réussi.
      </MimiSays>
      {tasks.some((t2) => t2.lessonId) && (
        <p className="text-xs text-ink-3 mt-3">Leçon du jour : {tasks.filter((x) => x.lessonId).map((x) => LESSON_BY_ID[x.lessonId!].title).join(', ')}.</p>
      )}
    </div>
  );
}
