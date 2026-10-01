import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { img } from '../utils/images';

interface Props { children: React.ReactNode }

const NAV = [
  { to: '/season',   label: 'Table' },
  { to: '/team',     label: 'Training' },
  { to: '/match',    label: 'Match' },
  { to: '/finances', label: 'Cash & Carry' },
  { to: '/desk',     label: 'Desk' },
  { to: '/stadium',  label: 'Stadium' },
];

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export function Layout({ children }: Props) {
  const navigate = useNavigate();
  const { managedTeamId, currentMatchday, totalMatchdays, balance, table } = useGameStore();
  const [saved, setSaved] = useState(false);
  const location = useLocation();
  const pos = table.findIndex(r => r.teamId === managedTeamId) + 1;

  const handleSave = () => {
    const data = localStorage.getItem('ifog-game-state');
    if (!data) return;
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ifog-save-md${currentMatchday}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        JSON.parse(text);
        localStorage.setItem('ifog-game-state', text);
        window.location.reload();
      } catch {
        alert('Invalid save file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#070b16', fontFamily: "'Barlow', system-ui, sans-serif", overflow: 'hidden', color: '#e8edf7' }}>

      {/* ── Top header ── */}
      <header style={{ height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 32, padding: '0 24px', background: '#0a0f1d', borderBottom: '1px solid #1c2640', userSelect: 'none' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#c8f53d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src={img('ball.png')} style={{ width: 18, height: 18, imageRendering: 'pixelated' }} alt="" />
          </div>
          <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1, whiteSpace: 'nowrap' }}>
            It's a Funny Old Game
          </div>
        </div>

        {/* Nav tabs */}
        <nav style={{ display: 'flex', height: 64, alignItems: 'stretch', flexShrink: 0 }}>
          {NAV.map(({ to, label }) => {
            const active = location.pathname === to;
            return (
              <Link key={to} to={to} style={{
                display: 'flex', alignItems: 'center', padding: '0 14px',
                color: active ? '#ffffff' : '#8d99b5',
                fontWeight: active ? 700 : 600, fontSize: 15,
                textDecoration: 'none', whiteSpace: 'nowrap',
                boxShadow: active ? 'inset 0 -3px 0 #c8f53d' : 'none',
              }}>
                {label}
              </Link>
            );
          })}
        </nav>

        <div style={{ flexGrow: 1 }} />

        {/* Stats */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8d99b5' }}>Matchday</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 15 }}>
              {currentMatchday}<span style={{ color: '#8d99b5' }}>/{totalMatchdays || 38}</span>
            </div>
          </div>
          {pos > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8d99b5' }}>Position</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 15 }}>{ordinal(pos)}</div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8d99b5' }}>Cash</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 15, color: balance >= 0 ? '#c8f53d' : '#f87171' }}>
              {balance < 0 ? '-' : ''}£{Math.abs(balance / 1000).toFixed(0)}K
            </div>
          </div>
        </div>

        {/* LOAD */}
        <label title="Load save file" style={{
          width: 44, height: 44, borderRadius: 10, border: '1px solid #2a3656',
          background: 'transparent', color: '#8d99b5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <input type="file" accept=".json" onChange={handleLoad} style={{ display: 'none' }} />
        </label>

        {/* SAVE */}
        <button onClick={handleSave} title="Save game" style={{
          width: 44, height: 44, borderRadius: 10,
          border: `1px solid ${saved ? '#16a34a' : '#2a3656'}`,
          background: saved ? 'rgba(22,163,74,0.15)' : 'transparent',
          color: saved ? '#4ade80' : '#8d99b5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>

        {/* EXIT */}
        <button onClick={() => navigate('/')} title="Exit to main menu" style={{
          width: 44, height: 44, borderRadius: 10, border: '1px solid #2a3656',
          background: 'transparent', color: '#8d99b5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </header>

      {/* ── Main content ── */}
      <main style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {children}
      </main>
    </div>
  );
}
