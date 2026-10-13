import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { THEMES } from './config/love';
import { useAppState, type VisitInfo } from './state/store';
import { Layout } from './ui/Layout';
import { BurstLayer, PendingCelebrations } from './ui/love';
import { HomePage } from './pages/HomePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { PathPage } from './pages/PathPage';
import { LessonPage } from './pages/LessonPage';
import { SheetsPage } from './pages/SheetsPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { PracticePage } from './pages/PracticePage';
import { ReviewPage } from './pages/ReviewPage';
import { PlanningPage } from './pages/PlanningPage';
import { SessionPage } from './pages/SessionPage';
import { ExamPage } from './pages/ExamPage';
import { MistakesPage } from './pages/MistakesPage';
import { StatsPage } from './pages/StatsPage';
import { GlossaryPage } from './pages/GlossaryPage';
import { LabPage } from './pages/LabPage';
import { VictoriesPage } from './pages/VictoriesPage';
import { SettingsPage } from './pages/SettingsPage';
import { CustomizePage } from './pages/CustomizePage';
import { AboutPage } from './pages/AboutPage';

function ThemeEffect() {
  const st = useAppState();
  useEffect(() => {
    const root = document.documentElement;
    const t = THEMES.find((x) => x.id === st.prefs.theme) ?? THEMES[0];
    root.classList.toggle('dark', st.prefs.dark);
    root.style.setProperty('--brand', t.brand);
    root.style.setProperty('--brand-2', t.brand2);
    root.style.setProperty('--num-ink-strong', st.prefs.dark ? t.brand2 : t.brand);
    if (st.prefs.dark) {
      root.style.setProperty('--brand-soft', `color-mix(in srgb, ${t.brand} 35%, transparent)`);
      root.style.removeProperty('--tint');
      root.style.removeProperty('--surface-2');
    } else {
      root.style.setProperty('--brand-soft', t.soft);
      root.style.setProperty('--tint', t.tint);
      root.style.setProperty('--surface-2', t.tint);
    }
    root.classList.toggle('no-anim', !st.prefs.animations);
    root.dataset.focus = String(st.prefs.focusMode);
  }, [st.prefs]);
  return null;
}

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Root() {
  const st = useAppState();
  return <Navigate to={st.profile.onboarded ? '/tableau-de-bord' : '/accueil'} replace />;
}

export function App({ visit }: { visit: VisitInfo }) {
  return (
    <HashRouter>
      <ThemeEffect />
      <ScrollTop />
      <BurstLayer />
      <PendingCelebrations />
      <Routes>
        <Route path="/" element={<Root />} />
        <Route path="/accueil" element={<HomePage visit={visit} />} />
        <Route path="/bienvenue" element={<OnboardingPage />} />
        <Route element={<Layout />}>
          <Route path="/tableau-de-bord" element={<DashboardPage visit={visit} />} />
          <Route path="/parcours" element={<PathPage />} />
          <Route path="/lecon/:id" element={<LessonPage />} />
          <Route path="/fiches" element={<SheetsPage />} />
          <Route path="/fiches/:id" element={<SheetsPage />} />
          <Route path="/exercices" element={<ExercisesPage />} />
          <Route path="/entrainement" element={<PracticePage />} />
          <Route path="/revisions" element={<ReviewPage />} />
          <Route path="/planning" element={<PlanningPage />} />
          <Route path="/seance" element={<SessionPage />} />
          <Route path="/examens" element={<ExamPage />} />
          <Route path="/erreurs" element={<MistakesPage />} />
          <Route path="/statistiques" element={<StatsPage />} />
          <Route path="/glossaire" element={<GlossaryPage />} />
          <Route path="/molecules" element={<LabPage />} />
          <Route path="/victoires" element={<VictoriesPage />} />
          <Route path="/reglages" element={<SettingsPage />} />
          <Route path="/personnaliser" element={<CustomizePage />} />
          <Route path="/a-propos" element={<AboutPage />} />
        </Route>
        <Route path="*" element={<Root />} />
      </Routes>
    </HashRouter>
  );
}
