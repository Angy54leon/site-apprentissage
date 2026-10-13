import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { LOVE, SECRET_LETTER } from '../config/love';
import { useAppState, updatePrefs, pickMessage, openSecretLetter } from '../state/store';
import { mimiStage, secretLetterUnlocked } from '../state/rewards';
import { Mimi, LoveLetter, burst } from './love';
import { Button, Modal, cx } from './kit';

const NAV: { to: string; label: string; icon: string; group: string }[] = [
  { to: '/tableau-de-bord', label: 'Tableau de bord', icon: '🏠', group: 'Mon labo' },
  { to: '/seance', label: 'Ma séance du jour', icon: '💕', group: 'Mon labo' },
  { to: '/planning', label: 'Mon planning', icon: '🗓️', group: 'Mon labo' },
  { to: '/parcours', label: 'Parcours', icon: '🗺️', group: 'Apprendre' },
  { to: '/fiches', label: 'Leçons et fiches', icon: '📖', group: 'Apprendre' },
  { to: '/molecules', label: 'Comprendre une molécule', icon: '🔬', group: 'Apprendre' },
  { to: '/glossaire', label: 'Glossaire', icon: '📚', group: 'Apprendre' },
  { to: '/exercices', label: 'Exercices', icon: '✏️', group: 'S’entraîner' },
  { to: '/entrainement', label: 'Entraînement libre', icon: '🎯', group: 'S’entraîner' },
  { to: '/revisions', label: 'Révisions espacées', icon: '🔁', group: 'S’entraîner' },
  { to: '/examens', label: 'Examens blancs', icon: '📝', group: 'S’entraîner' },
  { to: '/erreurs', label: 'Carnet d’erreurs', icon: '📒', group: 'Suivi' },
  { to: '/statistiques', label: 'Statistiques', icon: '📊', group: 'Suivi' },
  { to: '/victoires', label: 'Mes petites victoires', icon: '🏅', group: 'Suivi' },
  { to: '/reglages', label: 'Réglages', icon: '⚙️', group: 'Plus' },
  { to: '/personnaliser', label: 'Personnaliser', icon: '💌', group: 'Plus' },
  { to: '/a-propos', label: 'À propos', icon: '🌸', group: 'Plus' },
];

const MOBILE = ['/tableau-de-bord', '/seance', '/parcours', '/revisions'];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const groups = [...new Set(NAV.map((n) => n.group))];
  return (
    <nav aria-label="Navigation principale" className="flex flex-col gap-3">
      {groups.map((g) => (
        <div key={g}>
          <div className="px-3 text-[11px] font-extrabold uppercase tracking-wider text-ink-3 mb-1">{g}</div>
          {NAV.filter((n) => n.group === g).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cx('flex items-center gap-2.5 rounded-xl px-3 py-2 text-[15px] font-semibold transition', isActive ? 'bg-brand-soft/60 text-ink' : 'text-ink-2 hover:bg-surface-2 hover:text-ink')
              }
            >
              <span className="w-5 text-center" aria-hidden>
                {n.icon}
              </span>
              {n.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

function QuickToggles() {
  const st = useAppState();
  const t = (on: boolean) => cx('rounded-xl border px-2 py-1.5 text-sm font-bold transition', on ? 'bg-brand-soft/60 border-brand-2 text-ink' : 'border-line text-ink-2 hover:bg-surface-2');
  return (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" className={t(st.prefs.focusMode)} onClick={() => updatePrefs({ focusMode: !st.prefs.focusMode })} aria-pressed={st.prefs.focusMode} title="Mode concentration : masque les décorations">
        🎧 Concentration
      </button>
      <button type="button" className={t(!st.prefs.animations)} onClick={() => updatePrefs({ animations: !st.prefs.animations })} aria-pressed={!st.prefs.animations} title="Couper les animations">
        {st.prefs.animations ? '✨ Animations' : '⏸ Sans animation'}
      </button>
      <button type="button" className={t(st.prefs.dark)} onClick={() => updatePrefs({ dark: !st.prefs.dark })} aria-pressed={st.prefs.dark} title="Mode sombre doux">
        {st.prefs.dark ? '🌙 Sombre' : '☀️ Clair'}
      </button>
    </div>
  );
}

export function Layout() {
  const st = useAppState();
  const [drawer, setDrawer] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [secret, setSecret] = useState(false);
  const unlocked = secretLetterUnlocked(st);
  const openLoveBox = () => {
    setNote(pickMessage('loveBox'));
    burst('hearts');
  };
  const openSecret = () => {
    openSecretLetter();
    setSecret(true);
  };

  const brand = (
    <Link to="/accueil" className="flex items-center gap-2 px-2" aria-label="Accueil">
      <Mimi size={42} stage={mimiStage(st)} />
      <div className="leading-tight">
        <div className="font-extrabold">{LOVE.siteNameShort}</div>
        <div className="font-hand text-brand text-lg -mt-0.5">{LOVE.subtitle}</div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen love-bg">
      {/* barre latérale (ordinateur) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-72 flex-col gap-4 border-r border-line bg-surface/85 backdrop-blur px-3 py-4 overflow-y-auto thin-scroll">
        {brand}
        <NavList />
        <div className="mt-auto flex flex-col gap-2 px-1">
          <QuickToggles />
          {unlocked && (
            <button type="button" onClick={openSecret} className="decor text-left text-sm rounded-xl px-3 py-2 hover:bg-surface-2 text-ink-2" title="Une enveloppe…">
              <span className="anim-heartbeat">💌</span> {st.love.secretLetterOpened ? 'Relire la lettre secrète' : 'Une enveloppe est apparue…'}
            </button>
          )}
        </div>
      </aside>

      {/* en-tête (mobile et tablette) */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-line bg-surface/90 backdrop-blur px-3 py-2">
        {brand}
        <div className="flex items-center gap-1">
          <button type="button" onClick={openLoveBox} className="decor rounded-xl px-2 py-1.5 text-xl hover:bg-surface-2" aria-label="Boîte à mots doux">
            💗
          </button>
          <button type="button" onClick={() => setDrawer(true)} className="rounded-xl px-3 py-1.5 font-bold border border-line" aria-label="Ouvrir le menu">
            ☰
          </button>
        </div>
      </header>

      {drawer && (
        <div className="lg:hidden fixed inset-0 z-40 bg-[rgba(73,52,68,0.35)]" onClick={() => setDrawer(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-[82%] max-w-xs bg-surface p-4 overflow-y-auto anim-fade" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <span className="font-extrabold">Menu</span>
              <Button variant="ghost" size="sm" onClick={() => setDrawer(false)} aria-label="Fermer le menu">
                ✕
              </Button>
            </div>
            <NavList onNavigate={() => setDrawer(false)} />
            <div className="mt-4">
              <QuickToggles />
            </div>
            {unlocked && (
              <button type="button" onClick={openSecret} className="decor mt-3 text-sm text-ink-2">
                💌 {st.love.secretLetterOpened ? 'Relire la lettre secrète' : 'Une enveloppe est apparue…'}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="lg:pl-72">
        {/* boîte à mots doux (ordinateur) */}
        <div className="hidden lg:flex justify-end px-6 pt-4">
          <button type="button" onClick={openLoveBox} className="decor rounded-2xl border border-line bg-surface px-3 py-1.5 text-sm font-bold text-ink-2 hover:border-brand-2" title="Ouvrir la boîte à mots doux">
            <span className="anim-heartbeat">💗</span> Boîte à mots doux
          </button>
        </div>
        <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-4 pb-28 lg:pb-12">
          <Outlet />
        </main>
      </div>

      {/* navigation basse (mobile) */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-surface/95 backdrop-blur grid grid-cols-4" aria-label="Navigation rapide">
        {MOBILE.map((to) => {
          const n = NAV.find((x) => x.to === to)!;
          return (
            <NavLink key={to} to={to} className={({ isActive }) => cx('flex flex-col items-center py-2 text-[11px] font-bold', isActive ? 'text-brand' : 'text-ink-2')}>
              <span className="text-lg" aria-hidden>
                {n.icon}
              </span>
              {n.label.replace('Ma séance du jour', 'Séance').replace('Révisions espacées', 'Révisions')}
            </NavLink>
          );
        })}
      </nav>

      <Modal open={!!note} onClose={() => setNote(null)} title="Un petit mot pour toi 💌">
        <p className="font-hand text-3xl text-brand leading-snug text-center my-4">{note}</p>
        <div className="flex justify-center gap-2">
          <Button variant="soft" onClick={() => setNote(pickMessage('loveBox'))}>
            Un autre 💗
          </Button>
          <Button onClick={() => setNote(null)}>Merci</Button>
        </div>
      </Modal>
      <LoveLetter open={secret} onClose={() => setSecret(false)} text={st.love.custom.secretLetter || SECRET_LETTER} title="Ma lettre secrète 💌" />
    </div>
  );
}
