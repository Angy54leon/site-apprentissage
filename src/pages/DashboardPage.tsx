import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LOVE, MESSAGES } from '../config/love';
import { SKILLS, SKILL_BY_ID } from '../content/skills';
import { LESSONS } from '../content/lessons';
import { useAppState, pickMessage, snapshotTodayPlan, type VisitInfo } from '../state/store';
import { completedLessons, currentModule, firstAttempts, globalProgress, levelLabel, nextRecommendedLesson, allSkillStats, rate, readiness, totalActiveMinutes } from '../state/stats';
import { buildPlan, daysUntilExam, todaysTasks, DAY_TYPE_LABEL } from '../state/planner';
import { overdueSkills, dueSkills } from '../state/srs';
import { formatDate, shortDay, today } from '../state/dates';
import { mimiStage } from '../state/rewards';
import { Button, Card, HeartProgress, Pill, ProgressBar, Stat, pct, cx } from '../ui/kit';
import { MimiSays, LoveNote } from '../ui/love';

export function DashboardPage({ visit }: { visit: VisitInfo }) {
  const st = useAppState();
  const [msg, setMsg] = useState('');
  const t = today();
  useEffect(() => {
    setMsg(pickMessage(visit.comeback ? 'comeback' : 'motivation'));
  }, [visit.comeback]);
  const tasks = todaysTasks(st);
  useEffect(() => {
    snapshotTodayPlan(tasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const log = st.days[t];
  const done = log?.tasksDone ?? [];
  const sessionDone = !!log?.sessionDone;
  const g = st.profile.goal;
  const active = log?.activeMs ?? { lesson: 0, exercise: 0, review: 0 };
  const stats = allSkillStats(st);
  const mastered = stats.filter((s) => s.status === 'maitrisee').length;
  const toReview = stats.filter((s) => s.status === 'a-revoir');
  const overdue = overdueSkills(st, t);
  const next = nextRecommendedLesson(st);
  const mod = currentModule(st);
  const first = firstAttempts(st);
  const successes = first.filter((a) => a.status === 'correct').length;
  const examIn = daysUntilExam(st);
  const ready = readiness(st);
  const week = buildPlan(st, 7).days;
  const calendarNote = st.love.calendar.find((c) => c.date === t);
  const stage = mimiStage(st);

  return (
    <div className="space-y-5">
      <section className="anim-fade">
        <h1 className="text-2xl sm:text-3xl font-extrabold">Coucou {LOVE.firstName}, prête pour une nouvelle petite victoire ? <span className="decor">💗</span></h1>
        {msg && <LoveNote className="mt-1">{msg}</LoveNote>}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* objectif du jour */}
        <Card className="relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold">Notre petit objectif du jour <span className="decor">💕</span></h2>
              <p className="text-sm text-ink-2">{formatDate(t)} · environ {g.lessonMin + g.exerciseMin + g.reviewMin} min</p>
            </div>
            {sessionDone && <Pill tone="ok">Séance terminée ✓</Pill>}
          </div>
          <div className="mt-4 grid sm:grid-cols-3 gap-3">
            {(
              [
                ['📖 Cours', active.lesson, g.lessonMin],
                ['✏️ Exercices', active.exercise, g.exerciseMin],
                ['🔁 Révision', active.review, g.reviewMin],
              ] as [string, number, number][]
            ).map(([l, ms, min]) => (
              <div key={l} className="rounded-2xl bg-surface-2 border border-line p-3">
                <div className="text-sm font-bold">{l}</div>
                <div className="text-xs text-ink-2 mb-1.5">
                  {Math.round(ms / 60000)} / {min} min actives
                </div>
                <ProgressBar value={min ? ms / (min * 60000) : 1} />
              </div>
            ))}
          </div>
          <ul className="mt-4 space-y-1.5">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2 text-sm">
                <span className={cx('w-5 h-5 rounded-full grid place-items-center text-xs font-black', done.includes(task.id) ? 'bg-ok text-white' : 'border-2 border-line')}>{done.includes(task.id) ? '✓' : ''}</span>
                <span className={cx(done.includes(task.id) && 'line-through text-ink-3')}>{task.title}</span>
                <span className="ml-auto text-ink-3 text-xs">~{task.minutes} min</span>
              </li>
            ))}
            {!tasks.length && <li className="text-sm text-ink-2">Rien de prévu aujourd’hui : profite de ta journée ! Tu peux quand même faire une petite séance libre.</li>}
          </ul>
          {sessionDone ? (
            <p className="decor mt-4 font-hand text-2xl text-brand leading-snug">{MESSAGES.sessionDone[0]}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button to="/seance" size="lg">
              {sessionDone ? 'Revoir ma séance' : 'Commencer ma séance du jour'} 💗
            </Button>
            <Button to="/reglages" variant="ghost" size="sm">
              Modifier les durées
            </Button>
          </div>
        </Card>

        {/* progression */}
        <Card className="flex flex-col items-center text-center">
          <HeartProgress value={globalProgress(st)} size={130} label="Progression globale" />
          <div className="mt-1 font-extrabold">{levelLabel(st)}</div>
          <p className="text-sm text-ink-2">
            {completedLessons(st)} leçon{completedLessons(st) > 1 ? 's' : ''} validée{completedLessons(st) > 1 ? 's' : ''} sur {LESSONS.length}
          </p>
          <div className="mt-3 w-full text-left rounded-2xl bg-surface-2 p-3">
            <div className="text-xs font-bold uppercase text-ink-3">Chapitre en cours</div>
            <div className="font-bold">{mod.title}</div>
            {next ? (
              <>
                <div className="text-xs font-bold uppercase text-ink-3 mt-2">Prochaine leçon recommandée</div>
                <Link to={`/lecon/${next.id}`} className="font-bold text-brand underline">
                  {next.title}
                </Link>
              </>
            ) : (
              <p className="text-sm mt-1">Tout le parcours est validé ! Place aux examens blancs. 🏆</p>
            )}
          </div>
          <MimiSays className="mt-3 self-start" stage={stage} mood={sessionDone ? 'cheer' : 'happy'}>
            {sessionDone ? 'Bravo pour aujourd’hui ! Je suis fière de toi (et lui encore plus). 💗' : MESSAGES.mimiTips[new Date().getDate() % MESSAGES.mimiTips.length]}
          </MimiSays>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Notions maîtrisées" value={`${mastered}/${SKILLS.length}`} hint="selon des critères exigeants" />
        <Stat label="Exercices réussis" value={successes} hint={`sur ${first.length} faits`} />
        <Stat label="Taux de réussite" value={pct(rate(first))} hint="premiers essais" />
        <Stat label="Temps actif" value={`${totalActiveMinutes(st)} min`} hint="temps réellement mesuré" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <h2 className="font-extrabold mb-2">Notions à retravailler</h2>
          {toReview.length || overdue.length ? (
            <ul className="space-y-1 text-sm">
              {[...new Set([...toReview.map((s) => s.skill), ...overdue])].slice(0, 7).map((s) => (
                <li key={s} className="flex justify-between gap-2">
                  <span>{SKILL_BY_ID[s]?.label}</span>
                  {overdue.includes(s) ? <Pill tone="warn">en retard</Pill> : <Pill tone="bad">à revoir</Pill>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">Rien à signaler pour l’instant. Les notions ratées apparaîtront ici.</p>
          )}
          {dueSkills(st, t).length > 0 && (
            <Button to="/revisions" variant="soft" size="sm" className="mt-3">
              Réviser maintenant ({dueSkills(st, t).length})
            </Button>
          )}
        </Card>

        <Card>
          <h2 className="font-extrabold mb-2">Mon examen</h2>
          {examIn !== null ? (
            <>
              <p className="text-3xl font-black text-brand">{examIn > 0 ? `J − ${examIn}` : examIn === 0 ? 'C’est aujourd’hui !' : 'Passé'}</p>
              <p className="text-sm text-ink-2">{formatDate(st.profile.examDate!)}</p>
            </>
          ) : (
            <p className="text-sm text-ink-2">
              Pas de date d’examen renseignée. <Link to="/reglages" className="underline font-bold">Ajouter une date</Link>
            </p>
          )}
          <div className="mt-3">
            <div className="flex justify-between text-sm font-bold">
              <span>Préparation à l’examen</span>
              <span>{pct(ready.value)}</span>
            </div>
            <ProgressBar value={ready.value} className="mt-1" />
            <p className="text-xs text-ink-3 mt-1">
              Couverture {pct(ready.coverage)} · notions solides {pct(ready.mastery)} · examen blanc {ready.exam === null ? 'pas encore fait' : pct(ready.exam)}
            </p>
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-extrabold">Ma semaine</h2>
            <Link to="/planning" className="text-sm font-bold text-brand underline">
              Planning
            </Link>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {week.map((d) => (
              <div key={d.date} className={cx('rounded-xl p-1.5 text-center border', d.date === t ? 'border-brand-2 bg-brand-soft/30' : 'border-line')} title={DAY_TYPE_LABEL[d.type]}>
                <div className="text-[10px] uppercase font-bold text-ink-3">{shortDay(d.date)}</div>
                <div className="text-base">{d.type === 'rest' ? '☁️' : d.type === 'light' ? '🌱' : d.type === 'revision' ? '🔁' : d.type === 'exam-prep' ? '📝' : d.type === 'exam' ? '🎓' : '📖'}</div>
                <div className="text-[10px] text-ink-2">{d.minutes ? `${d.minutes}′` : ''}</div>
              </div>
            ))}
          </div>
          {calendarNote && (
            <div className="decor mt-3 rounded-2xl bg-surface-2 p-3">
              <div className="text-xs font-bold uppercase text-ink-3">Le petit mot du jour 💌</div>
              <p className="font-hand text-xl text-brand leading-snug">{MESSAGES.calendar[calendarNote.index]}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
