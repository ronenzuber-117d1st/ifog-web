import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { LEAGUE_TEAMS } from '../data/teams';
import { Layout } from '../components/Layout';
import { img } from '../utils/images';
import type { Formation, MatchReport, Team } from '../types/game';
import { simulateFullMatch } from '../engine/matchEngine';

const FORMATIONS: Formation[] = ['4-4-2', '4-3-3', '3-5-2', '5-3-2', '4-5-1'];
const FORMATION_DESC: Record<Formation, string> = {
  '4-4-2': 'Balanced', '4-3-3': 'Attacking', '3-5-2': 'Midfield',
  '5-3-2': 'Defensive', '4-5-1': 'Ultra-def',
};

const GENERIC_COMMENTARY = [
  'Ball played through midfield...', 'Strong tackle wins possession',
  'Corner kick awarded', 'Free kick in midfield',
  'Keeper claims the cross', 'Header clears from danger',
  'Pressure building in attack', 'Shot blocked by the wall',
  'Offside flag raised', 'Long ball forward...',
  'Good interplay between the forwards', 'Referee books a player',
  'Substitution being considered', 'Home crowd getting louder',
];

const RAISED = { border: '2px solid', borderColor: '#ffffff #808080 #808080 #ffffff' } as const;

interface MatchSnap {
  homeTeam: Team; awayTeam: Team; isHome: boolean; report: MatchReport;
}

export function MatchDay() {
  const navigate = useNavigate();
  const { managedTeamId, currentMatchday, formation, fixtures, rosters, setFormation, playMatchday } = useGameStore();

  const myTeam = LEAGUE_TEAMS.find(t => t.id === managedTeamId)!;
  const nextFixture = fixtures.find(f =>
    f.matchday === currentMatchday && (f.homeTeamId === managedTeamId || f.awayTeamId === managedTeamId)
  );
  const isHome = nextFixture?.homeTeamId === managedTeamId;
  const opponentId = isHome ? nextFixture?.awayTeamId : nextFixture?.homeTeamId;
  const opponent = opponentId ? LEAGUE_TEAMS.find(t => t.id === opponentId) : null;

  const myPlayers = (rosters[managedTeamId] ?? []).filter(p => !p.injuredFor && !p.suspended);

  // Match animation state
  const [phase, setPhase] = useState<'setup' | 'playing' | 'done'>('setup');
  const [matchSnap, setMatchSnap] = useState<MatchSnap | null>(null);
  const [ballPos, setBallPos] = useState({ x: 50, y: 50 });
  const [liveScore, setLiveScore] = useState({ home: 0, away: 0 });
  const [liveMinute, setLiveMinute] = useState(0);
  const [commentary, setCommentary] = useState<string[]>([]);
  const physRef = useRef({ x: 50, y: 50, vx: 1, vy: 0.5, minute: 0 });
  const processedRef = useRef(new Set<string>());
  const commentaryRef = useRef<string[]>([]);
  const scoreRef = useRef({ home: 0, away: 0 });

  const handleKickOff = () => {
    if (!nextFixture || !opponent) return;

    const homePlayers = rosters[nextFixture.homeTeamId] ?? [];
    const awayPlayers = rosters[nextFixture.awayTeamId] ?? [];
    const homeTeam = isHome ? myTeam : opponent;
    const awayTeam = isHome ? opponent : myTeam;

    const report = simulateFullMatch(
      nextFixture, homeTeam, awayTeam, homePlayers, awayPlayers, formation,
    );

    const snap: MatchSnap = { homeTeam, awayTeam, isHome, report };
    setMatchSnap(snap);

    // Reset animation state
    physRef.current = { x: 50, y: 50, vx: 1, vy: 0.5, minute: 0 };
    processedRef.current = new Set();
    scoreRef.current = { home: 0, away: 0 };
    commentaryRef.current = ['⚽ Kick off!'];
    setBallPos({ x: 50, y: 50 });
    setLiveScore({ home: 0, away: 0 });
    setLiveMinute(0);
    setCommentary(['⚽ Kick off!']);
    setPhase('playing');
  };

  const handleContinue = () => {
    playMatchday();
    navigate('/season');
  };

  // Ball animation
  useEffect(() => {
    if (phase !== 'playing' || !matchSnap) return;

    const { report, homeTeam, awayTeam } = matchSnap;

    const timer = setInterval(() => {
      const p = physRef.current;

      // Check events at this minute
      for (const evt of report.events) {
        const key = `${evt.type}-${evt.minute}`;
        if (processedRef.current.has(key)) continue;
        if (Math.floor(p.minute) < evt.minute) continue;

        processedRef.current.add(key);

        if (evt.type === 'goal') {
          const scoringHome = evt.teamId === homeTeam.id;
          scoreRef.current = {
            home: scoreRef.current.home + (scoringHome ? 1 : 0),
            away: scoreRef.current.away + (scoringHome ? 0 : 1),
          };
          // Rush ball toward scoring goal
          p.vx = scoringHome ? 12 : -12;
          p.vy = (Math.random() - 0.5) * 3;
          const msg = `⚽ GOAL! ${evt.minute}' ${evt.playerName} (${scoringHome ? homeTeam.name : awayTeam.name})`;
          commentaryRef.current = [msg, ...commentaryRef.current.slice(0, 7)];
          setLiveScore({ ...scoreRef.current });
          setCommentary([...commentaryRef.current]);
        } else if (evt.type === 'yellow') {
          const msg = `🟨 ${evt.minute}' Yellow — ${evt.playerName}`;
          commentaryRef.current = [msg, ...commentaryRef.current.slice(0, 7)];
          setCommentary([...commentaryRef.current]);
        }
      }

      // Add generic commentary occasionally
      if (Math.random() < 0.04) {
        const msg = GENERIC_COMMENTARY[Math.floor(Math.random() * GENERIC_COMMENTARY.length)];
        const prefix = p.minute < 45 ? `${Math.floor(p.minute)}'` : `${Math.floor(p.minute)}'`;
        commentaryRef.current = [`${prefix} ${msg}`, ...commentaryRef.current.slice(0, 7)];
        setCommentary([...commentaryRef.current]);
      }

      // Ball returns to center after goal
      if (Math.abs(p.x - 50) > 42) {
        p.x = 50; p.y = 50; p.vx = (Math.random() - 0.5) * 2; p.vy = (Math.random() - 0.5) * 2;
      }

      // Physics
      p.vx += (Math.random() - 0.5) * 1.5;
      p.vy += (Math.random() - 0.5) * 1.5;
      p.vx *= 0.90;
      p.vy *= 0.90;
      const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (spd > 6) { p.vx *= 6 / spd; p.vy *= 6 / spd; }

      p.x = Math.max(3, Math.min(97, p.x + p.vx));
      p.y = Math.max(6, Math.min(94, p.y + p.vy));
      setBallPos({ x: p.x, y: p.y });

      // Advance time: 0.3 game-mins per 100ms → full 90 mins in ~30s
      p.minute = Math.min(90, p.minute + 0.3);
      setLiveMinute(Math.floor(p.minute));

      if (p.minute >= 90) {
        clearInterval(timer);
        commentaryRef.current = ["🏁 Full Time!", ...commentaryRef.current.slice(0, 7)];
        setCommentary([...commentaryRef.current]);
        setLiveMinute(90);
        setPhase('done');
      }
    }, 100);

    return () => clearInterval(timer);
  }, [phase, matchSnap]);

  if (!nextFixture || !opponent) {
    return (
      <Layout>
        <div style={{ background: '#c0c0c0', padding: '40px', textAlign: 'center', minHeight: 'calc(100vh - 28px)', fontFamily: 'Arial' }}>
          <p style={{ color: '#444' }}>No match scheduled.</p>
          <button onClick={() => navigate('/season')} style={{ ...RAISED, background: '#c0c0c0', padding: '6px 16px', cursor: 'pointer', marginTop: '12px' }}>← Back</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ background: '#c0c0c0', minHeight: 'calc(100vh - 28px)', fontFamily: 'Arial, system-ui', display: 'flex', flexDirection: 'column' }}>

        {phase === 'setup' && (
          <SetupPhase
            myTeam={myTeam}
            opponent={opponent}
            isHome={isHome}
            currentMatchday={currentMatchday}
            myPlayers={myPlayers}
            formation={formation}
            setFormation={setFormation}
            onKickOff={handleKickOff}
          />
        )}

        {(phase === 'playing' || phase === 'done') && matchSnap && (
          <PlayingPhase
            snap={matchSnap}
            managedTeamId={managedTeamId}
            ballPos={ballPos}
            liveScore={liveScore}
            liveMinute={liveMinute}
            commentary={commentary}
            phase={phase}
            onSkip={() => {
              // Fast-forward: apply remaining events
              if (matchSnap) {
                const { report, homeTeam } = matchSnap;
                const finalScore = { home: 0, away: 0 };
                for (const evt of report.events) {
                  if (evt.type === 'goal') {
                    if (evt.teamId === homeTeam.id) finalScore.home++;
                    else finalScore.away++;
                  }
                }
                setLiveScore(finalScore);
                setLiveMinute(90);
                setCommentary(['🏁 Full Time!', ...report.events.map(e =>
                  e.type === 'goal' ? `⚽ ${e.minute}' GOAL! ${e.playerName}` : `🟨 ${e.minute}' ${e.playerName}`
                )]);
                setPhase('done');
              }
            }}
            onContinue={handleContinue}
          />
        )}
      </div>
    </Layout>
  );
}

function SetupPhase({ myTeam, opponent, isHome, currentMatchday, myPlayers, formation, setFormation, onKickOff }: {
  myTeam: Team; opponent: Team; isHome: boolean; currentMatchday: number;
  myPlayers: import('../types/game').Player[];
  formation: Formation; setFormation: (f: Formation) => void;
  onKickOff: () => void;
}) {
  const RAISED = { border: '2px solid', borderColor: '#ffffff #808080 #808080 #ffffff' } as const;
  const POS_LABEL: Record<string, string> = { T: 'GK', V: 'DEF', M: 'MID', S: 'FWD' };
  const POS_COLOR: Record<string, string> = { T: '#ccaa00', V: '#4488ff', M: '#22aa22', S: '#cc2222' };

  return (
    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* Match header */}
      <div style={{ ...RAISED, background: '#c0c0c0', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={img(`wappen${String(myTeam.id).padStart(2, '0')}.png`)} style={{ width: '48px', height: '48px', imageRendering: 'pixelated' }} alt="" />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{myTeam.name}</div>
            <div style={{ fontSize: '11px', color: '#006600' }}>{isHome ? 'HOME' : 'AWAY'}</div>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#444' }}>MATCHDAY {currentMatchday}</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '6px', marginTop: '2px' }}>? - ?</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{opponent.name}</div>
            <div style={{ fontSize: '11px', color: '#880000' }}>{isHome ? 'AWAY' : 'HOME'}</div>
          </div>
          <img src={img(`wappen${String(opponent.id).padStart(2, '0')}.png`)} style={{ width: '48px', height: '48px', imageRendering: 'pixelated' }} alt="" />
        </div>
      </div>

      {/* Formation picker */}
      <div style={{ ...RAISED, background: '#c0c0c0', padding: '10px' }}>
        <div style={{ fontSize: '11px', color: '#444', marginBottom: '6px' }}>TACTICAL SETUP</div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {FORMATIONS.map(f => {
            const active = formation === f;
            return (
              <button key={f} onClick={() => setFormation(f)} style={{
                padding: '6px 10px', fontSize: '12px', cursor: 'pointer',
                background: active ? '#000080' : '#c0c0c0',
                color: active ? '#ffffff' : '#000000',
                border: '2px solid',
                borderColor: active ? '#808080 #ffffff #ffffff #808080' : '#ffffff #808080 #808080 #ffffff',
                fontWeight: active ? 'bold' : 'normal',
              }}>
                <div>{f}</div>
                <div style={{ fontSize: '9px', opacity: 0.8 }}>{FORMATION_DESC[f]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Squad */}
      <div style={{ ...RAISED, background: '#c0c0c0', padding: '10px' }}>
        <div style={{ fontSize: '11px', color: '#444', marginBottom: '6px' }}>AVAILABLE SQUAD ({myPlayers.length})</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
          {myPlayers.map(p => (
            <div key={p.id} style={{ background: '#d4d0c8', padding: '4px 6px', fontSize: '11px', display: 'flex', gap: '4px', alignItems: 'center', border: '1px solid #808080' }}>
              <span style={{ fontWeight: 'bold', color: POS_COLOR[p.position], width: '26px', fontSize: '10px' }}>{POS_LABEL[p.position]}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              <span style={{ color: '#666', fontSize: '10px' }}>{p.skill}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Kick Off */}
      <button onClick={onKickOff} style={{
        ...RAISED, background: '#008000', color: '#ffffff',
        padding: '12px', fontSize: '16px', fontWeight: 'bold',
        cursor: 'pointer', letterSpacing: '2px',
      }}>
        ⚽ KICK OFF!
      </button>
    </div>
  );
}

function PlayingPhase({ snap, managedTeamId, ballPos, liveScore, liveMinute, commentary, phase, onSkip, onContinue }: {
  snap: MatchSnap; managedTeamId: number;
  ballPos: { x: number; y: number };
  liveScore: { home: number; away: number };
  liveMinute: number; commentary: string[];
  phase: 'playing' | 'done';
  onSkip: () => void; onContinue: () => void;
}) {
  const { homeTeam, awayTeam, report } = snap;
  const RAISED = { border: '2px solid', borderColor: '#ffffff #808080 #808080 #ffffff' } as const;
  const SUNKEN = { border: '2px solid', borderColor: '#808080 #ffffff #ffffff #808080' } as const;

  const homePortrait = img(`manag${((homeTeam.id - 1) % 6) + 1}_1.png`);
  const awayPortrait = img(`manag${((awayTeam.id - 1) % 6) + 1}_2.png`);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '8px', gap: '8px' }}>

      {/* Stadium banner */}
      <div style={{ position: 'relative', overflow: 'hidden', height: '80px' }}>
        <img src={img('zuschau1.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }} alt="" />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,40,0.3), rgba(0,0,40,0.7))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ color: '#ffffff', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', letterSpacing: '2px' }}>
            PREMIER LEAGUE — MATCHDAY
          </div>
        </div>
      </div>

      {/* Score + teams */}
      <div style={{ ...RAISED, background: '#000080', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={img(`wappen${String(homeTeam.id).padStart(2, '0')}.png`)} style={{ width: '36px', height: '36px', imageRendering: 'pixelated' }} alt="" />
          <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '13px' }}>{homeTeam.name}</span>
        </div>
        <div style={{ color: '#ffff00', fontSize: '32px', fontWeight: 'bold', letterSpacing: '8px', fontFamily: 'monospace' }}>
          {liveScore.home} : {liveScore.away}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: '13px' }}>{awayTeam.name}</span>
          <img src={img(`wappen${String(awayTeam.id).padStart(2, '0')}.png`)} style={{ width: '36px', height: '36px', imageRendering: 'pixelated' }} alt="" />
        </div>
      </div>

      {/* Main area: pitch + manager portraits */}
      <div style={{ display: 'flex', gap: '8px' }}>

        {/* Pitch */}
        <div style={{ flex: 1, ...SUNKEN, position: 'relative', background: '#1a7a1a', height: '180px', overflow: 'hidden' }}>
          {/* Pitch markings */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 200 100" preserveAspectRatio="none">
            <rect x="2" y="2" width="196" height="96" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1" />
            <line x1="100" y1="2" x2="100" y2="98" stroke="rgba(255,255,255,0.65)" strokeWidth="1" />
            <circle cx="100" cy="50" r="14" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1" />
            <circle cx="100" cy="50" r="1.5" fill="rgba(255,255,255,0.8)" />
            <rect x="2" y="28" width="22" height="44" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1" />
            <rect x="176" y="28" width="22" height="44" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1" />
            <rect x="2" y="38" width="8" height="24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1" />
            <rect x="190" y="38" width="8" height="24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1" />
            <rect x="0" y="42" width="2" height="16" fill="rgba(255,255,255,0.5)" />
            <rect x="198" y="42" width="2" height="16" fill="rgba(255,255,255,0.5)" />
          </svg>

          {/* Home badge */}
          <img src={img(`wappen${String(homeTeam.id).padStart(2, '0')}.png`)} style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', width: '28px', height: '28px', imageRendering: 'pixelated', opacity: 0.8 }} alt="" />
          {/* Away badge */}
          <img src={img(`wappen${String(awayTeam.id).padStart(2, '0')}.png`)} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', width: '28px', height: '28px', imageRendering: 'pixelated', opacity: 0.8 }} alt="" />

          {/* Ball */}
          <img
            src={img('ball.png')}
            style={{
              position: 'absolute',
              width: '22px', height: '22px',
              left: `${ballPos.x}%`, top: `${ballPos.y}%`,
              transform: 'translate(-50%, -50%)',
              imageRendering: 'pixelated',
              transition: phase === 'playing' ? 'left 0.1s linear, top 0.1s linear' : 'none',
              zIndex: 10,
              filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))',
            }}
          />

          {/* Minute */}
          <div style={{
            position: 'absolute', bottom: '6px', right: '8px',
            background: 'rgba(0,0,0,0.7)', color: '#ffffff',
            padding: '2px 6px', fontSize: '12px', fontWeight: 'bold', borderRadius: '3px',
          }}>
            {liveMinute}'
          </div>
        </div>

        {/* Manager portraits */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '80px' }}>
          <div style={{ ...SUNKEN, background: '#004', overflow: 'hidden', height: '84px' }}>
            <img src={homePortrait} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} alt="" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <div style={{ ...SUNKEN, background: '#400', overflow: 'hidden', height: '84px' }}>
            <img src={awayPortrait} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} alt="" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </div>
        </div>
      </div>

      {/* Commentary box */}
      <div style={{ ...SUNKEN, background: '#000000', padding: '6px 8px', minHeight: '100px', maxHeight: '130px', overflowY: 'auto' }}>
        {commentary.map((line, i) => (
          <div key={i} style={{
            color: i === 0 ? '#ffff00' : '#88ff88',
            fontSize: '11px', lineHeight: '1.6', fontFamily: 'monospace',
            opacity: 1 - i * 0.12,
          }}>
            {line}
          </div>
        ))}
      </div>

      {/* Bottom: team badges + buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <img src={img(`wappen${String(homeTeam.id).padStart(2, '0')}.png`)} style={{ width: '36px', height: '36px', imageRendering: 'pixelated' }} alt="" />
          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{homeTeam.name}</span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {phase === 'playing' && (
            <button onClick={onSkip} style={{ ...RAISED, background: '#c0c0c0', padding: '6px 14px', cursor: 'pointer', fontSize: '12px' }}>
              Skip ▶▶
            </button>
          )}
          {phase === 'done' && (
            <button onClick={onContinue} style={{ ...RAISED, background: '#008000', color: '#ffffff', padding: '8px 20px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
              Continue →
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{awayTeam.name}</span>
          <img src={img(`wappen${String(awayTeam.id).padStart(2, '0')}.png`)} style={{ width: '36px', height: '36px', imageRendering: 'pixelated' }} alt="" />
        </div>
      </div>

      {/* Full time summary */}
      {phase === 'done' && (
        <div style={{ ...RAISED, background: '#c0c0c0', padding: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
            {(() => {
              const myId = managedTeamId;
              const myIsHome = homeTeam.id === myId;
              const myGoals = myIsHome ? liveScore.home : liveScore.away;
              const oppGoals = myIsHome ? liveScore.away : liveScore.home;
              if (myGoals > oppGoals) return '✓ WIN!';
              if (myGoals === oppGoals) return '= DRAW';
              return '✗ DEFEAT';
            })()}
          </div>
          <div style={{ fontSize: '11px', color: '#444' }}>Man of the Match: {report.manOfMatch}</div>
        </div>
      )}
    </div>
  );
}
