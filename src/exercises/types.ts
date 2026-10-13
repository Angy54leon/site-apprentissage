// Types des exercices.
import type { ErrorCode, GradeStatus } from '../chem/nomenclature/grading';

export type ExerciseKind =
  | 'name'
  | 'structure'
  | 'mainChain'
  | 'numbering'
  | 'function'
  | 'complete'
  | 'judge'
  | 'findError'
  | 'formula'
  | 'countC'
  | 'implicitH'
  | 'match'
  | 'mcq'
  | 'tf'
  | 'ez'
  | 'rs';

export const KIND_LABEL: Record<ExerciseKind, string> = {
  name: 'Trouver le nom',
  structure: 'Retrouver la structure',
  mainChain: 'Chaîne principale',
  numbering: 'Sens de numérotation',
  function: 'Identifier la fonction',
  complete: 'Compléter le nom',
  judge: 'Nom correct ou non ?',
  findError: 'Trouver l’erreur',
  formula: 'Formule brute',
  countC: 'Compter les carbones',
  implicitH: 'Hydrogènes implicites',
  match: 'Relier noms et structures',
  mcq: 'QCM',
  tf: 'Vrai ou faux',
  ez: 'Configuration Z/E',
  rs: 'Configuration R/S',
};

/** Description d'un exercice dans le contenu (leçons, banque). */
export type ExerciseSpec =
  | {
      kind: Exclude<ExerciseKind, 'match' | 'mcq' | 'tf'>;
      smiles: string;
      hints?: string[];
      /** Pour « judge » : nom proposé (sinon généré). */
      proposed?: string;
      /** Pour « implicitH » : atome interrogé. */
      atom?: number;
      /** Pour « formula » : donner le nom au lieu de la structure. */
      fromName?: boolean;
    }
  | { kind: 'match'; smiles: string[] }
  | { kind: 'q'; id: string };

/** Question rédigée (QCM, vrai/faux). */
export interface AuthoredQuestion {
  id: string;
  kind: 'mcq' | 'tf';
  skills: string[];
  level: 1 | 2 | 3 | 4 | 5;
  prompt: string;
  smiles?: string;
  choices?: string[];
  /** Index des bonnes réponses (QCM) ou booléen (vrai/faux). */
  answer: number[] | boolean;
  explanation: string;
  hints?: string[];
}

export interface Choice {
  label: string;
  smiles?: string;
}

/** Exercice prêt à être affiché. */
export interface Exercise {
  uid: string;
  /** Clé stable (statistiques, carnet d'erreurs). */
  key: string;
  kind: ExerciseKind;
  skills: string[];
  level: number;
  prompt: string;
  smiles?: string;
  hints: string[];
  // champs selon le type
  choices?: Choice[];
  answer?: number[];
  multi?: boolean;
  truth?: boolean;
  explanation?: string;
  atom?: number;
  proposed?: string;
  wrongCode?: ErrorCode;
  items?: { smiles: string; name: string }[];
  /** Nom à compléter : segments de texte et trous (indices). */
  template?: { text?: string; blank?: string }[];
  stereo?: { center?: number; bond?: number; type?: 'wedge' | 'hash'; config: string };
  fromName?: boolean;
  name?: string;
  /** Coordonnées imposées (stéréochimie R/S). */
  coords?: [number, number][];
}

export interface ExerciseResult {
  status: GradeStatus;
  userAnswer: string;
  expected: string;
  errorCodes: ErrorCode[];
  /** Explications affichées dans la correction. */
  details: string[];
  headline: string;
  userSmiles?: string;
}
