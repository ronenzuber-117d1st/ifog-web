import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { LEAGUE_TEAMS } from '../data/teams';
import { img } from '../utils/images';

function ordinal(n: number) {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  if (n % 10 === 1) return `${n}st`;
  if (n % 10 === 2) return `${n}nd`;
  if (n % 10 === 3) return `${n}rd`;
  return `${n}th`;
}

export function MainMenu() {
  const navigate = useNavigate();
  const { phase, resetGame, managedTeamId, currentMatchday, totalMatchdays, table, fixtures, balance } = useGameStore();
  const hasGame = phase !== 'menu';

  const myTeam = hasGame ? LEAGUE_TEAMS.find(t => t.id === managedTeamId) : null;
  const position = hasGame ? table.findIndex(r => r.teamId === managedTeamId) + 1 : 0;

  const nextFixture = hasGame ? fixtures.find(f =>
    f.matchday === currentMatchday &&
    (f.homeTeamId === managedTeamId || f.awayTeamId === managedTeamId) &&
    f.homeGoals === undefined
  ) : null;
  const isNextHome = nextFixture?.homeTeamId === managedTeamId;
  const opponentId = isNextHome ? nextFixture?.awayTeamId : nextFixture?.homeTeamId;
  const opponent = opponentId ? LEAGUE_TEAMS.find(t => t.id === opponentId) : null;
  const nextInfo = opponent
    ? `Next: ${opponent.name} (${isNextHome ? 'home' : 'away'})`
    : currentMatchday > (totalMatchdays || 38) ? 'Season complete' : '';

  const teamAbbr = myTeam?.name.slice(0, 3).toUpperCase() ?? '';
  const teamColor = myTeam?.color ?? '#8d99b5';

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
    <div style={{ display: 'flex', height: '100vh', background: '#070b16', overflow: 'hidden', fontFamily: "'Barlow', system-ui, sans-serif", color: '#e8edf7' }}>

      {/* ── Left: illustrated Britain map ── */}
      <div style={{ position: 'relative', flexShrink: 0, height: '100%', overflow: 'hidden' }}>
        <img
          src="/images/mainmenu.jpg"
          alt=""
          style={{ height: '100%', width: 'auto', display: 'block' }}
        />
        <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: 160, background: 'linear-gradient(90deg, transparent, #070b16)' }} />
      </div>

      {/* ── Right: content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>

        {/* Background lime glow */}
        <div style={{ position: 'absolute', right: -160, top: -200, width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,245,61,0.10), transparent 65%)', pointerEvents: 'none' }} />

        {/* Inner content wrapper — centered in the panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, width: '100%', maxWidth: 500, padding: '0 24px', position: 'relative' }}>

        {/* Logo + Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#c8f53d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <img src={img('ball.png')} style={{ width: 18, height: 18, imageRendering: 'pixelated' }} alt="" />
            </div>
            <div style={{ fontSize: 12, letterSpacing: '0.24em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>Football Manager</div>
          </div>
          <h1 style={{ margin: 0, fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 'clamp(44px, 5vw, 76px)', lineHeight: 0.88, textTransform: 'uppercase', letterSpacing: '0.01em' }}>
            It's a funny<br /><span style={{ color: '#c8f53d' }}>old game</span>
          </h1>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, maxWidth: 520, position: 'relative' }}>

          {/* Continue */}
          {hasGame && (
            <button
              onClick={() => navigate('/season')}
              style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 20px', borderRadius: 16, background: '#c8f53d', color: '#070b16', border: 0, cursor: 'pointer', boxShadow: '0 14px 40px rgba(200,245,61,0.18)', textAlign: 'left', width: '100%' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 24, letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1 }}>Continue</div>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>
              </div>

              {/* Team inset card */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 10, background: 'rgba(7,11,22,0.9)', color: '#e8edf7' }}>
                {/* Team abbr circle */}
                <div style={{
                  width: 44, height: 44, flexShrink: 0, borderRadius: '50%',
                  border: `2px solid ${teamColor}`,
                  background: teamColor + '22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 13, color: teamColor,
                }}>{teamAbbr}</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{myTeam?.name}</div>
                  <div style={{ fontSize: 13, color: '#8d99b5' }}>{nextInfo}</div>
                </div>

                {/* Mini stats */}
                <div style={{ display: 'flex', gap: 18 }}>
                  {[
                    { label: 'Matchday', value: `${currentMatchday}/${totalMatchdays || 38}` },
                    { label: 'Pos', value: position > 0 ? ordinal(position) : '–' },
                    { label: 'Cash', value: `£${Math.abs(balance / 1000).toFixed(0)}K`, color: '#c8f53d' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
                      <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8d99b5' }}>{label}</div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: color ?? '#e8edf7' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </button>
          )}

          {/* New Game */}
          <button
            onClick={() => navigate('/select')}
            style={{ display: 'flex', alignItems: 'center', gap: 14, height: 60, padding: '0 20px', borderRadius: 14, background: '#0f1628', border: '1px solid #1c2640', color: '#e8edf7', cursor: 'pointer', width: '100%', textAlign: 'left' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c8f53d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>New game</div>
              <div style={{ fontSize: 13, color: '#8d99b5' }}>Pick a club and start a fresh season</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7797" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
          </button>

          {/* Load Save File */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 14, height: 60, padding: '0 20px', borderRadius: 14, background: '#0f1628', border: '1px solid #1c2640', color: '#e8edf7', cursor: 'pointer' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7fb2ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 19h16"/></svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Load save file</div>
              <div style={{ fontSize: 13, color: '#8d99b5' }}>Import a saved game from your computer</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7797" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
            <input type="file" accept=".json" onChange={handleLoad} style={{ display: 'none' }} />
          </label>

          {/* Bottom row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 4px 0' }}>
            {hasGame ? (
              <button
                onClick={() => { resetGame(); navigate('/'); }}
                style={{ height: 44, padding: '0 14px 0 10px', borderRadius: 10, border: '1px solid transparent', background: 'transparent', color: '#ff8a83', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: "'Barlow', system-ui, sans-serif" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg>
                Abandon season
              </button>
            ) : <div />}
            <div style={{ fontSize: 12, color: '#6b7797', textAlign: 'right', lineHeight: 1.5 }}>
              Inspired by the 1996 classic<br />by Anguilla Software International Ltd.
            </div>
          </div>
        </div>{/* end buttons */}
        </div>{/* end inner wrapper */}
      </div>
    </div>
  );
}
