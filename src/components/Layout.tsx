import { Link, useLocation } from 'react-router-dom';
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
  const { managedTeamId, currentMatchday, totalMatchdays, balance, table } = useGameStore();
  const location = useLocation();
  const pos = table.findIndex(r => r.teamId === managedTeamId) + 1;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#c0c0c0', fontFamily: 'Arial, system-ui, sans-serif' }}>

      {/* Windows title bar */}
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
          background: '#c0c0c0',
          borderLeft: '2px solid #808080',
          display: 'flex',
          flexDirection: 'column',
          padding: '6px 4px',
          gap: '4px',
        }}>
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
                  background: active ? '#a8a8a8' : '#c0c0c0',
                  border: '2px solid',
                  borderColor: active
                    ? '#808080 #ffffff #ffffff #808080'
                    : '#ffffff #808080 #808080 #ffffff',
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                {lines.map((line, i) => (
                  <span key={i} style={{
                    color: active ? '#222222' : color,
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

          <div style={{ flex: 1 }} />

          {/* Team badge */}
          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            <img
              src={img(`wappen${String(managedTeamId).padStart(2, '0')}.png`)}
              style={{ width: '60px', height: '60px', imageRendering: 'pixelated', display: 'block', margin: '0 auto' }}
              alt=""
            />
          </div>
        </nav>
      </div>
    </div>
  );
}
