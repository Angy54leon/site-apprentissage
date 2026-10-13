import { useState } from 'react';
import { SKILL_BY_ID } from '../content/skills';
import { buildReviewSet, skillScores } from '../exercises/sessions';
import type { Exercise } from '../exercises/types';
import { getState, recordReview, useAppState } from '../state/store';
import { INTERVALS, dueSkills, overdueSkills, upcomingSkills } from '../state/srs';
import { formatDate, today } from '../state/dates';
import { ExerciseRunner, RunSummary } from '../ui/exercises/ExerciseRunner';
import { Button, Card, Empty, PageTitle, Pill } from '../ui/kit';
import { MimiSays } from '../ui/love';

export function ReviewPage() {
  const st = useAppState();
  const t = today();
  const due = dueSkills(st, t);
  const overdue = overdueSkills(st, t);
  const upcoming = upcomingSkills(st, t, 7);
  const [run, setRun] = useState<Exercise[] | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const start = () => {
    const r = buildReviewSet(getState(), t, Math.max(6, Math.min(16, due.length * 2)));
    setInfo(r.memoryQuiz ? 'Aucune notion due : test de mémorisation sur des notions déjà vues.' : null);
    setRun(r.exercises);
  };
  if (run)
    return (
      <div>
        {info && <p className="mb-2 text-sm text-info">{info}</p>}
        <ExerciseRunner
          exercises={run}
          context="review"
          timeKind="review"
          title="Révisions espacées"
          onFinish={(results) => recordReview(skillScores(results))}
          renderSummary={(results) => (
            <RunSummary results={results}>
              <p className="w-full text-sm text-ink-2">Chaque notion a changé de boîte selon tes résultats.</p>
              <Button onClick={() => setRun(null)}>Retour aux révisions</Button>
            </RunSummary>
          )}
        />
      </div>
    );
  const boxes = [1, 2, 3, 4, 5].map((b) => Object.entries(st.skills).filter(([, s]) => s.box === b));
  return (
    <div>
      <PageTitle emoji="🔁" sub="Méthode inspirée de Leitner : une notion réussie revient de plus en plus tard, une notion ratée revient dès le lendemain.">
        Révisions espacées
      </PageTitle>
      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <Card>
          <h2 className="font-extrabold">Aujourd’hui</h2>
          <p className="text-4xl font-black text-brand my-2">{due.length}</p>
          <p className="text-sm text-ink-2">notion{due.length > 1 ? 's' : ''} à réviser{overdue.length ? `, dont ${overdue.length} en retard` : ''}.</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {due.map((s) => (
              <Pill key={s} tone={overdue.includes(s) ? 'warn' : 'brand'}>
                {SKILL_BY_ID[s]?.label}
              </Pill>
            ))}
          </div>
          <Button className="mt-4" size="lg" onClick={start} disabled={!Object.keys(st.skills).length}>
            {due.length ? 'Commencer les révisions' : 'Petit test de mémorisation'}
          </Button>
          {!Object.keys(st.skills).length && <p className="text-sm text-ink-2 mt-2">Termine une première leçon : ses notions entreront dans ton programme de révision.</p>}
          {overdue.length > 0 && <MimiSays className="mt-4">Des révisions en retard ? Aucun souci : rien n’est perdu, on rattrape tranquillement. 💗</MimiSays>}
        </Card>
        <Card>
          <h2 className="font-extrabold mb-2">Mes boîtes</h2>
          <div className="grid grid-cols-5 gap-2">
            {boxes.map((list, i) => (
              <div key={i} className="rounded-2xl bg-surface-2 border border-line p-2 min-h-28">
                <div className="text-center text-xs font-extrabold">Boîte {i + 1}</div>
                <div className="text-center text-[11px] text-ink-3 mb-1">tous les {INTERVALS[i + 1]} j</div>
                <div className="text-center text-2xl font-black">{list.length}</div>
                <ul className="text-[11px] text-ink-2 mt-1 space-y-0.5 hidden sm:block">
                  {list.slice(0, 5).map(([k]) => (
                    <li key={k} className="truncate" title={SKILL_BY_ID[k]?.label}>
                      {SKILL_BY_ID[k]?.label}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <h3 className="font-extrabold mt-4 mb-1">Prochaines échéances (7 jours)</h3>
          {upcoming.length ? (
            <ul className="text-sm space-y-1">
              {upcoming.map((u) => (
                <li key={u.skill} className="flex justify-between">
                  <span>{SKILL_BY_ID[u.skill]?.label}</span>
                  <span className="text-ink-2">{formatDate(u.due)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Aucune révision prévue dans les 7 prochains jours.</Empty>
          )}
        </Card>
      </div>
    </div>
  );
}
