import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LESSON_BY_ID, LESSONS, nextLesson, type Block, type Lesson } from '../content/lessons';
import { buildExercise } from '../exercises/generate';
import type { Exercise, ExerciseSpec } from '../exercises/types';
import { QUIZ_PASS, recordLessonQuiz, setLessonStep, useAppState } from '../state/store';
import { useActiveTimer } from '../ui/useActiveTimer';
import { ExerciseRunner, RunSummary, type RunResult } from '../ui/exercises/ExerciseRunner';
import { MoleculeCard, MoleculeExplorer } from '../ui/MoleculeCard';
import { MoleculeView } from '../ui/MoleculeView';
import { analyse } from '../exercises/generate';
import { Button, Callout, Card, Pill, ProgressBar, Rich, cx } from '../ui/kit';
import { Icon } from '../ui/icons';
import { chapterOfLesson } from '../content/chapters';

const STEPS = ['Explications', 'Règle à retenir', 'Exemple résolu', 'Erreurs fréquentes', 'Exercices guidés', 'Exercices autonomes', 'Quiz final', 'Fiche récapitulative'];

export function BlockView({ b }: { b: Block }) {
  switch (b.t) {
    case 'p':
      return (
        <p className="leading-relaxed">
          <Rich text={b.text} />
        </p>
      );
    case 'list': {
      const L = b.ordered ? 'ol' : 'ul';
      return (
        <L className={cx('pl-6 space-y-1', b.ordered ? 'list-decimal' : 'list-disc')}>
          {b.items.map((it, i) => (
            <li key={i}>
              <Rich text={it} />
            </li>
          ))}
        </L>
      );
    }
    case 'tip':
    case 'warn':
    case 'info':
    case 'mnemo': {
      const kind = { tip: 'method', warn: 'warning', info: 'definition', mnemo: 'tip' } as const;
      const title = b.title ?? (b.t === 'mnemo' ? 'Moyen mnémotechnique' : b.t === 'tip' ? 'Méthode' : b.t === 'warn' ? 'Attention' : 'Définition');
      return (
        <Callout kind={kind[b.t]} title={title}>
          <Rich text={b.text} />
        </Callout>
      );
    }
    case 'mol':
      if (b.compare)
        return (
          <div className="grid sm:grid-cols-3 gap-2">
            {(['dev', 'semi', 'topo'] as const).map((m) => (
              <figure key={m} className="rounded-lg border border-line bg-surface p-2">
                <MoleculeView smiles={b.smiles} mode={m} size="sm" />
                <figcaption className="text-center text-xs font-bold text-ink-2 mt-1">{m === 'dev' ? 'Développée' : m === 'semi' ? 'Semi-développée' : 'Topologique'}</figcaption>
              </figure>
            ))}
            {b.caption && <p className="sm:col-span-3 text-center text-sm text-ink-2">{b.caption}</p>}
          </div>
        );
      return <MoleculeCard smiles={b.smiles} show={b.show} initialMode={b.mode} caption={b.caption} asWritten={b.asWritten} className="max-w-xl mx-auto" />;
    case 'table':
      return (
        <div className="overflow-x-auto thin-scroll">
          <table className="w-full text-sm border-separate border-spacing-0 rounded-lg overflow-hidden border border-line">
            <thead>
              <tr>
                {b.head.map((h) => (
                  <th key={h} className="bg-surface-2 text-left px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i} className="odd:bg-surface even:bg-surface-2/50">
                  {r.map((c, j) => (
                    <td key={j} className="px-3 py-1.5 border-t border-line">
                      <Rich text={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function WorkedExample({ lesson }: { lesson: Lesson }) {
  const w = lesson.worked;
  const [shown, setShown] = useState(1);
  if (w.smiles && !w.steps)
    return (
      <div>
        <p className="mb-3">{w.intro}</p>
        <MoleculeExplorer smiles={w.smiles} />
      </div>
    );
  const steps = w.steps ?? [];
  const cur = steps[Math.min(shown, steps.length) - 1];
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
      {w.smiles && (
        <div className="rounded-lg border border-line bg-surface p-3">
          <MoleculeView smiles={w.smiles} mode={w.mode ?? 'topo'} show={cur?.show ?? []} size="lg" />
        </div>
      )}
      <div>
        <p className="mb-2 font-semibold">{w.intro}</p>
        <ol className="space-y-2">
          {steps.slice(0, shown).map((s, i) => (
            <li key={i} className="rounded-xl border border-line bg-surface px-3 py-2 anim-fade">
              <div className="font-bold">
                {i + 1}. {s.title}
              </div>
              <div className="text-sm text-ink-2">
                <Rich text={s.text} />
              </div>
            </li>
          ))}
        </ol>
        {shown < steps.length ? (
          <Button size="sm" className="mt-3" onClick={() => setShown(shown + 1)}>
            Étape suivante →
          </Button>
        ) : (
          w.answer && (
            <p className="mt-3 rounded-xl bg-ok-soft px-3 py-2">
              <strong>Réponse :</strong> {w.answer}
            </p>
          )
        )}
      </div>
    </div>
  );
}

function buildList(specs: ExerciseSpec[], skills: string[]): Exercise[] {
  return specs
    .map((s) => buildExercise(s, Math.random, s.kind === 'q' ? {} : { skills }))
    .filter((x): x is Exercise => !!x)
    .map((e) => (e.skills.length ? e : { ...e, skills }));
}

export function LessonPage() {
  const { id = '' } = useParams();
  const st = useAppState();
  const lesson = LESSON_BY_ID[id];
  const progress = st.lessons[id];
  const [step, setStep] = useState(() => Math.min(progress?.step ?? 0, STEPS.length - 1));
  const [runKey, setRunKey] = useState(0);
  const [quizResult, setQuizResult] = useState<{ score: number; results: RunResult[] } | null>(null);
  const [doneMsg, setDoneMsg] = useState('');
  useEffect(() => {
    setStep(Math.min(st.lessons[id]?.step ?? 0, STEPS.length - 1));
    setQuizResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const exerciseStep = step >= 4 && step <= 6;
  useActiveTimer('lesson', !exerciseStep);

  const exercises = useMemo(() => {
    if (!lesson) return [];
    // les exercices de notions avancées de module 0 utilisent les notions de la leçon
    if (step === 4) return buildList(lesson.guided, lesson.skills);
    if (step === 5) return buildList(lesson.autonomous, lesson.skills);
    if (step === 6) return buildList(lesson.quiz, lesson.skills);
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson, step, runKey]);

  if (!lesson)
    return (
      <Card>
        <p>Leçon introuvable.</p>
        <Button to="/parcours" className="mt-3">
          Retour au parcours
        </Button>
      </Card>
    );

  const go = (s: number) => {
    setStep(s);
    setQuizResult(null);
    setLessonStep(lesson.id, s);
    window.scrollTo(0, 0);
  };
  const chapter = chapterOfLesson(lesson.id);
  const idx = LESSONS.indexOf(lesson);
  const nxt = nextLesson(lesson.id);
  const completed = progress?.status === 'completed';

  const onQuizFinish = (results: RunResult[]) => {
    const evaluable = results.filter((r) => r.res.status !== 'unknown');
    const score = evaluable.length ? evaluable.reduce((s, r) => s + (r.res.status === 'correct' ? 1 : r.res.status === 'partial' ? 0.5 : 0), 0) / evaluable.length : 0;
    recordLessonQuiz(lesson.id, score);
    setQuizResult({ score, results });
    if (score >= QUIZ_PASS) {
      setDoneMsg('Leçon validée. Ses notions entrent dans ton programme de révision espacée (première révision demain).');
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-center gap-2 text-sm mb-2">
        <Link to="/parcours" className="font-medium text-brand hover:underline inline-flex items-center gap-1">
          <Icon name="arrowLeft" size={15} /> {chapter ? `Chapitre ${chapter.number} — ${chapter.title}` : 'Parcours'}
        </Link>
        <span className="text-ink-3">·</span>
        <span className="text-ink-2">
          Leçon {idx + 1}/{LESSONS.length} · ~{lesson.duration} min
        </span>
        {lesson.advanced && <Pill tone="warn">Notion optionnelle</Pill>}
        {completed && <Pill tone="ok">Validée</Pill>}
      </div>
      <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight mb-3">{lesson.title}</h1>
      <ProgressBar value={(step + 1) / STEPS.length} className="mb-3" />
      <div className="flex gap-1.5 overflow-x-auto thin-scroll pb-2 mb-4" role="tablist" aria-label="Étapes de la leçon">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={i === step}
            onClick={() => go(i)}
            className={cx('shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium border', i === step ? 'bg-navy text-white border-navy dark:bg-brand dark:text-navy' : i < step ? 'bg-surface border-line text-ink' : 'bg-surface border-line text-ink-2')}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {step === 0 && (
        <Card className="space-y-4 anim-fade">
          <div className="flex gap-2 rounded-lg border border-line bg-surface-2 px-4 py-3">
            <Icon name="target" className="text-brand shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Objectif de la leçon : </span>
              {lesson.objective}
            </div>
          </div>
          {lesson.explanation.map((b, i) => (
            <BlockView key={i} b={b} />
          ))}
        </Card>
      )}
      {step === 1 && (
        <Card className="space-y-4 anim-fade">
          <h2 className="text-lg font-semibold">Règle à retenir</h2>
          {lesson.rule.map((b, i) =>
            b.t === 'info' ? (
              <Callout key={i} kind="rule" title={b.title ?? 'Règle'}>
                <Rich text={b.text} />
              </Callout>
            ) : (
              <Callout key={i} kind="rule">
                <BlockView b={b} />
              </Callout>
            ),
          )}
          {lesson.mnemonic && <BlockView b={{ t: 'mnemo', title: 'Moyen mnémotechnique', text: lesson.mnemonic }} />}
        </Card>
      )}
      {step === 2 && (
        <Card className="anim-fade">
          <h2 className="text-lg font-semibold mb-3">Exemple résolu pas à pas</h2>
          <WorkedExample lesson={lesson} />
        </Card>
      )}
      {step === 3 && (
        <Card className="space-y-5 anim-fade">
          <div>
            <h2 className="text-lg font-semibold mb-2">Erreur fréquente à éviter</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-lg bg-bad-soft p-3">
                <div className="text-xs font-semibold uppercase text-bad">À éviter</div>
                <div className="font-bold">{lesson.mistake.wrong}</div>
              </div>
              <div className="rounded-lg bg-ok-soft p-3">
                <div className="text-xs font-semibold uppercase text-ok">Correct</div>
                <div className="font-bold">{lesson.mistake.right}</div>
              </div>
            </div>
            <p className="mt-2 text-ink-2">
              <strong className="text-ink">Pourquoi ?</strong> {lesson.mistake.why}
            </p>
            {lesson.mistake.smiles && (
              <div className="max-w-sm mt-2">
                <MoleculeView smiles={lesson.mistake.smiles} show={['numbers', 'chain']} size="sm" />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">Autres exemples</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lesson.examples.map((e) => (
                <figure key={e.smiles} className="rounded-lg border border-line bg-surface p-2">
                  <MoleculeView smiles={e.smiles} show={analyse(e.smiles).naming ? ['numbers'] : []} size="sm" />
                  <figcaption className="text-center text-sm mt-1">
                    <strong>{analyse(e.smiles).naming?.name}</strong>
                    {e.comment && <span className="block text-ink-2">{e.comment}</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </Card>
      )}
      {(step === 4 || step === 5) && (
        <div className="anim-fade">
          <p className="mb-3 text-ink-2">
            {step === 4 ? 'Exercices guidés : utilise les indices si tu bloques, ils sont là pour ça.' : 'Exercices autonomes : sans indice cette fois. Tu peux réessayer autant que tu veux.'}
          </p>
          <ExerciseRunner
            key={`${step}-${runKey}`}
            exercises={exercises}
            context="lesson"
            noHints={step === 5}
            title={STEPS[step]}
            onFinish={() => {}}
            renderSummary={(results) => (
              <RunSummary results={results}>
                <Button variant="soft" onClick={() => setRunKey((k) => k + 1)}>
                  Recommencer
                </Button>
                <Button onClick={() => go(step + 1)}>Étape suivante →</Button>
              </RunSummary>
            )}
          />
        </div>
      )}
      {step === 6 && (
        <div className="anim-fade">
          {!quizResult ? (
            <>
              <p className="mb-3 text-ink-2">Quiz final : {Math.round(QUIZ_PASS * 100)} % de bonnes réponses pour valider la leçon. Pas d’indice, mais une correction détaillée après chaque question.</p>
              <ExerciseRunner key={`quiz-${runKey}`} exercises={exercises} context="lesson" noHints title="Quiz final" onFinish={onQuizFinish} renderSummary={() => null} />
            </>
          ) : (
            <RunSummary results={quizResult.results} message={quizResult.score >= QUIZ_PASS ? doneMsg : undefined}>
              <p className="w-full text-lg font-semibold">
                Score : {Math.round(quizResult.score * 100)} % —{' '}
                {quizResult.score >= QUIZ_PASS ? 'leçon validée.' : 'leçon pas encore validée. Relis les points corrigés puis repasse le quiz.'}
              </p>
              {quizResult.score < QUIZ_PASS && (
                <>
                  <Button variant="soft" onClick={() => go(0)}>
                    Relire la leçon
                  </Button>
                  <Button variant="outline" onClick={() => { setQuizResult(null); setRunKey((k) => k + 1); }}>
                    Repasser le quiz
                  </Button>
                </>
              )}
              <Button onClick={() => go(7)}>Fiche récapitulative →</Button>
            </RunSummary>
          )}
        </div>
      )}
      {step === 7 && (
        <Card className="anim-fade">
          <h2 className="text-lg font-semibold mb-2">Fiche récapitulative</h2>
          <ul className="list-disc pl-6 space-y-1">
            {lesson.summary.map((s, i) => (
              <li key={i}>
                <Rich text={s} />
              </li>
            ))}
          </ul>
          {!completed && (
            <div className="mt-4">
              <Callout kind="tip" title="Validation">
                Pour valider la leçon, réussis le quiz final (étape 7) avec au moins {Math.round(QUIZ_PASS * 100)} % de bonnes réponses. Tu peux le repasser autant de fois que nécessaire.
              </Callout>
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {!completed && (
              <Button variant="outline" onClick={() => go(6)}>
                Passer le quiz final
              </Button>
            )}
            <Button to={`/fiches/${lesson.id}`} variant="soft">
              Voir la fiche de cours
            </Button>
            {nxt && (
              <Button to={`/lecon/${nxt.id}`} onClick={() => setStep(0)}>
                Leçon suivante : {nxt.title} →
              </Button>
            )}
          </div>
        </Card>
      )}

      {step < 4 && (
        <div className="mt-4 flex justify-between">
          <Button variant="ghost" onClick={() => go(Math.max(0, step - 1))} disabled={step === 0}>
            ← Précédent
          </Button>
          <Button onClick={() => go(step + 1)}>Suivant →</Button>
        </div>
      )}
    </div>
  );
}
