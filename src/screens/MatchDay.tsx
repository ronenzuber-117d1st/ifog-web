import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { LEAGUE_TEAMS } from '../data/teams';
import { Layout } from '../components/Layout';
import { img } from '../utils/images';
import type { Formation, MatchEvent, MatchReport, Team } from '../types/game';
import { simulateFullMatch } from '../engine/matchEngine';

const REFEREES = [
  { name: 'R. Ironside',  style: 'STRICT',      desc: 'Books everything. Zero tolerance.',      bribeable: false, color: '#f87171', img: 'schieds1.png' },
  { name: 'P. Softglove', style: 'LENIENT',     desc: 'Easy-going. Lets the game flow.',        bribeable: false, color: '#4ade80', img: 'schieds2.png' },
  { name: 'T. Steadman',  style: 'VETERAN',     desc: 'Fair and consistent. Hard to rattle.',   bribeable: false, color: '#60a5fa', img: 'schieds3.png' },
  { name: 'D. Slippery',  style: 'DODGY',       desc: 'Known for flexible interpretations.',    bribeable: true,  color: '#f59e0b', img: 'schieds4.png' },
  { name: 'B. Bumble',    style: 'INCOMPETENT', desc: 'Bewildered. Open to persuasion.',        bribeable: true,  color: '#c084fc', img: 'schieds5.png' },
];

function pickReferee(matchday: number, teamId: number) {
  return REFEREES[(matchday * 7 + teamId * 3) % REFEREES.length];
}

// Pitch coord system: x=0-100% (width), y=0%(top/away-goal) to 100%(bottom/home-goal)
function getFormationPositions(formation: Formation, isHome: boolean): { x: number; y: number }[] {
  const f = (y: number) => isHome ? y : 100 - y;
  const layouts: Record<Formation, { x: number; y: number }[]> = {
    '4-4-2': [
      { x: 50, y: f(90) },
      { x: 16, y: f(72) }, { x: 36, y: f(72) }, { x: 64, y: f(72) }, { x: 84, y: f(72) },
      { x: 16, y: f(52) }, { x: 36, y: f(52) }, { x: 64, y: f(52) }, { x: 84, y: f(52) },
      { x: 35, y: f(30) }, { x: 65, y: f(30) },
    ],
    '4-3-3': [
      { x: 50, y: f(90) },
      { x: 16, y: f(72) }, { x: 36, y: f(72) }, { x: 64, y: f(72) }, { x: 84, y: f(72) },
      { x: 25, y: f(52) }, { x: 50, y: f(52) }, { x: 75, y: f(52) },
      { x: 20, y: f(28) }, { x: 50, y: f(28) }, { x: 80, y: f(28) },
    ],
    '3-5-2': [
      { x: 50, y: f(90) },
      { x: 25, y: f(72) }, { x: 50, y: f(72) }, { x: 75, y: f(72) },
      { x: 10, y: f(52) }, { x: 28, y: f(52) }, { x: 50, y: f(52) }, { x: 72, y: f(52) }, { x: 90, y: f(52) },
      { x: 35, y: f(30) }, { x: 65, y: f(30) },
    ],
    '5-3-2': [
      { x: 50, y: f(90) },
      { x: 10, y: f(72) }, { x: 28, y: f(72) }, { x: 50, y: f(72) }, { x: 72, y: f(72) }, { x: 90, y: f(72) },
      { x: 25, y: f(52) }, { x: 50, y: f(52) }, { x: 75, y: f(52) },
      { x: 35, y: f(30) }, { x: 65, y: f(30) },
    ],
    '4-5-1': [
      { x: 50, y: f(90) },
      { x: 16, y: f(72) }, { x: 36, y: f(72) }, { x: 64, y: f(72) }, { x: 84, y: f(72) },
      { x: 10, y: f(52) }, { x: 28, y: f(52) }, { x: 50, y: f(52) }, { x: 72, y: f(52) }, { x: 90, y: f(52) },
      { x: 50, y: f(28) },
    ],
  };
  return layouts[formation] ?? layouts['4-4-2'];
}

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

const CARD = { background: '#161b27', border: '1px solid #28314a', borderRadius: '8px' } as const;

// Ball y-coordinates are within the pitch overlay div (top:'63%', bottom:'3%').
// The white commercial-board strip is roughly y < 38 and y > 87.
// Green grass lives at y: 38–87.  Away goal line ≈ 38,  Home goal line ≈ 86.
function genBallPath(minute: number): { x: number; y: number }[] {
  const r = () => Math.random();
  const wx = () => 12 + r() * 76;
  const phase = Math.floor(minute / 7) % 3;

  if (phase === 0) {
    // Home build-up toward away goal (top of grass, y≈38)
    return [
      { x: wx(), y: 78 + r() * 6  },
      { x: wx(), y: 66 + r() * 8  },
      { x: wx(), y: 54 + r() * 8  },
      { x: 22 + r() * 56, y: 44 + r() * 8 },
      { x: 35 + r() * 30, y: 38 + r() * 5 },
    ];
  } else if (phase === 1) {
    // Away build-up toward home goal (bottom of grass, y≈85)
    return [
      { x: wx(), y: 42 + r() * 6  },
      { x: wx(), y: 54 + r() * 8  },
      { x: wx(), y: 66 + r() * 8  },
      { x: 22 + r() * 56, y: 76 + r() * 8 },
      { x: 35 + r() * 30, y: 83 + r() * 4 },
    ];
  } else {
    // Midfield battle (y: 52–74)
    return [
      { x: wx(), y: 56 + r() * 12 },
      { x: wx(), y: 52 + r() * 10 },
      { x: wx(), y: 60 + r() * 12 },
      { x: wx(), y: 54 + r() * 10 },
    ];
  }
}

interface MatchSnap {
  homeTeam: Team; awayTeam: Team; isHome: boolean; report: MatchReport;
}

export function MatchDay() {
  const navigate = useNavigate();
  const { managedTeamId, currentMatchday, formation, fixtures, rosters, portrait, balance, setFormation, playMatchday, bribeReferee } = useGameStore();

  const myTeam = LEAGUE_TEAMS.find(t => t.id === managedTeamId)!;
  const nextFixture = fixtures.find(f =>
    f.matchday === currentMatchday && (f.homeTeamId === managedTeamId || f.awayTeamId === managedTeamId)
  );
  const isHome = nextFixture?.homeTeamId === managedTeamId;
  const opponentId = isHome ? nextFixture?.awayTeamId : nextFixture?.homeTeamId;
  const opponent = opponentId ? LEAGUE_TEAMS.find(t => t.id === opponentId) : null;

  const myPlayers = (rosters[managedTeamId] ?? []).filter(p => !p.injuredFor && !p.suspended);

  const referee = pickReferee(currentMatchday, managedTeamId);
  const [bribed, setBribed] = useState(false);
  const [phase, setPhase] = useState<'setup' | 'playing' | 'done'>('setup');
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [matchSnap, setMatchSnap] = useState<MatchSnap | null>(null);
  const [goalFlash, setGoalFlash] = useState(false);
  const goalFlashRef = useRef(false);
  const [ballPos, setBallPos] = useState({ x: 50, y: 50 });
  const [liveScore, setLiveScore] = useState({ home: 0, away: 0 });
  const [liveMinute, setLiveMinute] = useState(0);
  const [commentary, setCommentary] = useState<string[]>([]);

  const physRef = useRef({ x: 50, y: 50, minute: 0 });
  const ballTargetRef = useRef({ x: 50, y: 50 });
  const waypointQueueRef = useRef<{ x: number; y: number }[]>([]);
  const waypointIdxRef = useRef(0);
  const processedRef = useRef(new Set<string>());
  const commentaryRef = useRef<string[]>([]);
  const scoreRef = useRef({ home: 0, away: 0 });

  const handleKickOff = () => {
    if (!nextFixture || !opponent) return;

    const homePlayers = rosters[nextFixture.homeTeamId] ?? [];
    const awayPlayers = rosters[nextFixture.awayTeamId] ?? [];
    const homeTeam = isHome ? myTeam : opponent;
    const awayTeam = isHome ? opponent : myTeam;

    const report = simulateFullMatch(nextFixture, homeTeam, awayTeam, homePlayers, awayPlayers, formation);

    if (bribed) {
      const bonusGoal: MatchEvent = { minute: 3, type: 'goal', teamId: managedTeamId, playerName: 'Penalty (Ref decision)' };
      report.events.unshift(bonusGoal);
      if (nextFixture.homeTeamId === managedTeamId) {
        report.fixture = { ...report.fixture, homeGoals: (report.fixture.homeGoals ?? 0) + 1 };
      } else {
        report.fixture = { ...report.fixture, awayGoals: (report.fixture.awayGoals ?? 0) + 1 };
      }
    }

    const snap: MatchSnap = { homeTeam, awayTeam, isHome, report };
    setMatchSnap(snap);

    physRef.current = { x: 50, y: 50, minute: 0 };
    ballTargetRef.current = { x: 50, y: 50 };
    waypointQueueRef.current = [];
    waypointIdxRef.current = 0;
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

  useEffect(() => {
    if (phase !== 'playing' || !matchSnap) return;
    const { report, homeTeam, awayTeam } = matchSnap;

    const timer = setInterval(() => {
      if (goalFlashRef.current) return;
      const p = physRef.current;
      const target = ballTargetRef.current;

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
          // Teleport ball into the net right now (away net = top, home net = bottom)
          const netX = 38 + Math.random() * 24;
          const netY = scoringHome ? 38 + Math.random() * 6 : 81 + Math.random() * 6;
          p.x = netX; p.y = netY;
          ballTargetRef.current = { x: netX, y: netY };
          waypointQueueRef.current = [];
          setBallPos({ x: netX, y: netY });
          const msg = `⚽ GOAL! ${evt.minute}' ${evt.playerName} (${scoringHome ? homeTeam.name : awayTeam.name})`;
          commentaryRef.current = [msg, ...commentaryRef.current.slice(0, 49)];
          setLiveScore({ ...scoreRef.current });
          setCommentary([...commentaryRef.current]);
          goalFlashRef.current = true;
          setGoalFlash(true);
          setTimeout(() => { goalFlashRef.current = false; setGoalFlash(false); }, 3000);
        } else if (evt.type === 'yellow') {
          const msg = `🟨 ${evt.minute}' Yellow — ${evt.playerName}`;
          commentaryRef.current = [msg, ...commentaryRef.current.slice(0, 49)];
          setCommentary([...commentaryRef.current]);
          // Teleport ball to foul location and pause briefly
          const foulX = 15 + Math.random() * 70;
          const foulY = 42 + Math.random() * 42;
          p.x = foulX; p.y = foulY;
          ballTargetRef.current = { x: foulX, y: foulY };
          waypointQueueRef.current = [];
          setBallPos({ x: foulX, y: foulY });
          goalFlashRef.current = true;
          setTimeout(() => { goalFlashRef.current = false; }, 2000);
        }
      }

      if (Math.random() < 0.04) {
        const msg = GENERIC_COMMENTARY[Math.floor(Math.random() * GENERIC_COMMENTARY.length)];
        commentaryRef.current = [`${Math.floor(p.minute)}' ${msg}`, ...commentaryRef.current.slice(0, 49)];
        setCommentary([...commentaryRef.current]);
        if (msg.includes('Corner')) {
          const cx = Math.random() > 0.5 ? 3 : 97;
          const cy = Math.random() > 0.5 ? 39 : 85;
          p.x = cx; p.y = cy;
          ballTargetRef.current = { x: cx, y: cy };
          waypointQueueRef.current = [];
          setBallPos({ x: cx, y: cy });
          goalFlashRef.current = true;
          setTimeout(() => { goalFlashRef.current = false; }, 3000);
        } else if (msg.includes('Free kick')) {
          const fkX = 15 + Math.random() * 70;
          const fkY = 42 + Math.random() * 38;
          p.x = fkX; p.y = fkY;
          ballTargetRef.current = { x: fkX, y: fkY };
          waypointQueueRef.current = [];
          setBallPos({ x: fkX, y: fkY });
          goalFlashRef.current = true;
          setTimeout(() => { goalFlashRef.current = false; }, 3000);
        } else if (msg.includes('Shot blocked')) {
          const sbX = 25 + Math.random() * 50;
          const sbY = Math.random() > 0.5 ? 38 + Math.random() * 12 : 74 + Math.random() * 12;
          p.x = sbX; p.y = sbY;
          ballTargetRef.current = { x: sbX, y: sbY };
          waypointQueueRef.current = [];
          setBallPos({ x: sbX, y: sbY });
        }
      }

      // Advance ball along waypoint path
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 3) {
        waypointIdxRef.current++;
        if (waypointIdxRef.current >= waypointQueueRef.current.length) {
          waypointQueueRef.current = genBallPath(p.minute);
          waypointIdxRef.current = 0;
        }
        if (waypointQueueRef.current.length > 0) {
          ballTargetRef.current = waypointQueueRef.current[waypointIdxRef.current];
        }
      } else {
        const speed = 2.8 + Math.random() * 1.5;
        p.x = Math.max(2, Math.min(98, p.x + (dx / dist) * speed + (Math.random() - 0.5) * 0.6));
        p.y = Math.max(38, Math.min(87, p.y + (dy / dist) * speed + (Math.random() - 0.5) * 0.6));
      }

      setBallPos({ x: p.x, y: p.y });
      p.minute = Math.min(90, p.minute + 0.3);
      setLiveMinute(Math.floor(p.minute));

      if (p.minute >= 90) {
        clearInterval(timer);
        commentaryRef.current = ['🏁 Full Time!', ...commentaryRef.current.slice(0, 49)];
        setCommentary([...commentaryRef.current]);
        setLiveMinute(90);
        setPhase('done');
        setShowResultOverlay(true);
        setTimeout(() => setShowResultOverlay(false), 3000);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [phase, matchSnap]);

  if (!nextFixture || !opponent) {
    return (
      <Layout>
        <div style={{ background: '#0d1117', padding: '40px', textAlign: 'center', height: '100%', fontFamily: 'Arial' }}>
          <p style={{ color: '#94a3b8' }}>No match scheduled this matchday.</p>
          <button onClick={() => navigate('/season')} style={{ ...CARD, padding: '8px 20px', cursor: 'pointer', marginTop: '16px', color: '#e2e8f0', fontSize: '13px' }}>← Back to Season</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0d1117', fontFamily: 'Arial, system-ui' }}>
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
            referee={referee}
            balance={balance}
            bribed={bribed}
            onBribe={() => { bribeReferee(); setBribed(true); }}
          />
        )}

        {(phase === 'playing' || phase === 'done') && matchSnap && (
          <PlayingPhase
            snap={matchSnap}
            managedTeamId={managedTeamId}
            portrait={portrait}
            formation={formation}
            referee={referee}
            currentMatchday={currentMatchday}
            ballPos={ballPos}
            liveScore={liveScore}
            liveMinute={liveMinute}
            commentary={commentary}
            phase={phase}
            goalFlash={goalFlash}
            showResultOverlay={showResultOverlay}
            onDismissResult={() => setShowResultOverlay(false)}
            onSkip={() => {
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
                setShowResultOverlay(true);
                setTimeout(() => setShowResultOverlay(false), 3000);
              }
            }}
            onContinue={handleContinue}
          />
        )}
      </div>
    </Layout>
  );
}

// ── Setup Phase ──────────────────────────────────────────────────────────────

function SetupPhase({ myTeam, opponent, isHome, currentMatchday, myPlayers, formation, setFormation, onKickOff, referee, balance, bribed, onBribe }: {
  myTeam: Team; opponent: Team; isHome: boolean; currentMatchday: number;
  myPlayers: import('../types/game').Player[];
  formation: Formation; setFormation: (f: Formation) => void;
  onKickOff: () => void;
  referee: typeof REFEREES[0]; balance: number; bribed: boolean; onBribe: () => void;
}) {
  const POS_LABEL: Record<string, string> = { T: 'GK', V: 'DEF', M: 'MID', S: 'FWD' };
  const POS_COLOR: Record<string, string> = { T: '#f59e0b', V: '#60a5fa', M: '#4ade80', S: '#f87171' };

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>

      {/* Match header */}
      <div style={{ ...CARD, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={img(`wappen${String(myTeam.id).padStart(2, '0')}.png`)} style={{ width: '48px', height: '48px', imageRendering: 'pixelated' }} alt="" />
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#e2e8f0' }}>{myTeam.name}</div>
            <div style={{ fontSize: '11px', color: '#4ade80' }}>{isHome ? 'HOME' : 'AWAY'}</div>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: '#64748b' }}>MATCHDAY {currentMatchday}</div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', letterSpacing: '8px', color: '#ffffff', fontFamily: 'monospace', marginTop: '2px' }}>? - ?</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#e2e8f0' }}>{opponent.name}</div>
            <div style={{ fontSize: '11px', color: '#f87171' }}>{isHome ? 'AWAY' : 'HOME'}</div>
          </div>
          <img src={img(`wappen${String(opponent.id).padStart(2, '0')}.png`)} style={{ width: '48px', height: '48px', imageRendering: 'pixelated' }} alt="" />
        </div>
      </div>

      {/* Referee card */}
      <div style={{ ...CARD, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '52px', height: '52px', flexShrink: 0, overflow: 'hidden', borderRadius: '6px', background: '#000' }}>
          <img src={img(referee.img)} style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} alt="" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '1px' }}>TODAY'S REFEREE</div>
          <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#e2e8f0' }}>{referee.name}</div>
          <div style={{ display: 'inline-block', background: referee.color + '22', border: `1px solid ${referee.color}66`, color: referee.color, fontSize: '9px', fontWeight: 'bold', padding: '1px 6px', borderRadius: '3px', marginTop: '2px', letterSpacing: '0.5px' }}>{referee.style}</div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>{referee.desc}</div>
        </div>
        {referee.bribeable && !bribed && (
          <button disabled={balance < 100_000} onClick={onBribe} style={{
            flexShrink: 0, background: balance >= 100_000 ? '#451a03' : '#111',
            border: `1px solid ${balance >= 100_000 ? '#f59e0b' : '#2a2a1a'}`, borderRadius: '6px',
            color: balance >= 100_000 ? '#fbbf24' : '#444',
            padding: '8px 10px', cursor: balance >= 100_000 ? 'pointer' : 'default',
            fontSize: '11px', fontWeight: 'bold', textAlign: 'center', lineHeight: '1.4',
          }}>
            💰 BRIBE<br /><span style={{ fontSize: '10px' }}>£100,000</span>
          </button>
        )}
        {referee.bribeable && bribed && (
          <div style={{ flexShrink: 0, textAlign: 'center', color: '#4ade80', fontSize: '11px', fontWeight: 'bold' }}>
            ✓ BRIBED<br /><span style={{ fontSize: '9px', color: '#64748b', fontWeight: 'normal' }}>+1 goal bonus</span>
          </div>
        )}
        {!referee.bribeable && (
          <div style={{ flexShrink: 0, textAlign: 'center', color: '#374151', fontSize: '10px' }}>
            🔒 Cannot<br />be bribed
          </div>
        )}
      </div>

      {/* Formation picker */}
      <div style={{ ...CARD, padding: '12px' }}>
        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>TACTICAL SETUP</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {FORMATIONS.map(f => {
            const active = formation === f;
            return (
              <button key={f} onClick={() => setFormation(f)} style={{
                padding: '8px 12px', fontSize: '12px', cursor: 'pointer',
                background: active ? '#1e40af' : '#0d1117',
                color: active ? '#ffffff' : '#94a3b8',
                border: `1px solid ${active ? '#3b82f6' : '#28314a'}`,
                borderRadius: '6px', fontWeight: active ? 'bold' : 'normal',
              }}>
                <div>{f}</div>
                <div style={{ fontSize: '9px', opacity: 0.8 }}>{FORMATION_DESC[f]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Squad */}
      <div style={{ ...CARD, padding: '12px' }}>
        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>AVAILABLE SQUAD ({myPlayers.length})</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
          {myPlayers.map(p => (
            <div key={p.id} style={{ background: '#0d1117', padding: '4px 8px', fontSize: '11px', display: 'flex', gap: '4px', alignItems: 'center', border: '1px solid #1e2535', borderRadius: '4px' }}>
              <span style={{ fontWeight: 'bold', color: POS_COLOR[p.position], width: '26px', fontSize: '10px' }}>{POS_LABEL[p.position]}</span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#e2e8f0' }}>{p.name}</span>
              <span style={{ color: '#64748b', fontSize: '10px' }}>{p.skill}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onKickOff} style={{
        background: '#15803d', border: '1px solid #16a34a', borderRadius: '8px',
        color: '#ffffff', padding: '14px', fontSize: '16px', fontWeight: 'bold',
        cursor: 'pointer', letterSpacing: '3px',
      }}>
        ⚽ KICK OFF!
      </button>
    </div>
  );
}

// ── Playing Phase ─────────────────────────────────────────────────────────────

function PlayingPhase({ snap, managedTeamId, portrait, formation, referee, currentMatchday, ballPos, liveScore, liveMinute, commentary, phase, goalFlash, showResultOverlay, onDismissResult, onSkip, onContinue }: {
  snap: MatchSnap; managedTeamId: number; portrait: string;
  formation: Formation; referee: typeof REFEREES[0]; currentMatchday: number;
  ballPos: { x: number; y: number };
  liveScore: { home: number; away: number };
  liveMinute: number; commentary: string[];
  phase: 'playing' | 'done';
  goalFlash: boolean;
  showResultOverlay: boolean; onDismissResult: () => void;
  onSkip: () => void; onContinue: () => void;
}) {
  const { stadium, borderSponsors, table, managerName } = useGameStore();
  const { homeTeam, awayTeam, isHome, report } = snap;

  const myIsHome = homeTeam.id === managedTeamId;
  const myGoals = myIsHome ? liveScore.home : liveScore.away;
  const oppGoals = myIsHome ? liveScore.away : liveScore.home;
  const resultColor = phase === 'done'
    ? (myGoals > oppGoals ? '#4ade80' : myGoals === oppGoals ? '#60a5fa' : '#f87171')
    : '#ffffff';

  // Stadium image levels from upgrades (1–3)
  const pitchLevel  = stadium.pitch      as 1 | 2 | 3;
  const seatsLevel  = stadium.seats      as 1 | 2 | 3;
  const facilLevel  = stadium.facilities as 1 | 2 | 3;
  const lightsLevel = stadium.lights     as 1 | 2 | 3;

  // Table positions
  const myPos = table.findIndex(r => r.teamId === managedTeamId) + 1;
  const oppTeamId = myIsHome ? awayTeam.id : homeTeam.id;
  const oppPos = table.findIndex(r => r.teamId === oppTeamId) + 1;

  // Manager portraits
  const myPortrait = img(`${portrait}_1.png`);
  const oppPortraitId = ((isHome ? awayTeam.id : homeTeam.id) - 1) % 5 + 1;
  const oppPortrait = img(`manag${oppPortraitId}_2.png`);

  const myTeam = myIsHome ? homeTeam : awayTeam;
  const oppTeam = myIsHome ? awayTeam : homeTeam;

  if (phase === 'done' && !showResultOverlay) {
    const resultLabel = myGoals > oppGoals ? 'VICTORY!' : myGoals === oppGoals ? 'DRAW' : 'DEFEAT';
    const resultImg = myGoals > oppGoals ? 'sieg.png' : myGoals === oppGoals ? 'gleich.png' : 'loser.png';
    return (
      <div style={{ height: '100%', display: 'flex', background: '#0d1117', fontFamily: 'Arial, system-ui' }}>
        {/* Left: result image */}
        <div style={{ width: '38%', flexShrink: 0, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #1e2535', padding: '12px' }}>
          <img
            src={img(resultImg)}
            style={{ maxWidth: '100%', maxHeight: '70%', objectFit: 'contain', imageRendering: 'pixelated' }}
            alt=""
          />
          <div style={{ marginTop: '14px', fontWeight: 'bold', fontSize: '20px', color: resultColor, letterSpacing: '2px' }}>{resultLabel}</div>
          <div style={{ marginTop: '6px', fontSize: '28px', fontFamily: 'monospace', color: '#fff', fontWeight: 'bold' }}>
            {homeTeam.name} {liveScore.home} – {liveScore.away} {awayTeam.name}
          </div>
          <button onClick={onContinue} style={{
            marginTop: '20px', background: '#15803d', border: '1px solid #16a34a',
            color: '#fff', padding: '10px 28px', fontSize: '13px', fontWeight: 'bold',
            cursor: 'pointer', borderRadius: '6px', letterSpacing: '1px',
          }}>Continue →</button>
        </div>
        {/* Right: full commentary */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flexShrink: 0, padding: '10px 14px', borderBottom: '1px solid #1e2535', background: '#0a0010' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', letterSpacing: '1px' }}>MATCH REPORT</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', background: '#000814', fontFamily: 'monospace' }}>
            {commentary.map((line, i) => (
              <div key={i} style={{
                color: i === 0 ? '#ffff00' : line.startsWith('⚽') ? '#4ade80' : line.startsWith('🟨') ? '#f59e0b' : '#88ff88',
                fontSize: '11px', lineHeight: '1.6', padding: '2px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>{line}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* ── Main row: stadium+pitch | right panel ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>

        {/* Stadium + Pitch
             Canvas: 400×308px (stli:118 + anzeig:145 + stre:137 = 400 wide;
             top:123 + trib:65 + felda:120 = 308 tall)
             Percentages: top=39.9%  trib=21.1%  pitch=39% */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#001428' }}>

          {/* Top row (39.9%): stli | anzeig | stre side-by-side */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '39.9%', display: 'flex' }}>
            <img src={img(`stli${lightsLevel}.png`)} style={{ width: '29.5%', height: '100%', objectFit: 'fill', imageRendering: 'pixelated', flexShrink: 0 }} alt="" />
            <img src={img(`anzeig${facilLevel}.png`)} style={{ flex: 1, height: '100%', objectFit: 'fill', imageRendering: 'pixelated' }} alt="" />
            <img src={img(`stre${lightsLevel}.png`)} style={{ width: '34.25%', height: '100%', objectFit: 'fill', imageRendering: 'pixelated', flexShrink: 0 }} alt="" />
          </div>

          {/* Tribune / stands (21.1%) — between top row and pitch */}
          {/* pillar-align: left: seatsLevel >= 2 ? '-2%' : 0, width: seatsLevel >= 2 ? '102%' : '100%' */}
          <img src={img(`trib${seatsLevel}.png`)} style={{
            position: 'absolute', top: '39.9%',
            left: 0, width: '100%',
            height: '21.1%',
            objectFit: 'fill', imageRendering: 'pixelated',
          }} alt="" />

          {/* Pitch (39%) — anchored to bottom */}
          <img src={img(`felda${pitchLevel}.png`)} style={{
            position: 'absolute', bottom: 0, left: 0, width: '100%', height: '39%',
            objectFit: 'fill', imageRendering: 'pixelated',
          }} alt="" />

          {/* Scoreboard — overlaid on anzeig image, no background */}
          <div style={{
            position: 'absolute', top: 0, left: '29.5%', width: '36.25%', height: '39.9%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10, pointerEvents: 'none',
          }}>
            {goalFlash ? (
              <div style={{ color: '#ffffff', fontSize: '40px', fontWeight: 'bold', letterSpacing: '10px', fontFamily: 'Arial Black, Arial', textShadow: '0 0 24px #ffdd00, 0 2px 8px #000', textAlign: 'center', whiteSpace: 'nowrap' }}>
                G O A L ! ! !
              </div>
            ) : (
              <div style={{ width: '92%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                  {/* Home team */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                    {facilLevel >= 3 && (
                      <img src={img(`wappen${String(homeTeam.id).padStart(2, '0')}.png`)} style={{ width: '36px', height: '36px', imageRendering: 'pixelated', flexShrink: 0 }} alt="" />
                    )}
                    <div style={{ color: '#ffffff', fontSize: '11px', fontWeight: 'bold', textShadow: '0 1px 3px #000', textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word' }}>
                      {homeTeam.name}
                    </div>
                  </div>
                  {/* Score */}
                  <div style={{ color: '#ffffff', fontSize: '38px', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '4px', textShadow: '0 2px 6px #000', flexShrink: 0 }}>
                    {liveScore.home}:{liveScore.away}
                  </div>
                  {/* Away team */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                    {facilLevel >= 3 && (
                      <img src={img(`wappen${String(awayTeam.id).padStart(2, '0')}.png`)} style={{ width: '36px', height: '36px', imageRendering: 'pixelated', flexShrink: 0 }} alt="" />
                    )}
                    <div style={{ color: '#ffffff', fontSize: '11px', fontWeight: 'bold', textShadow: '0 1px 3px #000', textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word' }}>
                      {awayTeam.name}
                    </div>
                  </div>
                </div>
                <div style={{ color: '#cccccc', fontSize: '14px', fontFamily: 'monospace', textShadow: '0 1px 2px #000' }}>{liveMinute}'</div>
              </div>
            )}
          </div>

          {/* Sponsor hoarding — at the bottom of the crowd / top of pitch */}
          <div style={{
            position: 'absolute', top: '46%', left: 0, right: 0, height: '4.5%',
            background: '#cc0000', display: 'flex', alignItems: 'center', overflow: 'hidden', zIndex: 8,
          }}>
            {borderSponsors.length > 0 ? borderSponsors.map((d, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', color: '#fff', fontWeight: '900', fontSize: '9px', fontFamily: 'Impact, Arial Black, Arial', letterSpacing: '2px' }}>
                {d.name}
              </div>
            )) : (
              <div style={{ flex: 1, textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '8px', letterSpacing: '3px', fontFamily: 'Impact, Arial Black, Arial' }}>
                YOUR SPONSOR HERE
              </div>
            )}
          </div>

          {/* Ball — transparent overlay on the pitch area */}
          <div style={{ position: 'absolute', left: '7%', right: '7%', top: '63%', bottom: '3%', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', left: `${ballPos.x}%`, top: `${ballPos.y}%`,
              transform: 'translate(-50%, -50%)', fontSize: '28px', lineHeight: '1',
              transition: phase === 'playing' ? 'left 0.12s linear, top 0.12s linear' : 'none',
              zIndex: 10, pointerEvents: 'none',
            }}>⚽</div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div style={{ width: '96px', flexShrink: 0, background: '#0a0a18', borderLeft: '1px solid #1e2535', display: 'flex', flexDirection: 'column' }}>

          {/* Referee image / Result image */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: '#c8c8d0', borderBottom: '1px solid #1e2535' }}>
            {phase === 'done' ? (
              <img src={img(myGoals > oppGoals ? 'sieg.png' : myGoals === oppGoals ? 'gleich.png' : 'loser.png')} style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} alt="" />
            ) : (
              <img src={img(referee.img)} style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} alt="" />
            )}
          </div>

          {/* Clock pie */}
          <div style={{ flexShrink: 0, padding: '8px 6px', textAlign: 'center', borderBottom: '1px solid #1e2535' }}>
            <ClockPie minute={liveMinute} />
          </div>

          {/* Skip / Continue */}
          <div style={{ flexShrink: 0, padding: '6px' }}>
            {phase === 'playing' && (
              <button onClick={onSkip} style={{
                width: '100%', background: '#161b27', border: '1px solid #28314a',
                color: '#94a3b8', padding: '7px 0', fontSize: '10px', cursor: 'pointer', borderRadius: '4px',
              }}>Skip ▶▶</button>
            )}
            {phase === 'done' && (
              <>
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '11px', color: resultColor, marginBottom: '4px' }}>
                  {myGoals > oppGoals ? 'VICTORY!' : myGoals === oppGoals ? 'DRAW' : 'DEFEAT'}
                </div>
                <button onClick={onContinue} style={{
                  width: '100%', background: '#15803d', border: '1px solid #16a34a',
                  color: '#fff', padding: '7px 0', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px',
                }}>Continue →</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom strip: home | commentary | away ── */}
      <div style={{ flexShrink: 0, height: '84px', display: 'flex', borderTop: '1px solid #1e2535', background: '#0d1117' }}>

        {/* Home team */}
        <div style={{ width: '88px', flexShrink: 0, borderRight: '1px solid #1e2535', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'hidden', background: '#1a1a3a' }}>
            <img src={myIsHome ? myPortrait : oppPortrait} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} alt="" onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
          </div>
          <div style={{ background: '#000', padding: '2px 4px', fontSize: '8px', color: '#94a3b8', textAlign: 'center' }}>
            <div>{homeTeam.name}</div>
            <div style={{ color: '#4488aa' }}>{myIsHome ? managerName : homeTeam.managerName}</div>
            <div style={{ color: '#888' }}>{myIsHome ? myPos : oppPos}. Position</div>
          </div>
        </div>

        {/* Commentary + score header */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ background: '#0a0010', borderBottom: '1px solid #1e2535', padding: '2px 10px', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', flexShrink: 0 }}>
            <span style={{ fontWeight: 'bold', color: '#94a3b8' }}>{homeTeam.name}</span>
            <span style={{ color: '#ffff00', fontWeight: 'bold' }}>{liveScore.home} – {liveScore.away}</span>
            <span style={{ fontWeight: 'bold', color: '#94a3b8' }}>{awayTeam.name}</span>
          </div>
          <div style={{ flex: 1, background: '#000814', padding: '4px 8px', overflow: 'hidden', fontFamily: 'monospace' }}>
            {commentary.slice(0, 4).map((line, i) => (
              <div key={i} style={{
                color: i === 0 ? '#ffff00' : '#88ff88',
                fontSize: '10px', lineHeight: '1.55', opacity: 1 - i * 0.22,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {line}
              </div>
            ))}
          </div>
        </div>

        {/* Away team */}
        <div style={{ width: '88px', flexShrink: 0, borderLeft: '1px solid #1e2535', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'hidden', background: '#1a1a3a' }}>
            <img src={myIsHome ? oppPortrait : myPortrait} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} alt="" onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0'; }} />
          </div>
          <div style={{ background: '#000', padding: '2px 4px', fontSize: '8px', color: '#94a3b8', textAlign: 'center' }}>
            <div>{awayTeam.name}</div>
            <div style={{ color: '#4488aa' }}>{myIsHome ? awayTeam.managerName : managerName}</div>
            <div style={{ color: '#888' }}>{myIsHome ? oppPos : myPos}. Position</div>
          </div>
        </div>
      </div>
      {/* Full-screen result overlay */}
      {showResultOverlay && (
        <div onClick={onDismissResult} style={{
          position: 'absolute', inset: 0, zIndex: 200, cursor: 'pointer',
          background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <img
            src={img(myGoals > oppGoals ? 'sieg.png' : myGoals === oppGoals ? 'gleich.png' : 'loser.png')}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', imageRendering: 'pixelated' }}
            alt=""
          />
        </div>
      )}
    </div>
  );
}

function ClockPie({ minute }: { minute: number }) {
  const pct = Math.round((minute / 90) * 100);
  return (
    <div style={{ position: 'relative', width: '58px', height: '58px', margin: '0 auto' }}>
      <div style={{
        width: '58px', height: '58px', borderRadius: '50%',
        background: `conic-gradient(#4ade80 ${pct * 3.6}deg, #1e2535 ${pct * 3.6}deg)`,
        border: '2px solid #28314a',
      }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <span style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold', fontFamily: 'monospace', lineHeight: 1 }}>{minute}'</span>
      </div>
    </div>
  );
}
