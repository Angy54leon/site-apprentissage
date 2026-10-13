// Badges, autocollants, thèmes, mascotte et messages : tout est calculé à partir
// des données réelles. Les récompenses sont décoratives et ne bloquent jamais
// l'accès aux cours ou aux révisions.
import { BADGES, MESSAGES, STICKERS, THEMES, UNLOCK } from '../config/love';
import { MODULES } from '../content/skills';
import type { AppState } from './types';
import { activeDays, completedLessons, firstAttempts, moduleCompleted, skillStats } from './stats';

const MODULE_BADGE: Record<string, string> = {
  m0: 'bases-solides',
  m1: 'reine-des-alcanes',
  m2: 'double-liaison',
  m3: 'reine-des-cycles',
  m4: 'fonctions',
  m5: 'complexes',
};

/** Badges mérités d'après l'état actuel. */
export function earnedBadges(state: AppState): string[] {
  const out: string[] = [];
  const first = firstAttempts(state);
  if (state.attempts.some((a) => a.kind === 'name' && a.status === 'correct')) out.push('premiere-molecule');
  if (completedLessons(state) >= 1) out.push('premiere-lecon');
  for (const [m, b] of Object.entries(MODULE_BADGE)) if (moduleCompleted(state, m)) out.push(b);
  if (skillStats(state, 'alc-ramifies').status === 'maitrisee') out.push('experte-ramifications');
  if (first.length >= 50) out.push('50-exercices');
  if (first.length >= 200) out.push('200-exercices');
  if (first.length >= 500) out.push('500-exercices');
  const days = activeDays(state).length;
  if (days >= 3) out.push('regularite-3');
  if (days >= 7) out.push('regularite-7');
  if (days >= 20) out.push('regularite-20');
  if (Object.values(state.mistakes).some((m) => m.resolved)) out.push('erreur-vaincue');
  if (state.exams.length) out.push('examen-blanc');
  if (state.exams.some((e) => (e.score / e.max) * 20 >= 16)) out.push('mention');
  if (state.attempts.some((a) => a.context === 'timed')) out.push('chrono');
  if (state.sessionsCompleted >= UNLOCK.secretLetterSessions) out.push('lettre-secrete');
  return out.filter((b) => BADGES.some((x) => x.id === b));
}

/** Met à jour les badges et les célébrations en attente (mutation de l'état fourni). */
export function refreshRewards(state: AppState, date: string): void {
  for (const b of earnedBadges(state)) {
    if (!state.love.badges[b]) {
      state.love.badges[b] = date;
      state.love.pending.push({ type: 'badge', id: b });
    }
  }
  for (const m of MODULES) {
    if (m.id === 'm6') continue;
    if (moduleCompleted(state, m.id) && !state.love.celebratedModules.includes(m.id)) {
      state.love.celebratedModules.push(m.id);
      state.love.pending.push({ type: 'chapter', id: m.id });
    }
  }
  const days = activeDays(state).length;
  for (const ms of UNLOCK.effortMilestones) {
    if (days >= ms && !state.love.effortShown.includes(ms)) {
      state.love.effortShown.push(ms);
      if (MESSAGES.effort[ms]) state.love.pending.push({ type: 'effort', id: String(ms) });
    }
  }
}

export function unlockedStickers(state: AppState) {
  const n = completedLessons(state);
  return STICKERS.map((s) => ({ ...s, unlocked: n >= s.lessons }));
}

export function unlockedThemes(state: AppState) {
  const n = completedLessons(state);
  return THEMES.map((t) => ({ ...t, unlocked: n >= t.unlockLessons }));
}

/** Stade d'évolution de Mimi (0 à 3). */
export function mimiStage(state: AppState): number {
  const n = completedLessons(state);
  return UNLOCK.mimiStages.filter((s) => n >= s).length;
}

export function secretLetterUnlocked(state: AppState): boolean {
  return state.sessionsCompleted >= UNLOCK.secretLetterSessions;
}

// ---------------------------------------------------------------------------
// Messages : tirage aléatoire en évitant les répétitions récentes

export type MessageContext = Exclude<keyof typeof MESSAGES, 'effort'>;

export function messagePool(state: AppState, ctx: MessageContext): string[] {
  const base = MESSAGES[ctx] as string[];
  if (ctx === 'loveBox' || ctx === 'motivation') return [...base, ...state.love.custom.messages];
  return base;
}

/** Choisit un message et met à jour l'historique (mutation de l'état fourni). */
export function drawMessage(state: AppState, ctx: MessageContext, rng: () => number = Math.random): string {
  const pool = messagePool(state, ctx);
  if (!pool.length) return '';
  const recent = state.love.recent[ctx] ?? [];
  const memory = Math.floor(pool.length / 2);
  const candidates = pool.map((_, i) => i).filter((i) => !recent.includes(i));
  const choices = candidates.length ? candidates : pool.map((_, i) => i);
  const idx = choices[Math.floor(rng() * choices.length)];
  state.love.recent[ctx] = [...recent, idx].slice(-memory);
  return pool[idx];
}
