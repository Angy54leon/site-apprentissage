import { MOLECULES, EZ_MOLECULES, RS_MOLECULES } from '../content/molecules';
import { QUESTIONS } from '../content/questions';
import { buildExercise, pickExercises, analyse, wrongNames, SKILL_KINDS } from './generate';
import { gradeExercise, matchNames, type Answer } from './grade';
import type { Exercise, ExerciseKind } from './types';
import { parseSmiles } from '../chem/smiles';
import { isSameMolecule } from '../chem/isomorphism';
import { molecularFormula, formulaToString } from '../chem/molecule';
import { gradeName } from '../chem/nomenclature/grading';
import { SKILLS } from '../content/skills';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function correctAnswer(ex: Exercise): Answer {
  switch (ex.kind) {
    case 'name':
      return { text: analyse(ex.smiles!).naming!.name };
    case 'mainChain':
      return { atoms: ex.items![0].smiles.split(',').map(Number) };
    case 'numbering':
      return { atoms: [ex.answer![0]] };
    case 'complete':
      return { blanks: ex.template!.filter((t) => t.blank).map((t) => t.blank!) };
    case 'judge':
    case 'tf':
      return { bool: ex.truth };
    case 'formula':
      return { text: formulaToString(molecularFormula(analyse(ex.smiles!).mol), false) };
    case 'countC':
    case 'implicitH':
      return { number: ex.answer![0] };
    case 'match': {
      const names = matchNames(ex);
      return { matches: ex.items!.map((it) => names.indexOf(it.name)) };
    }
    default:
      return { choice: ex.answer };
  }
}

const KINDS: ExerciseKind[] = ['name', 'structure', 'mainChain', 'numbering', 'function', 'complete', 'judge', 'findError', 'formula', 'countC', 'implicitH'];

describe('exercices générés depuis la banque', () => {
  const rng = seeded(42);
  for (const e of MOLECULES) {
    test(e.smiles, () => {
      for (const kind of KINDS) {
        const ex = buildExercise({ kind: kind as never, smiles: e.smiles }, rng);
        if (!ex) continue;
        const r = gradeExercise(ex, correctAnswer(ex));
        expect(r.status, `${kind} ${e.smiles}`).toBe('correct');
        if (kind === 'structure') {
          const mols = ex.choices!.map((c) => parseSmiles(c.smiles!));
          expect(mols.length).toBe(4);
          for (let i = 0; i < 4; i++)
            for (let j = i + 1; j < 4; j++) expect(isSameMolecule(mols[i], mols[j])).toBe(false);
          expect(isSameMolecule(mols[ex.answer![0]], analyse(e.smiles).mol)).toBe(true);
        }
      }
    });
  }
  test('les noms erronés générés sont bien jugés non conformes', () => {
    for (const e of MOLECULES) {
      const { mol, naming } = analyse(e.smiles);
      for (const w of wrongNames(naming!)) {
        const g = gradeName(w.name, mol, naming!);
        expect(g.status, `${e.smiles} ${w.name}`).not.toBe('correct');
      }
    }
  });
  test('Z/E et R/S', () => {
    for (const e of EZ_MOLECULES) {
      const ex = buildExercise({ kind: 'ez', smiles: e.smiles }, rng)!;
      expect(gradeExercise(ex, correctAnswer(ex)).status).toBe('correct');
    }
    for (const e of RS_MOLECULES) {
      for (let k = 0; k < 4; k++) {
        const ex = buildExercise({ kind: 'rs', smiles: e.smiles }, rng)!;
        expect(ex).not.toBeNull();
        expect(gradeExercise(ex, correctAnswer(ex)).status).toBe('correct');
      }
    }
  });
  test('questions rédigées cohérentes', () => {
    for (const q of QUESTIONS) {
      if (q.kind === 'mcq') {
        expect(Array.isArray(q.answer)).toBe(true);
        for (const i of q.answer as number[]) expect(i).toBeLessThan(q.choices!.length);
      } else expect(typeof q.answer).toBe('boolean');
    }
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
  });
  test('chaque notion produit des exercices', () => {
    for (const s of SKILLS) {
      const list = pickExercises({ skills: [s.id], count: 4, rng });
      expect(list.length, s.id).toBeGreaterThan(0);
      expect(SKILL_KINDS[s.id], s.id).toBeDefined();
    }
  });
});
