import { setToday, addDays } from './dates';
import { MemoryRepository, LocalStorageRepository, exportState, importState, defaultState } from './storage';
import * as store from './store';
import { applyReview, introduceSkill, dueSkills } from './srs';
import { buildPlan, todaysTasks } from './planner';
import { skillStats, readiness } from './stats';
import { buildExercise } from '../exercises/generate';
import { gradeExercise } from '../exercises/grade';
import { LESSONS } from '../content/lessons';

beforeEach(() => {
  setToday('2026-10-12'); // lundi
  store.setRepository(new MemoryRepository());
  store.resetAll();
  store.initStore();
});

describe('répétition espacée', () => {
  test('boîtes de Leitner', () => {
    const skills = {};
    introduceSkill(skills, 'ene', '2026-10-12');
    const s = (skills as Record<string, ReturnType<typeof applyReview>>).ene;
    expect(s.box).toBe(1);
    expect(s.due).toBe('2026-10-13');
    const up = applyReview(s, 0.9, '2026-10-13');
    expect(up.box).toBe(2);
    expect(up.due).toBe('2026-10-15');
    const down = applyReview({ ...up, box: 4 }, 0.3, '2026-10-15');
    expect(down.box).toBe(1);
    expect(down.due).toBe('2026-10-16');
  });
  test('une erreur fait revenir la notion le lendemain', () => {
    store.recordReview({ ene: 1 });
    store.recordReview({ ene: 1 });
    expect(store.getState().skills.ene.box).toBeGreaterThan(2);
    const ex = buildExercise({ kind: 'name', smiles: 'CC=CC' })!;
    store.recordAttempt(ex, gradeExercise(ex, { text: 'butane' }), { context: 'practice' });
    expect(store.getState().skills.ene.due).toBe('2026-10-13');
    setToday('2026-10-13');
    expect(dueSkills(store.getState(), '2026-10-13')).toContain('ene');
  });
});

describe('maîtrise et carnet d’erreurs', () => {
  test('une seule bonne réponse ne suffit pas pour « maîtrisée »', () => {
    const ex = buildExercise({ kind: 'name', smiles: 'CCCC' })!;
    store.recordAttempt(ex, gradeExercise(ex, { text: 'butane' }), { context: 'practice' });
    expect(skillStats(store.getState(), 'alc-racines').status).not.toBe('maitrisee');
  });
  test('erreur enregistrée puis résolue après deux réussites', () => {
    const ex = buildExercise({ kind: 'name', smiles: 'CCC(C)C' })!;
    store.recordAttempt(ex, gradeExercise(ex, { text: '3-méthylbutane' }), { context: 'practice' });
    const m = store.getState().mistakes[ex.key];
    expect(m.count).toBe(1);
    expect(m.errorCodes).toContain('numbering');
    store.recordAttempt(ex, gradeExercise(ex, { text: '2-méthylbutane' }), { context: 'mistakes' });
    expect(store.getState().mistakes[ex.key].resolved).toBe(false);
    store.recordAttempt(ex, gradeExercise(ex, { text: '2-méthylbutane' }), { context: 'mistakes' });
    expect(store.getState().mistakes[ex.key].resolved).toBe(true);
  });
});

describe('leçons et planning', () => {
  test('valider une leçon introduit ses notions', () => {
    store.recordLessonQuiz('m1-racines', 0.8);
    const st = store.getState();
    expect(st.lessons['m1-racines'].status).toBe('completed');
    expect(st.skills['alc-racines'].due).toBe('2026-10-13');
  });
  test('quiz raté : leçon non validée', () => {
    store.recordLessonQuiz('m1-racines', 0.5);
    expect(store.getState().lessons['m1-racines'].status).toBe('in-progress');
  });
  test('le planning avance avec la progression', () => {
    store.updateProfile({ examDate: addDays('2026-10-12', 30), studyDays: [1, 2, 3, 4, 5] });
    const before = buildPlan(store.getState(), 7);
    const firstLesson = before.days.flatMap((d) => d.tasks).find((t) => t.kind === 'lesson')!;
    expect(firstLesson.lessonId).toBe(LESSONS[0].id);
    store.recordLessonQuiz(LESSONS[0].id, 1);
    const after = buildPlan(store.getState(), 7);
    expect(after.days.flatMap((d) => d.tasks).find((t) => t.kind === 'lesson')!.lessonId).toBe(LESSONS[1].id);
    expect(after.days.some((d) => d.type === 'rest')).toBe(true);
  });
  test('séance terminée quand toutes les tâches sont faites', () => {
    const tasks = todaysTasks(store.getState());
    store.snapshotTodayPlan(tasks);
    for (const t of tasks) store.markTaskDone(t.id);
    const st = store.getState();
    expect(st.days['2026-10-12'].sessionDone).toBe(true);
    expect(st.sessionsCompleted).toBe(1);
  });
  test('une séance comptée par jour', () => {
    for (let i = 0; i < 5; i++) {
      setToday(addDays('2026-10-12', i));
      const tasks = todaysTasks(store.getState());
      store.snapshotTodayPlan(tasks.length ? tasks : [{ id: 'x' + i, kind: 'practice', title: 'x', minutes: 1 }]);
      for (const t of store.getState().days[addDays('2026-10-12', i)].plan!) store.markTaskDone(t.id);
    }
    expect(store.getState().sessionsCompleted).toBe(5);
  });
  test('indicateur de préparation à 0 sans activité', () => {
    expect(readiness(store.getState()).value).toBe(0);
  });
});

describe('sauvegarde et messages', () => {
  test('export puis import restaurent la progression', () => {
    store.recordLessonQuiz('m1-racines', 1);
    const txt = store.exportData();
    store.resetAll();
    expect(store.getState().lessons['m1-racines']).toBeUndefined();
    store.importData(txt);
    expect(store.getState().lessons['m1-racines'].status).toBe('completed');
  });
  test('import refuse un fichier étranger', () => {
    expect(() => importState('{"foo": 1}')).toThrow();
    expect(importState(exportState(defaultState())).version).toBe(1);
  });
  test('reprise d’une ancienne sauvegarde (ancienne clé, champs décoratifs ignorés)', () => {
    const mem = new Map<string, string>();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    } as Storage;
    const old = { ...defaultState(), love: { badges: { x: '2026-01-01' } }, prefs: { animations: true, theme: 'rose', dark: true }, lessons: { 'm1-racines': { status: 'completed', step: 7 } } };
    mem.set('julies-chemistry-love:v1', JSON.stringify(old));
    const loaded = new LocalStorageRepository().load()!;
    expect(loaded.lessons['m1-racines'].status).toBe('completed');
    expect('love' in loaded).toBe(false);
    expect(loaded.prefs).toEqual({ focusMode: false, dark: true });
});
});
