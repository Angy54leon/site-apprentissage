// Programme de révision : recalculé à partir de la progression réelle.
// Le plan du jour est figé dans le journal du jour à sa première consultation,
// pour que les tâches ne « bougent » pas pendant la séance.
import { LESSONS, LESSON_BY_ID } from '../content/lessons';
import type { AppState, PlanTaskSnapshot } from './types';
import { addDays, diffDays, today, weekday } from './dates';
import { dueSkills } from './srs';

export type DayType = 'study' | 'light' | 'revision' | 'exam-prep' | 'rest' | 'exam';

export interface DayPlan {
  date: string;
  type: DayType;
  tasks: PlanTaskSnapshot[];
  minutes: number;
}

export const DAY_TYPE_LABEL: Record<DayType, string> = {
  study: 'Nouvelle leçon',
  light: 'Jour léger',
  revision: 'Révisions',
  'exam-prep': 'Examen blanc',
  rest: 'Repos',
  exam: 'Jour de l’examen',
};

const MIN_PER_EXERCISE = 1.2;

export interface PlanResult {
  days: DayPlan[];
  warning: string | null;
  lessonsLeft: number;
}

function completed(state: AppState, id: string) {
  return state.lessons[id]?.status === 'completed';
}

/** Notions déjà vues (leçons terminées), pour les tests de mémorisation. */
function learnedSkills(state: AppState): string[] {
  return [...new Set(LESSONS.filter((l) => completed(state, l.id)).flatMap((l) => l.skills))];
}

export function buildPlan(state: AppState, horizonDays = 14, from = today()): PlanResult {
  const p = state.profile;
  const goal = p.goal;
  const studyDays = p.studyDays.length ? p.studyDays : [1, 2, 3, 4, 5];
  const end = p.examDate && p.examDate > from ? p.examDate : addDays(from, 42);
  const remaining = LESSONS.filter((l) => !completed(state, l.id));
  const difficult = new Set(p.difficultSkills);

  // dates de travail jusqu'à l'examen (ou 6 semaines)
  const studyDates: string[] = [];
  for (let d = from; d < end; d = addDays(d, 1)) if (studyDays.includes(weekday(d))) studyDates.push(d);
  const revisionCount = p.examDate ? Math.min(studyDates.length, Math.max(2, Math.round(studyDates.length * 0.15))) : 0;
  const learningDates = studyDates.slice(0, studyDates.length - revisionCount);

  // répartition des leçons
  const assign = new Map<string, string[]>();
  let li = 0;
  learningDates.forEach((d, i) => {
    const light = i % 4 === 3;
    if (light || li >= remaining.length) return;
    const list: string[] = [];
    let minutes = 0;
    while (li < remaining.length) {
      const seen = p.seenModules.includes(remaining[li].module);
      const dur = remaining[li].duration * (remaining[li].skills.some((s) => difficult.has(s)) ? 1.3 : 1) * (seen ? 0.7 : 1);
      if (list.length && minutes + dur > goal.lessonMin * 1.3) break;
      list.push(remaining[li].id);
      minutes += dur;
      li++;
      if (minutes >= goal.lessonMin) break;
    }
    assign.set(d, list);
  });
  const lessonsLeft = remaining.length - li;
  let warning: string | null = null;
  if (p.examDate && lessonsLeft > 0)
    warning = `Avec ${goal.lessonMin} min de cours par jour, ${lessonsLeft} leçon(s) ne rentrent pas avant l’examen. Tu peux augmenter un peu le temps de cours, ajouter un jour de travail, ou garder les notions avancées pour plus tard.`;

  const reviewCount = Math.max(3, Math.round(goal.reviewMin / MIN_PER_EXERCISE));
  const practiceCount = Math.max(3, Math.round(goal.exerciseMin / MIN_PER_EXERCISE));
  const hasLearned = learnedSkills(state).length > 0 || remaining.length < LESSONS.length;

  const days: DayPlan[] = [];
  for (let k = 0; k < horizonDays; k++) {
    const date = addDays(from, k);
    if (p.examDate && date === p.examDate) {
      days.push({ date, type: 'exam', tasks: [], minutes: 0 });
      continue;
    }
    if (p.examDate && date > p.examDate) break;
    const idx = studyDates.indexOf(date);
    if (idx < 0) {
      days.push({ date, type: 'rest', tasks: [], minutes: 0 });
      continue;
    }
    const tasks: PlanTaskSnapshot[] = [];
    const isRevision = idx >= learningDates.length;
    const light = !isRevision && idx % 4 === 3;
    const lessonIds = assign.get(date) ?? [];
    if (hasLearned || k > 0)
      tasks.push({ id: `${date}:review`, kind: 'review', title: 'Révisions espacées (notions à revoir)', minutes: goal.reviewMin, count: reviewCount });
    let type: DayType = 'study';
    if (isRevision) {
      const revIdx = idx - learningDates.length;
      const examDay = revisionCount >= 2 && (revIdx === revisionCount - 2 || (revisionCount >= 5 && revIdx === 1));
      if (examDay) {
        type = 'exam-prep';
        tasks.push({ id: `${date}:exam`, kind: 'exam', title: 'Examen blanc corrigé', minutes: 30 });
      } else {
        type = 'revision';
        tasks.push({ id: `${date}:mistakes`, kind: 'mistakes', title: 'Réviser mes erreurs', minutes: Math.max(5, Math.round(goal.lessonMin / 2)), count: 5 });
        tasks.push({ id: `${date}:practice`, kind: 'practice', title: 'Exercices mélangés (tout le programme)', minutes: goal.exerciseMin + goal.lessonMin, count: practiceCount * 2 });
      }
    } else if (light) {
      type = 'light';
      tasks.push({ id: `${date}:mistakes`, kind: 'mistakes', title: 'Réviser mes erreurs (jour léger)', minutes: Math.max(5, Math.round(goal.exerciseMin * 0.6)), count: 4 });
    } else {
      for (const id of lessonIds)
        tasks.push({ id: `${date}:lesson:${id}`, kind: 'lesson', title: LESSON_BY_ID[id].title, minutes: LESSON_BY_ID[id].duration, lessonId: id });
      const skills = lessonIds.length ? [...new Set(lessonIds.flatMap((id) => LESSON_BY_ID[id].skills))] : undefined;
      if (hasLearned || lessonIds.length)
        tasks.push({
          id: `${date}:practice`,
          kind: 'practice',
          title: lessonIds.length ? 'Exercices d’application' : 'Exercices de synthèse',
          minutes: goal.exerciseMin,
          count: practiceCount,
          skills,
        });
      if (!lessonIds.length && !hasLearned) type = 'study';
    }
    days.push({ date, type, tasks, minutes: tasks.reduce((s, t) => s + t.minutes, 0) });
  }
  return { days, warning, lessonsLeft };
}

/** Plan du jour (figé une fois consulté). */
export function todaysTasks(state: AppState, date = today()): PlanTaskSnapshot[] {
  const snap = state.days[date]?.plan;
  if (snap) return snap;
  const plan = buildPlan(state, 1, date);
  const d = plan.days[0];
  if (d && d.tasks.length) return d.tasks;
  // jour de repos : séance libre et courte proposée
  const tasks: PlanTaskSnapshot[] = [];
  if (dueSkills(state, date).length)
    tasks.push({ id: `${date}:review`, kind: 'review', title: 'Révisions espacées (facultatif)', minutes: state.profile.goal.reviewMin, count: 4 });
  const next = LESSONS.find((l) => !completed(state, l.id));
  if (next) tasks.push({ id: `${date}:lesson:${next.id}`, kind: 'lesson', title: next.title, minutes: next.duration, lessonId: next.id });
  return tasks;
}

export function isRestDay(state: AppState, date = today()): boolean {
  const days = state.profile.studyDays.length ? state.profile.studyDays : [1, 2, 3, 4, 5];
  return !days.includes(weekday(date));
}

export function daysUntilExam(state: AppState, date = today()): number | null {
  return state.profile.examDate ? diffDays(state.profile.examDate, date) : null;
}
