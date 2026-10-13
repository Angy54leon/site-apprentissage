// Correction de chaque type d'exercice.
import { gradeName, gradeFormula, ERROR_INFO, type ErrorCode } from '../chem/nomenclature/grading';
import { toSmiles } from '../chem/smiles';
import { analyse } from './generate';
import type { Exercise, ExerciseResult } from './types';

export interface Answer {
  text?: string;
  choice?: number[];
  atoms?: number[];
  bool?: boolean;
  blanks?: string[];
  number?: number;
  /** Pour « match » : index du nom choisi pour chaque structure. */
  matches?: number[];
}

const sameSet = (a: number[], b: number[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join();

function choiceResult(ex: Exercise, ans: Answer, okText = 'Bonne réponse !'): ExerciseResult {
  const chosen = ans.choice ?? [];
  const expected = (ex.answer ?? []).map((i) => ex.choices?.[i]?.label ?? '').join(' ; ');
  const user = chosen.map((i) => ex.choices?.[i]?.label ?? '').join(' ; ');
  const ok = sameSet(chosen, ex.answer ?? []);
  let status: ExerciseResult['status'] = ok ? 'correct' : 'incorrect';
  if (!ok && ex.multi) {
    const good = chosen.filter((c) => ex.answer!.includes(c)).length;
    if (good > 0 && good >= chosen.length - 1) status = 'partial';
  }
  return {
    status,
    userAnswer: user,
    expected,
    errorCodes: [],
    headline: ok ? okText : status === 'partial' ? 'Presque : une partie de ta sélection est juste' : 'Ce n’est pas la bonne réponse',
    details: ex.explanation ? [ex.explanation] : [],
  };
}

export function gradeExercise(ex: Exercise, ans: Answer): ExerciseResult {
  switch (ex.kind) {
    case 'name': {
      const { mol, naming } = analyse(ex.smiles!);
      const g = gradeName(ans.text ?? '', mol, naming ?? undefined);
      return {
        status: g.status,
        userAnswer: ans.text ?? '',
        expected: g.expected,
        errorCodes: g.errorCodes,
        headline: g.headline,
        details: g.details,
        userSmiles: g.userMolecule ? toSmiles(g.userMolecule) : undefined,
      };
    }
    case 'structure':
    case 'function':
    case 'ez':
    case 'rs':
    case 'mcq': {
      const r = choiceResult(ex, ans);
      if (ex.kind === 'structure') r.expected = ex.name ?? '';
      if (ex.kind === 'structure' && r.status !== 'correct')
        r.details = ['Compare la longueur de la chaîne, la position des substituants et des liaisons multiples avec les indices du nom.'];
      if (ex.kind === 'function' && r.status !== 'correct') r.errorCodes = ['function'];
      return r;
    }
    case 'findError': {
      const r = choiceResult(ex, ans);
      const { naming } = analyse(ex.smiles!);
      r.details = [
        `Le nom correct est : ${naming?.name}.`,
        ex.explanation ?? '',
      ].filter(Boolean);
      if (r.status !== 'correct' && ex.wrongCode) r.errorCodes = [ex.wrongCode];
      return r;
    }
    case 'judge':
    case 'tf': {
      const ok = ans.bool === ex.truth;
      const details: string[] = [];
      if (ex.kind === 'judge') {
        const { naming } = analyse(ex.smiles!);
        if (ex.truth) details.push(`Oui : « ${ex.proposed} » est le nom correct.`);
        else {
          details.push(`Non : le nom correct est « ${naming?.name} ».`);
          if (ex.wrongCode) details.push(`${ERROR_INFO[ex.wrongCode].label} — ${ERROR_INFO[ex.wrongCode].rule}`);
        }
      } else if (ex.explanation) details.push(ex.explanation);
      const codes: ErrorCode[] = !ok && ex.wrongCode ? [ex.wrongCode] : [];
      return {
        status: ok ? 'correct' : 'incorrect',
        userAnswer: ans.bool === undefined ? '' : ans.bool ? 'Vrai' : 'Faux',
        expected: ex.truth ? 'Vrai' : 'Faux',
        errorCodes: codes,
        headline: ok ? 'Bonne réponse !' : 'Ce n’est pas la bonne réponse',
        details,
      };
    }
    case 'mainChain': {
      const valid = (ex.items ?? []).map((it) => it.smiles.split(',').map(Number));
      const sel = ans.atoms ?? [];
      const ok = valid.some((v) => sameSet(v, sel));
      const best = valid[0] ?? [];
      const L = best.length;
      let details: string[] = [];
      let status: ExerciseResult['status'] = ok ? 'correct' : 'incorrect';
      if (!ok) {
        if (sel.length < L) details = [`Ta sélection compte ${sel.length} carbone(s) : la chaîne principale en compte ${L}. Cherche une chaîne plus longue, qui peut passer par une ramification.`];
        else if (sel.length > L) details = [`Ta sélection compte ${sel.length} carbones, mais une chaîne ne se « divise » pas : elle va d’une extrémité à l’autre sans embranchement (${L} carbones ici).`];
        else {
          details = ['Ta chaîne a la bonne longueur, mais ce n’est pas celle à retenir (fonction principale, liaisons multiples ou nombre de substituants).'];
          status = 'partial';
        }
      }
      return {
        status,
        userAnswer: `${sel.length} atome(s) sélectionné(s)`,
        expected: `${L} carbones (surlignés dans la correction)`,
        errorCodes: ok ? [] : ['chain-length'],
        headline: ok ? 'Bonne chaîne principale !' : status === 'partial' ? 'Presque !' : 'Ce n’est pas la chaîne principale',
        details,
      };
    }
    case 'numbering': {
      const ok = !!ans.atoms?.length && (ex.answer ?? []).includes(ans.atoms[0]);
      const { naming } = analyse(ex.smiles!);
      return {
        status: ok ? 'correct' : 'incorrect',
        userAnswer: ans.atoms?.length ? 'carbone sélectionné' : '',
        expected: 'le carbone n°1 indiqué dans la correction',
        errorCodes: ok ? [] : ['numbering'],
        headline: ok ? 'Bon sens de numérotation !' : 'Ce n’est pas le carbone n°1',
        details: [naming?.steps.find((s) => s.title === 'Numéroter')?.text ?? '', `Nom : ${naming?.name}`].filter(Boolean),
      };
    }
    case 'complete': {
      const blanks = (ex.template ?? []).filter((t) => t.blank !== undefined).map((t) => t.blank!);
      const given = ans.blanks ?? [];
      const norm = (s: string) => s.replace(/\s/g, '').replace(/[;.]/g, ',');
      const good = blanks.filter((b, i) => norm(given[i] ?? '') === b).length;
      const ok = good === blanks.length;
      const { naming } = analyse(ex.smiles!);
      return {
        status: ok ? 'correct' : good > 0 ? 'partial' : 'incorrect',
        userAnswer: given.join(' | '),
        expected: naming?.name ?? '',
        errorCodes: ok ? [] : ['numbering'],
        headline: ok ? 'Indices corrects !' : `${good}/${blanks.length} indice(s) correct(s)`,
        details: ok ? [] : [naming?.steps.find((s) => s.title === 'Numéroter')?.text ?? ''],
      };
    }
    case 'formula': {
      const { mol } = analyse(ex.smiles!);
      const g = gradeFormula(ans.text ?? '', mol);
      return {
        status: g.status,
        userAnswer: ans.text ?? '',
        expected: g.expected,
        errorCodes: g.status === 'correct' ? [] : ['carbon-count'],
        headline: g.status === 'correct' ? 'Formule brute correcte !' : g.status === 'partial' ? 'Presque !' : g.status === 'unknown' ? 'Formule non reconnue' : 'Formule incorrecte',
        details: g.status === 'correct' ? [] : [g.message],
      };
    }
    case 'countC':
    case 'implicitH': {
      const ok = ans.number === ex.answer?.[0];
      return {
        status: ok ? 'correct' : 'incorrect',
        userAnswer: ans.number === undefined ? '' : String(ans.number),
        expected: String(ex.answer?.[0]),
        errorCodes: ok ? [] : [ex.kind === 'countC' ? 'carbon-count' : 'impossible'],
        headline: ok ? 'Bonne réponse !' : 'Ce n’est pas le bon nombre',
        details: ok
          ? []
          : ex.kind === 'countC'
            ? ['Compte chaque sommet et chaque extrémité de trait (sauf si un autre atome y est écrit). Les carbones apparaissent numérotés dans la correction.']
            : ['Le carbone forme 4 liaisons : nombre de H = 4 − (nombre de liaisons dessinées, une double comptant pour 2).'],
      };
    }
    case 'match': {
      const items = ex.items ?? [];
      const names = [...items.map((i) => i.name)].sort();
      const m = ans.matches ?? [];
      const good = items.filter((it, i) => names[m[i]] === it.name).length;
      const ok = good === items.length;
      return {
        status: ok ? 'correct' : good > 0 ? 'partial' : 'incorrect',
        userAnswer: `${good}/${items.length} associations correctes`,
        expected: items.map((it) => it.name).join(' ; '),
        errorCodes: ok ? [] : ['wrong-molecule'],
        headline: ok ? 'Toutes les associations sont correctes !' : `${good}/${items.length} associations correctes`,
        details: [],
      };
    }
  }
  return { status: 'unknown', userAnswer: '', expected: '', errorCodes: [], headline: '', details: [] };
}

/** Noms triés proposés dans l'exercice « relier ». */
export function matchNames(ex: Exercise): string[] {
  return [...(ex.items ?? []).map((i) => i.name)].sort();
}
