import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { STUDY_TIPS } from '../config/app';
import { LESSONS } from '../content/lessons';
import { SKILLS, SKILL_BY_ID } from '../content/skills';
import { chapterOfLesson } from '../content/chapters';
import { useAppState, snapshotTodayPlan } from '../state/store';
import {
  allSkillStats,
  chapterProgress,
  chapterRates,
  completedLessons,
  currentChapter,
  firstAttempts,
  globalProgress,
  history,
  lessonInProgress,
  levelLabel,
  nextRecommendedLesson,
  rate,
  readiness,
  totalActiveMinutes,
} from '../state/stats';
import { daysUntilExam, todaysTasks } from '../state/planner';
import { overdueSkills, dueSkills } from '../state/srs';
import { diffDays, formatDate, today } from '../state/dates';
import { Button, Card, Pill, ProgressBar, RingProgress, SectionTitle, Stat, pct, cx } from '../ui/kit';
import { BarChart, HBar } from '../ui/charts';
import { Icon } from '../ui/icons';

const TASK_ICON = { review: 'review', lesson: 'book', practice: 'pencil', mistakes: 'mistakes', exam: 'exam' } as const;
const TASK_WHY: Record<string, string> = {
  review: 'Notions arrivées à échéance dans ton programme de révision espacée.',
  lesson: 'Prochaine étape du parcours.',
  practice: 'Application immédiate des notions de la leçon.',
  mistakes: 'Retravailler les erreurs encore non comprises.',
  exam: 'Évaluation en conditions d’examen.',
};

export function DashboardPage() {
  const st = useAppState();
  const t = today();
  const tasks = todaysTasks(st);
  useEffect(() => {
    snapshotTodayPlan(tasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const log = st.days[t];
  const done = log?.tasksDone ?? [];
  const sessionDone = !!log?.sessionDone;
  const stats = allSkillStats(st);
  const mastered = stats.filter((s) => s.status === 'maitrisee');
  const overdue = overdueSkills(st, t);
  const due = dueSkills(st, t);
  const weak = stats.filter((s) => s.status === 'a-revoir');
  const priorities = [
    ...overdue.map((s) => ({ skill: s, reason: `Révision en retard de ${diffDays(t, st.skills[s].due)} j` })),
    ...weak.filter((s) => !overdue.includes(s.skill)).map((s) => ({ skill: s.skill, reason: `Réussite récente ${pct(s.recentRate)}` })),
    ...due.filter((s) => !overdue.includes(s) && !weak.some((w) => w.skill === s)).map((s) => ({ skill: s, reason: 'Révision prévue aujourd’hui' })),
  ].slice(0, 6);
  const next = nextRecommendedLesson(st);
  const inProgress = lessonInProgress(st);
  const resume = inProgress ?? next;
  const chapter = currentChapter(st);
  const cp = chapterProgress(st, chapter);
  const first = firstAttempts(st);
  const examIn = daysUntilExam(st);
  const ready = readiness(st);
  const hist = history(st, 14);
  const rates = chapterRates(st);
  const tip = STUDY_TIPS[new Date().getDate() % STUDY_TIPS.length];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight">Tableau de bord</h1>
          <p className="text-ink-2 mt-1">
            {formatDate(t)}
            {examIn !== null && examIn >= 0 ? ` · examen dans ${examIn} jour${examIn > 1 ? 's' : ''}` : ''}
          </p>
        </div>
        <Button to="/seance" size="lg">
          <Icon name="play" size={16} /> {sessionDone ? 'Revoir ma séance' : 'Commencer ma séance'}
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle>Reprendre mon apprentissage</SectionTitle>
          <div className="flex flex-wrap items-start gap-2 mb-1">
            <span className="text-sm text-ink-2">Chapitre {chapter.number} sur 12</span>
            <Pill tone="info">{chapter.difficulty}</Pill>
          </div>
          <h3 className="text-xl font-semibold">{chapter.title}</h3>
          <div className="flex items-center gap-3 mt-2">
            <ProgressBar value={cp.total ? cp.done / cp.total : 0} className="flex-1" label="Progression du chapitre" />
            <span className="text-sm text-ink-2 tabular-nums">
              {cp.done}/{cp.total} leçons
            </span>
          </div>
          {resume ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-2 p-4">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-ink-2">{inProgress ? 'Leçon en cours' : 'Prochaine leçon recommandée'}</div>
                <div className="font-semibold mt-0.5">{resume.title}</div>
                <div className="text-sm text-ink-2">
                  ~{resume.duration} min
                  {inProgress && st.lessons[inProgress.id] ? ` · étape ${st.lessons[inProgress.id].step + 1} sur 8` : ''}
                  {chapterOfLesson(resume.id) && chapterOfLesson(resume.id)!.id !== chapter.id ? ` · chapitre ${chapterOfLesson(resume.id)!.number}` : ''}
                </div>
              </div>
              <Button to={`/lecon/${resume.id}`}>
                {inProgress ? 'Reprendre la leçon' : 'Commencer la leçon'} <Icon name="arrowRight" size={16} />
              </Button>
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-2">Toutes les leçons sont validées. Poursuis avec les examens blancs et les révisions.</p>
          )}
          <p className="mt-3 text-sm">
            <Link to="/parcours" className="font-medium text-brand hover:underline">
              Voir tout le parcours
            </Link>
          </p>
        </Card>

        <Card className="flex flex-col items-center text-center">
          <SectionTitle>Progression globale</SectionTitle>
          <RingProgress value={globalProgress(st)} sub="du parcours" />
          <div className="mt-3 font-medium">{levelLabel(st)}</div>
          <p className="text-sm text-ink-2">
            {completedLessons(st)} leçon{completedLessons(st) > 1 ? 's' : ''} validée{completedLessons(st) > 1 ? 's' : ''} sur {LESSONS.length}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle actions={sessionDone ? <Pill tone="ok">Séance terminée</Pill> : <span className="text-sm text-ink-2">~{tasks.reduce((s, x) => s + x.minutes, 0)} min</span>}>
            Programme du jour
          </SectionTitle>
          {tasks.length ? (
            <ol className="space-y-2">
              {tasks.map((task, i) => {
                const isDone = done.includes(task.id);
                return (
                  <li key={task.id} className="flex items-start gap-3 rounded-lg border border-line p-3">
                    <span className={cx('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold', isDone ? 'bg-ok text-white' : 'bg-surface-2 text-ink-2')}>
                      {isDone ? <Icon name="check" size={14} /> : i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={cx('font-medium flex items-center gap-2', isDone && 'text-ink-2 line-through')}>
                        <Icon name={TASK_ICON[task.kind]} size={16} className="text-ink-2" /> {task.title}
                      </div>
                      <div className="text-xs text-ink-2 mt-0.5">{TASK_WHY[task.kind]}</div>
                    </div>
                    <span className="text-xs text-ink-2 whitespace-nowrap">~{task.minutes} min</span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-sm text-ink-2">Aucune tâche planifiée aujourd’hui (jour de repos). Une séance libre reste possible.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button to="/seance">{sessionDone ? 'Revoir ma séance' : 'Commencer ma séance'}</Button>
            <Button to="/revisions?vue=planning" variant="soft">
              <Icon name="calendar" size={16} /> Planning de la semaine
            </Button>
          </div>
        </Card>

        <Card>
          <SectionTitle actions={due.length > 0 ? <Button to="/revisions" size="sm" variant="outline">Réviser</Button> : undefined}>
            À retravailler en priorité
          </SectionTitle>
          {priorities.length ? (
            <ul className="space-y-2">
              {priorities.map((p) => (
                <li key={p.skill} className="flex items-start justify-between gap-2 text-sm">
                  <span className="font-medium">{SKILL_BY_ID[p.skill]?.label}</span>
                  <span className={cx('text-xs text-right whitespace-nowrap', p.reason.startsWith('Révision en retard') ? 'text-warn' : p.reason.startsWith('Réussite') ? 'text-bad' : 'text-ink-2')}>{p.reason}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">Aucune notion à retravailler pour l’instant. Les notions échouées ou à réviser apparaîtront ici, avec la raison.</p>
          )}
          {mastered.length > 0 && (
            <div className="mt-4 border-t border-line pt-3">
              <div className="text-xs font-medium uppercase tracking-wide text-ink-2 mb-1">Notions maîtrisées</div>
              <div className="flex flex-wrap gap-1">
                {mastered.map((s) => (
                  <Pill key={s.skill} tone="ok">
                    {SKILL_BY_ID[s.skill].label}
                  </Pill>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Exercices réalisés" value={first.length} hint={`${first.filter((a) => a.status === 'correct').length} réussis du premier coup`} />
        <Stat label="Taux de réussite" value={pct(rate(first))} hint="premiers essais" />
        <Stat label="Notions maîtrisées" value={`${mastered.length}/${SKILLS.length}`} hint="critères exigeants" />
        <Stat label="Temps actif" value={`${totalActiveMinutes(st)} min`} hint="mesuré pendant le travail" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <SectionTitle actions={<Link to="/statistiques" className="text-sm font-medium text-brand hover:underline">Détail</Link>}>Taux de réussite par chapitre</SectionTitle>
          <div className="space-y-2">
            {rates.map((r) => (
              <HBar key={r.chapter.id} label={`${r.chapter.number}. ${r.chapter.title}`} value={r.rate} sub={`${r.attempts} exercices`} />
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle>Historique des résultats (14 jours)</SectionTitle>
          {first.length ? (
            <BarChart
              title="Exercices réalisés par jour"
              data={hist.map((h) => ({
                label: `${Number(h.date.slice(8))}/${h.date.slice(5, 7)}`,
                value: h.attempts,
                tip: `${formatDate(h.date)} : ${h.attempts} exercice(s)${h.rate !== null ? `, ${Math.round(h.rate * 100)} % de réussite` : ''}`,
              }))}
            />
          ) : (
            <p className="text-sm text-ink-2">Aucun exercice enregistré pour l’instant : l’historique se remplira avec tes résultats réels.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle>Préparation à l’examen</SectionTitle>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="text-3xl font-bold tabular-nums">{pct(ready.value)}</span>
            <span className="text-sm text-ink-2">
              {st.profile.examDate ? `Examen le ${formatDate(st.profile.examDate)}` : (
                <>
                  Pas de date d’examen. <Link to="/reglages" className="font-medium text-brand hover:underline">Renseigner une date</Link>
                </>
              )}
            </span>
          </div>
          <ProgressBar value={ready.value} className="mt-2" />
          <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-ink-2">Couverture du programme</dt>
              <dd className="font-semibold">{pct(ready.coverage)}</dd>
            </div>
            <div>
              <dt className="text-ink-2">Notions solides</dt>
              <dd className="font-semibold">{pct(ready.mastery)}</dd>
            </div>
            <div>
              <dt className="text-ink-2">Dernier examen blanc</dt>
              <dd className="font-semibold">{ready.exam === null ? 'non passé' : pct(ready.exam)}</dd>
            </div>
          </dl>
          <p className="text-xs text-ink-2 mt-2">Estimation calculée uniquement à partir de tes résultats enregistrés.</p>
        </Card>
        <Card>
          <SectionTitle>Conseil de méthode</SectionTitle>
          <p className="text-sm text-ink flex gap-2">
            <Icon name="lightbulb" className="text-brand shrink-0 mt-0.5" />
            {tip}
          </p>
        </Card>
      </div>
    </div>
  );
}
