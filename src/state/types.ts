// Données sauvegardées (localStorage). Versionnées pour permettre les migrations
// et, plus tard, une synchronisation avec un compte utilisateur.
import type { ErrorCode, GradeStatus } from '../chem/nomenclature/grading';
import type { ExerciseKind } from '../exercises/types';

export const STATE_VERSION = 1;

export type AttemptContext = 'lesson' | 'practice' | 'review' | 'exam' | 'mistakes' | 'placement' | 'session' | 'timed';

export interface Attempt {
  ts: number;
  date: string;
  key: string;
  kind: ExerciseKind;
  skills: string[];
  level: number;
  status: GradeStatus;
  context: AttemptContext;
  hintsUsed: number;
  /** Nouvel essai sur le même exercice (ne compte pas dans les statistiques de réussite). */
  retry: boolean;
  errorCodes: ErrorCode[];
  durationMs: number;
}

export interface SkillState {
  /** Boîte de Leitner (1 à 5). */
  box: number;
  /** Prochaine révision (AAAA-MM-JJ). */
  due: string;
  reviews: number;
  lastReview?: string;
  introducedAt: string;
}

export interface MistakeEntry {
  key: string;
  kind: ExerciseKind;
  prompt: string;
  smiles?: string;
  userAnswer: string;
  expected: string;
  skills: string[];
  errorCodes: ErrorCode[];
  details: string[];
  first: string;
  last: string;
  count: number;
  /** Réussites depuis la dernière erreur. */
  successes: number;
  resolved: boolean;
  resolvedAt?: string;
}

export interface LessonProgress {
  status: 'in-progress' | 'completed';
  step: number;
  quizBest?: number;
  completedAt?: string;
  via?: 'lesson' | 'placement';
}

export interface ExamResult {
  id: string;
  date: string;
  score: number;
  max: number;
  durationMs: number;
  perSkill: Record<string, { ok: number; n: number }>;
}

export interface PlanTaskSnapshot {
  id: string;
  kind: 'review' | 'lesson' | 'practice' | 'mistakes' | 'exam';
  title: string;
  minutes: number;
  lessonId?: string;
  skills?: string[];
  count?: number;
}

export interface DayLog {
  activeMs: { lesson: number; exercise: number; review: number };
  exercises: number;
  correct: number;
  tasksDone: string[];
  plan?: PlanTaskSnapshot[];
  sessionDone?: boolean;
}

export interface Profile {
  onboarded: boolean;
  visits: number;
  firstVisitAt?: string;
  lastVisitAt?: string;
  studyLevel?: string;
  chemLevel?: 'debutante' | 'quelques-bases' | 'a-l-aise';
  examDate?: string;
  studyDays: number[];
  seenModules: string[];
  difficultSkills: string[];
  goal: { lessonMin: number; exerciseMin: number; reviewMin: number };
  placementDone?: boolean;
}

export interface Prefs {
  animations: boolean;
  focusMode: boolean;
  dark: boolean;
  theme: string;
  showMimi: boolean;
}

export interface LoveState {
  recent: Record<string, number[]>;
  calendar: { date: string; index: number }[];
  secretLetterOpened: boolean;
  badges: Record<string, string>;
  celebratedModules: string[];
  effortShown: number[];
  custom: { letter?: string; secretLetter?: string; messages: string[] };
  /** File d'événements à célébrer à l'écran (badges, chapitres…). */
  pending: { type: 'badge' | 'chapter' | 'session' | 'effort'; id: string }[];
}

export interface AppState {
  version: number;
  profile: Profile;
  prefs: Prefs;
  lessons: Record<string, LessonProgress>;
  attempts: Attempt[];
  skills: Record<string, SkillState>;
  mistakes: Record<string, MistakeEntry>;
  exams: ExamResult[];
  days: Record<string, DayLog>;
  sessionsCompleted: number;
  love: LoveState;
}
