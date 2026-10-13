// Affichage d'un exercice : consigne, réponse, vérification, correction détaillée.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Exercise, ExerciseResult } from '../../exercises/types';
import { KIND_LABEL } from '../../exercises/types';
import { gradeExercise, matchNames, type Answer } from '../../exercises/grade';
import { analyse } from '../../exercises/generate';
import { ERROR_INFO } from '../../chem/nomenclature/grading';
import { LESSON_BY_ID } from '../../content/lessons';
import { UNLOCK } from '../../config/love';
import { MoleculeView, type MolMode } from '../MoleculeView';
import { ModeSwitch, MoleculeExplorer } from '../MoleculeCard';
import { Button, Pill, Rich, cx } from '../kit';
import { burst } from '../love';
import { pickMessage } from '../../state/store';
import { Link } from 'react-router-dom';

export interface SubmitMeta {
  hintsUsed: number;
  retry: boolean;
  durationMs: number;
}

interface Props {
  ex: Exercise;
  /** « exam » : pas de correction immédiate. */
  mode?: 'learn' | 'exam';
  onSubmit: (res: ExerciseResult, meta: SubmitMeta) => void;
  onNext?: () => void;
  onSimilar?: () => void;
  nextLabel?: string;
  /** Pas d'indices (exercices autonomes, examen). */
  noHints?: boolean;
  /** Temps écoulé (mode chronométré) : la réponse est envoyée telle quelle. */
  timeUp?: boolean;
}

const STATUS_STYLE = {
  correct: 'bg-ok-soft border-ok/30',
  partial: 'bg-warn-soft border-warn/30',
  incorrect: 'bg-bad-soft border-bad/30',
  unknown: 'bg-info-soft border-info/30',
};
const STATUS_ICON = { correct: '✓', partial: '≈', incorrect: '✗', unknown: '?' };

export function ExerciseView({ ex, mode = 'learn', onSubmit, onNext, onSimilar, nextLabel = 'Continuer', noHints, timeUp }: Props) {
  const [answer, setAnswer] = useState<Answer>({});
  const [result, setResult] = useState<ExerciseResult | null>(null);
  const [hints, setHints] = useState(0);
  const [tries, setTries] = useState(0);
  const [loveMsg, setLoveMsg] = useState<string | null>(null);
  const [selfAssessed, setSelfAssessed] = useState(false);
  const [molMode, setMolMode] = useState<MolMode>('topo');
  const started = useRef(Date.now());

  useEffect(() => {
    setAnswer({});
    setResult(null);
    setHints(0);
    setTries(0);
    setLoveMsg(null);
    setSelfAssessed(false);
    setMolMode('topo');
    started.current = Date.now();
  }, [ex.uid]);

  const ready = useMemo(() => {
    switch (ex.kind) {
      case 'name':
      case 'formula':
        return !!answer.text?.trim();
      case 'mainChain':
      case 'numbering':
        return !!answer.atoms?.length;
      case 'complete':
        return (answer.blanks ?? []).filter((b) => b?.trim()).length === (ex.template ?? []).filter((t) => t.blank).length;
      case 'judge':
      case 'tf':
        return answer.bool !== undefined;
      case 'countC':
      case 'implicitH':
        return answer.number !== undefined && !Number.isNaN(answer.number);
      case 'match':
        return (answer.matches ?? []).filter((m) => m !== undefined && m >= 0).length === (ex.items ?? []).length;
      default:
        return !!answer.choice?.length;
    }
  }, [answer, ex]);

  const submit = (forced = false) => {
    if (!ready && !forced) return;
    const res = gradeExercise(ex, answer);
    const meta = { hintsUsed: hints, retry: tries > 0, durationMs: Date.now() - started.current };
    if (mode === 'exam') {
      onSubmit(res, meta);
      return;
    }
    setResult(res);
    setTries((t) => t + 1);
    if (res.status !== 'unknown') onSubmit(res, meta);
    if (res.status === 'correct') {
      if (Math.random() < UNLOCK.bravoProbability || tries > 0) {
        setLoveMsg(pickMessage('correct'));
        burst('hearts');
      } else setLoveMsg(null);
    } else if (res.status === 'incorrect') setLoveMsg(pickMessage('wrong'));
    else if (res.status === 'partial') setLoveMsg(pickMessage('partial'));
  };

  useEffect(() => {
    if (timeUp && !result) submit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  const retry = () => {
    setResult(null);
    setAnswer({});
    setLoveMsg(null);
    started.current = Date.now();
  };

  const selfAssess = (ok: boolean) => {
    if (!result) return;
    const res: ExerciseResult = { ...result, status: ok ? 'correct' : 'incorrect', headline: ok ? 'Noté comme réussi (auto-évaluation)' : 'Noté comme à revoir' };
    setResult(res);
    setSelfAssessed(true);
    onSubmit(res, { hintsUsed: hints, retry: tries > 1, durationMs: Date.now() - started.current });
  };

  const done = !!result && (result.status !== 'unknown' || selfAssessed);
  const locked = !!result;
  const showMolecule = !!ex.smiles && !['structure'].includes(ex.kind) && !(ex.kind === 'formula' && ex.fromName) && !(ex.kind === 'mcq' && !ex.smiles);
  const canSwitch = ex.kind === 'name' || ex.kind === 'formula' || ex.kind === 'function' || ex.kind === 'mcq' || ex.kind === 'tf';
  const cyclic = !!ex.smiles && /\d/.test(ex.smiles);
  const corrShow = result && mode === 'learn';

  // options d'affichage de la molécule selon le type et l'état
  const molShow = (() => {
    if (ex.kind === 'numbering') return corrShow ? ['chain', 'numbers'] : ['chain'];
    if (ex.kind === 'countC') return corrShow ? ['carbons'] : [];
    if (ex.kind === 'implicitH') return corrShow ? ['hydrogens'] : [];
    if (corrShow && (ex.kind === 'name' || ex.kind === 'complete' || ex.kind === 'judge' || ex.kind === 'findError')) return ['chain', 'numbers', 'subs', 'groups'];
    if (corrShow && ex.kind === 'function') return ['groups'];
    return [];
  })() as ('chain' | 'numbers' | 'subs' | 'groups' | 'carbons' | 'hydrogens')[];

  const goodAtoms = corrShow && ex.kind === 'mainChain' ? ex.items?.[0]?.smiles.split(',').map(Number) : corrShow && ex.kind === 'numbering' ? ex.answer : undefined;

  return (
    <div className="anim-fade">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Pill tone="brand">{KIND_LABEL[ex.kind]}</Pill>
        <Pill>Niveau {['', 'débutant', 'facile', 'intermédiaire', 'difficile', 'examen'][ex.level] ?? ex.level}</Pill>
      </div>
      <h2 className="text-lg sm:text-xl font-extrabold mb-3">
        <Rich text={ex.prompt} />
      </h2>

      {showMolecule && (
        <div className="rounded-2xl bg-surface border border-line p-3 mb-3">
          {canSwitch && !cyclic && (
            <div className="mb-2">
              <ModeSwitch mode={molMode} setMode={setMolMode} />
            </div>
          )}
          <MoleculeView
            smiles={ex.smiles}
            mode={canSwitch ? molMode : 'topo'}
            show={molShow}
            size="lg"
            selectable={(ex.kind === 'mainChain' || ex.kind === 'numbering') && !locked}
            selected={ex.kind === 'mainChain' || ex.kind === 'numbering' ? answer.atoms ?? [] : []}
            onAtomClick={(i) => {
              const { mol } = analyse(ex.smiles!);
              if (mol.atoms[i].el !== 'C') return;
              if (ex.kind === 'numbering') setAnswer({ atoms: [i] });
              else setAnswer((a) => ({ atoms: a.atoms?.includes(i) ? a.atoms.filter((x) => x !== i) : [...(a.atoms ?? []), i] }));
            }}
            marked={ex.kind === 'implicitH' || ex.kind === 'rs' ? [ex.atom!] : []}
            goodAtoms={goodAtoms}
            coords={ex.coords}
            asWritten={ex.kind === 'mainChain' || ex.skills.includes('alc-chaine')}
            stereo={ex.stereo?.bond !== undefined ? { bond: ex.stereo.bond, type: ex.stereo.type } : undefined}
          />
          {ex.kind === 'mainChain' && !locked && (
            <p className="text-xs text-ink-2 text-center mt-1">Clique sur les carbones (sommets) pour les sélectionner ; clique à nouveau pour désélectionner.</p>
          )}
        </div>
      )}
      {ex.kind === 'formula' && ex.fromName && <p className="mb-3 text-lg font-bold">« {ex.name} »</p>}
      {ex.proposed && ex.kind === 'findError' && <p className="mb-3 rounded-xl bg-surface-2 border border-line p-3 text-lg font-bold text-center">« {ex.proposed} »</p>}

      <AnswerInput ex={ex} answer={answer} setAnswer={setAnswer} locked={locked} result={corrShow ? result : null} onEnter={() => submit()} />

      {/* indices */}
      {mode === 'learn' && !noHints && !locked && ex.hints.length > 0 && (
        <div className="mt-3">
          {ex.hints.slice(0, hints).map((h, i) => (
            <p key={i} className="text-sm rounded-xl bg-info-soft text-info px-3 py-2 mb-1.5">
              💡 <Rich text={h} />
            </p>
          ))}
          {hints < ex.hints.length && (
            <Button variant="ghost" size="sm" onClick={() => setHints((h) => h + 1)}>
              💡 {hints === 0 ? 'Un indice' : 'Un autre indice'} ({ex.hints.length - hints} restant{ex.hints.length - hints > 1 ? 's' : ''})
            </Button>
          )}
        </div>
      )}

      {!locked && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => submit()} disabled={!ready} size="lg">
            {mode === 'exam' ? 'Valider et continuer' : 'Vérifier'}
          </Button>
          {mode === 'exam' && (
            <Button variant="ghost" onClick={() => submit(true)}>
              Passer
            </Button>
          )}
        </div>
      )}

      {result && mode === 'learn' && (
        <Feedback
          ex={ex}
          result={result}
          loveMsg={loveMsg}
          done={done}
          onSelfAssess={selfAssess}
          onRetry={result.status !== 'correct' ? retry : undefined}
          onSimilar={result.status !== 'correct' ? onSimilar : undefined}
          onNext={done ? onNext : undefined}
          nextLabel={nextLabel}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

const CHARS = ['é', 'è', 'ï', '-', ',', '’', '(', ')'];

function AnswerInput({ ex, answer, setAnswer, locked, result, onEnter }: { ex: Exercise; answer: Answer; setAnswer: (a: Answer) => void; locked: boolean; result: ExerciseResult | null; onEnter: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const insert = (c: string) => {
    const el = inputRef.current;
    const v = answer.text ?? '';
    const s = el?.selectionStart ?? v.length;
    const e = el?.selectionEnd ?? v.length;
    const nv = v.slice(0, s) + c + v.slice(e);
    setAnswer({ text: nv });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(s + c.length, s + c.length);
    });
  };
  const choiceBtn = (i: number, label: string, multi = false) => {
    const chosen = answer.choice?.includes(i);
    const isAnswer = result && ex.answer?.includes(i);
    const wrongPick = result && chosen && !ex.answer?.includes(i);
    return (
      <button
        key={i}
        type="button"
        disabled={locked}
        onClick={() => {
          if (multi) setAnswer({ choice: chosen ? answer.choice!.filter((x) => x !== i) : [...(answer.choice ?? []), i] });
          else setAnswer({ choice: [i] });
        }}
        className={cx(
          'text-left rounded-2xl border-2 px-4 py-3 font-semibold transition',
          isAnswer ? 'border-ok bg-ok-soft' : wrongPick ? 'border-bad bg-bad-soft' : chosen ? 'border-brand bg-brand-soft/30' : 'border-line bg-surface hover:border-brand-2',
        )}
        aria-pressed={chosen}
      >
        {multi && <span className="mr-2">{chosen ? '☑' : '☐'}</span>}
        {label}
      </button>
    );
  };

  switch (ex.kind) {
    case 'name':
    case 'formula':
      return (
        <div>
          <input
            ref={inputRef}
            value={answer.text ?? ''}
            onChange={(e) => setAnswer({ text: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && onEnter()}
            disabled={locked}
            placeholder={ex.kind === 'name' ? 'Écris le nom ici…' : 'Exemple : C4H10'}
            className="w-full rounded-2xl border-2 border-line bg-surface px-4 py-3 text-lg font-semibold focus:border-brand-2 outline-none"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-label="Ta réponse"
          />
          {ex.kind === 'name' && !locked && (
            <div className="flex flex-wrap gap-1.5 mt-2" aria-label="Caractères spéciaux">
              {CHARS.map((c) => (
                <button key={c} type="button" onClick={() => insert(c)} className="min-w-9 rounded-lg border border-line bg-surface-2 px-2 py-1 font-bold hover:border-brand-2">
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    case 'countC':
    case 'implicitH':
      return (
        <input
          type="number"
          min={0}
          value={answer.number ?? ''}
          onChange={(e) => setAnswer({ number: e.target.value === '' ? undefined : Number(e.target.value) })}
          onKeyDown={(e) => e.key === 'Enter' && onEnter()}
          disabled={locked}
          className="w-32 rounded-2xl border-2 border-line bg-surface px-4 py-3 text-xl font-bold focus:border-brand-2 outline-none"
          aria-label="Ta réponse (nombre)"
        />
      );
    case 'complete': {
      let bi = -1;
      return (
        <div className="flex flex-wrap items-center gap-1 text-lg font-bold rounded-2xl bg-surface-2 border border-line p-3">
          {(ex.template ?? []).map((t, i) => {
            if (t.text !== undefined) return <span key={i}>{t.text}</span>;
            bi++;
            const k = bi;
            const val = answer.blanks?.[k] ?? '';
            const ok = result ? val.replace(/\s/g, '') === t.blank : null;
            return (
              <input
                key={i}
                value={val}
                disabled={locked}
                onChange={(e) => {
                  const b = [...(answer.blanks ?? [])];
                  b[k] = e.target.value;
                  setAnswer({ blanks: b });
                }}
                onKeyDown={(e) => e.key === 'Enter' && onEnter()}
                className={cx('w-16 rounded-lg border-2 bg-surface px-2 py-1 text-center', ok === null ? 'border-brand-2' : ok ? 'border-ok' : 'border-bad')}
                aria-label={`Indice ${k + 1}`}
                inputMode="numeric"
              />
            );
          })}
        </div>
      );
    }
    case 'judge':
    case 'tf':
      return (
        <div className="flex gap-2">
          {[true, false].map((b) => {
            const chosen = answer.bool === b;
            const isAnswer = result && ex.truth === b;
            return (
              <button
                key={String(b)}
                type="button"
                disabled={locked}
                onClick={() => setAnswer({ bool: b })}
                className={cx('flex-1 rounded-2xl border-2 px-4 py-3 font-extrabold', isAnswer ? 'border-ok bg-ok-soft' : chosen ? 'border-brand bg-brand-soft/30' : 'border-line bg-surface hover:border-brand-2')}
                aria-pressed={chosen}
              >
                {ex.kind === 'judge' ? (b ? 'Oui, il est correct' : 'Non, il est faux') : b ? 'Vrai' : 'Faux'}
              </button>
            );
          })}
        </div>
      );
    case 'structure':
      return (
        <div className="grid grid-cols-2 gap-2">
          {(ex.choices ?? []).map((c, i) => {
            const chosen = answer.choice?.includes(i);
            const isAnswer = result && ex.answer?.includes(i);
            const wrongPick = result && chosen && !isAnswer;
            return (
              <button
                key={i}
                type="button"
                disabled={locked}
                onClick={() => setAnswer({ choice: [i] })}
                className={cx('rounded-2xl border-2 p-2 bg-surface', isAnswer ? 'border-ok bg-ok-soft' : wrongPick ? 'border-bad' : chosen ? 'border-brand' : 'border-line hover:border-brand-2')}
                aria-pressed={chosen}
                aria-label={c.label}
              >
                <div className="text-xs font-bold text-ink-3 text-left">{'ABCD'[i]}</div>
                <MoleculeView smiles={c.smiles} size="sm" naming={null} />
                {result && (
                  <div className="text-xs text-ink-2 mt-1">{analyse(c.smiles!).naming?.name}</div>
                )}
              </button>
            );
          })}
        </div>
      );
    case 'match': {
      const names = matchNames(ex);
      return (
        <div className="grid sm:grid-cols-2 gap-2">
          {(ex.items ?? []).map((it, i) => {
            const v = answer.matches?.[i] ?? -1;
            const ok = result ? names[v] === it.name : null;
            return (
              <div key={i} className={cx('rounded-2xl border-2 p-2 bg-surface', ok === null ? 'border-line' : ok ? 'border-ok' : 'border-bad')}>
                <MoleculeView smiles={it.smiles} size="sm" naming={null} />
                <select
                  value={v}
                  disabled={locked}
                  onChange={(e) => {
                    const m = [...(answer.matches ?? Array(ex.items!.length).fill(-1))];
                    m[i] = Number(e.target.value);
                    setAnswer({ matches: m });
                  }}
                  className="mt-1 w-full rounded-xl border border-line bg-surface-2 px-2 py-2 font-semibold"
                  aria-label={`Nom de la structure ${i + 1}`}
                >
                  <option value={-1}>— choisir un nom —</option>
                  {names.map((n, k) => (
                    <option key={n} value={k}>
                      {n}
                    </option>
                  ))}
                </select>
                {result && !ok && <div className="text-xs text-ok font-bold mt-1">→ {it.name}</div>}
              </div>
            );
          })}
        </div>
      );
    }
    case 'mainChain':
    case 'numbering':
      return null;
    default:
      return <div className={cx('grid gap-2', (ex.choices?.length ?? 0) > 3 ? 'sm:grid-cols-2' : '')}>{(ex.choices ?? []).map((c, i) => choiceBtn(i, c.label, ex.multi))}</div>;
  }
}

// ---------------------------------------------------------------------------

function Feedback({
  ex,
  result,
  loveMsg,
  done,
  onSelfAssess,
  onRetry,
  onSimilar,
  onNext,
  nextLabel,
}: {
  ex: Exercise;
  result: ExerciseResult;
  loveMsg: string | null;
  done: boolean;
  onSelfAssess: (ok: boolean) => void;
  onRetry?: () => void;
  onSimilar?: () => void;
  onNext?: () => void;
  nextLabel: string;
}) {
  const [method, setMethod] = useState(false);
  const naming = ex.smiles ? analyse(ex.smiles).naming : null;
  const nameKinds = ['name', 'complete', 'judge', 'findError', 'mainChain', 'numbering', 'structure'];
  const lessons = [...new Set(result.errorCodes.map((c) => ERROR_INFO[c]?.lesson).filter(Boolean))];
  return (
    <div className={cx('mt-4 rounded-2xl border p-4 anim-pop', STATUS_STYLE[result.status])} role="status" aria-live="polite">
      {loveMsg && <p className="decor font-hand text-xl text-brand mb-1">{loveMsg}</p>}
      <div className="flex items-start gap-2">
        <span className="text-2xl font-black leading-none mt-0.5">{STATUS_ICON[result.status]}</span>
        <div className="flex-1">
          <p className="font-extrabold text-lg">{result.headline}</p>
          {result.status !== 'correct' && result.expected && (
            <p className="mt-1">
              Réponse attendue : <strong className="text-ink">{result.expected}</strong>
            </p>
          )}
          {result.status === 'correct' && ex.kind === 'name' && naming && (
            <p className="mt-1 text-sm text-ink-2">
              Nom : <strong className="text-ink">{naming.name}</strong>
            </p>
          )}
          {result.details.filter(Boolean).length > 0 && (
            <ul className="mt-2 text-sm list-disc pl-5 space-y-1">
              {result.details.filter(Boolean).map((d, i) => (
                <li key={i}>
                  <Rich text={d} />
                </li>
              ))}
            </ul>
          )}
          {result.errorCodes.filter((c) => c !== 'accents' && c !== 'empty').length > 0 && (
            <div className="mt-2 space-y-1">
              {result.errorCodes
                .filter((c) => c !== 'accents' && c !== 'empty')
                .map((c) => (
                  <p key={c} className="text-sm rounded-xl bg-surface/70 border border-line px-3 py-2">
                    <strong>Règle : {ERROR_INFO[c].label}.</strong> {ERROR_INFO[c].rule}
                  </p>
                ))}
            </div>
          )}
          {result.userSmiles && (
            <div className="mt-3 rounded-xl bg-surface border border-line p-2">
              <p className="text-xs font-bold text-ink-3 mb-1">La molécule que décrit ta réponse :</p>
              <MoleculeView smiles={result.userSmiles} size="sm" naming={null} />
            </div>
          )}
          {ex.kind === 'rs' && ex.explanation && <p className="mt-2 text-sm">{ex.explanation}</p>}
          {lessons.length > 0 && result.status !== 'correct' && (
            <p className="mt-2 text-sm">
              Revoir :{' '}
              {lessons.map((l, i) => (
                <span key={l}>
                  {i > 0 && ', '}
                  <Link className="font-bold text-brand underline" to={`/lecon/${l}`}>
                    {LESSON_BY_ID[l!]?.title}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </div>
      </div>

      {result.status === 'unknown' && !done && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="ok" size="sm" onClick={() => onSelfAssess(true)}>
            J’avais la bonne réponse
          </Button>
          <Button variant="soft" size="sm" onClick={() => onSelfAssess(false)}>
            Je m’étais trompée
          </Button>
        </div>
      )}

      {naming && nameKinds.includes(ex.kind) && (
        <div className="mt-3">
          <Button variant="soft" size="sm" onClick={() => setMethod((m) => !m)}>
            {method ? 'Masquer la méthode' : '🔎 Voir la méthode pas à pas'}
          </Button>
          {method && (
            <div className="mt-3 rounded-2xl bg-surface p-3 border border-line">
              <MoleculeExplorer smiles={ex.smiles!} startAt={5} />
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {onRetry && done && (
          <Button variant="soft" onClick={onRetry}>
            ↺ Réessayer (sans pénalité)
          </Button>
        )}
        {onSimilar && done && (
          <Button variant="outline" onClick={onSimilar}>
            Un exercice similaire
          </Button>
        )}
        {onNext && (
          <Button onClick={onNext} className="ml-auto">
            {nextLabel} →
          </Button>
        )}
      </div>
    </div>
  );
}
