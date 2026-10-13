// Persistance. Première version : localStorage. L'interface Repository permet
// d'ajouter plus tard un stockage distant (compte utilisateur + base de données).
import { type AppState, STATE_VERSION } from './types';

export interface Repository {
  load(): AppState | null;
  save(state: AppState): void;
  clear(): void;
}

const KEY = 'nomenclature-organique:v1';
/** Ancienne clé de sauvegarde : reprise automatique de la progression existante. */
const LEGACY_KEYS = ['julies-chemistry-love:v1'];

export function defaultState(): AppState {
  return {
    version: STATE_VERSION,
    profile: {
      onboarded: false,
      visits: 0,
      studyDays: [1, 2, 3, 4, 5],
      seenModules: [],
      difficultSkills: [],
      goal: { lessonMin: 10, exerciseMin: 10, reviewMin: 5 },
    },
    prefs: {
      focusMode: false,
      dark: false,
    },
    lessons: {},
    attempts: [],
    skills: {},
    mistakes: {},
    exams: [],
    days: {},
    sessionsCompleted: 0,
  };
}

/** Complète un état chargé (ancienne version, import partiel) avec les valeurs par défaut. */
export function normalizeState(raw: unknown): AppState {
  const d = defaultState();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<AppState>;
  // Seules les données d'apprentissage sont reprises (les anciennes préférences
  // d'apparence et éléments décoratifs éventuels sont ignorés).
  return {
    version: STATE_VERSION,
    profile: { ...d.profile, ...(r.profile ?? {}), goal: { ...d.profile.goal, ...(r.profile?.goal ?? {}) } },
    prefs: { focusMode: !!r.prefs?.focusMode, dark: !!r.prefs?.dark },
    lessons: r.lessons ?? {},
    attempts: Array.isArray(r.attempts) ? r.attempts : [],
    skills: r.skills ?? {},
    mistakes: r.mistakes ?? {},
    exams: Array.isArray(r.exams) ? r.exams : [],
    days: r.days ?? {},
    sessionsCompleted: r.sessionsCompleted ?? 0,
  };
}

export class LocalStorageRepository implements Repository {
  load(): AppState | null {
    try {
      let txt = localStorage.getItem(KEY);
      if (!txt) {
        for (const k of LEGACY_KEYS) {
          txt = localStorage.getItem(k);
          if (txt) break;
        }
      }
      return txt ? normalizeState(JSON.parse(txt)) : null;
    } catch {
      return null;
    }
  }
  save(state: AppState): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // stockage plein ou indisponible : on ignore (l'export reste possible)
    }
  }
  clear(): void {
    try {
      localStorage.removeItem(KEY);
      for (const k of LEGACY_KEYS) localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}

export class MemoryRepository implements Repository {
  private data: AppState | null = null;
  load() {
    return this.data ? normalizeState(JSON.parse(JSON.stringify(this.data))) : null;
  }
  save(state: AppState) {
    this.data = JSON.parse(JSON.stringify(state));
  }
  clear() {
    this.data = null;
  }
}

export function exportState(state: AppState): string {
  return JSON.stringify({ app: 'nomenclature-organique', exportedAt: new Date().toISOString(), state }, null, 2);
}

export function importState(text: string): AppState {
  const parsed = JSON.parse(text);
  const st = parsed?.state ?? parsed;
  if (!st || typeof st !== 'object' || !('profile' in st) || !('lessons' in st))
    throw new Error('Ce fichier ne ressemble pas à une sauvegarde du site.');
  return normalizeState(st);
}
