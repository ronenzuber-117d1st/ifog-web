import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainMenu } from './screens/MainMenu';
import { TeamSelect } from './screens/TeamSelect';
import { SeasonHub } from './screens/SeasonHub';
import { MatchDay } from './screens/MatchDay';
import { TeamManagement } from './screens/TeamManagement';
import { Finances } from './screens/Finances';
import { useGameStore } from './store/useGameStore';

function RequireGame({ children }: { children: React.ReactNode }) {
  const phase = useGameStore(s => s.phase);
  if (phase === 'menu') return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/select" element={<TeamSelect />} />
        <Route path="/season" element={<RequireGame><SeasonHub /></RequireGame>} />
        <Route path="/match" element={<RequireGame><MatchDay /></RequireGame>} />
        <Route path="/team" element={<RequireGame><TeamManagement /></RequireGame>} />
        <Route path="/finances" element={<RequireGame><Finances /></RequireGame>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
