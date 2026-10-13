// Construction des séries : révisions espacées, entraînement adaptatif, carnet d'erreurs, examen blanc.
import { LESSONS } from '../content/lessons';
import { SKILLS, SKILL_BY_ID } from '../content/skills';
import type { AppState } from '../state/types';
import { dueSkills } from '../state/srs';
import { suggestedLevel, skillStats } from '../state/stats';
import { buildExercise, pickExercises, similarExercise, shuffle, type Rng } from './generate';
import type { Exercise, ExerciseKind, ExerciseSpec } from './types';
import type { RunResult } from '../ui/exercises/ExerciseRunner';

export function learnedSkills(state: AppState): string[] {
  return [...new Set(LESSONS.filter((l) => state.lessons[l.id]?.status === 'completed').flatMap((l) => l.skills))];
}

/** Exercices pour une notion, au niveau conseillé d'après les résultats récents. */
function adaptive(state: AppState, skill: string, count: number, rng: Rng, exclude: Set<string>, kinds?: ExerciseKind[]): Exercise[] {
  const lvl = suggestedLevel(state, skill);
  let list = pickExercises({ skills: [skill], count, minLevel: Math.max(1, lvl - 1), maxLevel: lvl, rng, exclude, kinds });
  if (list.length < count) list = [...list, ...pickExercises({ skills: [skill], count: count - list.length, rng, exclude: new Set([...exclude, ...list.map((e) => e.key)]), kinds })];
  list.forEach((e) => exclude.add(e.key));
  return list;
}

export function buildReviewSet(state: AppState, date: string, count: number, rng: Rng = Math.random): { exercises: Exercise[]; skills: string[]; memoryQuiz: boolean } {
  let skills = dueSkills(state, date);
  let memoryQuiz = false;
  if (!skills.length) {
    skills = shuffle(learnedSkills(state), rng).slice(0, 3);
    memoryQuiz = true;
  }
  const picked = skills.slice(0, Math.max(1, Math.ceil(count / 2)));
  const per = Math.max(2, Math.floor(count / picked.length));
  const exclude = new Set<string>();
  const exercises = picked.flatMap((s) => adaptive(state, s, per, rng, exclude));
  return { exercises: shuffle(exercises, rng).slice(0, Math.max(count, picked.length * 2)), skills: picked, memoryQuiz };
}

/** Score de chaque notion sur une série (1 = réussi, 0,5 = partiel). */
export function skillScores(results: RunResult[]): Record<string, number> {
  const acc: Record<string, [number, number]> = {};
  for (const r of results) {
    if (r.res.status === 'unknown') continue;
    const sc = r.res.status === 'correct' ? 1 : r.res.status === 'partial' ? 0.5 : 0;
    for (const s of r.ex.skills) {
      const a = acc[s] ?? [0, 0];
      a[0] += sc;
      a[1] += 1;
      acc[s] = a;
    }
  }
  return Object.fromEntries(Object.entries(acc).map(([k, [a, n]]) => [k, a / n]));
}

export function buildPracticeSet(state: AppState, skills: string[], count: number, rng: Rng = Math.random, kinds?: ExerciseKind[]): Exercise[] {
  if (!skills.length) return [];
  const exclude = new Set<string>();
  const out: Exercise[] = [];
  let i = 0;
  const order = shuffle(skills, rng);
  while (out.length < count && i < count * 3) {
    const s = order[i % order.length];
    out.push(...adaptive(state, s, 1, rng, exclude, kinds));
    i++;
  }
  return out.slice(0, count);
}

export function specFromKey(key: string): ExerciseSpec | null {
  const [kind, ...rest] = key.split(':');
  if (kind === 'q') return { kind: 'q', id: rest.join(':') };
  if (kind === 'match') return { kind: 'match', smiles: rest.join(':').split('|') };
  if (kind === 'formula') return { kind: 'formula', smiles: rest.slice(1).join(':'), fromName: rest[0] === 'n' };
  if (kind === 'implicitH') return { kind: 'implicitH', smiles: rest[0], atom: Number(rest[1]) };
  if (kind === 'judge') return { kind: 'judge', smiles: rest[0], proposed: rest.slice(1).join(':') };
  if (!rest[0]) return null;
  return { kind: kind as never, smiles: rest[0] };
}

/** Révision des erreurs : l'exercice raté, puis un exercice semblable pour vérifier la compréhension. */
export function buildMistakesSet(state: AppState, count: number, rng: Rng = Math.random, onlyKeys?: string[]): Exercise[] {
  const list = Object.values(state.mistakes)
    .filter((m) => !m.resolved && (!onlyKeys || onlyKeys.includes(m.key)))
    .sort((a, b) => b.count - a.count || (a.last < b.last ? 1 : -1));
  const out: Exercise[] = [];
  for (const m of list) {
    if (out.length >= count) break;
    const spec = specFromKey(m.key);
    const ex = spec ? buildExercise(spec, rng) : null;
    if (ex) {
      ex.key = m.key;
      out.push(ex);
      const sim = similarExercise(ex, rng);
      if (sim && out.length < count) out.push(sim);
    }
  }
  if (!out.length) {
    // pas d'erreur en attente : on travaille les notions les plus fragiles
    const weak = SKILLS.map((s) => skillStats(state, s.id))
      .filter((s) => s.attempts > 0)
      .sort((a, b) => (a.recentRate ?? 1) - (b.recentRate ?? 1))
      .slice(0, 3)
      .map((s) => s.skill);
    return buildPracticeSet(state, weak.length ? weak : learnedSkills(state), count, rng);
  }
  return out;
}

/** Examen blanc : questions mélangées, sans indice, de niveau intermédiaire à examen. */
export function buildExam(state: AppState, count = 20, rng: Rng = Math.random): Exercise[] {
  const learned = learnedSkills(state);
  const skills = (learned.length >= 6 ? learned : SKILLS.map((s) => s.id)).filter((s) => !SKILL_BY_ID[s].advanced || learned.includes(s));
  const named = pickExercises({ skills: skills.filter((s) => !s.startsWith('b-')), count: Math.round(count * 0.6), minLevel: 2, maxLevel: 5, kinds: ['name'], rng });
  const others = pickExercises({
    skills,
    count: count - named.length,
    minLevel: 2,
    maxLevel: 5,
    kinds: ['structure', 'function', 'findError', 'judge', 'complete', 'mainChain', 'numbering', 'mcq', 'tf', 'ez', 'match'],
    exclude: new Set(named.map((e) => e.key)),
    rng,
  });
  return shuffle([...named, ...others], rng).slice(0, count);
}

/** Barème : 1 point par question, 1,5 pour un nom de niveau ≥ 4 ; moitié des points si partiel. */
export function examPoints(ex: Exercise): number {
  return ex.kind === 'name' && ex.level >= 4 ? 1.5 : 1;
}
