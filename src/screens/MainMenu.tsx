import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { img } from '../utils/images';

export function MainMenu() {
  const navigate = useNavigate();
  const { phase, resetGame } = useGameStore();
  const hasGame = phase !== 'menu';

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#000' }}>

      {/* Left: start screen image at natural proportions */}
      <div style={{ flexShrink: 0, height: '100%', overflow: 'hidden' }}>
        <img
          src={img('startscreen.png')}
          alt=""
          style={{ height: '100%', width: 'auto', display: 'block', imageRendering: 'pixelated' }}
        />
      </div>

      {/* Right: black panel with buttons */}
      <div style={{
        flex: 1, background: '#000',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '14px', padding: '40px',
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'extrabold', color: '#fff', textAlign: 'center', marginBottom: '12px', lineHeight: 1.3 }}>
          It's A Funny<br />
          <span style={{ color: '#4ade80' }}>Old Game</span>
        </h1>

        <button
          className="btn-primary shadow-lg"
          style={{ fontSize: '18px', padding: '14px 0', width: '220px' }}
          onClick={() => navigate('/select')}
        >
          New Game
        </button>

        {hasGame && (
          <button
            className="btn-secondary"
            style={{ fontSize: '18px', padding: '14px 0', width: '220px' }}
            onClick={() => navigate('/season')}
          >
            Continue Game
          </button>
        )}

        {hasGame && (
          <button
            className="btn-danger"
            style={{ fontSize: '14px', padding: '10px 0', width: '220px', marginTop: '4px' }}
            onClick={() => { resetGame(); navigate('/'); }}
          >
            Abandon Season
          </button>
        )}

        <p style={{ fontSize: '12px', color: '#475569', marginTop: '24px', textAlign: 'center' }}>
          Inspired by the 1997 classic<br />by 21st Century Entertainment
        </p>
      </div>
    </div>
  );
}
