import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { img } from '../utils/images';
import { stopMusic, playMusic } from '../utils/sound';
import { useEffect } from 'react';
import { getTeamById } from '../data/teams';

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

type Outcome = 'champion' | 'top4' | 'midtable' | 'relegated' | 'promoted' | 'div2mid' | 'div2bottom';

function getOutcome(pos: number, division: 1 | 2): Outcome {
  if (division === 1) {
    if (pos === 1) return 'champion';
    if (pos <= 4) return 'top4';
    if (pos <= 17) return 'midtable';
    return 'relegated';
  } else {
    if (pos <= 3) return 'promoted';
    if (pos <= 17) return 'div2mid';
    return 'div2bottom';
  }
}

const OUTCOME_CONFIG: Record<Outcome, { accent: string; bg: string; kicker: string; headline: string; sub: string }> = {
  champion: {
    accent: '#c8f53d',
    bg: 'radial-gradient(ellipse at center, rgba(200,245,61,0.15) 0%, transparent 65%)',
    kicker: 'Season Complete — Champions',
    headline: 'Title Winners!',
    sub: 'You led the club to the championship. An unforgettable season.',
  },
  top4: {
    accent: '#60a5fa',
    bg: 'radial-gradient(ellipse at center, rgba(96,165,250,0.12) 0%, transparent 65%)',
    kicker: 'Season Complete — Top 4',
    headline: 'European Football!',
    sub: 'A fantastic campaign. The club will play in Europe next season.',
  },
  midtable: {
    accent: '#94a3b8',
    bg: 'radial-gradient(ellipse at center, rgba(148,163,184,0.08) 0%, transparent 65%)',
    kicker: 'Season Complete',
    headline: 'Season Over',
    sub: 'A solid but unremarkable campaign. The board expects more next season.',
  },
  relegated: {
    accent: '#f87171',
    bg: 'radial-gradient(ellipse at center, rgba(248,113,113,0.14) 0%, transparent 65%)',
    kicker: 'Season Complete — Relegated',
    headline: 'Relegated',
    sub: 'The club drops to the First Division. A painful end to a disappointing season.',
  },
  promoted: {
    accent: '#c8f53d',
    bg: 'radial-gradient(ellipse at center, rgba(200,245,61,0.15) 0%, transparent 65%)',
    kicker: 'Season Complete — Promoted!',
    headline: 'Up We Go!',
    sub: 'You\'ve earned promotion to the Premier League. The hard work paid off.',
  },
  div2mid: {
    accent: '#94a3b8',
    bg: 'radial-gradient(ellipse at center, rgba(148,163,184,0.08) 0%, transparent 65%)',
    kicker: 'Season Complete — First Division',
    headline: 'Season Over',
    sub: 'Another season in the First Division. Promotion remains the goal.',
  },
  div2bottom: {
    accent: '#f59e0b',
    bg: 'radial-gradient(ellipse at center, rgba(245,158,11,0.10) 0%, transparent 65%)',
    kicker: 'Season Complete — First Division',
    headline: 'Close Call',
    sub: 'A difficult season. The board is losing patience — push for promotion.',
  },
};

export function SeasonEndScreen() {
  const navigate = useNavigate();
  const { managerName, portrait, managedTeamId, table, balance, division, startNewSeason, resetGame } = useGameStore();

  const pos = table.findIndex(r => r.teamId === managedTeamId) + 1;
  const myRow = table.find(r => r.teamId === managedTeamId);
  const myTeam = getTeamById(managedTeamId);
  const outcome = getOutcome(pos, division);
  const cfg = OUTCOME_CONFIG[outcome];

  useEffect(() => {
    stopMusic();
    if (outcome === 'champion' || outcome === 'top4') {
      setTimeout(() => playMusic('/sounds/IFOGB.mp3'), 500);
    }
  }, [outcome]);

  const handleMenu = () => {
    resetGame();
    navigate('/');
  };

  const handleNewSeason = () => {
    startNewSeason();
    const newPhase = useGameStore.getState().phase;
    if (newPhase === 'sacked') navigate('/sacked');
    else navigate('/season');
  };

  return (
    <div style={{
      height: '100vh', width: '100vw', background: '#070b16',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Barlow', system-ui, sans-serif", color: '#e8edf7',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: cfg.bg, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28, maxWidth: 700, padding: '0 32px', textAlign: 'center', width: '100%' }}>

        {/* Team logo + portrait */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: `3px solid ${cfg.accent}`, background: '#0f1628', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={img(`wappen${String(managedTeamId).padStart(2, '0')}.png`)} alt="" style={{ width: '90%', height: '90%', objectFit: 'contain', imageRendering: 'pixelated' }} />
          </div>
          <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', border: '2px solid #1c2640', background: '#0f1628' }}>
            <img src={img(`${portrait}${outcome === 'champion' || outcome === 'top4' || outcome === 'promoted' ? '_1' : outcome === 'relegated' || outcome === 'div2bottom' ? '_3' : '_2'}.png`)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} />
          </div>
        </div>

        {/* Outcome */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: cfg.accent, marginBottom: 10 }}>
            {cfg.kicker}
          </div>
          <div style={{
            fontFamily: "'Big Shoulders Display', Impact, sans-serif",
            fontWeight: 900, fontSize: 56, textTransform: 'uppercase',
            letterSpacing: 3, lineHeight: 1,
            color: cfg.accent,
            textShadow: `0 0 40px ${cfg.accent}55`,
          }}>
            {cfg.headline}
          </div>
          <div style={{ marginTop: 8, fontSize: 15, color: '#8d99b5', maxWidth: 480, margin: '8px auto 0' }}>
            {cfg.sub}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 0, background: '#0a0f1d', border: '1px solid #1c2640', borderRadius: 14, overflow: 'hidden', width: '100%', maxWidth: 560 }}>
          {[
            { label: 'Team', value: myTeam?.name ?? '—' },
            { label: 'Manager', value: managerName },
            { label: 'Final Position', value: pos > 0 ? ordinal(pos) : '—' },
            { label: 'Points', value: String(myRow?.points ?? 0) },
            { label: 'Balance', value: `${balance < 0 ? '-' : ''}£${Math.abs(Math.round(balance / 1000))}K` },
          ].map(({ label, value }, i, arr) => (
            <div key={label} style={{
              flex: 1, padding: '16px 8px', textAlign: 'center',
              borderRight: i < arr.length - 1 ? '1px solid #1c2640' : 'none',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#4b5675', marginBottom: 6 }}>{label}</div>
              <div style={{
                fontFamily: label === 'Team' || label === 'Manager' ? 'inherit' : "'JetBrains Mono', monospace",
                fontWeight: 700, fontSize: label === 'Team' || label === 'Manager' ? 12 : 18,
                color: label === 'Balance' && balance < 0 ? '#f87171' : label === 'Final Position' ? cfg.accent : '#e8edf7',
                lineHeight: 1.2,
              }}>{value}</div>
            </div>
          ))}
        </div>

        {/* League table (top 5 + my position if outside) */}
        <div style={{ background: '#0a0f1d', border: '1px solid #1c2640', borderRadius: 14, overflow: 'hidden', width: '100%', maxWidth: 560 }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #1c2640', fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#4b5675', display: 'flex', gap: 8 }}>
            <span style={{ width: 24 }}>#</span>
            <span style={{ flex: 1 }}>Club</span>
            <span style={{ width: 32, textAlign: 'center' }}>P</span>
            <span style={{ width: 32, textAlign: 'center' }}>Pts</span>
          </div>
          {(() => {
            const rows = pos <= 5
              ? table.slice(0, 5)
              : [...table.slice(0, 3), null, table[pos - 1]];
            return rows.map((row, i) => {
              if (!row) return (
                <div key="sep" style={{ padding: '4px 16px', fontSize: 11, color: '#4b5675', textAlign: 'center' }}>· · ·</div>
              );
              const isMe = row.teamId === managedTeamId;
              const rowPos = table.findIndex(r => r.teamId === row.teamId) + 1;
              const team = getTeamById(row.teamId);
              return (
                <div key={row.teamId} style={{
                  display: 'flex', gap: 8, alignItems: 'center',
                  padding: '8px 16px',
                  background: isMe ? `${cfg.accent}14` : 'transparent',
                  borderTop: i > 0 ? '1px solid #0f1628' : 'none',
                }}>
                  <span style={{ width: 24, fontSize: 12, color: isMe ? cfg.accent : '#4b5675', fontWeight: isMe ? 700 : 400 }}>{rowPos}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: isMe ? 700 : 400, color: isMe ? cfg.accent : '#e8edf7' }}>{team?.name ?? '—'}</span>
                  <span style={{ width: 32, textAlign: 'center', fontSize: 12, color: '#8d99b5' }}>{row.played}</span>
                  <span style={{ width: 32, textAlign: 'center', fontSize: 13, fontWeight: 700, color: isMe ? cfg.accent : '#e8edf7' }}>{row.points}</span>
                </div>
              );
            });
          })()}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 16 }}>
          <button
            onClick={handleMenu}
            style={{
              height: 46, padding: '0 32px', borderRadius: 12, border: '1px solid #1c2640',
              background: 'transparent', color: '#6b7280',
              fontFamily: "'Big Shoulders Display', Impact, sans-serif",
              fontWeight: 900, fontSize: 16, letterSpacing: '0.1em',
              textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Main Menu
          </button>
          <button
            onClick={handleNewSeason}
            style={{
              height: 46, padding: '0 32px', borderRadius: 12, border: 0,
              background: cfg.accent, color: '#070b16',
              fontFamily: "'Big Shoulders Display', Impact, sans-serif",
              fontWeight: 900, fontSize: 16, letterSpacing: '0.1em',
              textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            New Season →
          </button>
        </div>
      </div>
    </div>
  );
}
