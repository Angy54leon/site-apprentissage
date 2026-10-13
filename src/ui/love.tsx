// Éléments du petit univers romantique : Mimi, cœurs, confettis, lettre, célébrations.
import { useEffect, useState, type ReactNode } from 'react';
import { LOVE, MESSAGES, BADGES } from '../config/love';
import { MODULES } from '../content/skills';
import { consumePending, getState, useAppState } from '../state/store';
import { Button, Modal, cx } from './kit';

// ---------------------------------------------------------------------------
// Mimi, l'atome rose

export type MimiMood = 'happy' | 'cheer' | 'think' | 'calm';

export function Mimi({ size = 72, mood = 'happy', stage = 0, className }: { size?: number; mood?: MimiMood; stage?: number; className?: string }) {
  const eyes =
    mood === 'cheer' ? (
      <>
        <path d="M40 50 q4 -5 8 0" stroke="#493444" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <path d="M56 50 q4 -5 8 0" stroke="#493444" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      </>
    ) : mood === 'think' ? (
      <>
        <circle cx="45" cy="47" r="3.2" fill="#493444" />
        <circle cx="61" cy="47" r="3.2" fill="#493444" />
      </>
    ) : (
      <>
        <circle cx="44" cy="50" r="3.6" fill="#493444" />
        <circle cx="60" cy="50" r="3.6" fill="#493444" />
        <circle cx="45.2" cy="48.6" r="1.1" fill="#fff" />
        <circle cx="61.2" cy="48.6" r="1.1" fill="#fff" />
      </>
    );
  const mouth =
    mood === 'think' ? <path d="M48 61 h8" stroke="#493444" strokeWidth="2.4" strokeLinecap="round" /> : <path d={mood === 'cheer' ? 'M45 58 q7 9 14 0' : 'M46 59 q6 6 12 0'} stroke="#493444" strokeWidth="2.4" fill={mood === 'cheer' ? '#e8758f' : 'none'} strokeLinecap="round" />;
  return (
    <svg viewBox="0 0 104 104" width={size} height={size} className={cx('shrink-0', className)} role="img" aria-label={`${LOVE.mascotName}, la mascotte`}>
      <defs>
        <radialGradient id="mimi-g" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffe3ee" />
          <stop offset="60%" stopColor="#f8bbd0" />
          <stop offset="100%" stopColor="#f09bb9" />
        </radialGradient>
      </defs>
      <ellipse cx="52" cy="54" rx="47" ry="17" fill="none" stroke="#c9b5ec" strokeWidth="2.2" transform="rotate(-25 52 54)" />
      <ellipse cx="52" cy="54" rx="47" ry="17" fill="none" stroke="#f4a6c1" strokeWidth="2.2" transform="rotate(25 52 54)" />
      <circle cx="52" cy="54" r="25" fill="url(#mimi-g)" stroke="#e57fa2" strokeWidth="1.6" />
      <circle cx="38" cy="58" r="4.2" fill="#f58fae" opacity="0.55" />
      <circle cx="66" cy="58" r="4.2" fill="#f58fae" opacity="0.55" />
      {eyes}
      {mouth}
      {/* électrons : une petite bille et un petit cœur */}
      <circle cx="11" cy="74" r="4" fill="#c9b5ec" />
      <path d="M92 30 c-2 -4 -8 -3 -7 2 c1 4 7 7 7 7 s6 -3 7 -7 c1 -5 -5 -6 -7 -2 z" fill="#d85b83" />
      {stage >= 1 && (
        <g transform="translate(52 26)">
          <path d="M0 0 l-12 -7 v14 z M0 0 l12 -7 v14 z" fill="#d85b83" />
          <circle r="3.4" fill="#f4a6c1" />
        </g>
      )}
      {stage >= 2 && (
        <g transform="translate(74 34)">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} rx="3.2" ry="5.5" fill="#fff6c9" stroke="#f3c96b" strokeWidth="0.8" transform={`rotate(${a}) translate(0 -5)`} />
          ))}
          <circle r="2.8" fill="#f3c96b" />
        </g>
      )}
      {stage >= 3 && (
        <g fill="#ffd36e" stroke="#e8a93a" strokeWidth="0.8">
          <path d="M20 22 l2 5 5 1 -4 3 1 5 -4 -3 -4 3 1 -5 -4 -3 5 -1z" />
          <path d="M86 78 l1.5 3.5 3.5 .7 -2.8 2.2 .7 3.6 -2.9 -2 -3 2 .8 -3.6 -2.8 -2.2 3.6 -.7z" />
        </g>
      )}
    </svg>
  );
}

export function MimiSays({ children, mood = 'happy', stage = 0, className }: { children: ReactNode; mood?: MimiMood; stage?: number; className?: string }) {
  const st = useAppState();
  if (!st.prefs.showMimi) return null;
  return (
    <div className={cx('decor flex items-end gap-2', className)}>
      <div className="anim-bob">
        <Mimi size={58} mood={mood} stage={stage} />
      </div>
      <div className="relative rounded-2xl rounded-bl-sm bg-surface-2 border border-line px-3 py-2 text-sm text-ink-2 max-w-md">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Animations ponctuelles : cœurs, étoiles, confettis

type BurstKind = 'hearts' | 'stars' | 'confetti';

export function burst(kind: BurstKind) {
  window.dispatchEvent(new CustomEvent('love-burst', { detail: kind }));
}

interface Particle {
  id: number;
  kind: BurstKind;
  left: number;
  dx: number;
  delay: number;
  rot: number;
  char: string;
  color: string;
}

let pid = 0;
const CONFETTI = ['#f8bbd0', '#f4a6c1', '#d85b83', '#e8ddf8', '#c9b5ec', '#ffe08a', '#bfe8d2'];

export function BurstLayer() {
  const st = useAppState();
  const [parts, setParts] = useState<Particle[]>([]);
  useEffect(() => {
    const h = (e: Event) => {
      if (!getState().prefs.animations) return;
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      const kind = (e as CustomEvent).detail as BurstKind;
      const n = kind === 'confetti' ? 48 : 12;
      const created: Particle[] = Array.from({ length: n }, () => ({
        id: pid++,
        kind,
        left: kind === 'confetti' ? Math.random() * 100 : 35 + Math.random() * 30,
        dx: (Math.random() - 0.5) * (kind === 'confetti' ? 200 : 160),
        delay: Math.random() * (kind === 'confetti' ? 0.6 : 0.35),
        rot: 360 + Math.random() * 540,
        char: kind === 'hearts' ? (Math.random() < 0.7 ? '💗' : '💕') : kind === 'stars' ? (Math.random() < 0.5 ? '✨' : '⭐') : '',
        color: CONFETTI[Math.floor(Math.random() * CONFETTI.length)],
      }));
      setParts((p) => [...p, ...created]);
      setTimeout(() => setParts((p) => p.filter((x) => !created.includes(x))), 2600);
    };
    window.addEventListener('love-burst', h);
    return () => window.removeEventListener('love-burst', h);
  }, []);
  if (!st.prefs.animations || !parts.length) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden decor" aria-hidden>
      {parts.map((p) =>
        p.kind === 'confetti' ? (
          <span
            key={p.id}
            className="absolute top-0 block w-2 h-3 rounded-sm"
            style={{ left: `${p.left}%`, background: p.color, animation: `confetti 2.2s ${p.delay}s ease-in both`, ['--dx' as string]: `${p.dx}px`, ['--rot' as string]: `${p.rot}deg` }}
          />
        ) : (
          <span
            key={p.id}
            className="absolute text-2xl"
            style={{ left: `${p.left}%`, bottom: '22%', animation: `float-up 1.6s ${p.delay}s ease-out both`, ['--dx' as string]: `${p.dx}px` }}
          >
            {p.char}
          </span>
        ),
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lettre dans son enveloppe

export function LoveLetter({ open, onClose, text, title = 'Mon petit mot pour toi 💌' }: { open: boolean; onClose: () => void; text: string; title?: string }) {
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    if (!open) setOpened(false);
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-[rgba(73,52,68,0.4)] backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        {!opened ? (
          <button type="button" onClick={() => setOpened(true)} className="group mx-auto block anim-pop" aria-label="Ouvrir l’enveloppe">
            <Envelope />
            <span className="mt-3 block text-center font-hand text-2xl text-white drop-shadow">Clique pour ouvrir 💗</span>
          </button>
        ) : (
          <div className="anim-letter relative rounded-3xl bg-[#fffaf3] dark:bg-surface border border-line p-6 sm:p-8 shadow-2xl max-h-[85vh] overflow-auto">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-3xl decor">💌</div>
            <h2 className="font-hand text-3xl text-brand text-center mb-3">{title}</h2>
            <div className="font-hand text-[1.45rem] leading-snug text-ink whitespace-pre-line">{text}</div>
            <div className="mt-5 flex flex-wrap gap-2 justify-center">
              <Button variant="soft" onClick={() => setOpened(false)}>
                Replier la lettre
              </Button>
              <Button onClick={onClose}>Fermer 💗</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Envelope({ size = 280 }: { size?: number }) {
  return (
    <svg viewBox="0 0 280 190" width={size} height={(size * 190) / 280} className="drop-shadow-xl transition-transform group-hover:-translate-y-1">
      <rect x="6" y="40" width="268" height="144" rx="14" fill="#fff0f5" stroke="#f4a6c1" strokeWidth="3" />
      <path d="M6 54 L140 132 L274 54" fill="none" stroke="#f4a6c1" strokeWidth="3" />
      <path d="M8 180 L110 112 M272 180 L170 112" stroke="#f8bbd0" strokeWidth="3" />
      <path d="M6 54 L140 6 L274 54 Z" fill="#f8bbd0" stroke="#f4a6c1" strokeWidth="3" className="origin-bottom" />
      <g transform="translate(140 104)">
        <path d="M0 18 C-22 2 -26 -12 -14 -20 C-6 -25 0 -18 0 -12 C0 -18 6 -25 14 -20 C26 -12 22 2 0 18 Z" fill="#d85b83" />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Célébrations en attente (badges, chapitres, séances, régularité)

export function PendingCelebrations() {
  const st = useAppState();
  const [current, setCurrent] = useState<{ type: string; id: string; msg: string } | null>(null);
  const pending = st.love.pending[0];
  useEffect(() => {
    if (current || !pending) return;
    const ev = consumePending();
    if (!ev) return;
    let msg = '';
    if (ev.type === 'session') msg = MESSAGES.sessionDone[Math.floor(Math.random() * MESSAGES.sessionDone.length)];
    else if (ev.type === 'chapter') msg = MESSAGES.chapterDone[0];
    else if (ev.type === 'effort') msg = MESSAGES.effort[Number(ev.id)] ?? '';
    else msg = MESSAGES.badgeUnlocked[Math.floor(Math.random() * MESSAGES.badgeUnlocked.length)];
    setCurrent({ type: ev.type, id: ev.id, msg });
    burst(ev.type === 'chapter' || ev.type === 'session' ? 'confetti' : 'stars');
    if (ev.type === 'chapter') setTimeout(() => burst('hearts'), 500);
  }, [pending, current]);
  if (!current) return null;
  const badge = current.type === 'badge' ? BADGES.find((b) => b.id === current.id) : null;
  const module = current.type === 'chapter' ? MODULES.find((m) => m.id === current.id) : null;
  return (
    <Modal open onClose={() => setCurrent(null)} title={current.type === 'chapter' ? 'CHAPITRE VALIDÉ ! 💗' : current.type === 'session' ? 'Mission accomplie ! 💗' : current.type === 'effort' ? 'Ta régularité 🌸' : 'Nouveau badge !'}>
      <div className="text-center">
        {badge && <div className="text-6xl my-2 anim-pop">{badge.emoji}</div>}
        {badge && <div className="text-lg font-extrabold">{badge.title}</div>}
        {badge && <p className="text-sm text-ink-2 mb-3">{badge.description}</p>}
        {module && <p className="font-bold text-ink-2 mb-2">{module.title}</p>}
        {current.type !== 'badge' && <Mimi size={84} mood="cheer" className="mx-auto mb-2 decor" />}
        <p className="font-hand text-2xl text-brand leading-snug">{current.msg}</p>
        <Button className="mt-4" onClick={() => setCurrent(null)}>
          Merci 💗
        </Button>
      </div>
    </Modal>
  );
}

export function LoveNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cx('decor font-hand text-xl text-brand leading-snug', className)}>
      {children} <span className="anim-heartbeat">💗</span>
    </p>
  );
}
