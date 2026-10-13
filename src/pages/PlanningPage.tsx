import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SKILL_BY_ID } from '../content/skills';
import { updateProfile, useAppState } from '../state/store';
import { buildPlan, daysUntilExam, todaysTasks, DAY_TYPE_LABEL } from '../state/planner';
import { overdueSkills, upcomingSkills } from '../state/srs';
import { WEEKDAY_LABELS, addDays, formatDate, today } from '../state/dates';
import { Button, Card, Empty, PageTitle, Pill, cx } from '../ui/kit';
import { Chip, GoalEditor } from './OnboardingPage';

const TYPE_ICON: Record<string, string> = { study: '📖', light: '🌱', revision: '🔁', 'exam-prep': '📝', rest: '☁️', exam: '🎓' };

export function PlanningPage() {
  const st = useAppState();
  const t = today();
  const [view, setView] = useState<'day' | 'week'>('week');
  const [edit, setEdit] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const plan = buildPlan(st, 7 + weekOffset * 7, t);
  const week = plan.days.slice(weekOffset * 7, weekOffset * 7 + 7);
  const tasks = todaysTasks(st);
  const done = st.days[t]?.tasksDone ?? [];
  const finished = Object.entries(st.days)
    .filter(([, d]) => d.sessionDone)
    .map(([k]) => k)
    .sort()
    .reverse();
  const overdue = overdueSkills(st, t);
  const upcoming = upcomingSkills(st, t, 14);
  const examIn = daysUntilExam(st);

  return (
    <div>
      <PageTitle emoji="💗" sub="Ton planning se recalcule tout seul à partir de ta progression réelle. Les jours légers évitent la surcharge.">
        Mon planning de révision
      </PageTitle>
      {plan.warning && <p className="mb-4 rounded-2xl bg-warn-soft text-warn px-4 py-3 text-sm font-semibold">{plan.warning}</p>}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <div className="inline-flex rounded-xl bg-surface-2 border border-line p-0.5 font-bold text-sm">
          {(['day', 'week'] as const).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} className={cx('px-3 py-1.5 rounded-lg', view === v ? 'bg-surface text-brand' : 'text-ink-2')} aria-pressed={view === v}>
              {v === 'day' ? 'Aujourd’hui' : 'Semaine'}
            </button>
          ))}
        </div>
        <Button to="/seance">Commencer ma séance 💗</Button>
        <Button variant="soft" onClick={() => setEdit(!edit)}>
          {edit ? 'Fermer' : 'Modifier mon planning'}
        </Button>
        {examIn !== null && examIn >= 0 && <Pill tone="brand">Examen : J − {examIn}</Pill>}
      </div>

      {edit && (
        <Card className="mb-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <label className="block">
              <span className="font-bold">Date d’examen</span>
              <input type="date" min={t} value={st.profile.examDate ?? ''} onChange={(e) => updateProfile({ examDate: e.target.value || undefined })} className="mt-1 block rounded-xl border border-line bg-surface px-3 py-2" />
            </label>
            <div>
              <div className="font-bold mb-1">Jours de travail</div>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                  <Chip
                    key={d}
                    on={st.profile.studyDays.includes(d)}
                    onClick={() => {
                      const days = st.profile.studyDays.includes(d) ? st.profile.studyDays.filter((x) => x !== d) : [...st.profile.studyDays, d];
                      if (days.length) updateProfile({ studyDays: days });
                    }}
                  >
                    {WEEKDAY_LABELS[d]}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
          <div>
            <div className="font-bold mb-1">Durées de la séance quotidienne</div>
            <GoalEditor goal={st.profile.goal} onChange={(g) => updateProfile({ goal: g })} />
          </div>
        </Card>
      )}

      {view === 'day' ? (
        <Card>
          <h2 className="font-extrabold mb-2">{formatDate(t)}</h2>
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                <span className={cx('w-5 h-5 rounded-full grid place-items-center text-xs font-black', done.includes(task.id) ? 'bg-ok text-white' : 'border-2 border-line')}>{done.includes(task.id) ? '✓' : ''}</span>
                <span className="flex-1">{task.title}</span>
                <span className="text-xs text-ink-3">~{task.minutes} min</span>
              </li>
            ))}
            {!tasks.length && <Empty>Journée libre.</Empty>}
          </ul>
        </Card>
      ) : (
        <Card>
          <div className="flex justify-between items-center mb-3">
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))} disabled={weekOffset === 0}>
              ← Semaine précédente
            </Button>
            <span className="font-bold text-sm">
              Du {formatDate(addDays(t, weekOffset * 7), false)} au {formatDate(addDays(t, weekOffset * 7 + 6), false)}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(weekOffset + 1)}>
              Semaine suivante →
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-7 gap-2">
            {week.map((d) => (
              <div key={d.date} className={cx('rounded-2xl border p-2 min-h-32', d.date === t ? 'border-brand bg-brand-soft/20' : 'border-line bg-surface')}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-extrabold uppercase">{formatDate(d.date).split(' ').slice(0, 2).join(' ')}</span>
                  <span>{TYPE_ICON[d.type]}</span>
                </div>
                <div className="text-[11px] font-bold text-ink-3 mb-1">
                  {DAY_TYPE_LABEL[d.type]}
                  {d.minutes ? ` · ${d.minutes} min` : ''}
                  {st.days[d.date]?.sessionDone ? ' · ✓' : ''}
                </div>
                <ul className="space-y-1">
                  {d.tasks.map((task) => (
                    <li key={task.id} className="text-xs rounded-lg bg-surface-2 px-1.5 py-1 leading-tight">
                      {task.kind === 'lesson' ? '📖 ' : task.kind === 'review' ? '🔁 ' : task.kind === 'practice' ? '✏️ ' : task.kind === 'mistakes' ? '📒 ' : '📝 '}
                      {task.title}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3 mt-4">
        <Card>
          <h2 className="font-extrabold mb-2">Révisions en retard</h2>
          {overdue.length ? (
            <ul className="text-sm space-y-1">
              {overdue.map((s) => (
                <li key={s}>
                  {SKILL_BY_ID[s]?.label} <span className="text-ink-3">(prévue le {formatDate(st.skills[s].due, false)})</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">Aucune révision en retard. 🌸</p>
          )}
          {overdue.length > 0 && (
            <Button to="/revisions" size="sm" variant="soft" className="mt-2">
              Rattraper
            </Button>
          )}
        </Card>
        <Card>
          <h2 className="font-extrabold mb-2">Prochaines échéances</h2>
          {examIn !== null && examIn >= 0 && <p className="text-sm font-bold mb-1">🎓 Examen le {formatDate(st.profile.examDate!)}</p>}
          {upcoming.length ? (
            <ul className="text-sm space-y-1">
              {upcoming.slice(0, 8).map((u) => (
                <li key={u.skill} className="flex justify-between gap-2">
                  <span>{SKILL_BY_ID[u.skill]?.label}</span>
                  <span className="text-ink-3">{formatDate(u.due, false)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">Pas encore d’échéance de révision.</p>
          )}
        </Card>
        <Card>
          <h2 className="font-extrabold mb-2">Séances terminées ({finished.length})</h2>
          {finished.length ? (
            <ul className="text-sm space-y-1 max-h-48 overflow-auto thin-scroll">
              {finished.map((d) => (
                <li key={d}>💗 {formatDate(d)}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">
              Ta première séance terminée apparaîtra ici. <Link className="underline font-bold" to="/seance">On commence ?</Link>
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
