import { useState } from 'react';
import { SKILLS, SKILL_BY_ID } from '../content/skills';
import { pickExercises, SKILL_KINDS } from '../exercises/generate';
import { KIND_LABEL, type Exercise, type ExerciseKind } from '../exercises/types';
import { learnedSkills } from '../exercises/sessions';
import { useAppState } from '../state/store';
import { ExerciseRunner, RunSummary } from '../ui/exercises/ExerciseRunner';
import { Button, Card, PageTitle } from '../ui/kit';

const KIND_DESC: Record<ExerciseKind, string> = {
  name: 'Écris le nom d’une molécule dessinée. Correction chimique : on retrouve la molécule décrite par ton nom.',
  structure: 'Retrouve la bonne structure parmi quatre, à partir du nom.',
  mainChain: 'Clique sur les carbones de la chaîne principale.',
  numbering: 'Clique sur le carbone n°1.',
  function: 'Identifie la famille (ou la fonction prioritaire).',
  complete: 'Complète le nom avec les bons indices.',
  judge: 'Ce nom est-il correct ?',
  findError: 'Repère l’erreur dans le nom proposé par un élève.',
  formula: 'Donne la formule brute.',
  countC: 'Compte les carbones d’une formule topologique.',
  implicitH: 'Compte les hydrogènes implicites d’un carbone.',
  match: 'Relie chaque structure à son nom.',
  mcq: 'Questions de cours (QCM).',
  tf: 'Vrai ou faux ?',
  ez: 'Détermine la configuration Z ou E.',
  rs: 'Détermine la configuration R ou S (notion avancée).',
};

export function ExercisesPage() {
  const st = useAppState();
  const [run, setRun] = useState<{ kind: ExerciseKind; list: Exercise[] } | null>(null);
  const start = (kind: ExerciseKind) => {
    const learned = learnedSkills(st);
    let skills = SKILLS.filter((s) => SKILL_KINDS[s.id]?.includes(kind)).map((s) => s.id);
    const inLearned = skills.filter((s) => learned.includes(s));
    if (inLearned.length) skills = inLearned;
    setRun({ kind, list: pickExercises({ skills, count: 8, kinds: [kind] }) });
  };
  if (run)
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => setRun(null)} className="mb-3">
          ← Tous les types d’exercices
        </Button>
        <ExerciseRunner
          exercises={run.list}
          context="practice"
          title={KIND_LABEL[run.kind]}
          onFinish={() => {}}
          renderSummary={(results) => (
            <RunSummary results={results}>
              <Button variant="soft" onClick={() => setRun(null)}>
                Autre type
              </Button>
              <Button onClick={() => start(run.kind)}>Encore une série</Button>
            </RunSummary>
          )}
        />
      </div>
    );
  return (
    <div>
      <PageTitle emoji="✏️" sub="Choisis un type d’exercice. Les molécules sont tirées des notions déjà vues (ou de tout le programme si tu débutes).">
        Exercices interactifs
      </PageTitle>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(Object.keys(KIND_LABEL) as ExerciseKind[]).map((k) => {
          const skills = SKILLS.filter((s) => SKILL_KINDS[s.id]?.includes(k)).map((s) => SKILL_BY_ID[s.id].label);
          return (
            <Card key={k} className="flex flex-col">
              <h2 className="font-extrabold">{KIND_LABEL[k]}</h2>
              <p className="text-sm text-ink-2 flex-1 mt-1">{KIND_DESC[k]}</p>
              <p className="text-xs text-ink-3 mt-2">{skills.slice(0, 4).join(' · ')}{skills.length > 4 ? '…' : ''}</p>
              <Button className="mt-3" onClick={() => start(k)}>
                S’entraîner
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
