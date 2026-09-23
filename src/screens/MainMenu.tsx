import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';

export function MainMenu() {
  const navigate = useNavigate();
  const { phase, resetGame } = useGameStore();
  const hasGame = phase !== 'menu';

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col items-center justify-center px-4">
      {/* Pitch lines background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-pitch-700/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-pitch-700/5" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-pitch-700/10" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-pitch-700/10" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
        <div className="text-pitch-500 text-6xl mb-6">⚽</div>

        <h1 className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
          It's A Funny<br />
          <span className="text-pitch-500">Old Game</span>
        </h1>

        <p className="mt-4 text-slate-400 text-lg">
          Football Club Management Simulation
        </p>

        <div className="mt-10 flex flex-col gap-3 w-full max-w-xs">
          <button
            className="btn-primary py-3 text-base"
            onClick={() => navigate('/select')}
          >
            New Game
          </button>

          {hasGame && (
            <button
              className="btn-secondary py-3 text-base"
              onClick={() => navigate('/season')}
            >
              Continue Game
            </button>
          )}

          {hasGame && (
            <button
              className="btn-danger py-3 text-sm mt-2"
              onClick={() => { resetGame(); navigate('/'); }}
            >
              Abandon Season
            </button>
          )}
        </div>

        <p className="mt-12 text-slate-600 text-xs">
          Inspired by the 1997 classic by 21st Century Entertainment
        </p>
      </div>
    </div>
  );
}
