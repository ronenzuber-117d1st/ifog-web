import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { LEAGUE_TEAMS } from '../data/teams';
import { Layout } from '../components/Layout';
import { img } from '../utils/images';
import type { Formation, MatchEvent, MatchReport, Team, Player } from '../types/game';
import { simulateFullMatch } from '../engine/matchEngine';

function MatchTeamLogo({ team, side }: { team: Team; side: 'home' | 'away' }) {
  const src = img(`wappen${String(team.id).padStart(2, '0')}.png`);
  const accent = side === 'home' ? '#6aa8ff' : '#ff6b63';
  const bg = side === 'home' ? '#14244a' : '#3a1418';
  const fallbackColor = side === 'home' ? '#6aa8ff' : '#ff8a83';
  const initials = team.name.slice(0, 3).toUpperCase();
  return (
    <div style={{ width: 68, height: 68, borderRadius: '50%', border: `3px solid ${accent}`, background: bg, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <img
        src={src}
        alt={team.name}
        style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3 }}
        onError={e => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
          (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
        }}
      />
      {/* fallback: initials */}
      <span style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800, fontSize: 20, color: fallbackColor }}>
        {initials}
      </span>
    </div>
  );
}

const REFEREES = [
  { name: 'R. Ironside',  style: 'STRICT',      desc: 'Books everything. Zero tolerance.',      bribeable: false, color: '#f87171', img: 'schieds4.png' },
  { name: 'P. Softglove', style: 'LENIENT',     desc: 'Easy-going. Lets the game flow.',        bribeable: false, color: '#4ade80', img: 'schieds5.png' },
  { name: 'T. Steadman',  style: 'VETERAN',     desc: 'Fair and consistent. Hard to rattle.',   bribeable: false, color: '#60a5fa', img: 'schieds3.png' },
  { name: 'D. Slippery',  style: 'DODGY',       desc: 'Known for flexible interpretations.',    bribeable: true,  color: '#f59e0b', img: 'schieds2.png' },
  { name: 'B. Bumble',    style: 'INCOMPETENT', desc: 'Bewildered. Open to persuasion.',        bribeable: false, color: '#c084fc', img: 'schieds1.png' },
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

const POS_LABEL: Record<string, string> = { T: 'GK', V: 'DEF', M: 'MID', S: 'FWD' };
const POS_COLOR: Record<string, string> = { T: '#f59e0b', V: '#60a5fa', M: '#4ade80', S: '#f87171' };

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

  const [halftime, setHalftime] = useState(false);
  const halftimeRef = useRef(false);
  const halftimeDoneRef = useRef(false);

  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const speedRef = useRef<1 | 2 | 4>(1);
  const handleSetSpeed = (s: 1 | 2 | 4) => { speedRef.current = s; setSpeed(s); };

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

    halftimeRef.current = false;
    halftimeDoneRef.current = false;
    setHalftime(false);
    speedRef.current = 1;
    setSpeed(1);
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

  const handleResumeHalftime = () => {
    halftimeRef.current = false;
    setHalftime(false);
  };

  useEffect(() => {
    if (phase !== 'playing' || !matchSnap) return;
    const { report, homeTeam, awayTeam } = matchSnap;

    const timer = setInterval(() => {
      if (goalFlashRef.current) return;
      if (halftimeRef.current) return;
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
      p.minute = Math.min(90, p.minute + 0.3 * speedRef.current);
      setLiveMinute(Math.floor(p.minute));

      if (p.minute >= 45 && !halftimeDoneRef.current) {
        halftimeDoneRef.current = true;
        halftimeRef.current = true;
        p.minute = 45;
        setLiveMinute(45);
        commentaryRef.current = ['⏱ Half Time!', ...commentaryRef.current.slice(0, 49)];
        setCommentary([...commentaryRef.current]);
        setHalftime(true);
        return;
      }

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
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
            halftime={halftime}
            onResumeHalftime={handleResumeHalftime}
            speed={speed}
            onSpeedChange={handleSetSpeed}
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
  myPlayers: Player[];
  formation: Formation; setFormation: (f: Formation) => void;
  onKickOff: () => void;
  referee: typeof REFEREES[0]; balance: number; bribed: boolean; onBribe: () => void;
}) {
  const { managerName } = useGameStore();
  const [refHover, setRefHover] = useState(false);

  // Auto-select XI based on formation
  const formLines = formation.split('-').map(Number);
  const need: Record<string, number> = { T: 1, V: formLines[0], M: formLines[1], S: formLines[2] };
  const byPos: Record<string, Player[]> = { T: [], V: [], M: [], S: [] };
  for (const pos of ['T', 'V', 'M', 'S']) {
    byPos[pos] = myPlayers.filter(p => p.position === pos).sort((a, b) => b.skill - a.skill).slice(0, need[pos]);
  }
  const allXI = [...byPos.T, ...byPos.V, ...byPos.M, ...byPos.S];
  const pickedIds = new Set(allXI.map(p => p.id));

  const pitchPos = getFormationPositions(formation, true);
  const xiWithPos = allXI.map((p, i) => ({ player: p, x: pitchPos[i]?.x ?? 50, y: pitchPos[i]?.y ?? 50 }));

  const avg = (arr: Player[]) => arr.length > 0 ? arr.reduce((s, p) => s + p.skill, 0) / arr.length : 0;
  const fwdAvg = avg(byPos.S);
  const midAvg = avg(byPos.M);
  const defAvg = avg([...byPos.T, ...byPos.V]);
  const overall = avg(allXI);

  const homeTeam = isHome ? myTeam : opponent;
  const awayTeam = isHome ? opponent : myTeam;
  const homeAbbr = homeTeam.name.slice(0, 3).toUpperCase();
  const awayAbbr = awayTeam.name.slice(0, 3).toUpperCase();

  const sortedPlayers = [...myPlayers].sort((a, b) => {
    const order = ['T', 'V', 'M', 'S'];
    const pa = order.indexOf(a.position), pb = order.indexOf(b.position);
    return pa !== pb ? pa - pb : b.skill - a.skill;
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#070b16', fontFamily: "'Barlow', system-ui", overflow: 'hidden' }}>

      {/* ── Match banner ── */}
      <section style={{ flexShrink: 0, height: 120, display: 'grid', gridTemplateColumns: '1fr 260px 1fr', alignItems: 'center', background: '#0f1628', margin: '16px 20px 0', borderRadius: 16, border: '1px solid #1c2640', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 40% 120% at 0% 50%, rgba(106,168,255,0.16), transparent 70%), radial-gradient(ellipse 40% 120% at 100% 50%, rgba(232,72,72,0.16), transparent 70%)', pointerEvents: 'none' }} />

        {/* Home */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingLeft: 28, position: 'relative' }}>
          <MatchTeamLogo team={homeTeam} side="home" />
          <div>
            <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800, fontSize: 36, textTransform: 'uppercase', lineHeight: 1 }}>{homeTeam.name}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
              <span style={{ padding: '2px 8px', borderRadius: 4, background: isHome ? '#c8f53d' : '#1c2a4e', color: isHome ? '#070b16' : '#9cc4ff', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em' }}>{isHome ? 'YOU · HOME' : 'HOME'}</span>
              <span style={{ fontSize: 13, color: '#8d99b5' }}>{isHome ? managerName : homeTeam.managerName}</span>
            </div>
          </div>
        </div>

        {/* VS */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8d99b5' }}>Matchday {currentMatchday} · League</div>
          <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 52, lineHeight: 1, color: '#3a4768' }}>VS</div>
        </div>

        {/* Away */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingRight: 28, justifyContent: 'flex-end', position: 'relative' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800, fontSize: 36, textTransform: 'uppercase', lineHeight: 1 }}>{awayTeam.name}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 13, color: '#8d99b5' }}>{isHome ? opponent.managerName : managerName}</span>
              <span style={{ padding: '2px 8px', borderRadius: 4, background: !isHome ? '#c8f53d' : '#1c2a4e', color: !isHome ? '#070b16' : '#9cc4ff', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em' }}>{!isHome ? 'YOU · AWAY' : 'AWAY'}</span>
            </div>
          </div>
          <MatchTeamLogo team={awayTeam} side="away" />
        </div>
      </section>

      {/* ── 3-column main ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '390px 1fr 320px', gap: 16, padding: '16px 20px 20px', minHeight: 0 }}>

        {/* ── Left: Tactics + Pitch ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 18, borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexShrink: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>Tactics</div>
            <div style={{ fontSize: 13, color: '#c8f53d', fontWeight: 600 }}>{FORMATION_DESC[formation]}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5, flexShrink: 0 }}>
            {FORMATIONS.map(f => (
              <button key={f} onClick={() => setFormation(f)} style={{
                height: 40, borderRadius: 8, border: `1px solid ${f === formation ? '#c8f53d' : '#2a3656'}`,
                background: f === formation ? '#c8f53d' : '#131c33',
                color: f === formation ? '#070b16' : '#c2cbe0',
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, cursor: 'pointer',
              }}>{f}</button>
            ))}
          </div>
          {/* Pitch */}
          <div style={{ flex: 1, position: 'relative', borderRadius: 12, overflow: 'hidden', background: 'repeating-linear-gradient(180deg, #16502f 0px 46px, #185935 46px 92px)', border: '1px solid #23704a', minHeight: 0 }}>
            <div style={{ position: 'absolute', inset: 12, border: '2px solid rgba(255,255,255,0.35)', borderRadius: 4 }} />
            <div style={{ position: 'absolute', left: 12, right: 12, top: '50%', height: 0, borderTop: '2px solid rgba(255,255,255,0.35)' }} />
            <div style={{ position: 'absolute', left: '50%', top: '50%', width: 80, height: 80, marginLeft: -40, marginTop: -40, border: '2px solid rgba(255,255,255,0.35)', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', left: '50%', bottom: 12, width: 150, height: 56, marginLeft: -75, border: '2px solid rgba(255,255,255,0.35)', borderBottom: 0 }} />
            <div style={{ position: 'absolute', left: '50%', top: 12, width: 150, height: 56, marginLeft: -75, border: '2px solid rgba(255,255,255,0.35)', borderTop: 0 }} />
            <div style={{ position: 'absolute', left: 0, right: 0, top: 18, textAlign: 'center', fontSize: 10, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)' }}>ATTACKING ↑</div>
            {xiWithPos.map(({ player, x, y }, i) => (
              <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, width: 76 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e8484d', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13, color: '#fff', boxShadow: '0 3px 8px rgba(0,0,0,0.4)', flexShrink: 0 }}>{player.skill}</div>
                <div style={{ padding: '1px 5px', borderRadius: 4, background: 'rgba(7,11,22,0.8)', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', color: '#e8edf7' }}>{player.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Center: Squad ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 18, borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexShrink: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>Squad</div>
            <div style={{ fontSize: 13, color: '#8d99b5' }}><span style={{ color: '#c8f53d', fontWeight: 700 }}>{allXI.length}</span> selected · {myPlayers.length} available</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 120px 28px 36px', gap: 8, padding: '0 8px', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7797', flexShrink: 0 }}>
            <div>Pos</div><div>Player</div><div>Form</div><div style={{ textAlign: 'right' }}>Rtg</div><div style={{ textAlign: 'right' }}>XI</div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {sortedPlayers.map(p => {
              const inXI = pickedIds.has(p.id);
              return (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '48px 1fr 120px 28px 36px', gap: 8, alignItems: 'center', height: 34, padding: '0 8px', borderRadius: 8, background: inXI ? '#141d36' : 'transparent', opacity: inXI ? 1 : 0.55 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, color: POS_COLOR[p.position] }}>{POS_LABEL[p.position]}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#e8edf7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ height: 6, borderRadius: 3, background: '#1f2945', overflow: 'hidden' }}>
                    <div style={{ height: 6, width: `${p.skill * 10}%`, background: POS_COLOR[p.position], borderRadius: 3 }} />
                  </div>
                  <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13 }}>{p.skill}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {inXI && (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#c8f53d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#070b16" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: Referee + Strength + Kick off ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>

          {/* Scrollable cards area */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Referee card */}
          <div style={{ padding: 18, borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>Today's Referee</div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div
                onMouseEnter={() => setRefHover(true)}
                onMouseLeave={() => setRefHover(false)}
                style={{ width: 72, height: 100, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1px solid #1c2640', cursor: 'zoom-in', transform: refHover ? 'scale(1.5)' : 'scale(1)', transformOrigin: 'top left', transition: 'transform 0.2s ease', position: 'relative', zIndex: refHover ? 10 : 1 }}
              >
                <img src={img(referee.img)} style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }} alt="" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800, fontSize: 24, lineHeight: 1 }}>{referee.name}</div>
                <div style={{ alignSelf: 'flex-start', padding: '3px 8px', borderRadius: 4, background: bribed ? '#f5b94a' : referee.color + '22', color: bribed ? '#070b16' : referee.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em' }}>{bribed ? 'PERSUADED' : referee.style}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#a9b3cb', fontStyle: 'italic' }}>{bribed ? '"I didn\'t see anything. I never do."' : referee.desc}</div>
            {referee.bribeable && !bribed && (
              <button onClick={onBribe} disabled={balance < 100_000} style={{
                height: 46, borderRadius: 10, border: `1px solid ${balance >= 100_000 ? '#f5b94a' : '#2a3656'}`,
                background: balance >= 100_000 ? 'rgba(245,185,74,0.1)' : '#131c33',
                color: balance >= 100_000 ? '#f5c76b' : '#4b5675',
                fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                cursor: balance >= 100_000 ? 'pointer' : 'default',
              }}>
                💰 Slip him £100,000
              </button>
            )}
            {referee.bribeable && bribed && (
              <button onClick={onBribe} style={{ height: 46, borderRadius: 10, border: '1px solid #2a3656', background: '#131c33', color: '#8d99b5', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Envelope delivered · Undo
              </button>
            )}
            {!referee.bribeable && (
              <div style={{ height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#374151' }}>🔒 Cannot be bribed</div>
            )}
          </div>

          {/* XI Strength */}
          <div style={{ padding: 18, borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>Starting XI Strength</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 20, color: '#c8f53d' }}>{overall.toFixed(1)}</div>
            </div>
            {([
              { label: 'Attack',  v: fwdAvg, color: '#ff7a6b' },
              { label: 'Midfield', v: midAvg, color: '#5fd49a' },
              { label: 'Defence', v: defAvg, color: '#7fb2ff' },
            ] as const).map(line => (
              <div key={line.label} style={{ display: 'grid', gridTemplateColumns: '68px 1fr 36px', gap: 10, alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: '#a9b3cb', fontWeight: 600 }}>{line.label}</div>
                <div style={{ height: 8, borderRadius: 4, background: '#1f2945', overflow: 'hidden' }}>
                  <div style={{ height: 8, width: `${line.v * 10}%`, background: line.color, borderRadius: 4 }} />
                </div>
                <div style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700 }}>{line.v.toFixed(1)}</div>
              </div>
            ))}
          </div>

          </div>{/* end scrollable cards */}

          {/* KICK OFF */}
          <button onClick={onKickOff} style={{
            height: 48, flexShrink: 0, borderRadius: 12, border: 0,
            background: '#c8f53d', color: '#070b16',
            fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 22, letterSpacing: '0.14em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: '0 6px 20px rgba(200,245,61,0.22)', cursor: 'pointer',
          }}>
            Kick off
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Playing Phase ─────────────────────────────────────────────────────────────

function PlayingPhase({ snap, managedTeamId, portrait, formation, referee, currentMatchday, ballPos, liveScore, liveMinute, commentary, phase, goalFlash, showResultOverlay, onDismissResult, onSkip, halftime, onResumeHalftime, speed, onSpeedChange, onContinue }: {
  snap: MatchSnap; managedTeamId: number; portrait: string;
  formation: Formation; referee: typeof REFEREES[0]; currentMatchday: number;
  ballPos: { x: number; y: number };
  liveScore: { home: number; away: number };
  liveMinute: number; commentary: string[];
  phase: 'playing' | 'done';
  goalFlash: boolean;
  showResultOverlay: boolean; onDismissResult: () => void;
  onSkip: () => void; halftime: boolean; onResumeHalftime: () => void;
  speed: 1 | 2 | 4; onSpeedChange: (s: 1 | 2 | 4) => void; onContinue: () => void;
}) {
  const { stadium, borderSponsors, table, managerName, rosters, ticketSales } = useGameStore();
  const { homeTeam, awayTeam, isHome, report } = snap;

  const allMyPlayers = (rosters[managedTeamId] ?? []).filter(p => !p.injuredFor && !p.suspended);
  const [showAction, setShowAction] = useState(false);
  const [subsLeft, setSubsLeft] = useState(3);
  const [matchSquad, setMatchSquad] = useState<Player[]>(() => allMyPlayers.slice(0, 11));
  const [matchBench, setMatchBench] = useState<Player[]>(() => allMyPlayers.slice(11));
  const [selectedOut, setSelectedOut] = useState<string | null>(null);
  const [selectedIn, setSelectedIn] = useState<string | null>(null);
  const [aggression, setAggression] = useState(50);

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

  // Attendance from ticket sales
  const attendance = Array.isArray(ticketSales) ? (ticketSales as number[]).reduce((a, b) => a + b, 0) : 0;

  // Team abbreviations for scoreboard circles
  const homeAbbr = homeTeam.name.slice(0, 3).toUpperCase();
  const awayAbbr = awayTeam.name.slice(0, 3).toUpperCase();

  // Live scorers text
  const homeScorers = report.events.filter(e => e.type === 'goal' && e.teamId === homeTeam.id && e.minute <= liveMinute).map(e => `${e.playerName} ${e.minute}'`).join(' · ');
  const awayScorers = report.events.filter(e => e.type === 'goal' && e.teamId === awayTeam.id && e.minute <= liveMinute).map(e => `${e.playerName} ${e.minute}'`).join(' · ');

  // Timeline event markers
  const timelineMarks = report.events.filter(e => e.minute <= liveMinute).map(e => {
    const isHomeEvt = e.teamId === homeTeam.id;
    const isCard = e.type === 'yellow';
    return {
      x: Math.round((e.minute / 90) * 1000) / 10,
      top: isHomeEvt ? 0 : 29,
      label: (isCard ? 'YC ' : 'GOAL ') + e.minute + "'",
      bg: isCard ? '#f5b94a' : isHomeEvt ? '#6aa8ff' : '#ff5a52',
      fg: isCard ? '#070b16' : isHomeEvt ? '#070b16' : '#ffffff',
    };
  });

  // Match stats derived from events + seeded pseudorandom
  const seed = homeTeam.id * 31 + awayTeam.id * 17;
  const pct = Math.min(1, liveMinute / 90);
  const evts = report.events.filter(e => e.minute <= liveMinute);
  const hG = evts.filter(e => e.type === 'goal' && e.teamId === homeTeam.id).length;
  const aG = evts.filter(e => e.type === 'goal' && e.teamId !== homeTeam.id).length;
  const hC = evts.filter(e => e.type === 'yellow' && e.teamId === homeTeam.id).length;
  const aC = evts.filter(e => e.type === 'yellow' && e.teamId !== homeTeam.id).length;
  const hShots = hG * 3 + Math.floor((3 + (seed % 5)) * pct);
  const aShots = aG * 3 + Math.floor((4 + ((seed * 7) % 5)) * pct);
  const total = hShots + aShots;
  const matchStats = [
    { label: 'Possession %', a: total > 0 ? Math.round((hShots / total) * 100) : 50, b: total > 0 ? Math.round((aShots / total) * 100) : 50 },
    { label: 'Shots', a: hShots, b: aShots },
    { label: 'On target', a: Math.min(hShots, hG + Math.floor(hShots * 0.35)), b: Math.min(aShots, aG + Math.floor(aShots * 0.35)) },
    { label: 'Corners', a: Math.floor((2 + (seed % 4)) * pct), b: Math.floor((3 + ((seed * 3) % 4)) * pct) },
    { label: 'Fouls', a: hC * 2 + Math.floor((3 + (seed % 3)) * pct), b: aC * 2 + Math.floor((4 + ((seed * 5) % 4)) * pct) },
  ].map(s => ({ ...s, pa: s.a + s.b > 0 ? Math.round((s.a / (s.a + s.b)) * 100) : 50 }));

  if (phase === 'done' && !showResultOverlay) {
    const resultLabel = myGoals > oppGoals ? 'VICTORY!' : myGoals === oppGoals ? 'DRAW' : 'DEFEAT';
    const resultImg = myGoals > oppGoals ? 'sieg.png' : myGoals === oppGoals ? 'gleich.png' : 'loser.png';
    const resultAccent = myGoals > oppGoals ? '#c8f53d' : myGoals === oppGoals ? '#6aa8ff' : '#ff5a52';
    return (
      <div style={{ height: '100%', display: 'flex', background: '#070b16', fontFamily: 'Barlow, system-ui' }}>
        <div style={{ width: '36%', flexShrink: 0, background: '#0f1628', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #1c2640', padding: '20px', gap: 12 }}>
          <img src={img(resultImg)} style={{ maxWidth: '100%', maxHeight: '52%', objectFit: 'contain', imageRendering: 'pixelated' }} alt="" />
          <div style={{ fontFamily: "'Big Shoulders Display', Impact, Arial Black", fontWeight: 900, fontSize: 32, color: resultAccent, letterSpacing: 3 }}>{resultLabel}</div>
          <div style={{ fontFamily: "'JetBrains Mono', Consolas, monospace", fontSize: 20, color: '#fff', fontWeight: 700 }}>
            {homeTeam.name} {liveScore.home} – {liveScore.away} {awayTeam.name}
          </div>
          <button onClick={onContinue} style={{ marginTop: 8, background: '#c8f53d', border: 'none', color: '#070b16', padding: '12px 36px', fontSize: 15, fontWeight: 900, cursor: 'pointer', borderRadius: 10, fontFamily: "'Big Shoulders Display', Impact", letterSpacing: 2 }}>
            CONTINUE →
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0f1d' }}>
          <div style={{ flexShrink: 0, padding: '10px 18px', borderBottom: '1px solid #1c2640' }}>
            <span style={{ fontSize: 11, color: '#8d99b5', fontWeight: 700, letterSpacing: 2 }}>MATCH REPORT</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {commentary.map((line, i) => {
              const isGoal = line.startsWith('⚽ GOAL!');
              const isCard = line.startsWith('🟨');
              const min = line.match(/(\d+)'/)?.[1] ?? '';
              const text = line.replace(/^[⚽🟨⏱🏁]\s*/, '').replace(/^\d+'\s*/, '');
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 8, padding: '5px 8px', borderRadius: 6, background: isGoal ? 'rgba(106,168,255,0.1)' : isCard ? 'rgba(245,185,74,0.07)' : 'transparent' }}>
                  <div style={{ fontFamily: "'JetBrains Mono', Consolas, monospace", fontSize: 12, fontWeight: 700, color: isGoal ? '#9cc4ff' : isCard ? '#f5c76b' : '#4b5675' }}>{min ? `${min}'` : ''}</div>
                  <div style={{ fontSize: 13, color: isGoal ? '#fff' : '#c2cbe0', fontWeight: isGoal ? 700 : 400 }}>{text}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Parse commentary into feed rows
  const feedRows = commentary.map((line, i) => {
    const isGoal = line.startsWith('⚽ GOAL!');
    const isCard = line.startsWith('🟨');
    const min = line.match(/(\d+)'/)?.[1] ?? '';
    const text = line.replace(/^[⚽🟨⏱🏁]\s*/, '').replace(/^\d+'\s*/, '');
    return { key: i, isGoal, isCard, min, text };
  });

  // Last goal for GOAL! banner
  const lastGoalLine = goalFlash ? commentary.find(l => l.startsWith('⚽ GOAL!')) ?? null : null;
  const goalBanner = (() => {
    if (!lastGoalLine) return null;
    const m = lastGoalLine.match(/GOAL! (\d+)' (.+?) \((.+?)\)/);
    if (!m) return null;
    const teamName = m[3];
    const isHomeGoal = teamName === homeTeam.name;
    const h = liveScore.home, a = liveScore.away;
    const lead = h > a ? `${teamName} lead ${h}–${a}` : h < a ? `${teamName} trail ${h}–${a}` : `Level ${h}–${a}`;
    return { abbr: teamName.slice(0, 3).toUpperCase(), scorer: m[2], minute: m[1], lead, isHome: isHomeGoal };
  })();

  return (
    <>
      <style>{`
        @keyframes goalin { 0%{transform:translateX(-50%) scale(0.85);opacity:0} 100%{transform:translateX(-50%) scale(1);opacity:1} }
        @keyframes livepulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
      `}</style>
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', background: '#070b16' }}>

      {/* ── Stadium section ── */}
      <div style={{ flex: '0 0 72%', position: 'relative', overflow: 'hidden', background: '#001428', margin: '10px 10px 0', borderRadius: 12, border: '1px solid #1c2640' }}>


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

          {/* Scoreboard overlay on anzeig */}
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
              <div style={{ width: '96%', height: '88%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', gap: 4 }}>
                {/* Home */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900, color: '#fff', fontFamily: "'Big Shoulders Display', sans-serif", flexShrink: 0 }}>{homeAbbr}</div>
                  <div style={{ fontSize: '8px', color: '#94a3b8', textAlign: 'center', lineHeight: 1.1, fontFamily: "'Barlow', sans-serif", overflow: 'hidden', maxWidth: '100%', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{homeTeam.name}</div>
                  {homeScorers && <div style={{ fontSize: '7px', color: '#c8f53d', textAlign: 'center', lineHeight: 1.1, fontFamily: "'Barlow', sans-serif", overflow: 'hidden', maxWidth: '100%', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{homeScorers}</div>}
                </div>
                {/* Score center */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  <div style={{ fontSize: '30px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#fff', lineHeight: 1, letterSpacing: 2 }}>{liveScore.home}<span style={{ color: '#475569', margin: '0 2px' }}>:</span>{liveScore.away}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#c8f53d', animation: 'livepulse 1.2s ease-in-out infinite' }} />
                    <div style={{ fontSize: '9px', fontFamily: "'JetBrains Mono', monospace", color: '#c8f53d', fontWeight: 600 }}>{liveMinute}'</div>
                  </div>
                </div>
                {/* Away */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, minWidth: 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 900, color: '#fff', fontFamily: "'Big Shoulders Display', sans-serif", flexShrink: 0 }}>{awayAbbr}</div>
                  <div style={{ fontSize: '8px', color: '#94a3b8', textAlign: 'center', lineHeight: 1.1, fontFamily: "'Barlow', sans-serif", overflow: 'hidden', maxWidth: '100%', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{awayTeam.name}</div>
                  {awayScorers && <div style={{ fontSize: '7px', color: '#c8f53d', textAlign: 'center', lineHeight: 1.1, fontFamily: "'Barlow', sans-serif", overflow: 'hidden', maxWidth: '100%', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{awayScorers}</div>}
                </div>
              </div>
            )}
          </div>

          {/* Referee badge — top-left */}
          <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 20, display: 'flex', alignItems: 'stretch', border: '2px solid #1c2640', borderRadius: 6, overflow: 'hidden', background: '#0f1628', boxShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
            <img src={img(referee.img)} style={{ width: 44, height: 68, objectFit: 'cover', imageRendering: 'pixelated', flexShrink: 0 }} alt="" />
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '4px 8px', gap: 3 }}>
              <div style={{ fontSize: '8px', color: '#475569', letterSpacing: 2, fontFamily: "'Barlow', sans-serif", textTransform: 'uppercase' }}>REF</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', fontFamily: "'Barlow', sans-serif", whiteSpace: 'nowrap' }}>{referee.name}</div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: referee.color, fontFamily: "'Barlow', sans-serif", letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{referee.style}</div>
            </div>
          </div>

          {/* Attendance badge — top-right */}
          <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 20, background: 'rgba(7,11,22,0.85)', border: '1px solid #1c2640', borderRadius: 6, padding: '4px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: '7px', color: '#64748b', letterSpacing: 2, fontFamily: "'Barlow', sans-serif", textTransform: 'uppercase' }}>Attendance</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace" }}>{attendance.toLocaleString()}</div>
          </div>

          {/* Sponsor hoarding — at the top of the pitch */}
          <div style={{
            position: 'absolute', top: '59.5%', left: 0, right: 0, height: '3%',
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

          {/* GOAL! banner */}
          {goalBanner && (
            <div style={{
              position: 'absolute', left: '50%', top: '56%', zIndex: 30,
              animation: 'goalin 0.4s ease-out forwards',
              background: goalBanner.isHome ? '#1e40af' : '#991b1b',
              border: `2px solid ${goalBanner.isHome ? '#60a5fa' : '#f87171'}`,
              borderRadius: 8, padding: '6px 16px', minWidth: 140,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 900, color: '#c8f53d', fontFamily: "'Big Shoulders Display', sans-serif", letterSpacing: 3 }}>GOAL!</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: "'Barlow', sans-serif" }}>{goalBanner.scorer}</div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', fontFamily: "'JetBrains Mono', monospace" }}>{goalBanner.minute}' · {goalBanner.lead}</div>
            </div>
          )}

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

      {/* ── 3-column bottom panel ── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, borderTop: '1px solid #1c2640' }}>

        {/* Col 1: ACTION + Speed + Skip */}
        <div style={{ flex: 1, minWidth: 0, background: '#0f1628', borderRight: '1px solid #1c2640', display: 'flex', flexDirection: 'column', padding: '10px 8px', gap: 8 }}>
          <div style={{ fontSize: '8px', color: '#475569', letterSpacing: 3, fontFamily: "'Barlow', sans-serif", textTransform: 'uppercase' }}>Control</div>
          {phase === 'playing' && (
            <>
              <button onClick={() => setShowAction(true)} style={{
                background: '#c8f53d', border: 'none', color: '#070b16',
                padding: '10px 0', fontSize: '13px', fontWeight: 900, fontFamily: "'Big Shoulders Display', sans-serif",
                cursor: 'pointer', borderRadius: 6, letterSpacing: 3, width: '100%',
              }}>ACTION</button>
              <div style={{ display: 'flex', gap: 4 }}>
                {([1, 2, 4] as const).map(s => (
                  <button key={s} onClick={() => onSpeedChange(s)} style={{
                    flex: 1, padding: '6px 0', fontSize: '11px', fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    background: speed === s ? '#c8f53d' : '#1c2640',
                    color: speed === s ? '#070b16' : '#94a3b8',
                    border: `1px solid ${speed === s ? '#c8f53d' : '#2a3650'}`,
                    borderRadius: 4, cursor: 'pointer',
                  }}>{s}x</button>
                ))}
              </div>
              <button onClick={onSkip} style={{
                background: 'transparent', border: '1px solid #1c2640',
                color: '#475569', padding: '7px 0', fontSize: '11px', fontFamily: "'Barlow', sans-serif",
                cursor: 'pointer', borderRadius: 4, width: '100%',
              }}>Skip ▶▶</button>
            </>
          )}
          {phase === 'done' && (
            <button onClick={onContinue} style={{
              background: '#c8f53d', border: 'none', color: '#070b16',
              padding: '12px 0', fontSize: '13px', fontWeight: 900, fontFamily: "'Big Shoulders Display', sans-serif",
              cursor: 'pointer', borderRadius: 6, letterSpacing: 2, width: '100%',
            }}>CONTINUE →</button>
          )}
        </div>

        {/* Col 2: Timeline + Feed */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', background: '#0a0e1a', borderRight: '1px solid #1c2640', minWidth: 0 }}>
          {/* Timeline bar */}
          <div style={{ flexShrink: 0, padding: '8px 12px 4px', borderBottom: '1px solid #1c2640' }}>
            <div style={{ position: 'relative', height: 28 }}>
              <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 3, background: '#1c2640', borderRadius: 2, transform: 'translateY(-50%)' }} />
              <div style={{ position: 'absolute', top: '50%', left: 0, width: `${(liveMinute / 90) * 100}%`, height: 3, background: '#c8f53d', borderRadius: 2, transform: 'translateY(-50%)' }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', width: 1, height: 10, background: '#2a3650', transform: 'translateY(-50%)' }} />
              {timelineMarks.map((m, i) => (
                <div key={i} title={m.label} style={{
                  position: 'absolute', left: `${m.x}%`,
                  top: m.top === 0 ? 0 : 'auto', bottom: m.top !== 0 ? 0 : 'auto',
                  width: 6, height: 6, borderRadius: '50%',
                  background: m.bg, border: `1px solid rgba(255,255,255,0.2)`,
                  transform: 'translateX(-50%)', cursor: 'default',
                }} />
              ))}
              <div style={{ position: 'absolute', bottom: 0, left: 0, fontSize: '8px', color: '#2a3650', fontFamily: "'JetBrains Mono', monospace" }}>0'</div>
              <div style={{ position: 'absolute', bottom: 0, left: '50%', fontSize: '8px', color: '#2a3650', fontFamily: "'JetBrains Mono', monospace", transform: 'translateX(-50%)' }}>45'</div>
              <div style={{ position: 'absolute', bottom: 0, right: 0, fontSize: '8px', color: '#2a3650', fontFamily: "'JetBrains Mono', monospace" }}>90'</div>
            </div>
          </div>
          {/* Feed */}
          <div style={{ flex: 1, overflow: 'hidden', padding: '4px 0' }}>
            {feedRows.slice(0, 6).map((row, i) => (
              <div key={row.key} style={{
                display: 'grid', gridTemplateColumns: '28px 1fr',
                padding: '3px 12px', gap: 6, alignItems: 'start',
                opacity: 1 - i * 0.14,
                marginLeft: 2,
                borderLeft: `2px solid ${row.isGoal ? '#c8f53d' : row.isCard ? '#f59e0b' : 'transparent'}`,
              }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#64748b', textAlign: 'right', paddingTop: 1 }}>{row.min ? `${row.min}'` : ''}</div>
                <div style={{ fontSize: '11px', color: row.isGoal ? '#c8f53d' : row.isCard ? '#fbbf24' : '#94a3b8', fontFamily: "'Barlow', sans-serif", lineHeight: 1.4, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{row.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Col 3: Match stats */}
        <div style={{ flex: 1, minWidth: 0, background: '#0f1628', display: 'flex', flexDirection: 'column', padding: '8px 10px', gap: 2 }}>
          <div style={{ fontSize: '8px', color: '#475569', letterSpacing: 3, fontFamily: "'Barlow', sans-serif", textTransform: 'uppercase', marginBottom: 4 }}>Stats</div>
          {matchStats.map(s => (
            <div key={s.label} style={{ marginBottom: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b', fontFamily: "'Barlow', sans-serif", marginBottom: 2 }}>
                <span style={{ color: '#93c5fd' }}>{s.a}</span>
                <span>{s.label}</span>
                <span style={{ color: '#f87171' }}>{s.b}</span>
              </div>
              <div style={{ display: 'flex', height: 3, background: '#1c2640', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${s.pa}%`, background: '#1d4ed8' }} />
                <div style={{ width: `${100 - s.pa}%`, background: '#991b1b' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* ── Half Time Overlay ── */}
      {halftime && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 160,
          background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, system-ui',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '4px', marginBottom: '6px' }}>MATCHDAY {currentMatchday}</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#60a5fa', letterSpacing: '4px', marginBottom: '4px' }}>⏱ HALF TIME</div>
            <div style={{ width: '120px', height: '2px', background: '#1e40af', margin: '0 auto' }} />
          </div>

          {/* Score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px' }}>
            <div style={{ textAlign: 'center', minWidth: '80px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>{snap.homeTeam.name}</div>
              <img src={img(`wappen${String(snap.homeTeam.id).padStart(2, '0')}.png`)} style={{ width: '36px', height: '36px', imageRendering: 'pixelated' }} alt="" />
            </div>
            <div style={{ fontSize: '48px', fontWeight: 'bold', fontFamily: 'monospace', color: '#ffffff', letterSpacing: '8px', lineHeight: 1 }}>
              {liveScore.home} – {liveScore.away}
            </div>
            <div style={{ textAlign: 'center', minWidth: '80px' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>{snap.awayTeam.name}</div>
              <img src={img(`wappen${String(snap.awayTeam.id).padStart(2, '0')}.png`)} style={{ width: '36px', height: '36px', imageRendering: 'pixelated' }} alt="" />
            </div>
          </div>

          {/* First-half events */}
          <div style={{ width: '280px', marginBottom: '28px' }}>
            {commentary.filter(l => l.startsWith('⚽') || l.startsWith('🟨')).length === 0 ? (
              <div style={{ textAlign: 'center', fontSize: '11px', color: '#475569' }}>No goals in the first half</div>
            ) : commentary.filter(l => l.startsWith('⚽') || l.startsWith('🟨')).slice(0, 5).map((line, i) => (
              <div key={i} style={{ fontSize: '11px', color: line.startsWith('⚽') ? '#4ade80' : '#f59e0b', padding: '3px 0', borderBottom: '1px solid #1e2535', textAlign: 'center' }}>
                {line}
              </div>
            ))}
          </div>

          <div style={{ fontSize: '10px', color: '#475569', marginBottom: '16px', letterSpacing: '1px' }}>
            Use ACTION button for substitutions
          </div>

          <button
            onClick={onResumeHalftime}
            style={{
              background: '#15803d', border: '2px solid #16a34a',
              color: '#ffffff', padding: '14px 40px',
              fontSize: '15px', fontWeight: 'bold', cursor: 'pointer',
              borderRadius: '8px', letterSpacing: '3px',
            }}
          >
            ▶ KICK OFF 2ND HALF
          </button>
        </div>
      )}

      {/* ── Substitution Panel Overlay ── */}
      {showAction && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 150,
          background: '#0a0a1a', display: 'flex', flexDirection: 'column',
          fontFamily: 'Arial, system-ui',
        }}>
          {/* Header */}
          <div style={{
            background: '#111827', borderBottom: '2px solid #3b82f6',
            padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
          }}>
            <span style={{ color: '#93c5fd', fontWeight: 'bold', fontSize: '13px', letterSpacing: '2px' }}>ACTION</span>
            <span style={{ color: '#60a5fa', fontSize: '11px', fontWeight: 'bold' }}>
              {subsLeft} Substitution{subsLeft !== 1 ? 's' : ''} left
            </span>
            <span style={{ color: '#475569', fontSize: '11px' }}>{liveMinute}'</span>
          </div>

          {/* Team + Reserves columns */}
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            {/* Team list */}
            <div style={{ flex: 1, borderRight: '1px solid #1e2535', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ background: '#0d1117', padding: '4px 10px', fontSize: '9px', color: '#64748b', letterSpacing: '2px', borderBottom: '1px solid #1e2535', flexShrink: 0 }}>TEAM</div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {matchSquad.map((p, i) => {
                  const stamina = Math.max(30, 100 - Math.round((liveMinute / 90) * 55) + Math.floor(p.skill * 0.25));
                  const isSelected = selectedOut === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedOut(isSelected ? null : p.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '5px 8px', cursor: 'pointer',
                        background: isSelected ? '#1e3a5f' : i % 2 === 0 ? '#0d1117' : '#0a0e1a',
                        borderBottom: '1px solid #1a2030',
                        borderLeft: isSelected ? '3px solid #3b82f6' : '3px solid transparent',
                      }}
                    >
                      <span style={{ width: '26px', fontSize: '9px', fontWeight: 'bold', color: POS_COLOR[p.position], flexShrink: 0 }}>{POS_LABEL[p.position]}</span>
                      <span style={{ flex: 1, fontSize: '11px', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                      <div style={{ width: '28px', flexShrink: 0 }}>
                        <div style={{ height: '3px', background: '#1e2535', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${stamina}%`, height: '100%', background: stamina > 60 ? '#4ade80' : stamina > 35 ? '#f59e0b' : '#f87171' }} />
                        </div>
                        <div style={{ fontSize: '8px', color: '#475569', textAlign: 'right', marginTop: '1px' }}>{stamina}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reserve list */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ background: '#0d1117', padding: '4px 10px', fontSize: '9px', color: '#64748b', letterSpacing: '2px', borderBottom: '1px solid #1e2535', flexShrink: 0 }}>RESERVES</div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {matchBench.length === 0 ? (
                  <div style={{ padding: '16px', fontSize: '11px', color: '#374151', textAlign: 'center' }}>No reserves available</div>
                ) : matchBench.map((p, i) => {
                  const isSelected = selectedIn === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedIn(isSelected ? null : p.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '5px 8px', cursor: 'pointer',
                        background: isSelected ? '#14532d' : i % 2 === 0 ? '#0d1117' : '#0a0e1a',
                        borderBottom: '1px solid #1a2030',
                        borderLeft: isSelected ? '3px solid #4ade80' : '3px solid transparent',
                      }}
                    >
                      <span style={{ width: '26px', fontSize: '9px', fontWeight: 'bold', color: POS_COLOR[p.position], flexShrink: 0 }}>{POS_LABEL[p.position]}</span>
                      <span style={{ flex: 1, fontSize: '11px', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                      <span style={{ fontSize: '10px', color: '#475569', flexShrink: 0 }}>{p.skill}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom controls */}
          <div style={{ flexShrink: 0, padding: '10px 12px', borderTop: '2px solid #1e2535', background: '#0d1117' }}>
            {/* Selected players info */}
            {(selectedOut || selectedIn) && (
              <div style={{ marginBottom: '8px', fontSize: '10px', color: '#94a3b8', display: 'flex', gap: '8px', alignItems: 'center' }}>
                {selectedOut && (
                  <span style={{ color: '#f87171' }}>OUT: {matchSquad.find(p => p.id === selectedOut)?.name}</span>
                )}
                {selectedOut && selectedIn && <span style={{ color: '#64748b' }}>→</span>}
                {selectedIn && (
                  <span style={{ color: '#4ade80' }}>IN: {matchBench.find(p => p.id === selectedIn)?.name}</span>
                )}
              </div>
            )}

            {/* Aggression slider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <button
                onClick={() => setAggression(a => Math.max(0, a - 10))}
                style={{ background: '#161b27', border: '1px solid #28314a', color: '#94a3b8', padding: '3px 10px', cursor: 'pointer', borderRadius: '3px', fontSize: '13px', fontWeight: 'bold' }}
              >&lt;</button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: '#64748b', letterSpacing: '1px', marginBottom: '2px' }}>AGGRESSION</div>
                <div style={{ height: '5px', background: '#1e2535', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${aggression}%`, height: '100%', background: aggression > 70 ? '#f87171' : aggression > 40 ? '#f59e0b' : '#4ade80', transition: 'width 0.15s' }} />
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{aggression}%</div>
              </div>
              <button
                onClick={() => setAggression(a => Math.min(100, a + 10))}
                style={{ background: '#161b27', border: '1px solid #28314a', color: '#94a3b8', padding: '3px 10px', cursor: 'pointer', borderRadius: '3px', fontSize: '13px', fontWeight: 'bold' }}
              >&gt;</button>
            </div>

            {/* Substitute + MATCH buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={!selectedOut || !selectedIn || subsLeft === 0}
                onClick={() => {
                  if (!selectedOut || !selectedIn || subsLeft === 0) return;
                  const outPlayer = matchSquad.find(p => p.id === selectedOut)!;
                  const inPlayer = matchBench.find(p => p.id === selectedIn)!;
                  setMatchSquad(sq => sq.map(p => p.id === selectedOut ? inPlayer : p));
                  setMatchBench(b => b.map(p => p.id === selectedIn ? outPlayer : p));
                  setSubsLeft(s => s - 1);
                  setSelectedOut(null);
                  setSelectedIn(null);
                }}
                style={{
                  flex: 1,
                  background: (!selectedOut || !selectedIn || subsLeft === 0) ? '#111' : '#1e40af',
                  border: `1px solid ${(!selectedOut || !selectedIn || subsLeft === 0) ? '#1e2535' : '#3b82f6'}`,
                  color: (!selectedOut || !selectedIn || subsLeft === 0) ? '#374151' : '#fff',
                  padding: '10px', fontSize: '12px', fontWeight: 'bold',
                  cursor: (!selectedOut || !selectedIn || subsLeft === 0) ? 'default' : 'pointer',
                  borderRadius: '6px', letterSpacing: '1px',
                }}
              >
                &lt; Substitute &gt;
              </button>
              <button
                onClick={() => { setShowAction(false); setSelectedOut(null); setSelectedIn(null); }}
                style={{
                  flex: 1, background: '#15803d', border: '1px solid #16a34a',
                  color: '#fff', padding: '10px', fontSize: '12px', fontWeight: 'bold',
                  cursor: 'pointer', borderRadius: '6px', letterSpacing: '2px',
                }}
              >
                MATCH
              </button>
            </div>
          </div>
        </div>
      )}

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
    </>
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
