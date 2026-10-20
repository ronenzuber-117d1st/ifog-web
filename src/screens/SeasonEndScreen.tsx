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

const TROPHY_IMG: Partial<Record<Outcome, string>> = {
  champion: 'champion.png',
  top4:     'cup4.png',
  promoted: 'cup3.png',
};

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
  champion:   { accent: '#c8f53d', bg: 'rgba(200,245,61,0.06)',   kicker: 'Season Complete — Champions',     headline: 'Title Winners!',      sub: 'You led the club to the championship. An unforgettable season.' },
  top4:       { accent: '#60a5fa', bg: 'rgba(96,165,250,0.06)',   kicker: 'Season Complete — Top 4',         headline: 'European Football!',   sub: 'A fantastic campaign. The club will play in Europe next season.' },
  midtable:   { accent: '#94a3b8', bg: 'rgba(148,163,184,0.04)', kicker: 'Season Complete',                  headline: 'Season Over',          sub: 'A solid but unremarkable campaign. The board expects more next season.' },
  relegated:  { accent: '#f87171', bg: 'rgba(248,113,113,0.06)', kicker: 'Season Complete — Relegated',      headline: 'Relegated',            sub: 'The club drops to the First Division. A painful end to a disappointing season.' },
  promoted:   { accent: '#c8f53d', bg: 'rgba(200,245,61,0.06)',  kicker: 'Season Complete — Promoted!',      headline: 'Up We Go!',            sub: "You've earned promotion to the Premier League. The hard work paid off." },
  div2mid:    { accent: '#94a3b8', bg: 'rgba(148,163,184,0.04)', kicker: 'Season Complete — First Division', headline: 'Season Over',          sub: 'Another season in the First Division. Promotion remains the goal.' },
  div2bottom: { accent: '#f59e0b', bg: 'rgba(245,158,11,0.06)',  kicker: 'Season Complete — First Division', headline: 'Close Call',           sub: 'A difficult season. The board is losing patience — push for promotion.' },
};

export function SeasonEndScreen() {
  const navigate = useNavigate();
  const { managerName, portrait, managedTeamId, table, balance, division, europeanCup, startNewSeason, startEuropeanCup, resetGame } = useGameStore();

  const pos = table.findIndex(r => r.teamId === managedTeamId) + 1;
  const myRow = table.find(r => r.teamId === managedTeamId);
  const myTeam = getTeamById(managedTeamId);
  const outcome = getOutcome(pos, division);
  const cfg = OUTCOME_CONFIG[outcome];
  const trophyImg = TROPHY_IMG[outcome];
  const moodSuffix = (outcome === 'champion' || outcome === 'top4' || outcome === 'promoted') ? '_1'
    : (outcome === 'relegated' || outcome === 'div2bottom') ? '_3' : '_2';

  useEffect(() => {
    stopMusic();
    if (outcome === 'champion' || outcome === 'top4') {
      setTimeout(() => playMusic('/sounds/IFOGB.mp3'), 500);
    }
  }, [outcome]);

  const canPlayEuroCup = (outcome === 'champion' || outcome === 'top4') && !europeanCup;
  const handleMenu = () => { resetGame(); navigate('/'); };
  const handleNewSeason = () => {
    startNewSeason();
    const newPhase = useGameStore.getState().phase;
    if (newPhase === 'sacked') navigate('/sacked');
    else navigate('/season');
  };
  const handleEuroCup = () => { startEuropeanCup(); navigate('/european-cup'); };

  // Table rows: top 3 + separator + my row if outside top 3
  const tableRows = pos <= 3
    ? table.slice(0, 5)
    : [...table.slice(0, 3), null, table[pos - 1]];

  return (
    <div style={{
      height: '100vh', width: '100vw', background: '#070b16',
      display: 'flex', fontFamily: "'Barlow', system-ui, sans-serif", color: '#e8edf7',
      overflow: 'hidden',
    }}>
      {/* ── Left panel: hero ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 24, padding: '40px 48px',
        background: cfg.bg,
        borderRight: '1px solid #1c2640',
        position: 'relative',
      }}>
        {/* subtle radial glow */}
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at center, ${cfg.accent}10 0%, transparent 65%)`, pointerEvents: 'none' }} />

        {/* Trophy */}
        {trophyImg ? (
          <div style={{
            width: 300, height: 300, borderRadius: 24, overflow: 'hidden',
            border: `2px solid ${cfg.accent}44`,
            boxShadow: `0 0 40px ${cfg.accent}33`,
            flexShrink: 0,
          }}>
            <img src={img(trophyImg)} alt="trophy" style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} />
          </div>
        ) : (
          /* No trophy — show large position badge */
          <div style={{
            width: 160, height: 160, borderRadius: '50%',
            border: `3px solid ${cfg.accent}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 56, color: cfg.accent }}>{ordinal(pos)}</span>
          </div>
        )}

        {/* Headline */}
        <div style={{ textAlign: 'center', position: 'relative' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: cfg.accent, marginBottom: 8 }}>
            {cfg.kicker}
          </div>
          <div style={{
            fontFamily: "'Big Shoulders Display', Impact, sans-serif",
            fontWeight: 900, fontSize: 52, textTransform: 'uppercase',
            letterSpacing: 2, lineHeight: 1, color: cfg.accent,
            textShadow: `0 0 32px ${cfg.accent}55`,
          }}>
            {cfg.headline}
          </div>
          <div style={{ marginTop: 10, fontSize: 14, color: '#8d99b5', maxWidth: 360, lineHeight: 1.5 }}>
            {cfg.sub}
          </div>
        </div>
      </div>

      {/* ── Right panel: details ── */}
      <div style={{
        width: 500, flexShrink: 0, display: 'flex', flexDirection: 'column',
        padding: '32px 28px', gap: 20, overflowY: 'auto',
      }}>

        {/* Portrait + badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${cfg.accent}`, background: '#0f1628', flexShrink: 0 }}>
            <img src={img(`${portrait}${moodSuffix}.png`)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} />
          </div>
          <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', border: '2px solid #1c2640', background: '#0f1628', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={img(`wappen${String(managedTeamId).padStart(2, '0')}.png`)} alt="" style={{ width: '85%', height: '85%', objectFit: 'contain', imageRendering: 'pixelated' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#e8edf7' }}>{myTeam?.name}</div>
            <div style={{ fontSize: 13, color: '#8d99b5' }}>Manager: {managerName}</div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Position',  value: pos > 0 ? ordinal(pos) : '—', accent: true },
            { label: 'Points',    value: String(myRow?.points ?? 0) },
            { label: 'W / D / L', value: `${myRow?.won ?? 0} / ${myRow?.drawn ?? 0} / ${myRow?.lost ?? 0}` },
            { label: 'Goals For', value: String(myRow?.goalsFor ?? 0) },
            { label: 'Goals Ag.', value: String(myRow?.goalsAgainst ?? 0) },
            { label: 'Balance',   value: `${balance < 0 ? '-' : ''}£${Math.abs(Math.round(balance / 1000))}K`, neg: balance < 0 },
          ].map(({ label, value, accent, neg }) => (
            <div key={label} style={{ background: '#0a0f1d', border: '1px solid #1c2640', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4b5675', marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 15, color: neg ? '#f87171' : accent ? cfg.accent : '#e8edf7' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Final table */}
        <div style={{ background: '#0a0f1d', border: '1px solid #1c2640', borderRadius: 12, overflow: 'hidden', flex: 1, minHeight: 0 }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid #1c2640', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4b5675', display: 'flex', gap: 8 }}>
            <span style={{ width: 20 }}>#</span>
            <span style={{ flex: 1 }}>Club</span>
            <span style={{ width: 28, textAlign: 'center' }}>Pts</span>
          </div>
          {tableRows.map((row, i) => {
            if (!row) return (
              <div key="sep" style={{ padding: '3px 14px', fontSize: 11, color: '#2a3656', textAlign: 'center' }}>· · ·</div>
            );
            const isMe = row.teamId === managedTeamId;
            const rowPos = table.findIndex(r => r.teamId === row.teamId) + 1;
            const team = getTeamById(row.teamId);
            return (
              <div key={row.teamId} style={{
                display: 'flex', gap: 8, alignItems: 'center',
                padding: '7px 14px',
                background: isMe ? `${cfg.accent}14` : 'transparent',
                borderTop: i > 0 ? '1px solid #0f1628' : 'none',
              }}>
                <span style={{ width: 20, fontSize: 12, color: isMe ? cfg.accent : '#4b5675', fontWeight: isMe ? 700 : 400 }}>{rowPos}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: isMe ? 700 : 400, color: isMe ? cfg.accent : '#e8edf7' }}>{team?.name ?? '—'}</span>
                <span style={{ width: 28, textAlign: 'center', fontSize: 13, fontWeight: 700, color: isMe ? cfg.accent : '#e8edf7' }}>{row.points}</span>
              </div>
            );
          })}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>
          <button onClick={handleMenu} style={{
            flex: 1, height: 44, borderRadius: 10, border: '1px solid #1c2640',
            background: 'transparent', color: '#6b7280',
            fontFamily: "'Big Shoulders Display', Impact, sans-serif",
            fontWeight: 900, fontSize: 15, letterSpacing: '0.1em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}>
            Main Menu
          </button>
          {canPlayEuroCup && (
            <button onClick={handleEuroCup} style={{
              flex: 2, height: 44, borderRadius: 10, border: 0,
              background: '#60a5fa', color: '#070b16',
              fontFamily: "'Big Shoulders Display', Impact, sans-serif",
              fontWeight: 900, fontSize: 15, letterSpacing: '0.1em',
              textTransform: 'uppercase', cursor: 'pointer',
            }}>
              European Cup →
            </button>
          )}
          <button onClick={handleNewSeason} style={{
            flex: canPlayEuroCup ? 1 : 2, height: 44, borderRadius: 10, border: canPlayEuroCup ? '1px solid #1c2640' : 0,
            background: canPlayEuroCup ? 'transparent' : cfg.accent,
            color: canPlayEuroCup ? '#6b7280' : '#070b16',
            fontFamily: "'Big Shoulders Display', Impact, sans-serif",
            fontWeight: 900, fontSize: 15, letterSpacing: '0.1em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}>
            {canPlayEuroCup ? 'Skip →' : 'New Season →'}
          </button>
        </div>

      </div>
    </div>
  );
}
