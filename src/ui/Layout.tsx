import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { APP } from '../config/app';
import { useAppState, updatePrefs } from '../state/store';
import { Icon, Logo, type IconName } from './icons';
import { cx } from './kit';

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/tableau-de-bord', label: 'Tableau de bord', icon: 'dashboard' },
  { to: '/parcours', label: 'Parcours', icon: 'path' },
  { to: '/cours', label: 'Cours', icon: 'book' },
  { to: '/exercices', label: 'Exercices', icon: 'pencil' },
  { to: '/revisions', label: 'Révisions', icon: 'review' },
  { to: '/examens', label: 'Examens blancs', icon: 'exam' },
  { to: '/erreurs', label: 'Carnet d’erreurs', icon: 'mistakes' },
  { to: '/statistiques', label: 'Statistiques', icon: 'stats' },
  { to: '/glossaire', label: 'Glossaire', icon: 'glossary' },
];

const MOBILE: { to: string; label: string; icon: IconName }[] = [
  { to: '/tableau-de-bord', label: 'Accueil', icon: 'dashboard' },
  { to: '/parcours', label: 'Parcours', icon: 'path' },
  { to: '/exercices', label: 'Exercices', icon: 'pencil' },
  { to: '/revisions', label: 'Révisions', icon: 'review' },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Navigation principale" className="flex flex-col gap-0.5">
      {NAV.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cx(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-[14.5px] font-medium transition-colors',
              isActive ? 'bg-white/12 text-white' : 'text-slate-300 hover:bg-white/6 hover:text-white',
            )
          }
        >
          <Icon name={n.icon} />
          {n.label}
        </NavLink>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link to="/tableau-de-bord" className="flex items-center gap-2.5 px-2" aria-label="Tableau de bord">
      <Logo />
      <div className="leading-tight">
        <div className="font-semibold text-white text-[15px]">{APP.name}</div>
        <div className="text-[11.5px] text-slate-400">Chimie organique · IUPAC</div>
      </div>
    </Link>
  );
}

function SidebarFooter({ onNavigate }: { onNavigate?: () => void }) {
  const st = useAppState();
  const item = 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/6 hover:text-white w-full text-left';
  return (
    <div className="flex flex-col gap-0.5 border-t border-white/10 pt-3">
      <button type="button" className={item} onClick={() => updatePrefs({ focusMode: true })}>
        <Icon name="focus" /> Mode concentration
      </button>
      <button type="button" className={item} onClick={() => updatePrefs({ dark: !st.prefs.dark })} aria-pressed={st.prefs.dark}>
        <Icon name={st.prefs.dark ? 'sun' : 'moon'} /> {st.prefs.dark ? 'Thème clair' : 'Thème sombre'}
      </button>
      <NavLink to="/reglages" onClick={onNavigate} className={({ isActive }) => cx(item, isActive && 'bg-white/12 text-white')}>
        <Icon name="settings" /> Réglages
      </NavLink>
    </div>
  );
}

export function Layout() {
  const st = useAppState();
  const [drawer, setDrawer] = useState(false);
  const focus = st.prefs.focusMode;

  // Une seule arborescence : <Outlet /> garde sa place quand on active ou quitte
  // le mode concentration, pour ne pas interrompre l'exercice en cours.
  return (
    <div className="min-h-screen bg-bg">
      {focus ? (
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/95 backdrop-blur px-4 py-2">
          <span className="flex items-center gap-2 text-sm font-medium text-ink-2">
            <Icon name="focus" /> Mode concentration
          </span>
          <button type="button" onClick={() => updatePrefs({ focusMode: false })} className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-2">
            Quitter
          </button>
        </div>
      ) : (
        <>
          {/* barre latérale (ordinateur) */}
          <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col gap-6 bg-navy px-3 py-4 overflow-y-auto thin-scroll">
            <Brand />
            <NavList />
            <div className="mt-auto">
              <SidebarFooter />
            </div>
          </aside>

          {/* en-tête (mobile et tablette) */}
          <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-2 bg-navy px-3 py-2.5">
            <Brand />
            <button type="button" onClick={() => setDrawer(true)} className="rounded-lg p-2 text-white hover:bg-white/10" aria-label="Ouvrir le menu">
              <Icon name="menu" size={22} />
            </button>
          </header>
        </>
      )}

      {!focus && drawer && (
        <div className="lg:hidden fixed inset-0 z-40 bg-[rgba(15,23,42,0.5)]" onClick={() => setDrawer(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-[80%] max-w-xs bg-navy p-3 flex flex-col gap-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <Brand />
              <button type="button" onClick={() => setDrawer(false)} className="rounded-lg p-2 text-white hover:bg-white/10" aria-label="Fermer le menu">
                <Icon name="close" />
              </button>
            </div>
            <NavList onNavigate={() => setDrawer(false)} />
            <SidebarFooter onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className={focus ? undefined : 'lg:pl-60'}>
        <main className={focus ? 'mx-auto max-w-4xl px-4 sm:px-6 py-6' : 'mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 pb-24 lg:pb-12'}>
          <Outlet />
        </main>
      </div>

      {/* navigation basse (mobile) */}
      {!focus && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-surface grid grid-cols-4" aria-label="Navigation rapide">
          {MOBILE.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => cx('flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium', isActive ? 'text-brand' : 'text-ink-2')}>
              <Icon name={n.icon} size={20} />
              {n.label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
