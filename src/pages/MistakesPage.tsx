import { useState } from 'react';
import { ERROR_INFO } from '../chem/nomenclature/grading';
import { LESSON_BY_ID } from '../content/lessons';
import { SKILL_BY_ID, MODULES } from '../content/skills';
import { buildMistakesSet } from '../exercises/sessions';
import { KIND_LABEL, type Exercise } from '../exercises/types';
import { deleteMistake, getState, setMistakeResolved, useAppState } from '../state/store';
import { recurringErrors } from '../state/stats';
import { formatDate } from '../state/dates';
import { ExerciseRunner, RunSummary } from '../ui/exercises/ExerciseRunner';
import { MoleculeView } from '../ui/MoleculeView';
import { Button, Card, Empty, PageTitle, Pill, Rich, cx } from '../ui/kit';
import { Callout } from '../ui/kit';
import { Link } from 'react-router-dom';

export function MistakesPage() {
  const st = useAppState();
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [run, setRun] = useState<Exercise[] | null>(null);
  const entries = Object.values(st.mistakes)
    .filter((m) => (filter === 'all' ? true : filter === 'open' ? !m.resolved : m.resolved))
    .sort((a, b) => (a.last < b.last ? 1 : -1));
  const openCount = Object.values(st.mistakes).filter((m) => !m.resolved).length;
  const recurring = recurringErrors(st);

  if (run)
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => setRun(null)} className="mb-3">
          ← Carnet d’erreurs
        </Button>
        <ExerciseRunner
          exercises={run}
          context="mistakes"
          timeKind="review"
          title="Réviser mes erreurs"
          onFinish={() => {}}
          renderSummary={(results) => (
            <RunSummary results={results}>
              <p className="w-full text-sm text-ink-2">Une erreur est considérée comme comprise après deux réussites sur le même exercice.</p>
              <Button onClick={() => setRun(null)}>Retour au carnet</Button>
            </RunSummary>
          )}
        />
      </div>
    );

  return (
    <div>
      <PageTitle sub="Chaque erreur est gardée ici avec la règle à revoir. Elle disparaît des erreurs à revoir quand tu la réussis deux fois.">
        Carnet d’erreurs
      </PageTitle>
      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-4">
          <Card>
            <p className="text-4xl font-bold text-brand">{openCount}</p>
            <p className="text-ink-2 text-sm">erreur{openCount > 1 ? 's' : ''} à revoir</p>
            <Button className="mt-3 w-full" onClick={() => setRun(buildMistakesSet(getState(), 10))}>
              Réviser mes erreurs
            </Button>
            <p className="text-xs text-ink-3 mt-2">Chaque exercice raté revient, suivi d’un exercice similaire pour vérifier que la règle est comprise.</p>
          </Card>
          <Card>
            <h2 className="font-semibold mb-2">Erreurs récurrentes</h2>
            {recurring.length ? (
              <ul className="space-y-2 text-sm">
                {recurring.map((r) => (
                  <li key={r.code}>
                    <div className="flex justify-between font-bold">
                      <span>{ERROR_INFO[r.code].label}</span>
                      <span>×{r.count}</span>
                    </div>
                    <Link className="text-xs text-brand underline" to={`/lecon/${ERROR_INFO[r.code].lesson}`}>
                      Revoir : {LESSON_BY_ID[ERROR_INFO[r.code].lesson]?.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-2">Rien pour l’instant.</p>
            )}
          </Card>
          <Callout kind="method" title="Comment utiliser le carnet">Lis la règle associée à chaque erreur, refais l’exercice, puis un exercice ciblé. Une erreur est marquée comme comprise après deux réussites.</Callout>
        </div>
        <div>
          <div className="flex gap-1.5 mb-3">
            {(
              [
                ['open', 'À revoir'],
                ['resolved', 'Comprises'],
                ['all', 'Toutes'],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k} className={cx('rounded-xl px-3 py-1.5 text-sm font-bold border', filter === k ? 'bg-brand text-white border-brand' : 'border-line')}>
                {l}
              </button>
            ))}
          </div>
          {!entries.length && <Empty>{filter === 'open' ? 'Aucune erreur à revoir.' : 'Rien ici pour le moment.'}</Empty>}
          <ul className="space-y-3">
            {entries.map((m) => {
              const skill = SKILL_BY_ID[m.skills[0]];
              const module = MODULES.find((x) => x.id === skill?.module);
              return (
                <li key={m.key}>
                  <Card className="!p-4">
                    <div className="flex flex-wrap gap-1.5 items-center mb-2">
                      <Pill tone="brand">{KIND_LABEL[m.kind]}</Pill>
                      {module && <Pill>{module.short}</Pill>}
                      {skill && <Pill>{skill.label}</Pill>}
                      <Pill tone={m.resolved ? 'ok' : 'bad'}>{m.resolved ? 'comprise' : `rencontrée ${m.count} fois`}</Pill>
                      <span className="text-xs text-ink-3 ml-auto">dernière fois : {formatDate(m.last, false)}</span>
                    </div>
                    <div className="grid sm:grid-cols-[180px_1fr] gap-3">
                      {m.smiles && m.kind !== 'structure' && (
                        <div className="rounded-xl border border-line p-1">
                          <MoleculeView smiles={m.smiles} size="sm" />
                        </div>
                      )}
                      <div className="text-sm space-y-1">
                        <p className="font-bold">
                          <Rich text={m.prompt} />
                        </p>
                        <p>
                          Ma réponse : <span className="text-bad font-semibold">{m.userAnswer || '—'}</span>
                        </p>
                        <p>
                          Réponse attendue : <span className="text-ok font-semibold">{m.expected}</span>
                        </p>
                        {m.errorCodes
                          .filter((c) => ERROR_INFO[c])
                          .map((c) => (
                            <p key={c} className="rounded-lg bg-surface-2 px-2 py-1">
                              <strong>Règle à revoir : {ERROR_INFO[c].label}.</strong> {ERROR_INFO[c].rule}
                            </p>
                          ))}
                        {m.details.slice(0, 2).map((d, i) => (
                          <p key={i} className="text-ink-2">
                            {d}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button size="sm" onClick={() => setRun(buildMistakesSet(getState(), 2, Math.random, [m.key]))} disabled={m.resolved}>
                        Refaire
                      </Button>
                      {m.resolved ? (
                        <Button size="sm" variant="soft" onClick={() => setMistakeResolved(m.key, false)}>
                          Remettre à revoir
                        </Button>
                      ) : (
                        <Button size="sm" variant="soft" onClick={() => setMistakeResolved(m.key, true)}>
                          J’ai compris
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => deleteMistake(m.key)}>
                        Supprimer
                      </Button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
