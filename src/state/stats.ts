// Statistiques calculées uniquement à partir des données réelles de Julie.
import { LESSONS, lessonsOfModule } from '../content/lessons';
import { MODULES, SKILLS, SKILL_BY_ID } from '../content/skills';
import type { ErrorCode } from '../chem/nomenclature/grading';
import type { AppState, Attempt } from './types';
import { addDays, today } from './dates';

/** Premiers essais uniquement (les nouvelles tentatives ne pénalisent pas). */
export function firstAttempts(state: AppState): Attempt[] {
  return state.attempts.filter((a) => !a.retry);
}

export const score = (a: Attempt) => (a.status === 'correct' ? 1 : a.status === 'partial' ? 0.5 : 0);

export function rate(list: Attempt[]): number | null {
  const evaluable = list.filter((a) => a.status !== 'unknown');
  if (!evaluable.length) return null;
  return evaluable.reduce((s, a) => s + score(a), 0) / evaluable.length;
}

export type SkillStatus = 'nouvelle' | 'en-cours' | 'maitrisee' | 'a-revoir';

export interface SkillStats {
  skill: string;
  attempts: number;
  rate: number | null;
  recentRate: number | null;
  days: number;
  box: number;
  status: SkillStatus;
}

export const MASTERY_RULE =
  'Une notion est « maîtrisée » quand elle est en boîte 4 ou 5 de révision, avec au moins 8 exercices faits sur au moins 2 jours différents et au moins 80 % de réussite sur les 10 derniers.';

export function skillStats(state: AppState, skill: string): SkillStats {
  const list = firstAttempts(state).filter((a) => a.skills.includes(skill));
  const recent = list.slice(-10);
  const r = rate(list);
  const rr = rate(recent);
  const days = new Set(list.map((a) => a.date)).size;
  const box = state.skills[skill]?.box ?? 0;
  let status: SkillStatus = 'nouvelle';
  if (list.length || state.skills[skill]) status = 'en-cours';
  if (list.length >= 3 && rr !== null && rr < 0.6) status = 'a-revoir';
  else if (box >= 4 && list.length >= 8 && days >= 2 && rr !== null && rr >= 0.8) status = 'maitrisee';
  return { skill, attempts: list.length, rate: r, recentRate: rr, days, box, status };
}

export function allSkillStats(state: AppState): SkillStats[] {
  return SKILLS.map((s) => skillStats(state, s.id));
}

export function completedLessons(state: AppState): number {
  return LESSONS.filter((l) => state.lessons[l.id]?.status === 'completed').length;
}

export function moduleProgress(state: AppState, module: string): { done: number; total: number } {
  const ls = lessonsOfModule(module);
  return { done: ls.filter((l) => state.lessons[l.id]?.status === 'completed').length, total: ls.length };
}

export function moduleCompleted(state: AppState, module: string): boolean {
  const ls = lessonsOfModule(module).filter((l) => !l.advanced);
  return ls.length > 0 && ls.every((l) => state.lessons[l.id]?.status === 'completed');
}

/** Progression globale : part des leçons terminées (la seule mesure non subjective). */
export function globalProgress(state: AppState): number {
  return completedLessons(state) / LESSONS.length;
}

export function currentModule(state: AppState) {
  const next = nextRecommendedLesson(state);
  return MODULES.find((m) => m.id === (next?.module ?? 'm6'))!;
}

export function nextRecommendedLesson(state: AppState) {
  return LESSONS.find((l) => state.lessons[l.id]?.status !== 'completed');
}

export function levelLabel(state: AppState): string {
  const n = completedLessons(state);
  if (n === 0) return 'Grande débutante (et c’est parfait pour commencer)';
  if (n < 6) return 'Apprentie chimiste';
  if (n < 13) return 'Chimiste en herbe';
  if (n < 22) return 'Chimiste confirmée';
  if (n < LESSONS.length) return 'Presque experte';
  return 'Experte de la nomenclature';
}

export function moduleRates(state: AppState): { module: string; label: string; rate: number | null; attempts: number }[] {
  const first = firstAttempts(state);
  return MODULES.filter((m) => m.id !== 'm6').map((m) => {
    const list = first.filter((a) => a.skills.some((s) => SKILL_BY_ID[s]?.module === m.id));
    return { module: m.id, label: m.short, rate: rate(list), attempts: list.length };
  });
}

export function recurringErrors(state: AppState, top = 5): { code: ErrorCode; count: number }[] {
  const counts = new Map<ErrorCode, number>();
  for (const a of state.attempts) for (const c of a.errorCodes) counts.set(c, (counts.get(c) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([c]) => c !== 'accents')
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, top);
}

export function history(state: AppState, days = 30): { date: string; attempts: number; rate: number | null; minutes: number }[] {
  const end = today();
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(end, -i);
    const list = firstAttempts(state).filter((a) => a.date === date);
    const log = state.days[date];
    const ms = log ? log.activeMs.lesson + log.activeMs.exercise + log.activeMs.review : 0;
    out.push({ date, attempts: list.length, rate: rate(list), minutes: Math.round(ms / 60000) });
  }
  return out;
}

export function totalActiveMinutes(state: AppState): number {
  let ms = 0;
  for (const d of Object.values(state.days)) ms += d.activeMs.lesson + d.activeMs.exercise + d.activeMs.review;
  return Math.round(ms / 60000);
}

/** Jours avec une vraie activité (au moins un exercice ou 2 minutes actives). */
export function activeDays(state: AppState): string[] {
  return Object.entries(state.days)
    .filter(([, d]) => d.exercises > 0 || d.activeMs.lesson + d.activeMs.exercise + d.activeMs.review >= 120000)
    .map(([k]) => k)
    .sort();
}

/**
 * Indicateur de préparation à l'examen (0–1), avec ses composantes.
 * Couverture du programme 40 %, notions maîtrisées 40 %, dernier examen blanc 20 %.
 * Sans examen blanc, les deux premières composantes sont repondérées.
 */
export function readiness(state: AppState): { value: number; coverage: number; mastery: number; exam: number | null } {
  const coverage = globalProgress(state);
  const stats = allSkillStats(state).filter((s) => !SKILL_BY_ID[s.skill].advanced);
  const mastery =
    stats.reduce((acc, s) => acc + (s.status === 'maitrisee' ? 1 : s.box >= 2 && (s.recentRate ?? 0) >= 0.7 ? 0.5 : 0), 0) / stats.length;
  const last = state.exams[state.exams.length - 1];
  const exam = last ? last.score / last.max : null;
  const value = exam === null ? 0.5 * coverage + 0.5 * mastery : 0.4 * coverage + 0.4 * mastery + 0.2 * exam;
  return { value, coverage, mastery, exam };
}

/** Niveau d'exercice conseillé pour une notion, d'après les derniers résultats. */
export function suggestedLevel(state: AppState, skill: string): number {
  const list = firstAttempts(state).filter((a) => a.skills.includes(skill)).slice(-8);
  if (!list.length) return state.skills[skill] ? 2 : 1;
  const avg = list.reduce((s, a) => s + a.level, 0) / list.length;
  const r = rate(list) ?? 0;
  let lvl = Math.round(avg);
  if (r >= 0.8 && list.length >= 4) lvl += 1;
  else if (r < 0.5) lvl -= 1;
  return Math.max(1, Math.min(5, lvl));
}
