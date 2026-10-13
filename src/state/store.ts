// Magasin global (sans dépendance) + actions. Toute modification est sauvegardée.
import { useSyncExternalStore } from 'react';
import { LESSONS, lessonsOfModule } from '../content/lessons';
import type { Exercise, ExerciseResult } from '../exercises/types';
import { addDays, diffDays, today } from './dates';
import { applyMistake, applyReview, introduceSkill } from './srs';
import { LocalStorageRepository, type Repository, defaultState, exportState, importState } from './storage';
import type { AppState, AttemptContext, DayLog, ExamResult, PlanTaskSnapshot, Profile, Prefs } from './types';

let repo: Repository = typeof localStorage !== 'undefined' ? new LocalStorageRepository() : (null as unknown as Repository);
let state: AppState = defaultState();
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const MAX_ATTEMPTS = 5000;

export function setRepository(r: Repository) {
  repo = r;
}

function emit() {
  listeners.forEach((l) => l());
}

function persist(immediate = false) {
  if (!repo) return;
  if (saveTimer) clearTimeout(saveTimer);
  if (immediate) repo.save(state);
  else saveTimer = setTimeout(() => repo.save(state), 150);
}

export function getState(): AppState {
  return state;
}

/** Applique une modification sur une copie de l'état, puis sauvegarde. */
export function mutate(fn: (draft: AppState) => void): void {
  const draft = structuredClone(state);
  fn(draft);
  state = draft;
  persist();
  emit();
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

function dayLog(d: AppState, date = today()): DayLog {
  if (!d.days[date]) d.days[date] = { activeMs: { lesson: 0, exercise: 0, review: 0 }, exercises: 0, correct: 0, tasksDone: [] };
  return d.days[date];
}

// ---------------------------------------------------------------------------
// Démarrage

export interface VisitInfo {
  firstVisit: boolean;
  /** Absence d'au moins 3 jours : on affiche un récapitulatif de reprise. */
  comeback: boolean;
}

export function initStore(): VisitInfo {
  const loaded = repo?.load();
  state = loaded ?? defaultState();
  const t = today();
  const last = state.profile.lastVisitAt;
  const info: VisitInfo = { firstVisit: state.profile.visits === 0, comeback: !!last && diffDays(t, last) >= 3 };
  const draft = structuredClone(state);
  if (draft.profile.lastVisitAt !== t) draft.profile.visits += 1;
  if (!draft.profile.firstVisitAt) draft.profile.firstVisitAt = t;
  draft.profile.lastVisitAt = t;
  state = draft;
  persist(true);
  emit();
  return info;
}

// ---------------------------------------------------------------------------
// Profil et préférences

export function updateProfile(p: Partial<Profile>) {
  mutate((d) => {
    d.profile = { ...d.profile, ...p, goal: { ...d.profile.goal, ...(p.goal ?? {}) } };
  });
}

export function updatePrefs(p: Partial<Prefs>) {
  mutate((d) => {
    d.prefs = { ...d.prefs, ...p };
  });
}

/** Fin de l'accueil : profil + éventuels modules déjà acquis (test de positionnement). */
export function completeOnboarding(p: Partial<Profile>, acquiredModules: string[] = []) {
  mutate((d) => {
    d.profile = { ...d.profile, ...p, onboarded: true, goal: { ...d.profile.goal, ...(p.goal ?? {}) } };
    const t = today();
    for (const m of acquiredModules) {
      for (const l of lessonsOfModule(m)) {
        if (d.lessons[l.id]?.status === 'completed') continue;
        d.lessons[l.id] = { status: 'completed', step: 0, completedAt: t, via: 'placement' };
        // acquis « à confirmer » : boîte 2, révision dans 2 jours
        for (const s of l.skills) introduceSkill(d.skills, s, t, 2);
      }
    }
    if (acquiredModules.length) d.profile.placementDone = true;
  });
}

// ---------------------------------------------------------------------------
// Exercices

export interface AttemptMeta {
  context: AttemptContext;
  hintsUsed?: number;
  retry?: boolean;
  durationMs?: number;
}

export function recordAttempt(ex: Exercise, res: ExerciseResult, meta: AttemptMeta) {
  // Le test de positionnement sert seulement à placer l'utilisateur dans le parcours :
  // il ne compte ni dans les statistiques ni dans le carnet d'erreurs.
  if (meta.context === 'placement') return;
  mutate((d) => {
    const t = today();
    d.attempts.push({
      ts: Date.now(),
      date: t,
      key: ex.key,
      kind: ex.kind,
      skills: ex.skills,
      level: ex.level,
      status: res.status,
      context: meta.context,
      hintsUsed: meta.hintsUsed ?? 0,
      retry: !!meta.retry,
      errorCodes: res.errorCodes,
      durationMs: meta.durationMs ?? 0,
    });
    if (d.attempts.length > MAX_ATTEMPTS) d.attempts = d.attempts.slice(-MAX_ATTEMPTS);
    const log = dayLog(d, t);
    if (!meta.retry) {
      log.exercises += 1;
      if (res.status === 'correct') log.correct += 1;
    }
    // notions : une erreur fait revenir la notion plus tôt
    for (const s of ex.skills) {
      if (!d.skills[s] && meta.context !== 'placement') introduceSkill(d.skills, s, t);
      if (d.skills[s] && (res.status === 'incorrect' || res.status === 'partial') && meta.context !== 'review')
        d.skills[s] = applyMistake(d.skills[s], t);
    }
    // carnet d'erreurs
    const existing = d.mistakes[ex.key];
    const skipped = !res.userAnswer.trim();
    if ((res.status === 'incorrect' || res.status === 'partial') && !skipped) {
      d.mistakes[ex.key] = {
        key: ex.key,
        kind: ex.kind,
        prompt: ex.prompt,
        smiles: ex.smiles,
        userAnswer: res.userAnswer,
        expected: res.expected,
        skills: ex.skills,
        errorCodes: res.errorCodes,
        details: res.details,
        first: existing?.first ?? t,
        last: t,
        count: (existing?.count ?? 0) + 1,
        successes: 0,
        resolved: false,
      };
    } else if (res.status === 'correct' && existing && !existing.resolved) {
      existing.successes += 1;
      if (existing.successes >= 2) {
        existing.resolved = true;
        existing.resolvedAt = t;
      }
    }
  });
}

/** Fin d'une séance de révisions espacées : chaque notion change de boîte. */
export function recordReview(scores: Record<string, number>) {
  mutate((d) => {
    const t = today();
    for (const [skill, sc] of Object.entries(scores)) {
      if (!d.skills[skill]) introduceSkill(d.skills, skill, t);
      d.skills[skill] = applyReview(d.skills[skill], sc, t);
    }
  });
}

/** Marque une erreur comme comprise (après au moins une réussite). */
export function setMistakeResolved(key: string, resolved: boolean) {
  mutate((d) => {
    const m = d.mistakes[key];
    if (!m) return;
    m.resolved = resolved;
    m.resolvedAt = resolved ? today() : undefined;
    if (!resolved) m.successes = 0;
  });
}

export function deleteMistake(key: string) {
  mutate((d) => {
    delete d.mistakes[key];
  });
}

// ---------------------------------------------------------------------------
// Leçons

export function setLessonStep(id: string, step: number) {
  mutate((d) => {
    const cur = d.lessons[id];
    if (cur?.status === 'completed') {
      cur.step = step;
      return;
    }
    d.lessons[id] = { status: 'in-progress', step, quizBest: cur?.quizBest };
  });
}

export const QUIZ_PASS = 0.7;

export function recordLessonQuiz(id: string, quizScore: number) {
  mutate((d) => {
    const t = today();
    const cur = d.lessons[id] ?? { status: 'in-progress', step: 0 };
    const best = Math.max(cur.quizBest ?? 0, quizScore);
    const passed = quizScore >= QUIZ_PASS;
    const lesson = LESSONS.find((l) => l.id === id)!;
    if (passed && cur.status !== 'completed') {
      d.lessons[id] = { ...cur, status: 'completed', quizBest: best, completedAt: t, via: 'lesson' };
      for (const s of lesson.skills) introduceSkill(d.skills, s, t);
    } else d.lessons[id] = { ...cur, quizBest: best, completedAt: cur.completedAt, via: cur.via ?? (passed ? 'lesson' : undefined) };
    // une leçon validée ce jour coche la tâche correspondante
    const log = dayLog(d, t);
    if (passed) for (const task of log.plan ?? []) if (task.lessonId === id && !log.tasksDone.includes(task.id)) log.tasksDone.push(task.id);
    checkSession(d, t);
  });
}

// ---------------------------------------------------------------------------
// Temps actif, plan du jour et séances

export function addActiveTime(kind: 'lesson' | 'exercise' | 'review', ms: number) {
  if (ms <= 0) return;
  mutate((d) => {
    const t = today();
    dayLog(d, t).activeMs[kind] += ms;
    checkSession(d, t);
  });
}

export function snapshotTodayPlan(tasks: PlanTaskSnapshot[]) {
  const t = today();
  if (state.days[t]?.plan) return;
  mutate((d) => {
    const log = dayLog(d, t);
    log.plan = tasks;
    // tâches déjà faites (leçon validée plus tôt dans la journée)
    for (const task of tasks) if (task.lessonId && d.lessons[task.lessonId]?.status === 'completed' && d.lessons[task.lessonId]?.completedAt === t) log.tasksDone.push(task.id);
  });
}

export function markTaskDone(taskId: string) {
  mutate((d) => {
    const t = today();
    const log = dayLog(d, t);
    if (!log.tasksDone.includes(taskId)) log.tasksDone.push(taskId);
    checkSession(d, t);
  });
}

/** La séance est terminée quand toutes les tâches du jour sont faites, ou quand les trois durées objectifs sont atteintes. */
function checkSession(d: AppState, t: string) {
  const log = dayLog(d, t);
  if (log.sessionDone) return;
  const plan = log.plan ?? [];
  const tasksOk = plan.length > 0 && plan.every((task) => log.tasksDone.includes(task.id));
  const g = d.profile.goal;
  const timeOk =
    log.activeMs.lesson >= g.lessonMin * 60000 && log.activeMs.exercise >= g.exerciseMin * 60000 && log.activeMs.review >= g.reviewMin * 60000;
  if (tasksOk || timeOk) {
    log.sessionDone = true;
    d.sessionsCompleted += 1;
  }
}

// ---------------------------------------------------------------------------
// Examens blancs

export function recordExam(r: ExamResult) {
  mutate((d) => {
    d.exams.push(r);
    const log = dayLog(d, r.date);
    for (const task of log.plan ?? []) if (task.kind === 'exam' && !log.tasksDone.includes(task.id)) log.tasksDone.push(task.id);
    checkSession(d, r.date);
  });
}

// ---------------------------------------------------------------------------
// Sauvegarde

export function exportData(): string {
  return exportState(state);
}

export function importData(text: string) {
  state = importState(text);
  persist(true);
  emit();
}

export function resetAll() {
  repo?.clear();
  state = defaultState();
  persist(true);
  emit();
}

/** Pour les tests. */
export function __setState(s: AppState) {
  state = s;
}

export { addDays };
