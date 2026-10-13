// Répétition espacée inspirée de la méthode Leitner, par notion.
//  - Une notion entre en boîte 1 après la leçon (révision le lendemain).
//  - Révision réussie (≥ 80 %) : boîte suivante, délai plus long.
//  - Révision moyenne (50–79 %) : même boîte.
//  - Révision ratée (< 50 %) : retour en boîte 1 (révision le lendemain).
//  - Une erreur en entraînement avance la prochaine révision à demain.
import type { AppState, SkillState } from './types';
import { addDays } from './dates';

export const INTERVALS = [0, 1, 2, 4, 8, 16];
export const MAX_BOX = 5;

export function introduceSkill(skills: Record<string, SkillState>, skill: string, date: string, box = 1): void {
  if (skills[skill]) return;
  skills[skill] = { box, due: addDays(date, INTERVALS[box]), reviews: 0, introducedAt: date };
}

export function applyReview(s: SkillState, score: number, date: string): SkillState {
  let box = s.box;
  if (score >= 0.8) box = Math.min(MAX_BOX, box + 1);
  else if (score < 0.5) box = 1;
  return { ...s, box, due: addDays(date, INTERVALS[box]), reviews: s.reviews + 1, lastReview: date };
}

/** Une erreur hors révision : la notion reviendra dès demain. */
export function applyMistake(s: SkillState, date: string): SkillState {
  const tomorrow = addDays(date, 1);
  return s.due > tomorrow ? { ...s, due: tomorrow } : s;
}

export function dueSkills(state: AppState, date: string): string[] {
  return Object.entries(state.skills)
    .filter(([, s]) => s.due <= date)
    .sort((a, b) => (a[1].due === b[1].due ? a[1].box - b[1].box : a[1].due < b[1].due ? -1 : 1))
    .map(([k]) => k);
}

export function overdueSkills(state: AppState, date: string): string[] {
  return Object.entries(state.skills)
    .filter(([, s]) => s.due < date)
    .map(([k]) => k);
}

export function upcomingSkills(state: AppState, date: string, days: number): { skill: string; due: string }[] {
  const end = addDays(date, days);
  return Object.entries(state.skills)
    .filter(([, s]) => s.due > date && s.due <= end)
    .map(([skill, s]) => ({ skill, due: s.due }))
    .sort((a, b) => (a.due < b.due ? -1 : 1));
}
