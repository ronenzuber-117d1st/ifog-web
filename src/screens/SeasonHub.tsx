import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { LEAGUE_TEAMS } from '../data/teams';
import { LeagueTable } from '../components/LeagueTable';
import { Badge } from '../components/Badge';
import { EventModal } from '../components/EventModal';
import { Layout } from '../components/Layout';
import { img } from '../utils/images';

const RAISED = { border: '2px solid', borderColor: '#ffffff #808080 #808080 #ffffff' } as const;

export function SeasonHub() {
  const navigate = useNavigate();
  const {
    managedTeamId, managerName, currentMatchday, totalMatchdays, table, fixtures,
    balance, chairmanMessage, pendingEvent, dismissEvent, phase,
  } = useGameStore();

  const myTeam = LEAGUE_TEAMS.find(t => t.id === managedTeamId)!;
  const myRow = table.find(r => r.teamId === managedTeamId);
  const position = table.findIndex(r => r.teamId === managedTeamId) + 1;

  const nextFixture = fixtures.find(f =>
    f.matchday === currentMatchday && (f.homeTeamId === managedTeamId || f.awayTeamId === managedTeamId)
  );
  const isHome = nextFixture?.homeTeamId === managedTeamId;
  const opponentId = isHome ? nextFixture?.awayTeamId : nextFixture?.homeTeamId;
  const opponent = opponentId ? LEAGUE_TEAMS.find(t => t.id === opponentId) : null;

  const recentResults = fixtures
    .filter(f =>
      (f.homeTeamId === managedTeamId || f.awayTeamId === managedTeamId) &&
      f.homeGoals !== undefined
    )
    .slice(-5)
    .reverse();

  const seasonOver = currentMatchday > totalMatchdays;
  const portraitId = ((managedTeamId - 1) % 6) + 1;

  return (
    <Layout>
      {pendingEvent && phase === 'result' && (
        <EventModal event={pendingEvent} onClose={dismissEvent} />
      )}

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 28px)', fontFamily: 'Arial, system-ui' }}>

        {/* LEFT PANEL - Manager info */}
        <div style={{
          width: '170px', flexShrink: 0,
          background: '#0d1117',
          borderRight: '2px solid #000080',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Manager portrait */}
          <div style={{ background: '#1a1a3a', overflow: 'hidden', height: '130px' }}>
            <img
              src={img(`manag${portraitId}_1.png`)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }}
              alt="Manager"
            />
          </div>

          {/* Team badge */}
          <div style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #1e2535' }}>
            <img
              src={img(`wappen${String(managedTeamId).padStart(2, '0')}.png`)}
              style={{ width: '52px', height: '52px', imageRendering: 'pixelated', display: 'block', margin: '0 auto 4px' }}
              alt={myTeam.name}
            />
            <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '12px' }}>{myTeam.name}</div>
            <div style={{ color: '#888', fontSize: '10px' }}>{managerName}</div>
          </div>

          {/* Stats box */}
          <div style={{ padding: '8px', fontSize: '11px' }}>
            {[
              ['SEASON', '1994/95'],
              ['MATCHDAY', `${currentMatchday}/${totalMatchdays}`],
              ['POSITION', position > 0 ? `${position}${ordinal(position)}` : '-'],
              ['POINTS', String(myRow?.points ?? 0)],
              ['W/D/L', `${myRow?.won ?? 0}/${myRow?.drawn ?? 0}/${myRow?.lost ?? 0}`],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #1e2535' }}>
                <span style={{ color: '#4488aa', fontSize: '10px' }}>{label}</span>
                <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '10px' }}>{value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
              <span style={{ color: '#4488aa', fontSize: '10px' }}>CASH</span>
              <span style={{ fontWeight: 'bold', fontSize: '10px', color: balance >= 0 ? '#4ade80' : '#f87171' }}>
                £{(balance / 1000).toFixed(0)}K
              </span>
            </div>
          </div>

          {/* Stadium image */}
          <div style={{ marginTop: 'auto', overflow: 'hidden' }}>
            <img
              src={img('zuschau1.png')}
              style={{ width: '100%', imageRendering: 'pixelated', display: 'block', opacity: 0.7 }}
              alt=""
            />
          </div>
        </div>

        {/* CENTER - Main content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px', background: '#0d1117' }}>

          {/* Season over banner */}
          {seasonOver && (
            <div style={{ background: '#15803d', border: '2px solid #4ade80', padding: '16px', textAlign: 'center', marginBottom: '10px', borderRadius: '4px' }}>
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>🏆</div>
              <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '16px' }}>Season Complete!</div>
              <div style={{ color: '#86efac', fontSize: '13px', margin: '4px 0' }}>
                You finished <strong>{position}{ordinal(position)}</strong> with {myRow?.points ?? 0} points.
              </div>
              <button
                onClick={() => navigate('/')}
                style={{ ...RAISED, background: '#c0c0c0', padding: '6px 16px', cursor: 'pointer', marginTop: '8px', fontSize: '12px' }}
              >
                Main Menu
              </button>
            </div>
          )}

          {/* Chairman message */}
          <div style={{ background: '#161b27', border: '1px solid #28314a', borderRadius: '4px', padding: '8px 12px', marginBottom: '10px' }}>
            <div style={{ color: '#4ade80', fontSize: '10px', marginBottom: '3px' }}>CHAIRMAN:</div>
            <div style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>"{chairmanMessage}"</div>
          </div>

          {/* Next fixture */}
          {!seasonOver && nextFixture && opponent && (
            <div style={{ background: '#161b27', border: '1px solid #28314a', borderRadius: '4px', padding: '10px', marginBottom: '10px' }}>
              <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '8px' }}>NEXT MATCH — MATCHDAY {currentMatchday}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Badge team={myTeam} size="md" />
                  <div>
                    <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '13px' }}>{myTeam.name}</div>
                    <div style={{ color: '#4ade80', fontSize: '10px' }}>{isHome ? 'HOME' : 'AWAY'}</div>
                  </div>
                </div>
                <div style={{ color: '#64748b', fontWeight: 'bold', fontSize: '16px' }}>vs</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: 'row-reverse' }}>
                  <Badge team={opponent} size="md" />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '13px' }}>{opponent.name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '10px' }}>{isHome ? 'AWAY' : 'HOME'}</div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/match')}
                style={{ ...RAISED, background: '#000080', color: '#ffffff', padding: '8px', cursor: 'pointer', width: '100%', fontSize: '13px', fontWeight: 'bold' }}
              >
                ⚽ Play Matchday {currentMatchday}
              </button>
            </div>
          )}

          {/* Recent results */}
          {recentResults.length > 0 && (
            <div style={{ background: '#161b27', border: '1px solid #28314a', borderRadius: '4px', padding: '10px', marginBottom: '10px' }}>
              <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '8px' }}>RECENT RESULTS</div>
              {recentResults.map(f => {
                const isHomeResult = f.homeTeamId === managedTeamId;
                const myGoals = isHomeResult ? f.homeGoals! : f.awayGoals!;
                const theirGoals = isHomeResult ? f.awayGoals! : f.homeGoals!;
                const opp = LEAGUE_TEAMS.find(t => t.id === (isHomeResult ? f.awayTeamId : f.homeTeamId))!;
                const w = myGoals > theirGoals, d = myGoals === theirGoals;
                const resultColor = w ? '#4ade80' : d ? '#60a5fa' : '#f87171';
                return (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0', borderBottom: '1px solid #1e2535', fontSize: '12px' }}>
                    <span style={{ background: w ? '#15803d' : d ? '#1e40af' : '#991b1b', color: '#fff', padding: '0 4px', fontSize: '10px', fontWeight: 'bold', minWidth: '14px', textAlign: 'center' }}>{w ? 'W' : d ? 'D' : 'L'}</span>
                    <span style={{ color: '#64748b', fontSize: '10px' }}>{isHomeResult ? 'H' : 'A'}</span>
                    <span style={{ color: '#cbd5e1', flex: 1 }}>{opp.name}</span>
                    <span style={{ fontWeight: 'bold', color: resultColor, fontFamily: 'monospace' }}>{myGoals}–{theirGoals}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* League table */}
          <div style={{ background: '#161b27', border: '1px solid #28314a', borderRadius: '4px', padding: '10px' }}>
            <div style={{ color: '#94a3b8', fontSize: '10px', marginBottom: '8px' }}>PREMIER LEAGUE TABLE</div>
            <LeagueTable table={table} managedTeamId={managedTeamId} />
          </div>
        </div>
      </div>
    </Layout>
  );
}

function ordinal(n: number) {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  if (n % 10 === 1) return 'st';
  if (n % 10 === 2) return 'nd';
  if (n % 10 === 3) return 'rd';
  return 'th';
}
