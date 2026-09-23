import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';

export function MainMenu() {
  const navigate = useNavigate();
  const { phase, resetGame } = useGameStore();
  const hasGame = phase !== 'menu';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Stadium background */}
      <div className="absolute inset-0">
        <img
          src="/images/zuschau.png"
          alt=""
          className="w-full h-full object-cover"
          style={{ imageRendering: 'pixelated' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
      </div>

      {/* Fans strip at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 overflow-hidden opacity-40">
        <img src="/images/fans.png" alt="" className="w-full object-cover" style={{ imageRendering: 'pixelated' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-lg px-4">
        <div className="mb-4 opacity-90">
          <img src="/images/ball.png" alt="ball" className="w-16 h-16 mx-auto" style={{ imageRendering: 'pixelated' }} />
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight drop-shadow-2xl">
          It's A Funny<br />
          <span className="text-pitch-400">Old Game</span>
        </h1>

        <p className="mt-3 text-slate-300 text-lg drop-shadow">
          Football Club Management Simulation
        </p>

        <div className="mt-10 flex flex-col gap-3 w-full max-w-xs">
          <button
            className="btn-primary py-3 text-base shadow-lg"
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

        <p className="mt-12 text-slate-500 text-xs">
          Inspired by the 1997 classic by 21st Century Entertainment
        </p>
      </div>
    </div>
  );
}
