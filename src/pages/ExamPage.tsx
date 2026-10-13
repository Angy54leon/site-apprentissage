import { useState } from 'react';
import { SKILL_BY_ID } from '../content/skills';
import { buildExam, buildPracticeSet, examPoints } from '../exercises/sessions';
import type { Exercise } from '../exercises/types';
import { getState, recordExam, useAppState } from '../state/store';
import { formatDate, today } from '../state/dates';
import { ExerciseRunner, type RunResult } from '../ui/exercises/ExerciseRunner';
import { MoleculeView } from '../ui/MoleculeView';
import { MoleculeExplorer } from '../ui/MoleculeCard';
import { analyse } from '../exercises/generate';
import { Button, Card, Empty, PageTitle, Pill, cx } from '../ui/kit';

const COUNT = 20;
const SECONDS = 30 * 60;

function CorrectionItem({ r, i }: { r: RunResult; i: number }) {
  const [open, setOpen] = useState(false);
  const pts = examPoints(r.ex);
  const got = r.res.status === 'correct' ? pts : r.res.status === 'partial' ? pts / 2 : 0;
  const named = r.ex.smiles ? analyse(r.ex.smiles).naming : null;
  return (
    <li className="rounded-lg border border-line bg-surface p-3">
      <button type="button" className="w-full flex items-start gap-2 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className={cx('font-bold', r.res.status === 'correct' ? 'text-ok' : r.res.status === 'partial' ? 'text-warn' : 'text-bad')}>
          {r.res.status === 'correct' ? '✓' : r.res.status === 'partial' ? '≈' : '✗'}
        </span>
        <span className="flex-1">
          <span className="font-bold">Q{i + 1}.</span> {r.ex.prompt}
        </span>
        <span className="text-sm font-bold tabular-nums">
          {got}/{pts}
        </span>
      </button>
      {open && (
        <div className="mt-2 pl-6 space-y-2 text-sm">
          {r.ex.smiles && r.ex.kind !== 'structure' && (
            <div className="max-w-sm">
              <MoleculeView smiles={r.ex.smiles} size="sm" coords={r.ex.coords} stereo={r.ex.stereo?.bond !== undefined ? { bond: r.ex.stereo.bond, type: r.ex.stereo.type } : undefined} />
            </div>
          )}
          <p>
            Ta réponse : <strong>{r.res.userAnswer || '(pas de réponse)'}</strong>
          </p>
          <p>
            Réponse attendue : <strong className="text-ok">{r.res.expected}</strong>
          </p>
          {r.res.details.filter(Boolean).map((d, k) => (
            <p key={k} className="text-ink-2">
              {d}
            </p>
          ))}
          {named && ['name', 'complete', 'judge', 'findError', 'numbering', 'mainChain'].includes(r.ex.kind) && <MoleculeExplorer smiles={r.ex.smiles!} startAt={5} compact />}
        </div>
      )}
    </li>
  );
}

export function ExamPage() {
  const st = useAppState();
  const [exam, setExam] = useState<Exercise[] | null>(null);
  const [started, setStarted] = useState(0);
  const [done, setDone] = useState<{ results: RunResult[]; score: number } | null>(null);
  const [target, setTarget] = useState<Exercise[] | null>(null);

  const start = () => {
    setDone(null);
    setTarget(null);
    setExam(buildExam(getState(), COUNT));
    setStarted(Date.now());
  };
  const finish = (results: RunResult[]) => {
    let max = 0;
    let got = 0;
    const perSkill: Record<string, { ok: number; n: number }> = {};
    // questions non atteintes (temps écoulé) : comptées 0
    for (const ex of exam ?? []) {
      const r = results.find((x) => x.ex.uid === ex.uid);
      const p = examPoints(ex);
      max += p;
      const sc = r ? (r.res.status === 'correct' ? 1 : r.res.status === 'partial' ? 0.5 : 0) : 0;
      got += p * sc;
      for (const s of ex.skills) {
        const a = perSkill[s] ?? { ok: 0, n: 0 };
        a.ok += sc;
        a.n += 1;
        perSkill[s] = a;
      }
    }
    const score = Math.round((got / max) * 20 * 2) / 2;
    recordExam({ id: String(Date.now()), date: today(), score, max: 20, durationMs: Date.now() - started, perSkill });
    setDone({ results, score });
  };

  if (target)
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => setTarget(null)} className="mb-3">
          ← Retour aux résultats
        </Button>
        <ExerciseRunner exercises={target} context="practice" title="Révision ciblée après l’examen blanc" onFinish={() => {}} />
      </div>
    );

  if (exam && !done)
    return (
      <div>
        <p className="mb-3 text-sm text-ink-2">Conditions d’examen : pas d’indice ni de correction pendant l’épreuve. La correction détaillée de chaque question est affichée à la fin.</p>
        <ExerciseRunner exercises={exam} context="exam" mode="exam" noHints totalSeconds={SECONDS} title="Examen blanc" onFinish={finish} renderSummary={() => null} />
      </div>
    );

  if (done) {
    const last = st.exams[st.exams.length - 1];
    const weak = Object.entries(last?.perSkill ?? {})
      .filter(([, v]) => v.n && v.ok / v.n < 0.6)
      .map(([k]) => k);
    return (
      <div className="max-w-3xl">
        <Card className="text-center mb-4">
          <h1 className="text-2xl font-semibold">Résultat de l’examen blanc</h1>
          <p className="text-5xl font-bold text-brand my-3">{done.score}/20</p>
          <p className="text-ink-2">{done.score >= 16 ? 'Très bon résultat : les notions du programme sont solides. Concentre-toi sur les rares erreurs restantes.' : done.score >= 10 ? 'Résultat correct. Analyse la correction des questions manquées et retravaille les notions signalées.' : 'Des notions restent à consolider. Utilise la révision ciblée ci-dessous, puis repasse un examen blanc dans quelques jours.'}</p>
          {weak.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-bold">Notions à retravailler :</p>
              <div className="flex flex-wrap justify-center gap-1 mt-1">
                {weak.map((s) => (
                  <Pill key={s} tone="bad">
                    {SKILL_BY_ID[s]?.label}
                  </Pill>
                ))}
              </div>
              <Button className="mt-3" onClick={() => setTarget(buildPracticeSet(getState(), weak, 10))}>
                Révision ciblée de ces notions
              </Button>
            </div>
          )}
        </Card>
        <h2 className="font-semibold mb-2">Correction détaillée (clique sur une question)</h2>
        <ul className="space-y-2">
          {(exam ?? []).map((ex, i) => {
            const r = done.results.find((x) => x.ex.uid === ex.uid) ?? { ex, res: { status: 'incorrect' as const, userAnswer: '', expected: '(temps écoulé)', errorCodes: [], details: [], headline: '' } };
            return <CorrectionItem key={ex.uid} r={r} i={i} />;
          })}
        </ul>
        <div className="mt-4 flex gap-2">
          <Button onClick={start}>Nouvel examen blanc</Button>
          <Button variant="soft" onClick={() => { setExam(null); setDone(null); }}>
            Retour
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageTitle sub="Conditions d’examen : questions mélangées de tout le programme vu, sans indice, chronométrées, avec un barème.">
        Examens blancs
      </PageTitle>
      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <Card>
          <h2 className="font-semibold">Format</h2>
          <ul className="list-disc pl-5 text-ink-2 mt-2 space-y-1">
            <li>{COUNT} questions (60 % de noms de molécules, le reste varié : structures, fonctions, erreurs, numérotation…).</li>
            <li>Durée : 30 minutes. Les questions non traitées comptent 0.</li>
            <li>Barème : 1 point par question, 1,5 point pour un nom difficile ; moitié des points si la réponse est presque juste. Note ramenée sur 20.</li>
            <li>Correction détaillée de chaque réponse à la fin, et révision ciblée des notions ratées.</li>
          </ul>
          <Button size="lg" className="mt-4" onClick={start}>
            Commencer un examen blanc
          </Button>
        </Card>
        <Card>
          <h2 className="font-semibold mb-2">Mes examens</h2>
          {st.exams.length ? (
            <ul className="space-y-1">
              {[...st.exams].reverse().map((e) => (
                <li key={e.id} className="flex justify-between rounded-xl bg-surface-2 px-3 py-2">
                  <span>{formatDate(e.date)}</span>
                  <strong>{e.score}/20</strong>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Pas encore d’examen blanc. Le premier est souvent le plus instructif !</Empty>
          )}
        </Card>
      </div>
    </div>
  );
}
