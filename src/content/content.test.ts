import { LESSONS } from './lessons';
import { QUESTION_BY_ID } from './questions';
import { GLOSSARY } from './glossary';
import { ERROR_INFO } from '../chem/nomenclature/grading';
import { buildExercise, analyse } from '../exercises/generate';
import { SKILL_BY_ID } from './skills';
import { CHAPTERS } from './chapters';

describe('contenu des leçons', () => {
  test('chaque leçon appartient à exactement un chapitre', () => {
    const ids = CHAPTERS.flatMap((c) => c.lessons);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(LESSONS.length);
    for (const l of LESSONS) expect(l, 'leçon manquante').toBeDefined();
    for (const c of CHAPTERS) for (const p of c.prerequisites) expect(CHAPTERS.some((x) => x.id === p)).toBe(true);
  });
  test('identifiants uniques', () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
  });
  for (const l of LESSONS) {
    test(l.id, () => {
      for (const s of l.skills) expect(SKILL_BY_ID[s], s).toBeDefined();
      const specs = [...l.guided, ...l.autonomous, ...l.quiz];
      expect(l.quiz.length).toBeGreaterThanOrEqual(3);
      for (const spec of specs) {
        if (spec.kind === 'q') expect(QUESTION_BY_ID[spec.id], spec.id).toBeDefined();
        const ex = buildExercise(spec);
        expect(ex, JSON.stringify(spec)).not.toBeNull();
      }
      const smilesList = [
        ...l.examples.map((e) => e.smiles),
        ...(l.worked.smiles ? [l.worked.smiles] : []),
        ...l.explanation.flatMap((b) => (b.t === 'mol' ? [b.smiles] : [])),
      ];
      for (const s of smilesList) analyse(s); // SMILES valides
      // un exemple résolu sans étapes rédigées doit être nommable par le moteur
      if (l.worked.smiles && !l.worked.steps) expect(analyse(l.worked.smiles).naming, l.worked.smiles).not.toBeNull();
      for (const e of l.examples) if (!e.comment) expect(analyse(e.smiles).naming, e.smiles).not.toBeNull();
      if (l.mistake.smiles) expect(analyse(l.mistake.smiles).naming!.name).toBe(l.mistake.right);
    });
  }
  test('les règles des erreurs renvoient vers des leçons existantes', () => {
    const ids = new Set(LESSONS.map((l) => l.id));
    for (const [code, info] of Object.entries(ERROR_INFO)) expect(ids.has(info.lesson), code).toBe(true);
    for (const g of GLOSSARY) if (g.lesson) expect(ids.has(g.lesson), g.term).toBe(true);
  });
});
