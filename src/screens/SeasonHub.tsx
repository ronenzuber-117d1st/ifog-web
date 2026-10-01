import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { LEAGUE_TEAMS } from '../data/teams';
import { EventModal } from '../components/EventModal';
import { Layout } from '../components/Layout';
import { img } from '../utils/images';

const FORM_COLOR = { W: '#5fd49a', D: '#8d99b5', L: '#ff7a6b' } as const;

function ordinal(n: number) {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  if (n % 10 === 1) return 'st';
  if (n % 10 === 2) return 'nd';
  if (n % 10 === 3) return 'rd';
  return 'th';
}

export function SeasonHub() {
  const navigate = useNavigate();
  const {
    managedTeamId, managerName, currentMatchday, totalMatchdays, table, fixtures,
    balance, chairmanMessage, pendingEvent, dismissEvent, phase, portrait,
  } = useGameStore();

  const [viewMatchday, setViewMatchday] = useState(currentMatchday);

  const myTeam = LEAGUE_TEAMS.find(t => t.id === managedTeamId)!;
  const myRow = table.find(r => r.teamId === managedTeamId);

  const nextFixture = fixtures.find(f =>
    f.matchday === currentMatchday &&
    (f.homeTeamId === managedTeamId || f.awayTeamId === managedTeamId) &&
    f.homeGoals === undefined
  );
  const matchHomeTeam = nextFixture ? LEAGUE_TEAMS.find(t => t.id === nextFixture.homeTeamId) : null;
  const matchAwayTeam = nextFixture ? LEAGUE_TEAMS.find(t => t.id === nextFixture.awayTeamId) : null;
  const matchHomePos = table.findIndex(r => r.teamId === nextFixture?.homeTeamId) + 1;
  const matchAwayPos = table.findIndex(r => r.teamId === nextFixture?.awayTeamId) + 1;
  const homeIsMe = nextFixture?.homeTeamId === managedTeamId;

  const seasonOver = currentMatchday > totalMatchdays;
  const portraitSrc = portrait
    ? img(`${portrait}_1.png`)
    : img(`manag${((managedTeamId - 1) % 6) + 1}_1.png`);

  const teamAbbr = myTeam.name.replace(/^The /, '').slice(0, 3).toUpperCase();
  const teamColor = myTeam.color;

  const mdFixtures = fixtures.filter(f => f.matchday === viewMatchday);

  function getForm(teamId: number): string[] {
    return fixtures
      .filter(f => (f.homeTeamId === teamId || f.awayTeamId === teamId) && f.homeGoals !== undefined)
      .slice(-5)
      .map(f => {
        const isH = f.homeTeamId === teamId;
        const my = isH ? f.homeGoals! : f.awayGoals!;
        const th = isH ? f.awayGoals! : f.homeGoals!;
        return my > th ? 'W' : my === th ? 'D' : 'L';
      });
  }

  return (
    <Layout>
      {pendingEvent && phase === 'result' && (
        <EventModal event={pendingEvent} onClose={dismissEvent} />
      )}

      <div style={{
        height: '100%', display: 'grid',
        gridTemplateColumns: '320px minmax(0,1fr) 380px',
        gap: 20, padding: '20px 24px',
        overflow: 'hidden',
        fontFamily: "'Barlow', system-ui, sans-serif",
        background: '#070b16', color: '#e8edf7', boxSizing: 'border-box',
      }}>

        {/* ── Left column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0, overflow: 'hidden' }}>

          {/* Manager card */}
          <div style={{ flex: 1, minHeight: 0, borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
              <img
                src={portraitSrc}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'top center', imageRendering: 'pixelated', display: 'block' }}
                alt="Manager"
              />
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 90, background: 'linear-gradient(180deg, rgba(15,22,40,0), #0f1628)' }} />
              <div style={{ position: 'absolute', left: 18, bottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', border: `2px solid ${teamColor}`, background: teamColor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 14, color: teamColor, flexShrink: 0 }}>{teamAbbr}</div>
                <div>
                  <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 22, textTransform: 'uppercase', lineHeight: 1 }}>{myTeam.name}</div>
                  <div style={{ fontSize: 13, color: '#c2cbe0' }}>Manager · {managerName}</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 18px 14px' }}>
              {([
                ['Season', '1994/95'],
                ['Points', String(myRow?.points ?? 0)],
                ['W / D / L', `${myRow?.won ?? 0} / ${myRow?.drawn ?? 0} / ${myRow?.lost ?? 0}`],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 38, borderBottom: '1px solid #1c2640' }}>
                  <span style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8d99b5' }}>{label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14 }}>{value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 38 }}>
                <span style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8d99b5' }}>Cash</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: '#c8f53d' }}>
                  {balance < 0 ? '-' : ''}£{Math.abs(balance / 1000).toFixed(0)}K
                </span>
              </div>
            </div>
          </div>

          {/* Chairman message */}
          <div style={{ display: 'flex', gap: 14, padding: 18, borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c8f53d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#c8f53d', fontWeight: 600 }}>Chairman</div>
              <div style={{ fontSize: 15, lineHeight: 1.4, color: '#e8edf7', fontStyle: 'italic' }}>"{chairmanMessage}"</div>
            </div>
          </div>
        </div>

        {/* ── Center: League table ── */}
        <section style={{ minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10, padding: '18px 20px', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 26, textTransform: 'uppercase', lineHeight: 1 }}>Premier League</div>
            <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#8d99b5' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#c8f53d', display: 'inline-block' }} />Champions
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: '#ff5a52', display: 'inline-block' }} />Relegation
              </span>
            </div>
          </div>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '30px 26px minmax(0,1fr) repeat(4,28px) 36px 36px 60px', gap: 8, padding: '0 10px', height: 26, alignItems: 'center', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6b7797', borderBottom: '1px solid #1c2640', flexShrink: 0 }}>
            <div>#</div><div /><div>Team</div>
            <div style={{ textAlign: 'center' }}>P</div>
            <div style={{ textAlign: 'center' }}>W</div>
            <div style={{ textAlign: 'center' }}>D</div>
            <div style={{ textAlign: 'center' }}>L</div>
            <div style={{ textAlign: 'right' }}>GD</div>
            <div style={{ textAlign: 'right' }}>Pts</div>
            <div style={{ textAlign: 'right' }}>Form</div>
          </div>

          {/* Rows */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
            {table.map((row, i) => {
              const team = LEAGUE_TEAMS.find(t => t.id === row.teamId);
              if (!team) return null;
              const isMe = row.teamId === managedTeamId;
              const gd = row.goalsFor - row.goalsAgainst;
              const pos = i + 1;
              const zone = pos === 1 ? '#c8f53d' : pos >= 18 ? '#ff5a52' : 'transparent';
              const form = getForm(row.teamId);
              const abbr = team.name.replace(/^The /, '').slice(0, 2).toUpperCase();
              return (
                <div key={row.teamId} style={{ position: 'relative', display: 'grid', gridTemplateColumns: '30px 26px minmax(0,1fr) repeat(4,28px) 36px 36px 60px', gap: 8, alignItems: 'center', height: 31, padding: '0 10px', borderRadius: 6, background: isMe ? 'rgba(200,245,61,0.12)' : 'transparent' }}>
                  <div style={{ position: 'absolute', left: 0, top: 5, bottom: 5, width: 3, borderRadius: 2, background: zone }} />
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13, color: '#8d99b5' }}>{pos}</div>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: team.color + '33', border: `1.5px solid ${team.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: team.color }}>{abbr}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: isMe ? 700 : 500, fontSize: 15, color: isMe ? '#c8f53d' : '#e8edf7', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {team.name}
                    {isMe && <span style={{ padding: '1px 6px', borderRadius: 4, background: '#c8f53d', color: '#070b16', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em' }}>YOU</span>}
                  </div>
                  <div style={{ textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#a9b3cb' }}>{row.played}</div>
                  <div style={{ textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#a9b3cb' }}>{row.won}</div>
                  <div style={{ textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#a9b3cb' }}>{row.drawn}</div>
                  <div style={{ textAlign: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#a9b3cb' }}>{row.lost}</div>
                  <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#a9b3cb' }}>{gd > 0 ? `+${gd}` : gd}</div>
                  <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, color: '#ffffff' }}>{row.points}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 3 }}>
                    {form.map((r, fi) => (
                      <div key={fi} style={{ width: 18, height: 18, borderRadius: 4, background: FORM_COLOR[r as keyof typeof FORM_COLOR], color: '#070b16', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{r}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Right column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>

          {/* Next match card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 18, borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 90% at 0% 40%, rgba(106,168,255,0.14), transparent 70%), radial-gradient(ellipse 50% 90% at 100% 40%, rgba(232,72,72,0.14), transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600, position: 'relative' }}>
              <span>Next match</span>
              <span>Matchday {currentMatchday}</span>
            </div>

            {!seasonOver && matchHomeTeam && matchAwayTeam ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'center', gap: 10, position: 'relative' }}>
                  {/* Home */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', border: `3px solid ${matchHomeTeam.color}`, background: matchHomeTeam.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 17, color: matchHomeTeam.color }}>
                      {matchHomeTeam.name.replace(/^The /, '').slice(0, 3).toUpperCase()}
                    </div>
                    <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 20, textTransform: 'uppercase', lineHeight: 1, textAlign: 'center' }}>{matchHomeTeam.name}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: homeIsMe ? '#c8f53d' : '#9cc4ff' }}>
                      {homeIsMe ? 'YOU · ' : ''}HOME · {matchHomePos}{ordinal(matchHomePos)}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 34, color: '#3a4768' }}>VS</div>
                  {/* Away */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', border: `3px solid ${matchAwayTeam.color}`, background: matchAwayTeam.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 17, color: matchAwayTeam.color }}>
                      {matchAwayTeam.name.replace(/^The /, '').slice(0, 3).toUpperCase()}
                    </div>
                    <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 20, textTransform: 'uppercase', lineHeight: 1, textAlign: 'center' }}>{matchAwayTeam.name}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: !homeIsMe ? '#c8f53d' : '#9cc4ff' }}>
                      {!homeIsMe ? 'YOU · ' : ''}AWAY · {matchAwayPos}{ordinal(matchAwayPos)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/match')}
                  style={{ position: 'relative', height: 56, borderRadius: 12, background: '#c8f53d', color: '#070b16', fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 22, letterSpacing: '0.14em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, border: 0, cursor: 'pointer', width: '100%' }}
                >
                  Play matchday {currentMatchday}
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#8d99b5', fontSize: 14, position: 'relative' }}>
                {seasonOver ? 'Season complete!' : 'No upcoming fixture'}
              </div>
            )}
          </div>

          {/* Matchday fixtures */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 18px', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => setViewMatchday(m => Math.max(1, m - 1))}
                disabled={viewMatchday <= 1}
                style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid #2a3656', background: '#131c33', color: viewMatchday <= 1 ? '#3a4768' : '#e8edf7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: viewMatchday <= 1 ? 'default' : 'pointer', flexShrink: 0 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 20, textTransform: 'uppercase', lineHeight: 1 }}>Matchday {viewMatchday}</div>
                <div style={{ fontSize: 12, color: '#8d99b5' }}>
                  {viewMatchday === currentMatchday ? 'Up next' : viewMatchday < currentMatchday ? 'Full-time results' : 'Upcoming'}
                </div>
              </div>
              <button
                onClick={() => setViewMatchday(m => Math.min(totalMatchdays, m + 1))}
                disabled={viewMatchday >= totalMatchdays}
                style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid #2a3656', background: '#131c33', color: viewMatchday >= totalMatchdays ? '#3a4768' : '#e8edf7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: viewMatchday >= totalMatchdays ? 'default' : 'pointer', flexShrink: 0 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {mdFixtures.map(f => {
                const ht = LEAGUE_TEAMS.find(t => t.id === f.homeTeamId);
                const at = LEAGUE_TEAMS.find(t => t.id === f.awayTeamId);
                if (!ht || !at) return null;
                const isMe = f.homeTeamId === managedTeamId || f.awayTeamId === managedTeamId;
                const hasScore = f.homeGoals !== undefined;
                return (
                  <div key={f.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 56px minmax(0,1fr)', gap: 8, alignItems: 'center', height: 38, padding: '0 10px', borderRadius: 8, background: isMe ? 'rgba(200,245,61,0.12)' : 'transparent' }}>
                    <div style={{ textAlign: 'right', fontSize: 14, fontWeight: hasScore && f.homeGoals! > f.awayGoals! ? 700 : 400, color: f.homeTeamId === managedTeamId ? '#c8f53d' : '#e8edf7', whiteSpace: 'nowrap', overflow: 'hidden' }}>{ht.name}</div>
                    <div style={{ height: 26, borderRadius: 6, background: hasScore ? '#1f2945' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13, color: hasScore ? '#ffffff' : '#6b7797' }}>
                      {hasScore ? `${f.homeGoals}–${f.awayGoals}` : 'v'}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: hasScore && f.awayGoals! > f.homeGoals! ? 700 : 400, color: f.awayTeamId === managedTeamId ? '#c8f53d' : '#e8edf7', whiteSpace: 'nowrap', overflow: 'hidden' }}>{at.name}</div>
                  </div>
                );
              })}
              {mdFixtures.length === 0 && (
                <div style={{ color: '#8d99b5', fontSize: 13, textAlign: 'center', paddingTop: 20 }}>No fixtures</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
