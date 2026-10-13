import { ERROR_INFO } from '../chem/nomenclature/grading';
import { SKILLS, MODULES } from '../content/skills';
import { useAppState } from '../state/store';
import { MASTERY_RULE, activeDays, allSkillStats, chapterRates, completedLessons, firstAttempts, history, rate, readiness, recurringErrors, totalActiveMinutes } from '../state/stats';
import { formatDate } from '../state/dates';
import { BarChart, HBar } from '../ui/charts';
import { Card, PageTitle, Pill, ProgressBar, Stat, pct } from '../ui/kit';

const STATUS_LABEL = { nouvelle: ['Pas commencée', 'neutral'], 'en-cours': ['En cours', 'info'], maitrisee: ['Maîtrisée', 'ok'], 'a-revoir': ['À revoir', 'bad'] } as const;

export function StatsPage() {
  const st = useAppState();
  const first = firstAttempts(st);
  const hist = history(st, 30);
  const stats = allSkillStats(st);
  const ready = readiness(st);
  const recurring = recurringErrors(st, 6);
  return (
    <div>
      <PageTitle sub="Toutes ces statistiques sont calculées à partir de tes vraies réponses (premiers essais ; les nouvelles tentatives ne te pénalisent pas).">
        Statistiques et progression
      </PageTitle>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Stat label="Leçons validées" value={completedLessons(st)} />
        <Stat label="Exercices faits" value={first.length} />
        <Stat label="Réussite globale" value={pct(rate(first))} />
        <Stat label="Jours de travail" value={activeDays(st).length} />
        <Stat label="Temps actif" value={`${totalActiveMinutes(st)} min`} hint="pages visibles + activité récente" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Exercices par jour (30 derniers jours)</h2>
          <BarChart title="Nombre d’exercices par jour" data={hist.map((h) => ({ label: `${Number(h.date.slice(8))}/${h.date.slice(5, 7)}`, value: h.attempts, tip: `${formatDate(h.date)} : ${h.attempts} exercice(s), ${h.minutes} min actives` }))} />
        </Card>
        <Card>
          <h2 className="font-semibold">Taux de réussite par jour</h2>
          <BarChart
            title="Taux de réussite par jour"
            max={1}
            format={(v) => `${Math.round(v * 100)} %`}
            data={hist.map((h) => ({ label: `${Number(h.date.slice(8))}/${h.date.slice(5, 7)}`, value: h.rate, tip: h.rate === null ? `${formatDate(h.date)} : pas d’exercice` : `${formatDate(h.date)} : ${Math.round(h.rate * 100)} % (${h.attempts} exercices)` }))}
          />
        </Card>
        <Card>
          <h2 className="font-semibold mb-3">Réussite par chapitre</h2>
          <div className="space-y-2">
            {chapterRates(st).map((r) => (
              <HBar key={r.chapter.id} label={`${r.chapter.number}. ${r.chapter.title}`} value={r.rate} sub={`${r.attempts} exercices`} />
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold mb-2">Préparation à l’examen</h2>
          <p className="text-3xl font-bold text-brand">{pct(ready.value)}</p>
          <ProgressBar value={ready.value} className="my-2" />
          <ul className="text-sm text-ink-2 space-y-0.5">
            <li>Couverture du programme (leçons validées) : {pct(ready.coverage)}</li>
            <li>Notions solides : {pct(ready.mastery)}</li>
            <li>Dernier examen blanc : {ready.exam === null ? 'pas encore fait' : pct(ready.exam)}</li>
          </ul>
          <p className="text-xs text-ink-3 mt-2">Calcul : 40 % couverture + 40 % notions + 20 % examen blanc (50/50 sans examen blanc).</p>
          <h3 className="font-semibold mt-4 mb-1">Erreurs récurrentes</h3>
          {recurring.length ? (
            <ul className="text-sm space-y-0.5">
              {recurring.map((r) => (
                <li key={r.code} className="flex justify-between">
                  <span>{ERROR_INFO[r.code].label}</span>
                  <strong>×{r.count}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">Aucune pour l’instant.</p>
          )}
        </Card>
      </div>
      <Card className="mt-4">
        <h2 className="font-semibold mb-1">Détail par notion</h2>
        <p className="text-xs text-ink-3 mb-3">{MASTERY_RULE}</p>
        <div className="overflow-x-auto thin-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-3 text-xs uppercase">
                <th className="py-1 pr-2">Notion</th>
                <th className="py-1 pr-2">Chapitre</th>
                <th className="py-1 pr-2">État</th>
                <th className="py-1 pr-2 text-right">Exercices</th>
                <th className="py-1 pr-2 text-right">Réussite</th>
                <th className="py-1 pr-2 text-right">10 derniers</th>
                <th className="py-1 text-right">Boîte</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => {
                const sk = SKILLS.find((x) => x.id === s.skill)!;
                const [label, tone] = STATUS_LABEL[s.status];
                return (
                  <tr key={s.skill} className="border-t border-line">
                    <td className="py-1.5 pr-2 font-semibold">{sk.label}</td>
                    <td className="py-1.5 pr-2 text-ink-2">{MODULES.find((m) => m.id === sk.module)?.short}</td>
                    <td className="py-1.5 pr-2">
                      <Pill tone={tone}>{label}</Pill>
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{s.attempts}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{pct(s.rate)}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{pct(s.recentRate)}</td>
                    <td className="py-1.5 text-right tabular-nums">{s.box || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
