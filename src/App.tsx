import { useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAppState } from './state/store';
import { Layout } from './ui/Layout';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { PathPage } from './pages/PathPage';
import { LessonPage } from './pages/LessonPage';
import { SheetsPage } from './pages/SheetsPage';
import { ExercisesPage } from './pages/ExercisesPage';
import { ReviewPage } from './pages/ReviewPage';
import { SessionPage } from './pages/SessionPage';
import { ExamPage } from './pages/ExamPage';
import { MistakesPage } from './pages/MistakesPage';
import { StatsPage } from './pages/StatsPage';
import { GlossaryPage } from './pages/GlossaryPage';
import { LabPage } from './pages/LabPage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';

function ThemeEffect() {
  const st = useAppState();
  useEffect(() => {
    document.documentElement.classList.toggle('dark', st.prefs.dark);
  }, [st.prefs.dark]);
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
  return <Navigate to={st.profile.onboarded ? '/tableau-de-bord' : '/bienvenue'} replace />;
}

export function App() {
  return (
    <HashRouter>
      <ThemeEffect />
      <ScrollTop />
      <Routes>
        <Route path="/" element={<Root />} />
        <Route path="/bienvenue" element={<OnboardingPage />} />
        <Route element={<Layout />}>
          <Route path="/tableau-de-bord" element={<DashboardPage />} />
          <Route path="/parcours" element={<PathPage />} />
          <Route path="/lecon/:id" element={<LessonPage />} />
          <Route path="/cours" element={<SheetsPage />} />
          <Route path="/fiches/:id" element={<SheetsPage />} />
          <Route path="/exercices" element={<ExercisesPage />} />
          <Route path="/revisions" element={<ReviewPage />} />
          <Route path="/seance" element={<SessionPage />} />
          <Route path="/examens" element={<ExamPage />} />
          <Route path="/erreurs" element={<MistakesPage />} />
          <Route path="/statistiques" element={<StatsPage />} />
          <Route path="/glossaire" element={<GlossaryPage />} />
          <Route path="/molecules" element={<LabPage />} />
          <Route path="/reglages" element={<SettingsPage />} />
          <Route path="/a-propos" element={<AboutPage />} />
          {/* anciennes adresses */}
          <Route path="/fiches" element={<Navigate to="/cours" replace />} />
          <Route path="/planning" element={<Navigate to="/revisions?vue=planning" replace />} />
          <Route path="/entrainement" element={<Navigate to="/exercices?vue=libre" replace />} />
        </Route>
        <Route path="*" element={<Root />} />
      </Routes>
    </HashRouter>
  );
}
