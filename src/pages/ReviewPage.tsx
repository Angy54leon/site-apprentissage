import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SKILLS, SKILL_BY_ID } from '../content/skills';
import { buildMistakesSet, buildReviewSet, skillScores } from '../exercises/sessions';
import type { Exercise } from '../exercises/types';
import { getState, recordReview, useAppState } from '../state/store';
import { INTERVALS, dueSkills, overdueSkills, upcomingSkills } from '../state/srs';
import { skillStats, MASTERY_RULE } from '../state/stats';
import { diffDays, formatDate, today } from '../state/dates';
import { ExerciseRunner, RunSummary } from '../ui/exercises/ExerciseRunner';
import { Button, Callout, Card, Empty, PageTitle, Pill, SectionTitle, pct } from '../ui/kit';
import { Tabs, useTab } from '../ui/Tabs';
import { PlanningPage } from './PlanningPage';

export function ReviewPage() {
  const st = useAppState();
  const t = today();
  const [tab, setTab] = useTab('aujourdhui');
  const due = dueSkills(st, t);
  const overdue = overdueSkills(st, t);
  const upcoming = upcomingSkills(st, t, 7);
  const openMistakes = Object.values(st.mistakes).filter((m) => !m.resolved).length;
  const [run, setRun] = useState<{ list: Exercise[]; review: boolean; info?: string } | null>(null);

  const startReview = () => {
    const r = buildReviewSet(getState(), t, Math.max(6, Math.min(16, due.length * 2)));
    setRun({ list: r.exercises, review: true, info: r.memoryQuiz ? 'Aucune notion n’est due : test de mémorisation sur des notions déjà étudiées.' : undefined });
  };
  const startMistakes = () => setRun({ list: buildMistakesSet(getState(), 10), review: false });

  if (run)
    return (
      <div>
        {run.info && <p className="mb-3 text-sm text-info">{run.info}</p>}
        <ExerciseRunner
          exercises={run.list}
          context={run.review ? 'review' : 'mistakes'}
          timeKind="review"
          title={run.review ? 'Révisions espacées' : 'Exercices ciblés sur mes erreurs'}
          onFinish={(results) => run.review && recordReview(skillScores(results))}
          renderSummary={(results) => (
            <RunSummary results={results}>
              {run.review && <p className="w-full text-sm text-ink-2">Chaque notion a changé de boîte selon tes résultats : réussie, elle reviendra plus tard ; échouée, dès demain.</p>}
              <Button onClick={() => setRun(null)}>Retour aux révisions</Button>
            </RunSummary>
          )}
        />
      </div>
    );

  // priorités du jour, dans l'ordre de traitement, avec leur justification
  const priorities = due.map((s) => {
    const stats = skillStats(st, s);
    const late = st.skills[s].due < t ? diffDays(t, st.skills[s].due) : 0;
    const reason = late
      ? `En retard de ${late} jour${late > 1 ? 's' : ''}`
      : stats.recentRate !== null && stats.recentRate < 0.6
        ? `Réussite récente faible (${pct(stats.recentRate)})`
        : `Rappel prévu (boîte ${st.skills[s].box})`;
    return { skill: s, reason, late: late > 0, weak: stats.recentRate !== null && stats.recentRate < 0.6 };
  });
  const boxes = [1, 2, 3, 4, 5].map((b) => Object.entries(st.skills).filter(([, s]) => s.box === b));

  return (
    <div>
      <PageTitle sub="Répétition espacée (méthode Leitner) : une notion réussie revient de plus en plus tard, une notion échouée revient dès le lendemain. Le planning s’adapte à ta date d’examen.">
        Révisions
      </PageTitle>
      <Tabs
        tabs={[
          { id: 'aujourdhui', label: 'Priorités du jour' },
          { id: 'planning', label: 'Planning' },
          { id: 'competences', label: 'Suivi des compétences' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'planning' && <PlanningPage embedded />}

      {tab === 'aujourdhui' && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <SectionTitle actions={<span className="text-sm text-ink-2">{formatDate(t)}</span>}>À réviser aujourd’hui ({due.length})</SectionTitle>
            {priorities.length ? (
              <ol className="space-y-2">
                {priorities.map((p, i) => (
                  <li key={p.skill} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-ink-2">{i + 1}</span>
                    <span className="flex-1 font-medium text-sm">{SKILL_BY_ID[p.skill]?.label}</span>
                    <span className={p.late ? 'text-xs text-warn' : p.weak ? 'text-xs text-bad' : 'text-xs text-ink-2'}>{p.reason}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty>
                {Object.keys(st.skills).length
                  ? 'Aucune notion n’arrive à échéance aujourd’hui. Tu peux faire un test de mémorisation ou retravailler tes erreurs.'
                  : 'Valide une première leçon : ses notions entreront dans ton programme de révision.'}
              </Empty>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={startReview} disabled={!Object.keys(st.skills).length}>
                {due.length ? 'Commencer les révisions' : 'Test de mémorisation'}
              </Button>
              <Button variant="soft" onClick={startMistakes} disabled={!openMistakes && !Object.keys(st.skills).length}>
                Exercices ciblés sur mes erreurs{openMistakes ? ` (${openMistakes})` : ''}
              </Button>
            </div>
            {overdue.length > 0 && <p className="mt-3 text-sm text-warn">Les révisions en retard sont traitées en premier dans la prochaine série.</p>}
          </Card>
          <div className="space-y-6">
            <Card>
              <SectionTitle>Prochaines échéances (7 jours)</SectionTitle>
              {upcoming.length ? (
                <ul className="text-sm space-y-1.5">
                  {upcoming.map((u) => (
                    <li key={u.skill} className="flex justify-between gap-2">
                      <span>{SKILL_BY_ID[u.skill]?.label}</span>
                      <span className="text-ink-2 whitespace-nowrap">{formatDate(u.due)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-2">Aucune révision prévue dans les 7 prochains jours.</p>
              )}
            </Card>
            <Callout kind="method" title="Pourquoi cet ordre ?">
              Les notions en retard passent d’abord, puis celles dont la réussite récente est faible, puis les rappels prévus. Réviser une notion juste avant de l’oublier est ce qui la fixe le plus durablement.
            </Callout>
          </div>
        </div>
      )}

      {tab === 'competences' && (
        <div className="space-y-6">
          <Card>
            <SectionTitle>Boîtes de révision</SectionTitle>
            <div className="grid grid-cols-5 gap-2">
              {boxes.map((list, i) => (
                <div key={i} className="rounded-lg border border-line bg-surface-2 p-2 text-center">
                  <div className="text-xs font-semibold">Boîte {i + 1}</div>
                  <div className="text-[11px] text-ink-2">tous les {INTERVALS[i + 1]} j</div>
                  <div className="text-2xl font-bold mt-1 tabular-nums">{list.length}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <SectionTitle actions={<Link to="/statistiques" className="text-sm font-medium text-brand hover:underline">Statistiques détaillées</Link>}>État de chaque compétence</SectionTitle>
            <p className="text-xs text-ink-2 mb-3">{MASTERY_RULE}</p>
            <ul className="divide-y divide-line">
              {SKILLS.map((s) => {
                const ss = skillStats(st, s.id);
                const sk = st.skills[s.id];
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                    <span className="flex-1 min-w-[12rem] font-medium">{s.label}</span>
                    <Pill tone={ss.status === 'maitrisee' ? 'ok' : ss.status === 'a-revoir' ? 'warn' : ss.status === 'en-cours' ? 'info' : 'neutral'}>
                      {ss.status === 'maitrisee' ? 'Maîtrisée' : ss.status === 'a-revoir' ? 'À revoir' : ss.status === 'en-cours' ? 'En cours' : 'Non commencée'}
                    </Pill>
                    <span className="w-28 text-right text-ink-2 tabular-nums">{ss.attempts ? `${pct(ss.recentRate)} récents` : '—'}</span>
                    <span className="w-32 text-right text-ink-2">{sk ? `prochaine : ${formatDate(sk.due, false)}` : ''}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
