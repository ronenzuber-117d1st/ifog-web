import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { img } from '../utils/images';
import { stopMusic } from '../utils/sound';
import { useEffect } from 'react';

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export function SackedScreen() {
  const navigate = useNavigate();
  const { managerName, sackReason, currentMatchday, table, managedTeamId, balance, resetGame } = useGameStore();
  const pos = table.findIndex(r => r.teamId === managedTeamId) + 1;
  const myRow = table.find(r => r.teamId === managedTeamId);

  useEffect(() => { stopMusic(); }, []);

  const handleMenu = () => {
    resetGame();
    navigate('/');
  };

  return (
    <div style={{
      height: '100vh', width: '100vw', background: '#0a0006',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Barlow', system-ui, sans-serif", color: '#e8edf7',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(180,0,0,0.22) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, maxWidth: 680, padding: '0 32px', textAlign: 'center', width: '100%' }}>

        {/* Hero image */}
        <img
          src={img('gefeuert.png')}
          alt="You're fired"
          style={{ width: '100%', maxWidth: 420, imageRendering: 'pixelated', borderRadius: 8 }}
        />

        {/* Heading */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#ef4444', marginBottom: 8 }}>
            Board Statement
          </div>
          <div style={{
            fontFamily: "'Big Shoulders Display', Impact, sans-serif",
            fontWeight: 900, fontSize: 52, textTransform: 'uppercase',
            letterSpacing: 3, lineHeight: 1,
            color: '#ef4444',
            textShadow: '0 0 40px rgba(239,68,68,0.5)',
          }}>
            You're Sacked
          </div>
          <div style={{ marginTop: 8, fontSize: 17, fontWeight: 600, color: '#e8edf7' }}>
            {managerName}
          </div>
        </div>

        {/* Reason */}
        {sackReason && (
          <div style={{
            background: 'rgba(127,29,29,0.2)', border: '1px solid #7f1d1d',
            borderRadius: 12, padding: '16px 28px',
            fontSize: 15, lineHeight: 1.6, color: '#fca5a5',
            fontStyle: 'italic', maxWidth: 520,
          }}>
            "{sackReason}"
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 32 }}>
          {[
            { label: 'Matchday', value: String(currentMatchday - 1) },
            { label: 'Position', value: pos > 0 ? ordinal(pos) : '—' },
            { label: 'Points', value: String(myRow?.points ?? 0) },
            { label: 'Balance', value: `${balance < 0 ? '-' : ''}£${Math.abs(Math.round(balance / 1000))}K` },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 20, color: label === 'Balance' && balance < 0 ? '#ef4444' : '#e8edf7' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Button */}
        <button
          onClick={handleMenu}
          style={{
            height: 48, padding: '0 40px', borderRadius: 12, border: '1px solid #374151',
            background: '#111827', color: '#9ca3af',
            fontFamily: "'Big Shoulders Display', Impact, sans-serif",
            fontWeight: 900, fontSize: 18, letterSpacing: '0.1em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          Back to Menu
        </button>
      </div>
    </div>
  );
}
