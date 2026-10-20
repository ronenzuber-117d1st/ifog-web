import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MainMenu } from './screens/MainMenu';
import { useGameStore } from './store/useGameStore';
import { playMusic, stopMusic } from './utils/sound';
import { DevPanel } from './components/DevPanel';

const TeamSelect     = lazy(() => import('./screens/TeamSelect').then(m => ({ default: m.TeamSelect })));
const SeasonHub      = lazy(() => import('./screens/SeasonHub').then(m => ({ default: m.SeasonHub })));
const MatchDay       = lazy(() => import('./screens/MatchDay').then(m => ({ default: m.MatchDay })));
const TeamManagement = lazy(() => import('./screens/TeamManagement').then(m => ({ default: m.TeamManagement })));
const Finances       = lazy(() => import('./screens/Finances').then(m => ({ default: m.Finances })));
const Stadium        = lazy(() => import('./screens/Stadium').then(m => ({ default: m.Stadium })));
const Desk           = lazy(() => import('./screens/Desk').then(m => ({ default: m.Desk })));
const SackedScreen   = lazy(() => import('./screens/SackedScreen').then(m => ({ default: m.SackedScreen })));
const SeasonEndScreen = lazy(() => import('./screens/SeasonEndScreen').then(m => ({ default: m.SeasonEndScreen })));
const EuropeanCup    = lazy(() => import('./screens/EuropeanCup').then(m => ({ default: m.EuropeanCup })));

function RequireGame({ children }: { children: React.ReactNode }) {
  const phase = useGameStore(s => s.phase);
  if (phase === 'menu') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function MusicController() {
  const { pathname } = useLocation();
  const base = import.meta.env.BASE_URL;

  useEffect(() => {
    if (pathname === '/' || pathname === '/select') {
      playMusic(`${base}sounds/IFOGB.mp3`);
    } else if (pathname === '/stadium') {
      playMusic(`${base}sounds/IFOGC.mp3`);
    } else if (pathname === '/desk' || pathname === '/season' || pathname === '/team' || pathname === '/finances' || pathname === '/match') {
      playMusic(`${base}sounds/IFOGA.mp3`);
    } else if (pathname === '/sacked' || pathname === '/season-end' || pathname === '/european-cup') {
      // these screens manage their own music
    } else {
      stopMusic();
    }
  }, [pathname, base]);

  useEffect(() => () => { stopMusic(); }, []);

  return null;
}

export default function App() {
  return (
    <HashRouter>
      <MusicController />
      <DevPanel />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/select" element={<TeamSelect />} />
          <Route path="/season" element={<RequireGame><SeasonHub /></RequireGame>} />
          <Route path="/match" element={<RequireGame><MatchDay /></RequireGame>} />
          <Route path="/team" element={<RequireGame><TeamManagement /></RequireGame>} />
          <Route path="/finances" element={<RequireGame><Finances /></RequireGame>} />
          <Route path="/stadium" element={<RequireGame><Stadium /></RequireGame>} />
          <Route path="/desk" element={<RequireGame><Desk /></RequireGame>} />
          <Route path="/sacked" element={<RequireGame><SackedScreen /></RequireGame>} />
          <Route path="/season-end" element={<RequireGame><SeasonEndScreen /></RequireGame>} />
          <Route path="/european-cup" element={<RequireGame><EuropeanCup /></RequireGame>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
