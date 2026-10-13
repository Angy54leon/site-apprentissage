import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { HOME, LOVE, WELCOME_LETTER, MESSAGES } from '../config/love';
import { useAppState, type VisitInfo } from '../state/store';
import { mimiStage } from '../state/rewards';
import { Button } from '../ui/kit';
import { LoveLetter, Mimi } from '../ui/love';
import { MoleculeView } from '../ui/MoleculeView';

export function HomePage({ visit }: { visit: VisitInfo }) {
  const st = useAppState();
  const nav = useNavigate();
  const [letter, setLetter] = useState(false);
  const welcome = useMemo(() => {
    if (visit.firstVisit || !st.profile.onboarded) return HOME.welcomeFirst;
    const pool = visit.comeback ? MESSAGES.comeback : MESSAGES.welcomeBack;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [visit, st.profile.onboarded]);
  return (
    <div className="min-h-screen love-bg flex flex-col">
      <div className="decor pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        {['💗', '✨', '🌸', '💕', '⭐', '🎀', '☁️', '💗'].map((c, i) => (
          <span key={i} className="absolute text-2xl opacity-60 anim-bob" style={{ left: `${(i * 13 + 5) % 95}%`, top: `${(i * 23 + 8) % 85}%`, animationDelay: `${i * 0.4}s` }}>
            {c}
          </span>
        ))}
      </div>
      <main className="relative mx-auto max-w-3xl px-5 py-10 sm:py-16 flex-1 flex flex-col items-center text-center">
        <p className="font-hand text-2xl text-brand anim-fade">{LOVE.dedication}</p>
        <div className="mt-4 anim-pop">
          <Mimi size={110} mood="happy" stage={mimiStage(st)} />
        </div>
        <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight anim-fade">{HOME.title}</h1>
        <p className="mt-5 text-lg text-ink-2 max-w-2xl anim-fade">{HOME.intro}</p>
        <p className="mt-4 font-hand text-2xl sm:text-3xl text-brand anim-fade">
          {HOME.love}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 anim-fade">
          <Button size="lg" onClick={() => nav(st.profile.onboarded ? '/tableau-de-bord' : '/bienvenue')}>
            {HOME.startButton}
          </Button>
          <Button size="lg" variant="outline" onClick={() => setLetter(true)}>
            {HOME.letterButton}
          </Button>
        </div>
        <div className="mt-10 w-full max-w-xl rounded-3xl bg-surface/80 border border-line p-5 text-left anim-fade">
          <p className="text-ink-2">{welcome}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 items-center">
            <MoleculeView smiles="CCO" size="sm" naming={null} />
            <MoleculeView smiles="CC(C)=O" size="sm" naming={null} />
            <MoleculeView smiles="C1=CC=CC=C1" size="sm" naming={null} />
          </div>
          <p className="text-xs text-ink-3 text-center mt-1">éthanol · propanone · benzène — tu sauras bientôt les nommer toutes seules 💗</p>
        </div>
        <p className="mt-8 text-sm text-ink-3">
          {LOVE.siteName} — <Link to="/a-propos" className="underline">à propos de ce petit univers</Link>
        </p>
      </main>
      <LoveLetter open={letter} onClose={() => setLetter(false)} text={st.love.custom.letter || WELCOME_LETTER} />
    </div>
  );
}
