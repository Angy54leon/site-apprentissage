import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LESSONS, lessonsOfModule } from '../content/lessons';
import { MODULES } from '../content/skills';
import { useAppState } from '../state/store';
import { moduleProgress, nextRecommendedLesson } from '../state/stats';
import { Button, Card, Modal, PageTitle, Pill, ProgressBar, cx } from '../ui/kit';

export function PathPage() {
  const st = useAppState();
  const nav = useNavigate();
  const next = nextRecommendedLesson(st);
  const [confirm, setConfirm] = useState<string | null>(null);
  const available = (id: string) => {
    const i = LESSONS.findIndex((l) => l.id === id);
    if (i <= 0) return true;
    const l = LESSONS[i];
    if (st.lessons[id]) return true;
    if (st.profile.seenModules.includes(l.module)) return true;
    return st.lessons[LESSONS[i - 1].id]?.status === 'completed';
  };
  const open = (id: string) => (available(id) ? nav(`/lecon/${id}`) : setConfirm(id));
  return (
    <div>
      <PageTitle emoji="🗺️" sub="Les chapitres sont dans un ordre progressif. Chaque leçon : explication, règle, exemple résolu, pièges, exercices guidés et autonomes, mini-test, résumé.">
        Parcours d’apprentissage
      </PageTitle>
      <div className="space-y-5">
        {MODULES.map((m) => {
          const prog = moduleProgress(st, m.id);
          return (
            <Card key={m.id}>
              <div className="flex flex-wrap items-end justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-lg font-extrabold">{m.title}</h2>
                  <p className="text-sm text-ink-2">{m.description}</p>
                </div>
                <span className="text-sm font-bold text-ink-2">
                  {prog.done}/{prog.total} leçons
                </span>
              </div>
              <ProgressBar value={prog.total ? prog.done / prog.total : 0} className="mb-3" />
              <ol className="grid sm:grid-cols-2 gap-2">
                {lessonsOfModule(m.id).map((l) => {
                  const p = st.lessons[l.id];
                  const isNext = next?.id === l.id;
                  const ok = available(l.id);
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        onClick={() => open(l.id)}
                        className={cx(
                          'w-full text-left rounded-2xl border-2 px-3 py-2.5 flex items-center gap-3 transition',
                          isNext ? 'border-brand bg-brand-soft/25' : 'border-line bg-surface hover:border-brand-2',
                        )}
                      >
                        <span className={cx('w-9 h-9 shrink-0 rounded-xl grid place-items-center font-black', p?.status === 'completed' ? 'bg-ok text-white' : ok ? 'bg-surface-2' : 'bg-surface-2 text-ink-3')}>
                          {p?.status === 'completed' ? '✓' : ok ? LESSONS.indexOf(l) + 1 : '🔒'}
                        </span>
                        <span className="flex-1">
                          <span className="block font-bold leading-tight">{l.title}</span>
                          <span className="text-xs text-ink-2">
                            ~{l.duration} min
                            {p?.status === 'completed' && p.via === 'placement' ? ' · acquis au test (à confirmer)' : ''}
                            {p?.status === 'in-progress' ? ` · en cours (étape ${p.step + 1}/8)` : ''}
                            {p?.quizBest !== undefined ? ` · mini-test : ${Math.round(p.quizBest * 100)} %` : ''}
                          </span>
                        </span>
                        {l.advanced && <Pill tone="warn">avancé</Pill>}
                        {isNext && <Pill tone="brand">à faire</Pill>}
                      </button>
                    </li>
                  );
                })}
                {m.id === 'm6' && (
                  <>
                    <li>
                      <Button to="/entrainement?chrono=1" variant="soft" className="w-full justify-start">
                        ⏱️ Entraînement chronométré
                      </Button>
                    </li>
                    <li>
                      <Button to="/examens" variant="soft" className="w-full justify-start">
                        📝 Examens blancs avec barème
                      </Button>
                    </li>
                    <li>
                      <Button to="/erreurs" variant="soft" className="w-full justify-start">
                        📒 Révision ciblée de mes erreurs
                      </Button>
                    </li>
                    <li>
                      <Button to="/entrainement?mix=1" variant="soft" className="w-full justify-start">
                        🎲 Exercices mélangés sans indice
                      </Button>
                    </li>
                  </>
                )}
              </ol>
            </Card>
          );
        })}
      </div>
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Leçon pas encore débloquée">
        <p className="text-ink-2">
          Les leçons s’appuient sur les précédentes. Tu peux quand même l’ouvrir si tu as déjà vu cette notion en cours.
        </p>
        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="soft" onClick={() => setConfirm(null)}>
            Plus tard
          </Button>
          <Button onClick={() => nav(`/lecon/${confirm}`)}>Ouvrir quand même</Button>
        </div>
      </Modal>
    </div>
  );
}
