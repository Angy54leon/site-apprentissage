import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CHAPTERS, CHAPTER_BY_ID } from '../content/chapters';
import { LESSON_BY_ID, LESSONS } from '../content/lessons';
import { SKILL_BY_ID } from '../content/skills';
import { useAppState } from '../state/store';
import { chapterCompleted, chapterProgress, chapterSkills, currentChapter, nextRecommendedLesson, skillStats } from '../state/stats';
import { Button, Card, PageTitle, Pill, ProgressBar, cx } from '../ui/kit';
import { Icon } from '../ui/icons';

const DIFF_TONE = { Fondamental: 'neutral', Débutant: 'info', Intermédiaire: 'info', Avancé: 'warn', Examen: 'bad' } as const;

export function PathPage() {
  const st = useAppState();
  const next = nextRecommendedLesson(st);
  const current = currentChapter(st);
  const [open, setOpen] = useState<string>(current.id);
  return (
    <div>
      <PageTitle sub="Douze chapitres progressifs, des bases absolues jusqu’à la préparation aux examens. Les prérequis sont indiqués à titre de conseil : tous les chapitres restent accessibles pour réviser librement.">
        Parcours d’apprentissage
      </PageTitle>
      <ol className="space-y-3">
        {CHAPTERS.map((c) => {
          const prog = chapterProgress(st, c);
          const done = chapterCompleted(st, c);
          const missing = c.prerequisites.filter((p) => !chapterCompleted(st, CHAPTER_BY_ID[p]));
          const isOpen = open === c.id;
          const isCurrent = current.id === c.id;
          return (
            <li key={c.id}>
              <Card className={cx('!p-0 overflow-hidden', isCurrent && 'ring-1 ring-brand')}>
                <button type="button" onClick={() => setOpen(isOpen ? '' : c.id)} className="w-full flex items-center gap-4 p-4 text-left hover:bg-surface-2/60" aria-expanded={isOpen}>
                  <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-lg text-sm font-semibold', done ? 'bg-ok text-white' : isCurrent ? 'bg-brand text-white' : 'bg-surface-2 text-ink-2')}>
                    {done ? <Icon name="check" /> : c.number}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{c.title}</span>
                      <Pill tone={DIFF_TONE[c.difficulty]}>{c.difficulty}</Pill>
                      {isCurrent && <Pill tone="brand">En cours</Pill>}
                    </span>
                    <span className="mt-1.5 flex items-center gap-3">
                      <ProgressBar value={prog.total ? prog.done / prog.total : 0} className="flex-1 max-w-xs" />
                      <span className="text-xs text-ink-2 tabular-nums">
                        {prog.done}/{prog.total} leçon{prog.total > 1 ? 's' : ''}
                      </span>
                    </span>
                  </span>
                  <Icon name="arrowRight" className={cx('text-ink-3 transition-transform', isOpen && 'rotate-90')} />
                </button>
                {isOpen && (
                  <div className="border-t border-line p-4 grid gap-5 md:grid-cols-[1fr_1.3fr]">
                    <div className="space-y-4 text-sm">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-ink-2 mb-1">Objectifs</div>
                        <ul className="list-disc pl-5 space-y-0.5">
                          {c.objectives.map((o) => (
                            <li key={o}>{o}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-ink-2 mb-1">Prérequis</div>
                        {c.prerequisites.length ? (
                          <ul className="space-y-0.5">
                            {c.prerequisites.map((p) => (
                              <li key={p} className="flex items-center gap-2">
                                <span className={chapterCompleted(st, CHAPTER_BY_ID[p]) ? 'text-ok' : 'text-ink-3'}>
                                  <Icon name={chapterCompleted(st, CHAPTER_BY_ID[p]) ? 'check' : 'info'} size={15} />
                                </span>
                                Chapitre {CHAPTER_BY_ID[p].number} — {CHAPTER_BY_ID[p].title}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-ink-2">Aucun : point de départ du parcours.</p>
                        )}
                        {missing.length > 0 && <p className="text-xs text-warn mt-1">Conseil : valide d’abord le chapitre {CHAPTER_BY_ID[missing[0]].number}, mais tu peux consulter celui-ci dès maintenant.</p>}
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-ink-2 mb-1">Compétences travaillées</div>
                        <div className="flex flex-wrap gap-1">
                          {chapterSkills(c).map((s) => {
                            const status = skillStats(st, s).status;
                            return (
                              <Pill key={s} tone={status === 'maitrisee' ? 'ok' : status === 'a-revoir' ? 'warn' : 'neutral'}>
                                {SKILL_BY_ID[s].label}
                              </Pill>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-ink-2 mb-1">Leçons</div>
                      <ol className="space-y-1.5">
                        {c.lessons.map((id) => {
                          const l = LESSON_BY_ID[id];
                          const p = st.lessons[id];
                          const isNext = next?.id === id;
                          return (
                            <li key={id}>
                              <Link to={`/lecon/${id}`} className={cx('flex items-center gap-3 rounded-lg border px-3 py-2 hover:border-brand', isNext ? 'border-brand bg-brand-soft' : 'border-line')}>
                                <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold', p?.status === 'completed' ? 'bg-ok text-white' : 'bg-surface-2 text-ink-2')}>
                                  {p?.status === 'completed' ? <Icon name="check" size={13} /> : LESSONS.indexOf(l) + 1}
                                </span>
                                <span className="flex-1 min-w-0">
                                  <span className="block font-medium text-sm leading-tight">{l.title}</span>
                                  <span className="text-xs text-ink-2">
                                    ~{l.duration} min
                                    {p?.status === 'completed' && p.via === 'placement' ? ' · acquis au test de positionnement' : ''}
                                    {p?.status === 'in-progress' ? ` · en cours (étape ${p.step + 1}/8)` : ''}
                                    {p?.quizBest !== undefined ? ` · quiz : ${Math.round(p.quizBest * 100)} %` : ''}
                                  </span>
                                </span>
                                {l.advanced && <Pill tone="warn">Option</Pill>}
                                {isNext && <Pill tone="brand">Recommandée</Pill>}
                              </Link>
                            </li>
                          );
                        })}
                      </ol>
                      {c.id === 'c12' && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button to="/examens" size="sm" variant="soft">
                            Examens blancs
                          </Button>
                          <Button to="/exercices?vue=libre&chrono=1" size="sm" variant="soft">
                            Entraînement chronométré
                          </Button>
                          <Button to="/erreurs" size="sm" variant="soft">
                            Révision ciblée des erreurs
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
