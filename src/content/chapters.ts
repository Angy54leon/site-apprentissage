// Parcours en 12 chapitres progressifs. Chaque chapitre regroupe des leçons,
// indique son niveau, ses prérequis, les compétences travaillées et ses objectifs.
// Les prérequis sont indicatifs : aucun contenu n'est verrouillé.

export type Difficulty = 'Fondamental' | 'Débutant' | 'Intermédiaire' | 'Avancé' | 'Examen';

export interface Chapter {
  id: string;
  number: number;
  title: string;
  difficulty: Difficulty;
  /** Chapitres à connaître avant de commencer. */
  prerequisites: string[];
  objectives: string[];
  lessons: string[];
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'c1',
    number: 1,
    title: 'Structure des atomes et des molécules',
    difficulty: 'Fondamental',
    prerequisites: [],
    objectives: ['Définir la chimie organique, une molécule et une formule brute.', 'Reconnaître les symboles C, H, O, N, S et les halogènes.'],
    lessons: ['m0-chimie-organique', 'm0-atomes'],
  },
  {
    id: 'c2',
    number: 2,
    title: 'Valence du carbone et liaisons chimiques',
    difficulty: 'Fondamental',
    prerequisites: ['c1'],
    objectives: ['Savoir que le carbone forme 4 liaisons.', 'Distinguer liaisons simples, doubles et triples.', 'Calculer le nombre d’hydrogènes d’un carbone.'],
    lessons: ['m0-valence'],
  },
  {
    id: 'c3',
    number: 3,
    title: 'Formules développées et semi-développées',
    difficulty: 'Fondamental',
    prerequisites: ['c2'],
    objectives: ['Passer d’une formule développée à une formule semi-développée.', 'Établir la formule brute d’une molécule.'],
    lessons: ['m0-formules'],
  },
  {
    id: 'c4',
    number: 4,
    title: 'Lecture des formules topologiques',
    difficulty: 'Débutant',
    prerequisites: ['c3'],
    objectives: ['Retrouver tous les carbones d’une formule topologique.', 'Retrouver les hydrogènes implicites.'],
    lessons: ['m0-topologique'],
  },
  {
    id: 'c5',
    number: 5,
    title: 'Chaînes carbonées et ramifications',
    difficulty: 'Débutant',
    prerequisites: ['c4'],
    objectives: ['Distinguer chaîne linéaire, ramifiée et cyclique.', 'Repérer les liaisons multiples.'],
    lessons: ['m0-chaines'],
  },
  {
    id: 'c6',
    number: 6,
    title: 'Nomenclature des alcanes',
    difficulty: 'Débutant',
    prerequisites: ['c5'],
    objectives: ['Connaître les racines méth- à déc- et la terminaison -ane.', 'Identifier la chaîne principale d’un alcane.'],
    lessons: ['m1-racines', 'm1-chaine-principale'],
  },
  {
    id: 'c7',
    number: 7,
    title: 'Groupes alkyles et numérotation',
    difficulty: 'Intermédiaire',
    prerequisites: ['c6'],
    objectives: [
      'Nommer les groupes alkyles.',
      'Numéroter la chaîne (règle du premier point de différence).',
      'Écrire multiplicateurs, tirets, virgules et ordre alphabétique.',
      'Nommer un alcane ramifié de bout en bout.',
    ],
    lessons: ['m1-alkyles', 'm1-numerotation', 'm1-multiplicateurs', 'm1-ordre-alphabetique', 'm1-alcanes-ramifies'],
  },
  {
    id: 'c8',
    number: 8,
    title: 'Alcènes et alcynes',
    difficulty: 'Intermédiaire',
    prerequisites: ['c7'],
    objectives: ['Nommer alcènes et alcynes (-ène, -yne).', 'Gérer plusieurs insaturations et les ramifications.', 'Déterminer une configuration Z/E.'],
    lessons: ['m2-alcenes', 'm2-alcynes', 'm2-plusieurs-insaturations', 'm2-alcenes-ramifies', 'm2-ez'],
  },
  {
    id: 'c9',
    number: 9,
    title: 'Cycles',
    difficulty: 'Intermédiaire',
    prerequisites: ['c8'],
    objectives: ['Nommer cycloalcanes et cycles substitués.', 'Numéroter un cycle.', 'Nommer cycloalcènes et dérivés simples du benzène.'],
    lessons: ['m3-cycloalcanes', 'm3-cycles-substitues', 'm3-cycloalcenes', 'm3-benzene'],
  },
  {
    id: 'c10',
    number: 10,
    title: 'Fonctions chimiques',
    difficulty: 'Avancé',
    prerequisites: ['c9'],
    objectives: ['Reconnaître les groupes caractéristiques.', 'Nommer halogénoalcanes, alcools, éthers, aldéhydes, cétones, acides, esters, amines, amides et nitriles.'],
    lessons: [
      'm4-identifier-fonctions',
      'm4-halogenoalcanes',
      'm4-alcools',
      'm4-ethers',
      'm4-aldehydes',
      'm4-cetones',
      'm4-acides',
      'm4-esters',
      'm4-amines',
      'm4-amides',
      'm4-nitriles',
    ],
  },
  {
    id: 'c11',
    number: 11,
    title: 'Molécules comportant plusieurs fonctions',
    difficulty: 'Avancé',
    prerequisites: ['c10'],
    objectives: ['Choisir la fonction prioritaire.', 'Nommer les autres groupes en préfixe.', 'Appliquer la méthode complète à des molécules complexes.'],
    lessons: ['m4-polyfonctionnels', 'm5-methode-generale'],
  },
  {
    id: 'c12',
    number: 12,
    title: 'Exercices de synthèse et préparation aux examens',
    difficulty: 'Examen',
    prerequisites: ['c11'],
    objectives: ['Connaître les noms usuels.', 'Éviter les pièges classiques.', 'S’entraîner en conditions d’examen.', 'Option : configuration R/S.'],
    lessons: ['m5-noms-usuels', 'm6-pieges', 'm5-rs'],
  },
];

export const CHAPTER_BY_ID: Record<string, Chapter> = Object.fromEntries(CHAPTERS.map((c) => [c.id, c]));

export function chapterOfLesson(lessonId: string): Chapter | undefined {
  return CHAPTERS.find((c) => c.lessons.includes(lessonId));
}
