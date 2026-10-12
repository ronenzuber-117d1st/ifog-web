import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MainMenu } from './screens/MainMenu';
import { TeamSelect } from './screens/TeamSelect';
import { SeasonHub } from './screens/SeasonHub';
import { MatchDay } from './screens/MatchDay';
import { TeamManagement } from './screens/TeamManagement';
import { Finances } from './screens/Finances';
import { Stadium } from './screens/Stadium';
import { Desk } from './screens/Desk';
import { SackedScreen } from './screens/SackedScreen';
import { SeasonEndScreen } from './screens/SeasonEndScreen';
import { useGameStore } from './store/useGameStore';
import { playMusic, stopMusic } from './utils/sound';

function RequireGame({ children }: { children: React.ReactNode }) {
  const phase = useGameStore(s => s.phase);
  if (phase === 'menu') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function MusicController() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === '/' || pathname === '/select') {
      playMusic('/sounds/IFOGB.mp3');
    } else if (pathname === '/stadium') {
      playMusic('/sounds/IFOGC.mp3');
    } else if (pathname === '/desk' || pathname === '/season' || pathname === '/team' || pathname === '/finances' || pathname === '/match') {
      playMusic('/sounds/IFOGA.mp3');
    } else if (pathname === '/sacked' || pathname === '/season-end') {
      // these screens manage their own music
    } else {
      stopMusic();
    }
  }, [pathname]);

  // Stop music when the app unmounts
  useEffect(() => () => { stopMusic(); }, []);

  return null;
}

export default function App() {
  return (
    <HashRouter>
      <MusicController />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
