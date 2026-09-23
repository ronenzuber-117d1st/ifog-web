import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { img } from '../utils/images';

interface Props { children: React.ReactNode }

const NAV = [
  { to: '/season',   lines: ['TABLE'],          color: '#ff55bb' },
  { to: '/team',     lines: ['TRAINING'],        color: '#ffcc00' },
  { to: '/match',    lines: ['MATCH'],           color: '#55ff55' },
  { to: '/finances', lines: ['CASH', '& CARRY'], color: '#ff9933' },
  { to: '/desk',     lines: ['DESK'],            color: '#ff5555' },
  { to: '/stadium',  lines: ['STADIUM'],         color: '#55ffff' },
];

export function Layout({ children }: Props) {
  const navigate = useNavigate();
  const { managedTeamId, currentMatchday, totalMatchdays, balance, table } = useGameStore();
  const location = useLocation();
  const pos = table.findIndex(r => r.teamId === managedTeamId) + 1;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0d1117', fontFamily: 'Arial, system-ui, sans-serif' }}>

      {/* Title bar */}
      <header style={{
        background: '#000080',
        color: '#ffffff',
        padding: '4px 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        fontSize: '12px',
        userSelect: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <img src={img('ball.png')} style={{ width: '16px', height: '16px', imageRendering: 'pixelated' }} alt="" />
          <span style={{ fontWeight: 'bold', letterSpacing: '1px', fontSize: '13px' }}>IT'S A FUNNY OLD GAME</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#c8c8ff' }}>
          <span>Match Day: <strong style={{ color: '#ffffff' }}>{currentMatchday}{totalMatchdays ? `/${totalMatchdays}` : ''}</strong></span>
          {pos > 0 && <span>Position: <strong style={{ color: '#ffffff' }}>{pos}</strong></span>}
          <span>Cash: <strong style={{ color: balance >= 0 ? '#88ff88' : '#ff8888' }}>
            {balance < 0 ? '-' : ''}£{Math.abs(balance / 1000).toFixed(0)}K
          </strong></span>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Main content area */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#0d1117', minWidth: 0 }}>
          {children}
        </main>

        {/* Right navigation sidebar */}
        <nav style={{
          width: '88px',
          flexShrink: 0,
          background: '#0d1117',
          borderLeft: '1px solid #1e2535',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Scrollable nav items */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', padding: '6px 4px', gap: '4px' }}>
            {NAV.map(({ to, lines, color }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 4px',
                    minHeight: '44px',
                    background: active ? '#161b27' : 'transparent',
                    border: '1px solid',
                    borderColor: active ? '#2d3a52' : 'transparent',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {lines.map((line, i) => (
                    <span key={i} style={{
                      color: active ? '#ffffff' : color,
                      fontWeight: 'bold',
                      fontSize: '10px',
                      lineHeight: '1.4',
                      letterSpacing: '0.04em',
                      textAlign: 'center',
                      display: 'block',
                    }}>
                      {line}
                    </span>
                  ))}
                </Link>
              );
            })}
          </div>

          {/* Always-visible bottom: badge + exit */}
          <div style={{ flexShrink: 0, padding: '4px', borderTop: '1px solid #1e2535' }}>
            <div style={{ textAlign: 'center', padding: '4px 0' }}>
              <img
                src={img(`wappen${String(managedTeamId).padStart(2, '0')}.png`)}
                style={{ width: '56px', height: '56px', imageRendering: 'pixelated', display: 'block', margin: '0 auto' }}
                alt=""
              />
            </div>
            <button
              onClick={() => navigate('/')}
              style={{
                background: '#1a0a0a',
                border: '1px solid #4a1a1a',
                color: '#f87171',
                padding: '6px 4px',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 'bold',
                width: '100%',
                marginTop: '4px',
              }}
            >
              EXIT GAME
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
