import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LOVE } from '../config/love';
import { MODULES, SKILLS } from '../content/skills';
import { buildExercise } from '../exercises/generate';
import type { Exercise, ExerciseSpec } from '../exercises/types';
import { completeOnboarding, useAppState } from '../state/store';
import { WEEKDAY_LABELS, today } from '../state/dates';
import type { Profile } from '../state/types';
import { ExerciseRunner, type RunResult } from '../ui/exercises/ExerciseRunner';
import { Button, Card, cx } from '../ui/kit';
import { Mimi, burst } from '../ui/love';

/** Test de positionnement : quelques questions vérifiées par module. */
const PLACEMENT: { module: string; spec: ExerciseSpec }[] = [
  { module: 'm0', spec: { kind: 'countC', smiles: 'CC(C)CC(C)C' } },
  { module: 'm0', spec: { kind: 'implicitH', smiles: 'CC=CC', atom: 1 } },
  { module: 'm1', spec: { kind: 'name', smiles: 'CCC(C)C' } },
  { module: 'm1', spec: { kind: 'name', smiles: 'CC(C)CC(C)(C)C' } },
  { module: 'm2', spec: { kind: 'name', smiles: 'CC=CC' } },
  { module: 'm2', spec: { kind: 'name', smiles: 'CC(C)C=C' } },
  { module: 'm3', spec: { kind: 'name', smiles: 'CC1CCCCC1' } },
  { module: 'm3', spec: { kind: 'name', smiles: 'CC1CCCC(C)C1' } },
  { module: 'm4', spec: { kind: 'name', smiles: 'CCC(C)O' } },
  { module: 'm4', spec: { kind: 'name', smiles: 'CC(C)CC=O' } },
  { module: 'm4', spec: { kind: 'function', smiles: 'CCOC(C)=O' } },
  { module: 'm5', spec: { kind: 'name', smiles: 'CC(=O)CCO' } },
];

const LEVELS = ['Lycée (terminale)', 'Licence 1 / PASS / LAS', 'Licence 2 ou plus', 'BTS / BUT', 'Classe préparatoire', 'Autre'];

export function OnboardingPage() {
  const st = useAppState();
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Partial<Profile>>({
    studyLevel: st.profile.studyLevel ?? LEVELS[1],
    chemLevel: st.profile.chemLevel ?? 'debutante',
    examDate: st.profile.examDate,
    studyDays: st.profile.studyDays,
    seenModules: st.profile.seenModules,
    difficultSkills: st.profile.difficultSkills,
    goal: st.profile.goal,
  });
  const [difficultModules, setDifficultModules] = useState<string[]>([]);
  const [placement, setPlacement] = useState<Exercise[] | null>(null);
  const [placementResult, setPlacementResult] = useState<{ acquired: string[]; scores: Record<string, [number, number]> } | null>(null);
  const set = (p: Partial<Profile>) => setProfile((x) => ({ ...x, ...p }));
  const goal = profile.goal!;

  const finish = (acquired: string[]) => {
    const difficult = SKILLS.filter((s) => difficultModules.includes(s.module)).map((s) => s.id);
    completeOnboarding({ ...profile, difficultSkills: difficult }, acquired);
    burst('hearts');
    nav('/tableau-de-bord');
  };

  const startPlacement = () => {
    const list = PLACEMENT.map((p) => buildExercise(p.spec)).filter((x): x is Exercise => !!x);
    setPlacement(list);
  };

  const onPlacementDone = (results: RunResult[]) => {
    const scores: Record<string, [number, number]> = {};
    results.forEach((r, i) => {
      const m = PLACEMENT[i]?.module;
      if (!m) return;
      const s = scores[m] ?? [0, 0];
      s[0] += r.res.status === 'correct' ? 1 : r.res.status === 'partial' ? 0.5 : 0;
      s[1] += 1;
      scores[m] = s;
    });
    // un module est « acquis (à confirmer) » si au moins 75 % de ses questions sont réussies,
    // et seulement si les modules précédents le sont aussi (on ne saute pas les bases).
    const acquired: string[] = [];
    for (const m of ['m0', 'm1', 'm2', 'm3', 'm4', 'm5']) {
      const s = scores[m];
      if (s && s[0] / s[1] >= 0.75) acquired.push(m);
      else break;
    }
    setPlacementResult({ acquired, scores });
  };

  const minPerDay = goal.lessonMin + goal.exerciseMin + goal.reviewMin;
  const daysCount = profile.studyDays?.length ?? 5;
  const stepTitle = ['Faisons connaissance', 'Ton temps et ton examen', 'Ce que tu as déjà vu', 'Par où commencer ?'];
  const progress = useMemo(() => (step + 1) / 4, [step]);

  if (placement) {
    return (
      <div className="min-h-screen love-bg px-4 py-8">
        {!placementResult ? (
          <ExerciseRunner
            exercises={placement}
            context="placement"
            mode="exam"
            title="Test de positionnement — réponds sans stress, c’est juste pour adapter ton parcours 💗"
            onFinish={onPlacementDone}
            renderSummary={() => null}
          />
        ) : (
          <Card className="max-w-xl mx-auto text-center">
            <Mimi size={90} mood="cheer" className="mx-auto" />
            <h1 className="text-2xl font-extrabold mt-2">Résultat du test</h1>
            <ul className="text-left my-4 space-y-1">
              {MODULES.filter((m) => placementResult.scores[m.id]).map((m) => {
                const [ok, n] = placementResult.scores[m.id];
                return (
                  <li key={m.id} className="flex justify-between rounded-xl bg-surface-2 px-3 py-2">
                    <span>{m.short}</span>
                    <span className="font-bold">
                      {ok}/{n} {placementResult.acquired.includes(m.id) ? '✓ acquis (à confirmer en révision)' : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-ink-2 mb-4">
              {placementResult.acquired.length
                ? `Les leçons des modules acquis sont marquées comme vues : elles reviendront en révision pour vérifier que tout est solide. Tu peux toujours les rouvrir.`
                : `On commence au début : c’est le meilleur choix pour construire des bases solides. 💗`}
            </p>
            <Button onClick={() => finish(placementResult.acquired)}>Découvrir mon tableau de bord 💗</Button>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen love-bg px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Mimi size={60} mood="happy" />
          <div>
            <p className="font-hand text-2xl text-brand">Coucou {LOVE.firstName} !</p>
            <p className="text-ink-2 text-sm">Quelques questions pour préparer ton programme. Tout est modifiable plus tard.</p>
          </div>
        </div>
        <div className="h-2 rounded-full bg-surface-2 mb-4 overflow-hidden">
          <div className="h-full bg-brand transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
        <Card className="anim-fade">
          <h1 className="text-xl font-extrabold mb-4">
            {step + 1}. {stepTitle[step]}
          </h1>
          {step === 0 && (
            <div className="space-y-5">
              <fieldset>
                <legend className="font-bold mb-2">Ton niveau d’études</legend>
                <div className="flex flex-wrap gap-2">
                  {LEVELS.map((l) => (
                    <Chip key={l} on={profile.studyLevel === l} onClick={() => set({ studyLevel: l })}>
                      {l}
                    </Chip>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="font-bold mb-2">Ton niveau actuel en chimie organique</legend>
                <div className="grid gap-2">
                  {(
                    [
                      ['debutante', 'Je débute complètement'],
                      ['quelques-bases', 'J’ai quelques bases (alcanes, formules…)'],
                      ['a-l-aise', 'Je suis plutôt à l’aise, je veux surtout réviser'],
                    ] as const
                  ).map(([v, l]) => (
                    <Chip key={v} on={profile.chemLevel === v} onClick={() => set({ chemLevel: v })} block>
                      {l}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-5">
              <label className="block">
                <span className="font-bold">Date de ton examen (facultatif)</span>
                <input
                  type="date"
                  min={today()}
                  value={profile.examDate ?? ''}
                  onChange={(e) => set({ examDate: e.target.value || undefined })}
                  className="mt-1 block rounded-xl border border-line bg-surface px-3 py-2"
                />
              </label>
              <fieldset>
                <legend className="font-bold mb-2">Tes jours de travail ({daysCount} par semaine)</legend>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                    <Chip
                      key={d}
                      on={profile.studyDays!.includes(d)}
                      onClick={() => set({ studyDays: profile.studyDays!.includes(d) ? profile.studyDays!.filter((x) => x !== d) : [...profile.studyDays!, d] })}
                    >
                      {WEEKDAY_LABELS[d]}
                    </Chip>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="font-bold mb-2">Notre petit objectif du jour : {minPerDay} min</legend>
                <GoalEditor goal={goal} onChange={(g) => set({ goal: g })} />
                <p className="text-xs text-ink-3 mt-1">Une séance courte et régulière vaut mieux qu’une longue séance de temps en temps.</p>
              </fieldset>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-5">
              <fieldset>
                <legend className="font-bold mb-2">Les chapitres déjà vus en cours</legend>
                <div className="grid gap-2">
                  {MODULES.filter((m) => m.id !== 'm6').map((m) => (
                    <Chip
                      key={m.id}
                      block
                      on={profile.seenModules!.includes(m.id)}
                      onClick={() => set({ seenModules: profile.seenModules!.includes(m.id) ? profile.seenModules!.filter((x) => x !== m.id) : [...profile.seenModules!, m.id] })}
                    >
                      {m.title}
                    </Chip>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="font-bold mb-2">Ceux que tu trouves difficiles (ils auront un peu plus de temps)</legend>
                <div className="flex flex-wrap gap-2">
                  {MODULES.filter((m) => m.id !== 'm6').map((m) => (
                    <Chip key={m.id} on={difficultModules.includes(m.id)} onClick={() => setDifficultModules((x) => (x.includes(m.id) ? x.filter((y) => y !== m.id) : [...x, m.id]))}>
                      {m.short}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            </div>
          )}
          {step === 3 && (
            <div className="grid gap-3">
              <button type="button" onClick={() => finish([])} className="text-left rounded-2xl border-2 border-line hover:border-brand-2 bg-surface p-4">
                <div className="font-extrabold text-lg">🌱 Commencer directement au début</div>
                <p className="text-ink-2 text-sm">Idéal si tu débutes : on pose les bases une par une, tranquillement.</p>
              </button>
              <button type="button" onClick={startPlacement} className="text-left rounded-2xl border-2 border-line hover:border-brand-2 bg-surface p-4">
                <div className="font-extrabold text-lg">🧪 Faire un petit test de positionnement (≈ 8 min)</div>
                <p className="text-ink-2 text-sm">12 questions pour repérer ce que tu sais déjà. Les modules réussis seront marqués comme vus, et vérifiés en révision.</p>
              </button>
            </div>
          )}
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={() => (step === 0 ? nav('/accueil') : setStep(step - 1))}>
              ← Retour
            </Button>
            {step < 3 && (
              <Button onClick={() => setStep(step + 1)} disabled={step === 1 && !profile.studyDays!.length}>
                Continuer →
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export function Chip({ on, onClick, children, block }: { on: boolean; onClick: () => void; children: React.ReactNode; block?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cx('rounded-2xl border-2 px-3 py-2 font-semibold transition text-left', block && 'w-full', on ? 'border-brand bg-brand-soft/40' : 'border-line bg-surface hover:border-brand-2')}
    >
      {on ? '💗 ' : ''}
      {children}
    </button>
  );
}

export function GoalEditor({ goal, onChange }: { goal: Profile['goal']; onChange: (g: Profile['goal']) => void }) {
  const row = (key: keyof Profile['goal'], label: string) => (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2">
      <span className="font-semibold">{label}</span>
      <span className="flex items-center gap-2">
        <button type="button" className="w-8 h-8 rounded-lg border border-line bg-surface font-bold" onClick={() => onChange({ ...goal, [key]: Math.max(0, goal[key] - 5) })} aria-label={`Moins de ${label}`}>
          −
        </button>
        <span className="w-14 text-center font-extrabold tabular-nums">{goal[key]} min</span>
        <button type="button" className="w-8 h-8 rounded-lg border border-line bg-surface font-bold" onClick={() => onChange({ ...goal, [key]: Math.min(90, goal[key] + 5) })} aria-label={`Plus de ${label}`}>
          +
        </button>
      </span>
    </div>
  );
  return (
    <div className="grid gap-2">
      {row('lessonMin', '📖 Cours')}
      {row('exerciseMin', '✏️ Exercices')}
      {row('reviewMin', '🔁 Révision')}
    </div>
  );
}
