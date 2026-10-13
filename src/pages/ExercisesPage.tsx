import { useState } from 'react';
import { SKILLS } from '../content/skills';
import { pickExercises, SKILL_KINDS } from '../exercises/generate';
import { KIND_LABEL, type Exercise, type ExerciseKind } from '../exercises/types';
import { learnedSkills } from '../exercises/sessions';
import { useAppState } from '../state/store';
import { ExerciseRunner, RunSummary } from '../ui/exercises/ExerciseRunner';
import { Button, Card, PageTitle, cx } from '../ui/kit';
import { Tabs, useTab } from '../ui/Tabs';
import { PracticePage } from './PracticePage';

const KIND_DESC: Record<ExerciseKind, string> = {
  name: 'Écrire le nom d’une molécule. La réponse est analysée chimiquement : variantes valides acceptées, erreur précise identifiée.',
  structure: 'Retrouver la structure correspondant à un nom parmi quatre propositions.',
  mainChain: 'Sélectionner les carbones de la chaîne principale.',
  numbering: 'Désigner le carbone n°1 de la chaîne principale.',
  function: 'Identifier la fonction (ou la fonction prioritaire).',
  complete: 'Compléter un nom avec les bons indices de position.',
  judge: 'Décider si un nom proposé est correct.',
  findError: 'Identifier la règle mal appliquée dans un nom incorrect.',
  formula: 'Établir la formule brute.',
  countC: 'Compter les atomes de carbone d’une formule topologique.',
  implicitH: 'Compter les hydrogènes implicites d’un carbone.',
  match: 'Associer chaque structure à son nom.',
  mcq: 'Questions de cours à choix multiples.',
  tf: 'Affirmations vraies ou fausses.',
  ez: 'Déterminer la configuration Z ou E d’une double liaison.',
  rs: 'Déterminer la configuration R ou S d’un carbone asymétrique (option).',
};

const GROUPS: { title: string; kinds: ExerciseKind[] }[] = [
  { title: 'Nomenclature', kinds: ['name', 'complete', 'findError', 'judge'] },
  { title: 'Structures et numérotation', kinds: ['structure', 'match', 'mainChain', 'numbering'] },
  { title: 'Fonctions chimiques', kinds: ['function'] },
  { title: 'Bases : lecture des formules', kinds: ['formula', 'countC', 'implicitH'] },
  { title: 'Questions de cours', kinds: ['mcq', 'tf'] },
  { title: 'Stéréochimie', kinds: ['ez', 'rs'] },
];

const LEVELS = ['Tous niveaux', 'Débutant', 'Facile', 'Intermédiaire', 'Difficile', 'Examen'];

export function ExercisesPage() {
  const st = useAppState();
  const [tab, setTab] = useTab('types');
  const [level, setLevel] = useState(0);
  const [run, setRun] = useState<{ title: string; list: Exercise[]; again: () => void } | null>(null);

  const skillsFor = (kind?: ExerciseKind) => {
    const learned = learnedSkills(st);
    let skills = SKILLS.filter((s) => !kind || SKILL_KINDS[s.id]?.includes(kind)).map((s) => s.id);
    const inLearned = skills.filter((s) => learned.includes(s));
    if (inLearned.length) skills = inLearned;
    return skills;
  };
  const start = (kind: ExerciseKind) => {
    const list = pickExercises({ skills: skillsFor(kind), count: 8, kinds: [kind], minLevel: level || 1, maxLevel: level || 5 });
    const fallback = list.length >= 3 ? list : pickExercises({ skills: skillsFor(kind), count: 8, kinds: [kind] });
    setRun({ title: KIND_LABEL[kind], list: fallback, again: () => start(kind) });
  };
  const progressive = () => {
    const skills = skillsFor();
    const list: Exercise[] = [];
    const used = new Set<string>();
    for (let lvl = 1; lvl <= 5; lvl++) {
      const part = pickExercises({ skills, count: 2, minLevel: lvl, maxLevel: lvl, exclude: used });
      part.forEach((e) => used.add(e.key));
      list.push(...part);
    }
    setRun({ title: 'Série de difficulté croissante', list: list.sort((a, b) => a.level - b.level), again: progressive });
  };

  if (run)
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => setRun(null)} className="mb-3">
          ← Retour aux exercices
        </Button>
        <ExerciseRunner
          key={run.list.map((e) => e.uid).join()}
          exercises={run.list}
          context="practice"
          title={run.title}
          onFinish={() => {}}
          renderSummary={(results) => (
            <RunSummary results={results}>
              <Button variant="soft" onClick={() => setRun(null)}>
                Autre type d’exercice
              </Button>
              <Button onClick={run.again}>Nouvelle série</Button>
            </RunSummary>
          )}
        />
      </div>
    );

  return (
    <div>
      <PageTitle sub="Exercices tirés des notions déjà étudiées (ou de tout le programme si tu débutes). Chaque réponse est corrigée avec le raisonnement complet.">Exercices</PageTitle>
      <Tabs
        tabs={[
          { id: 'types', label: 'Par type d’exercice' },
          { id: 'libre', label: 'Entraînement libre' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'libre' ? (
        <PracticePage embedded />
      ) : (
        <div className="space-y-6">
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Série de difficulté croissante</div>
              <p className="text-sm text-ink-2">10 exercices variés, du niveau débutant au niveau examen.</p>
            </div>
            <Button onClick={progressive}>Lancer la série</Button>
          </Card>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-2">Niveau :</span>
            {LEVELS.map((l, i) => (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(i)}
                aria-pressed={level === i}
                className={cx('rounded-lg border px-3 py-1 text-sm font-medium', level === i ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-ink-2 hover:text-ink')}
              >
                {l}
              </button>
            ))}
          </div>
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2 mb-2">{g.title}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {g.kinds.map((k) => (
                  <Card key={k} className="flex flex-col !p-4">
                    <h3 className="font-semibold">{KIND_LABEL[k]}</h3>
                    <p className="text-sm text-ink-2 flex-1 mt-1">{KIND_DESC[k]}</p>
                    <Button className="mt-3" size="sm" variant="outline" onClick={() => start(k)}>
                      S’entraîner
                    </Button>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
