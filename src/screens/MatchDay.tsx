import { useState, useEffect, useRef, type MutableRefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { getTeamById } from '../data/teams';
import { Layout } from '../components/Layout';
import { img } from '../utils/images';
import type { Formation, MatchEvent, MatchReport, Team, Player } from '../types/game';
import { simulateFullMatch } from '../engine/matchEngine';
import { BOARD_STYLES, BOARD_EMPTY } from '../data/boardStyles';
import type { BoardStyle } from '../data/boardStyles';
import { preload, whistle, startCrowd, stopCrowd, stopMusic, crowdRoar, crowdCalm, crowdResume, playKick } from '../utils/sound';

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
  { name: 'B. Bumble',    style: 'INCOMPETENT', desc: 'Bewildered. Makes it up as he goes.',    bribeable: false, color: '#c084fc', img: 'schieds1.png' },
];

function pickReferee(matchday: number, teamId: number) {
  const hash = Math.abs(matchday * 7193 + teamId * 3761);
  return REFEREES[hash % REFEREES.length];
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
    '5-4-1': [
      { x: 50, y: f(90) },
      { x: 10, y: f(72) }, { x: 28, y: f(72) }, { x: 50, y: f(72) }, { x: 72, y: f(72) }, { x: 90, y: f(72) },
      { x: 16, y: f(52) }, { x: 38, y: f(52) }, { x: 62, y: f(52) }, { x: 84, y: f(52) },
      { x: 50, y: f(28) },
    ],
    '3-4-3': [
      { x: 50, y: f(90) },
      { x: 25, y: f(72) }, { x: 50, y: f(72) }, { x: 75, y: f(72) },
      { x: 16, y: f(52) }, { x: 38, y: f(52) }, { x: 62, y: f(52) }, { x: 84, y: f(52) },
      { x: 20, y: f(28) }, { x: 50, y: f(28) }, { x: 80, y: f(28) },
    ],
  };
  return layouts[formation] ?? layouts['4-4-2'];
}

const POS_LABEL: Record<string, string> = { T: 'GK', V: 'DEF', M: 'MID', S: 'FWD' };
const POS_COLOR: Record<string, string> = { T: '#f59e0b', V: '#60a5fa', M: '#4ade80', S: '#f87171' };

const FORMATIONS: Formation[] = ['4-4-2', '4-3-3', '3-5-2', '5-3-2', '4-5-1', '5-4-1', '3-4-3'];
const FORMATION_DESC: Record<Formation, string> = {
  '4-4-2': 'Balanced', '4-3-3': 'Attacking', '3-5-2': 'Midfield',
  '5-3-2': 'Defensive', '4-5-1': 'Ultra-def', '5-4-1': 'Fortress', '3-4-3': 'All-out',
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

// SIDE VIEW from centre stand. x = left↔right along pitch length.
// Coordinates calibrated per pitch upgrade level (press C in match to calibrate).
// Free kick zones: each has [near, far] — one is picked randomly.
// leftBox/leftMid = home half (away team takes FK). rightBox/rightMid = away half (home team takes FK).
type FKZone = [[number,number],[number,number]];
type PitchCoords = {
  leftNet:[number,number]; rightNet:[number,number]; kickoff:[number,number];
  leftPen:[number,number]; rightPen:[number,number];
  leftCorner:[number,number]; rightCorner:[number,number];
  leftBoxFK:FKZone; rightBoxFK:FKZone; leftMidFK:FKZone; rightMidFK:FKZone;
};
const PITCH_COORDS: Record<1|2|3, PitchCoords> = {
  1: { leftNet:[8,25], rightNet:[97,32], kickoff:[50.5,41], leftPen:[19,38], rightPen:[85,41], leftCorner:[25,20], rightCorner:[80,21],
       leftBoxFK:[[32,30],[21,57]], rightBoxFK:[[72,31],[81,58]], leftMidFK:[[45,28],[39,60]], rightMidFK:[[60,26],[59,58]] }, // TODO: calibrate
  2: { leftNet:[7,30], rightNet:[98,30], kickoff:[51,40], leftPen:[20,43], rightPen:[86,40], leftCorner:[25,21], rightCorner:[80,20],
       leftBoxFK:[[32,30],[21,57]], rightBoxFK:[[72,31],[81,58]], leftMidFK:[[45,28],[39,60]], rightMidFK:[[60,26],[59,58]] }, // TODO: calibrate
  3: { leftNet:[5,24], rightNet:[97,24], kickoff:[51,36], leftPen:[17,38], rightPen:[86,38], leftCorner:[22,17], rightCorner:[80,17],
       leftBoxFK:[[32,30],[21,57]], rightBoxFK:[[72,31],[81,58]], leftMidFK:[[45,28],[39,60]], rightMidFK:[[60,26],[59,58]] },
};
// Cap each waypoint to be at most maxDelta away from the previous position.
const nudge = (from: number, toward: number, maxDelta: number) =>
  from + Math.max(-maxDelta, Math.min(maxDelta, toward - from));

function genBallPath(minute: number, fromX: number, fromY: number): { x: number; y: number }[] {
  const r = () => Math.random();
  // y drifts ±15 from current y, clamped to visible grass
  const wy = () => Math.max(10, Math.min(75, fromY + (r() - 0.5) * 30));
  const phase = Math.floor(minute / 7) % 3;
  const DX = 18; // max x step per waypoint

  if (phase === 0) {
    // Home build-up drifting right toward x≈96
    const x1 = nudge(fromX, 50 + r()*15, DX);
    const x2 = nudge(x1,    62 + r()*12, DX);
    const x3 = nudge(x2,    74 + r()*10, DX);
    const x4 = nudge(x3,    84 + r()*8,  DX);
    const x5 = nudge(x4,    90 + r()*6,  DX);
    return [
      { x: x1, y: wy() }, { x: x2, y: wy() }, { x: x3, y: wy() },
      { x: x4, y: wy() }, { x: x5, y: 21 + r()*6 },
    ];
  } else if (phase === 1) {
    // Away build-up drifting left toward x≈6
    const x1 = nudge(fromX, 50 - r()*15, DX);
    const x2 = nudge(x1,    38 - r()*12, DX);
    const x3 = nudge(x2,    26 - r()*10, DX);
    const x4 = nudge(x3,    16 - r()*8,  DX);
    const x5 = nudge(x4,     8 - r()*4,  DX);
    return [
      { x: x1, y: wy() }, { x: x2, y: wy() }, { x: x3, y: wy() },
      { x: x4, y: wy() }, { x: x5, y: 21 + r()*6 },
    ];
  } else {
    // Midfield — stays in x: 30–70, drifts from current position
    const x1 = nudge(fromX, 35 + r()*30, DX);
    const x2 = nudge(x1,    30 + r()*35, DX);
    const x3 = nudge(x2,    38 + r()*25, DX);
    const x4 = nudge(x3,    32 + r()*30, DX);
    return [
      { x: x1, y: wy() }, { x: x2, y: wy() }, { x: x3, y: wy() }, { x: x4, y: wy() },
    ];
  }
}

interface MatchSnap {
  homeTeam: Team; awayTeam: Team; isHome: boolean; report: MatchReport; myXI: Player[];
}

export function MatchDay() {
  const navigate = useNavigate();
  const { managedTeamId, currentMatchday, formation, fixtures, rosters, portrait, balance, stadium, setFormation, playMatchday, bribeReferee } = useGameStore();
  const pitchCoordsRef = useRef<PitchCoords>(PITCH_COORDS[(stadium.pitch as 1|2|3) ?? 3]);

  const myTeam = getTeamById(managedTeamId)!;
  const nextFixture = fixtures.find(f =>
    f.matchday === currentMatchday && (f.homeTeamId === managedTeamId || f.awayTeamId === managedTeamId)
  );
  const isHome = nextFixture?.homeTeamId === managedTeamId;
  const opponentId = isHome ? nextFixture?.awayTeamId : nextFixture?.homeTeamId;
  const opponent = opponentId ? getTeamById(opponentId) : null;

  const myPlayers = (rosters[managedTeamId] ?? []).filter(p => !p.injuredFor && !p.suspended);

  const referee = pickReferee(currentMatchday, managedTeamId);
  const [bribed, setBribed] = useState(false);
  const [phase, setPhase] = useState<'setup' | 'playing' | 'done'>('setup');
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [matchSnap, setMatchSnap] = useState<MatchSnap | null>(null);
  const [goalFlash, setGoalFlash] = useState(false);
  const goalFlashRef = useRef(false);
  const kickoffPauseRef = useRef(false);
  const [ballPos, setBallPos] = useState({ x: 51, y: 36 });
  const [liveScore, setLiveScore] = useState({ home: 0, away: 0 });
  const [liveMinute, setLiveMinute] = useState(0);
  const [commentary, setCommentary] = useState<string[]>([]);

  const [halftime, setHalftime] = useState(false);
  const halftimeRef = useRef(false);
  const halftimeDoneRef = useRef(false);
  const [aggression, setAggression] = useState(50);
  const aggressionAtKickoffRef = useRef(50);

  const lastKickTimeRef = useRef(0);

  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const speedRef = useRef<1 | 2 | 4>(1);
  const handleSetSpeed = (s: 1 | 2 | 4) => { speedRef.current = s; setSpeed(s); pausedRef.current = false; setPaused(false); };
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const handleTogglePause = () => { pausedRef.current = !pausedRef.current; setPaused(p => !p); };

  const physRef = useRef({ x: 51, y: 36, minute: 0 });
  const ballTargetRef = useRef({ x: 51, y: 36 });
  const waypointQueueRef = useRef<{ x: number; y: number }[]>([]);
  const waypointIdxRef = useRef(0);
  const processedRef = useRef(new Set<string>());
  const commentaryRef = useRef<string[]>([]);
  const scoreRef = useRef({ home: 0, away: 0 });
  const subEventsRef = useRef<MatchEvent[]>([]);
  const approachingGoalRef = useRef<number | null>(null);

  const handleKickOff = (myXI: Player[]) => {
    if (!nextFixture || !opponent) return;
    pitchCoordsRef.current = PITCH_COORDS[(stadium.pitch as 1|2|3) ?? 3];

    const homeTeam = isHome ? myTeam : opponent;
    const awayTeam = isHome ? opponent : myTeam;
    const oppId = isHome ? nextFixture.awayTeamId : nextFixture.homeTeamId;
    const oppXI = (rosters[oppId] ?? []).slice(0, 11);
    const homePlayers = isHome ? myXI : oppXI;
    const awayPlayers = isHome ? oppXI : myXI;

    aggressionAtKickoffRef.current = aggression;
    const report = simulateFullMatch(nextFixture, homeTeam, awayTeam, homePlayers, awayPlayers, formation, 1, aggression, isHome);

    if (bribed) {
      const myIsHome = nextFixture.homeTeamId === managedTeamId;
      let myGoals = myIsHome ? (report.fixture.homeGoals ?? 0) : (report.fixture.awayGoals ?? 0);
      let oppGoals = myIsHome ? (report.fixture.awayGoals ?? 0) : (report.fixture.homeGoals ?? 0);

      // Guarantee at least a narrow win: if losing or drawing, nudge score to a 1-goal win
      if (myGoals <= oppGoals) {
        const extra = oppGoals + 1 - myGoals;
        for (let i = 0; i < extra; i++) {
          const min = 3 + i * 7;
          report.events.push({ minute: min, type: 'goal', teamId: managedTeamId, playerName: 'Penalty (Ref decision)' });
          myGoals++;
        }
        report.events.sort((a, b) => a.minute - b.minute);
      }

      report.fixture = myIsHome
        ? { ...report.fixture, homeGoals: myGoals, awayGoals: oppGoals }
        : { ...report.fixture, homeGoals: oppGoals, awayGoals: myGoals };
    }

    const snap: MatchSnap = { homeTeam, awayTeam, isHome, report, myXI };
    setMatchSnap(snap);

    halftimeRef.current = false;
    halftimeDoneRef.current = false;
    setHalftime(false);
    speedRef.current = 1;
    setSpeed(1);
    const [kx, ky] = pitchCoordsRef.current.kickoff;
    physRef.current = { x: kx, y: ky, minute: 0 };
    ballTargetRef.current = { x: kx, y: ky };
    waypointQueueRef.current = [];
    waypointIdxRef.current = 0;
    processedRef.current = new Set();
    scoreRef.current = { home: 0, away: 0 };
    subEventsRef.current = [];
    approachingGoalRef.current = null;
    commentaryRef.current = ['⚽ Kick off!'];
    setBallPos({ x: kx, y: ky });
    setLiveScore({ home: 0, away: 0 });
    setLiveMinute(0);
    setCommentary(['⚽ Kick off!']);
    kickoffPauseRef.current = true;
    setTimeout(() => { kickoffPauseRef.current = false; }, 2000);
    void preload();
    stopMusic();
    whistle('kickoff');
    startCrowd();
    setPhase('playing');
  };

  const handleContinue = () => {
    stopCrowd();
    playMatchday(matchSnap?.report, bribed);
    const newPhase = useGameStore.getState().phase;
    if (newPhase === 'sacked') navigate('/sacked');
    else if (newPhase === 'season_end') navigate('/season-end');
    else navigate('/season');
  };

  const handleResumeHalftime = () => {
    if (matchSnap && aggression !== aggressionAtKickoffRef.current) {
      const { homeTeam, awayTeam, isHome, myXI } = matchSnap;
      const oppId2 = isHome ? awayTeam.id : homeTeam.id;
      const oppXI2 = (rosters[oppId2] ?? []).slice(0, 11);
      const homePlayers2 = isHome ? myXI : oppXI2;
      const awayPlayers2 = isHome ? oppXI2 : myXI;
      const newReport = simulateFullMatch(
        matchSnap.report.fixture, homeTeam, awayTeam,
        homePlayers2, awayPlayers2,
        formation, 1, aggression, isHome,
      );
      const firstHalf = matchSnap.report.events.filter(e => e.minute <= 45);
      const secondHalf = newReport.events.filter(e => e.minute > 45);
      const newHomeGoals2H = secondHalf.filter(e => e.type === 'goal' && e.teamId === homeTeam.id).length;
      const newAwayGoals2H = secondHalf.filter(e => e.type === 'goal' && e.teamId === awayTeam.id).length;
      const updatedReport = {
        ...matchSnap.report,
        fixture: {
          ...matchSnap.report.fixture,
          homeGoals: liveScore.home + newHomeGoals2H,
          awayGoals: liveScore.away + newAwayGoals2H,
        },
        events: [...firstHalf, ...secondHalf].sort((a, b) => a.minute - b.minute),
      };
      setMatchSnap({ ...matchSnap, report: updatedReport });
      aggressionAtKickoffRef.current = aggression;
    }

    const [kx, ky] = pitchCoordsRef.current.kickoff;
    physRef.current.x = kx; physRef.current.y = ky;
    ballTargetRef.current = { x: kx, y: ky };
    waypointQueueRef.current = [];
    setBallPos({ x: kx, y: ky });
    kickoffPauseRef.current = true;
    setTimeout(() => { kickoffPauseRef.current = false; }, 2000);
    halftimeRef.current = false;
    setHalftime(false);
    whistle('kickoff');
    crowdResume();
  };

  useEffect(() => {
    if (phase !== 'playing' || !matchSnap) return;
    const { report, homeTeam, awayTeam } = matchSnap;

    const timer = setInterval(() => {
      if (goalFlashRef.current) return;
      if (halftimeRef.current) return;
      if (pausedRef.current) return;
      if (kickoffPauseRef.current) return;
      const p = physRef.current;

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
          const [lnx, lny] = pitchCoordsRef.current.leftNet;
          const [rnx, rny] = pitchCoordsRef.current.rightNet;
          const netX = (scoringHome ? rnx : lnx) + (Math.random() - 0.5) * 4;
          const netY = (scoringHome ? rny : lny) + (Math.random() - 0.5) * 4;
          p.x = netX; p.y = netY;
          ballTargetRef.current = { x: netX, y: netY };
          waypointQueueRef.current = [];
          approachingGoalRef.current = null;
          setBallPos({ x: netX, y: netY });
          const teamName = scoringHome ? homeTeam.name : awayTeam.name;
          const suffix = evt.detail === 'penalty' ? ' · Penalty' : evt.detail === 'freekick' ? ' · Free kick' : '';
          const msg = evt.detail === 'owngoal'
            ? `⚽ OWN GOAL! ${evt.minute}' ${evt.playerName} (${teamName})`
            : `⚽ GOAL! ${evt.minute}' ${evt.playerName} (${teamName})${suffix}`;
          commentaryRef.current = [msg, ...commentaryRef.current.slice(0, 49)];
          setLiveScore({ ...scoreRef.current });
          setCommentary([...commentaryRef.current]);
          goalFlashRef.current = true;
          setGoalFlash(true);
          setTimeout(() => {
            goalFlashRef.current = false;
            setGoalFlash(false);
            const [kx, ky] = pitchCoordsRef.current.kickoff;
            p.x = kx; p.y = ky;
            ballTargetRef.current = { x: kx, y: ky };
            waypointQueueRef.current = [];
            setBallPos({ x: kx, y: ky });
            kickoffPauseRef.current = true;
            setTimeout(() => { kickoffPauseRef.current = false; }, 2000);
          }, 3000);
        } else if (evt.type === 'yellow') {
          const msg = `🟨 ${evt.minute}' Yellow card — ${evt.playerName}`;
          commentaryRef.current = [msg, ...commentaryRef.current.slice(0, 49)];
          setCommentary([...commentaryRef.current]);
          const fkCoords = pitchCoordsRef.current;
          const foulInLeftHalf = p.x < 50;
          const foulUseBox = Math.random() < 0.4;
          const foulZone: FKZone = foulInLeftHalf
            ? (foulUseBox ? fkCoords.leftBoxFK  : fkCoords.leftMidFK)
            : (foulUseBox ? fkCoords.rightBoxFK : fkCoords.rightMidFK);
          const [foulX, foulY] = foulZone[Math.random() < 0.5 ? 0 : 1];
          p.x = foulX; p.y = foulY;
          ballTargetRef.current = { x: foulX, y: foulY };
          waypointQueueRef.current = [];
          setBallPos({ x: foulX, y: foulY });
          goalFlashRef.current = true;
          setTimeout(() => { goalFlashRef.current = false; }, 2000);
        } else if (evt.type === 'red') {
          const msg = `🟥 ${evt.minute}' RED CARD — ${evt.playerName}${evt.detail === '2Y' ? ' (2nd yellow)' : ''}`;
          commentaryRef.current = [msg, ...commentaryRef.current.slice(0, 49)];
          setCommentary([...commentaryRef.current]);
          const foulX = 10 + Math.random() * 80;
          const foulY = 15 + Math.random() * 54;
          p.x = foulX; p.y = foulY;
          ballTargetRef.current = { x: foulX, y: foulY };
          waypointQueueRef.current = [];
          setBallPos({ x: foulX, y: foulY });
          goalFlashRef.current = true;
          setTimeout(() => { goalFlashRef.current = false; }, 2500);
        } else if (evt.type === 'missed_penalty') {
          const msg = `❌ ${evt.minute}' Penalty MISSED — ${evt.playerName}`;
          commentaryRef.current = [msg, ...commentaryRef.current.slice(0, 49)];
          setCommentary([...commentaryRef.current]);
          // home attacks right (away goal), away attacks left (home goal)
          const [lpx, lpy] = pitchCoordsRef.current.leftPen;
          const [rpx, rpy] = pitchCoordsRef.current.rightPen;
          const penX = evt.teamId === homeTeam.id ? rpx : lpx, penY = evt.teamId === homeTeam.id ? rpy : lpy;
          p.x = penX; p.y = penY;
          ballTargetRef.current = { x: penX, y: penY };
          waypointQueueRef.current = [];
          setBallPos({ x: penX, y: penY });
          goalFlashRef.current = true;
          setTimeout(() => { goalFlashRef.current = false; }, 2000);
        } else if (evt.type === 'injury') {
          const msg = `🚑 ${evt.minute}' Injury — ${evt.playerName} is down`;
          commentaryRef.current = [msg, ...commentaryRef.current.slice(0, 49)];
          setCommentary([...commentaryRef.current]);
        }
      }

      if (Math.random() < 0.04) {
        const msg = GENERIC_COMMENTARY[Math.floor(Math.random() * GENERIC_COMMENTARY.length)];
        commentaryRef.current = [`${Math.floor(p.minute)}' ${msg}`, ...commentaryRef.current.slice(0, 49)];
        setCommentary([...commentaryRef.current]);
        if (msg.includes('Corner')) {
          playKick(0.6);
          const [lcx, lcy] = pitchCoordsRef.current.leftCorner;
          const [rcx, rcy] = pitchCoordsRef.current.rightCorner;
          const [cx, cy] = Math.random() > 0.5 ? [lcx, lcy] : [rcx, rcy];
          p.x = cx; p.y = cy;
          ballTargetRef.current = { x: cx, y: cy };
          waypointQueueRef.current = [];
          setBallPos({ x: cx, y: cy });
          goalFlashRef.current = true;
          setTimeout(() => { goalFlashRef.current = false; }, 1000);
        } else if (msg.includes('Free kick')) {
          playKick(0.65);
          const coords = pitchCoordsRef.current;
          // Ball is on the side of the team that was fouled — pick zone by current ball x
          const inLeftHalf = p.x < 50;
          const useBox = Math.random() < 0.4; // 40% box, 60% midfield
          const zone: FKZone = inLeftHalf
            ? (useBox ? coords.leftBoxFK  : coords.leftMidFK)
            : (useBox ? coords.rightBoxFK : coords.rightMidFK);
          const [fkX, fkY] = zone[Math.random() < 0.5 ? 0 : 1];
          p.x = fkX; p.y = fkY;
          ballTargetRef.current = { x: fkX, y: fkY };
          waypointQueueRef.current = [];
          setBallPos({ x: fkX, y: fkY });
          goalFlashRef.current = true;
          setTimeout(() => { goalFlashRef.current = false; }, 1000);
        } else if (msg.includes('Shot blocked')) {
          playKick(0.7);
          const sbX = 25 + Math.random() * 50;
          const sbY = 20 + Math.random() * 44;
          p.x = sbX; p.y = sbY;
          ballTargetRef.current = { x: sbX, y: sbY };
          waypointQueueRef.current = [];
          setBallPos({ x: sbX, y: sbY });
        }
      }

      // Immediately redirect ball when a goal is within 10 simulated minutes (inject once per goal)
      {
        const nextGoal = report.events.find(evt =>
          evt.type === 'goal' &&
          !processedRef.current.has(`goal-${evt.minute}`) &&
          evt.minute > p.minute &&
          evt.minute - p.minute <= 10
        );
        if (nextGoal && approachingGoalRef.current !== nextGoal.minute) {
          approachingGoalRef.current = nextGoal.minute;
          playKick(0.7);
          const toHome = nextGoal.teamId !== homeTeam.id;
          const r = () => Math.random();
          const [gnx, gny] = toHome ? pitchCoordsRef.current.leftNet : pitchCoordsRef.current.rightNet;
          const goalX = gnx, goalY = gny + (r() - 0.5) * 4;
          const distToGoal = Math.abs(p.x - goalX);
          // Build path proportional to distance — skip far waypoints if already near the goal
          if (distToGoal < 18) {
            waypointQueueRef.current = [
              { x: goalX, y: goalY },
            ];
          } else if (distToGoal < 45) {
            waypointQueueRef.current = [
              { x: toHome ? 18 - r()*8 : 82 + r()*8, y: 25 + r() * 34 },
              { x: goalX,                              y: goalY },
            ];
          } else {
            waypointQueueRef.current = [
              { x: toHome ? 40 - r()*10 : 60 + r()*10, y: 15 + r() * 54 },
              { x: toHome ? 18 - r()*8  : 82 + r()*8,  y: 25 + r() * 34 },
              { x: goalX,                                y: goalY },
            ];
          }
          waypointIdxRef.current = 0;
          ballTargetRef.current = waypointQueueRef.current[0];
        } else if (!nextGoal) {
          approachingGoalRef.current = null;
        }
      }

      // Advance ball — skip if an event just triggered a flash this tick
      if (!goalFlashRef.current) {
        const target = ballTargetRef.current; // read fresh after all event/look-ahead updates
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 3) {
          const now = Date.now();
          if (now - lastKickTimeRef.current > 480) {
            playKick(0.45);
            lastKickTimeRef.current = now;
          }
          waypointIdxRef.current++;
          if (waypointIdxRef.current >= waypointQueueRef.current.length) {
            const upcomingGoal = report.events.find(evt =>
              evt.type === 'goal' &&
              !processedRef.current.has(`goal-${evt.minute}`) &&
              evt.minute > p.minute &&
              evt.minute - p.minute <= 10
            );
            if (upcomingGoal) {
              const toHome = upcomingGoal.teamId !== homeTeam.id;
              const r = () => Math.random();
              const [gnx2, gny2] = toHome ? pitchCoordsRef.current.leftNet : pitchCoordsRef.current.rightNet;
              const goalX = gnx2, goalY = gny2 + (r() - 0.5) * 4;
              const distToGoal = Math.abs(p.x - goalX);
              if (distToGoal < 18) {
                waypointQueueRef.current = [{ x: goalX, y: goalY }];
              } else {
                waypointQueueRef.current = [
                  { x: toHome ? 18 - r() * 8 : 82 + r() * 8, y: 25 + r() * 34 },
                  { x: goalX, y: goalY },
                ];
              }
            } else {
              waypointQueueRef.current = genBallPath(p.minute, p.x, p.y);
            }
            waypointIdxRef.current = 0;
          }
          if (waypointQueueRef.current.length > 0) {
            ballTargetRef.current = waypointQueueRef.current[waypointIdxRef.current];
          }
        } else {
          const speed = 2.8 + Math.random() * 1.5;
          p.x = Math.max(2, Math.min(98, p.x + (dx / dist) * speed + (Math.random() - 0.5) * 0.6));
          p.y = Math.max(5, Math.min(84, p.y + (dy / dist) * speed + (Math.random() - 0.5) * 0.6));
        }
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
        whistle('halftime');
        crowdCalm();
        setHalftime(true);
        return;
      }

      if (p.minute >= 90) {
        clearInterval(timer);
        commentaryRef.current = ['🏁 Full Time!', ...commentaryRef.current.slice(0, 49)];
        setCommentary([...commentaryRef.current]);
        setLiveMinute(90);
        whistle('fulltime');
        setTimeout(() => stopCrowd(), 1500);
        setPhase('done');
        setShowResultOverlay(true);
        setTimeout(() => setShowResultOverlay(false), 3000);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [phase, matchSnap]);

  // Crowd roar on each goal
  const prevScoreRef = useRef({ home: 0, away: 0 });
  useEffect(() => {
    const prev = prevScoreRef.current;
    if (liveScore.home > prev.home || liveScore.away > prev.away) {
      crowdRoar();
    }
    prevScoreRef.current = { ...liveScore };
  }, [liveScore]);

  // Stop crowd if user navigates away mid-match
  useEffect(() => () => { stopCrowd(); }, []);

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
    <Layout lockNav={phase === 'playing' || phase === 'done'}>
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
            aggression={aggression}
            onAggressionChange={setAggression}
            speed={speed}
            onSpeedChange={handleSetSpeed}
            paused={paused}
            onTogglePause={handleTogglePause}
            onContinue={handleContinue}
            subEventsRef={subEventsRef}
            physRef={physRef}
            commentaryRef={commentaryRef}
            setCommentary={setCommentary}
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
  onKickOff: (xi: Player[]) => void;
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
      <section style={{ flexShrink: 0, height: 96, display: 'grid', gridTemplateColumns: '1fr 260px 1fr', alignItems: 'center', background: '#0f1628', margin: '12px 20px 0', borderRadius: 16, border: '1px solid #1c2640', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 40% 120% at 0% 50%, rgba(106,168,255,0.16), transparent 70%), radial-gradient(ellipse 40% 120% at 100% 50%, rgba(232,72,72,0.16), transparent 70%)', pointerEvents: 'none' }} />

        {/* Home */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingLeft: 28, position: 'relative' }}>
          <MatchTeamLogo team={homeTeam} side="home" />
          <div>
            <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800, fontSize: 28, textTransform: 'uppercase', lineHeight: 1 }}>{homeTeam.name}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
              <span style={{ padding: '2px 8px', borderRadius: 4, background: isHome ? '#c8f53d' : '#1c2a4e', color: isHome ? '#070b16' : '#9cc4ff', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em' }}>{isHome ? 'YOU · HOME' : 'HOME'}</span>
              <span style={{ fontSize: 12, color: '#8d99b5' }}>{isHome ? managerName : homeTeam.managerName}</span>
            </div>
          </div>
        </div>

        {/* VS */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8d99b5' }}>Matchday {currentMatchday} · League</div>
          <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 900, fontSize: 40, lineHeight: 1, color: '#3a4768' }}>VS</div>
        </div>

        {/* Away */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingRight: 28, justifyContent: 'flex-end', position: 'relative' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Big Shoulders Display', sans-serif", fontWeight: 800, fontSize: 28, textTransform: 'uppercase', lineHeight: 1 }}>{awayTeam.name}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 12, color: '#8d99b5' }}>{isHome ? opponent.managerName : managerName}</span>
              <span style={{ padding: '2px 8px', borderRadius: 4, background: !isHome ? '#c8f53d' : '#1c2a4e', color: !isHome ? '#070b16' : '#9cc4ff', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em' }}>{!isHome ? 'YOU · AWAY' : 'AWAY'}</span>
            </div>
          </div>
          <MatchTeamLogo team={awayTeam} side="away" />
        </div>
      </section>

      {/* ── 3-column main ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '390px 1fr 320px', gap: 14, padding: '12px 20px 16px', minHeight: 0 }}>

        {/* ── Left: Tactics + Pitch ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexShrink: 0 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>Tactics</div>
            <div style={{ fontSize: 13, color: '#c8f53d', fontWeight: 600 }}>{FORMATION_DESC[formation]}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5, flexShrink: 0 }}>
            {FORMATIONS.map(f => (
              <button key={f} onClick={() => setFormation(f)} style={{
                height: 34, borderRadius: 8, border: `1px solid ${f === formation ? '#c8f53d' : '#2a3656'}`,
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
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e8484d', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13, color: '#fff', boxShadow: '0 3px 8px rgba(0,0,0,0.4)', flexShrink: 0 }}>{i + 1}</div>
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
                style={{ width: 72, height: 100, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1px solid #1c2640', cursor: 'zoom-in', transform: refHover ? 'scale(2.2)' : 'scale(1)', transformOrigin: 'top left', transition: 'transform 0.2s ease', position: 'relative', zIndex: refHover ? 10 : 1 }}
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
          <button onClick={() => onKickOff(allXI)} disabled={allXI.length < 11} style={{
            height: 48, flexShrink: 0, borderRadius: 12, border: 0,
            background: allXI.length >= 11 ? '#c8f53d' : '#2a1820',
            color: allXI.length >= 11 ? '#070b16' : '#ff8a83',
            fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: allXI.length >= 11 ? 22 : 14, letterSpacing: '0.08em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: allXI.length >= 11 ? '0 6px 20px rgba(200,245,61,0.22)' : 'none',
            cursor: allXI.length >= 11 ? 'pointer' : 'not-allowed',
            border: allXI.length < 11 ? '1px solid rgba(255,90,82,0.3)' : '0',
          }}>
            {allXI.length >= 11 ? (
              <>Kick off <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg></>
            ) : (
              <>⚠ Only {allXI.length} players available — need 11</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Playing Phase ─────────────────────────────────────────────────────────────

function PlayingPhase({ snap, managedTeamId, portrait, formation, referee, currentMatchday, ballPos, liveScore, liveMinute, commentary, phase, goalFlash, showResultOverlay, onDismissResult, onSkip, halftime, onResumeHalftime, aggression, onAggressionChange, speed, onSpeedChange, paused, onTogglePause, onContinue, subEventsRef, physRef, commentaryRef, setCommentary }: {
  snap: MatchSnap; managedTeamId: number; portrait: string;
  formation: Formation; referee: typeof REFEREES[0]; currentMatchday: number;
  ballPos: { x: number; y: number };
  liveScore: { home: number; away: number };
  liveMinute: number; commentary: string[];
  phase: 'playing' | 'done';
  goalFlash: boolean;
  showResultOverlay: boolean; onDismissResult: () => void;
  onSkip: () => void; halftime: boolean; onResumeHalftime: () => void;
  aggression: number; onAggressionChange: (v: number) => void;
  speed: 1 | 2 | 4; onSpeedChange: (s: 1 | 2 | 4) => void; paused: boolean; onTogglePause: () => void; onContinue: () => void;
  subEventsRef: MutableRefObject<MatchEvent[]>;
  physRef: MutableRefObject<{ x: number; y: number; minute: number }>;
  commentaryRef: MutableRefObject<string[]>;
  setCommentary: (c: string[]) => void;
}) {
  const { stadium, borderSponsors, table, managerName, rosters, ticketSales } = useGameStore();
  const { homeTeam, awayTeam, isHome, report } = snap;

  const allMyPlayers = (rosters[managedTeamId] ?? []).filter(p => !p.injuredFor && !p.suspended);
  const xiIds = new Set(snap.myXI.map(p => p.id));
  const [showAction, setShowAction] = useState(false);

  // ── Calibration mode (press C during match) ──────────────────────────────
  const [calibMode, setCalibMode] = useState(false);
  const [calibPoints, setCalibPoints] = useState<{ x: number; y: number; label: string }[]>([]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'c' || e.key === 'C') {
        setCalibMode(m => { if (!m) setCalibPoints([]); return !m; });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  const [subsLeft, setSubsLeft] = useState(3);
  const [matchSquad, setMatchSquad] = useState<Player[]>(() => snap.myXI);
  const [matchBench, setMatchBench] = useState<Player[]>(() => allMyPlayers.filter(p => !xiIds.has(p.id)));
  const [selectedOut, setSelectedOut] = useState<string | null>(null);
  const [selectedIn, setSelectedIn] = useState<string | null>(null);
  const aggressionLocked = phase === 'playing' && !halftime;

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

  // Manager portraits — mood follows live score
  const myMood   = myGoals > oppGoals ? '_1' : myGoals < oppGoals ? '_3' : '_2';
  const myPortrait = img(`${portrait}${myMood}.png`);
  const oppPortraitId = ((isHome ? awayTeam.id : homeTeam.id) - 1) % 5 + 1;
  const oppPortrait = img(`manag${oppPortraitId}_2.png`);

  const myTeam = myIsHome ? homeTeam : awayTeam;
  const oppTeam = myIsHome ? awayTeam : homeTeam;

  // Attendance from ticket sales
  const attendance = Array.isArray(ticketSales) ? (ticketSales as number[]).reduce((a, b) => a + b, 0) : 0;

  // Team abbreviations for scoreboard circles
  const homeAbbr = homeTeam.name.slice(0, 3).toUpperCase();
  const awayAbbr = awayTeam.name.slice(0, 3).toUpperCase();


  // Timeline event markers
  const timelineMarks = report.events.filter(e => e.minute <= liveMinute).map(e => {
    const isHomeEvt = e.teamId === homeTeam.id;
    const isYellow = e.type === 'yellow';
    const isRed = e.type === 'red';
    const isMiss = e.type === 'missed_penalty';
    const isInj = e.type === 'injury';
    const isSub = e.type === 'sub';
    const label = isYellow ? `YC ${e.minute}'` : isRed ? `RC ${e.minute}'` : isMiss ? `❌ ${e.minute}'` : isInj ? `🚑 ${e.minute}'` : isSub ? `🔄 ${e.minute}'` : `⚽ ${e.minute}'`;
    const bg = isYellow ? '#f5b94a' : isRed ? '#ef4444' : isMiss ? '#374151' : isInj ? '#0d9488' : isSub ? '#7c3aed' : isHomeEvt ? '#6aa8ff' : '#ff5a52';
    const fg = isYellow ? '#070b16' : '#ffffff';
    return { x: Math.round((e.minute / 90) * 1000) / 10, top: isHomeEvt ? 0 : 29, label, bg, fg };
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

    const pointsEarned = myGoals > oppGoals ? 3 : myGoals === oppGoals ? 1 : 0;

    // Simulate post-match table to compute position change
    const hG = liveScore.home, aG = liveScore.away;
    const simTable = table.map(row => {
      const isH = row.teamId === homeTeam.id, isA = row.teamId === awayTeam.id;
      if (!isH && !isA) return row;
      const gf = isH ? hG : aG, ga = isH ? aG : hG;
      const w = gf > ga ? 1 : 0, d = gf === ga ? 1 : 0, l = gf < ga ? 1 : 0;
      return { ...row, played: row.played + 1, won: row.won + w, drawn: row.drawn + d, lost: row.lost + l, goalsFor: row.goalsFor + gf, goalsAgainst: row.goalsAgainst + ga, points: row.points + (w ? 3 : d ? 1 : 0) };
    }).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const gdD = (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
      return gdD !== 0 ? gdD : b.goalsFor - a.goalsFor;
    });
    const myPosBefore = myPos;
    const myPosAfter = simTable.findIndex(r => r.teamId === managedTeamId) + 1;
    const posChange = myPosBefore - myPosAfter; // positive = moved up

    const ordinal = (n: number) => {
      const s = ['th','st','nd','rd'], v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    // Goal scorers per team
    const homeScorers = report.events.filter(e => e.type === 'goal' && e.teamId === homeTeam.id && e.detail !== 'owngoal');
    const awayScorers = report.events.filter(e => e.type === 'goal' && e.teamId === awayTeam.id && e.detail !== 'owngoal');
    // own goals count for the other team visually
    const homeOwnGoals = report.events.filter(e => e.type === 'goal' && e.teamId === awayTeam.id && e.detail === 'owngoal');
    const awayOwnGoals = report.events.filter(e => e.type === 'goal' && e.teamId === homeTeam.id && e.detail === 'owngoal');
    const homeGoalEvents = [...homeScorers, ...homeOwnGoals];
    const awayGoalEvents = [...awayScorers, ...awayOwnGoals];
    const fmtScorers = (evts: MatchEvent[]) => evts.map(e => `${e.playerName} ${e.minute}'`).join(' · ');

    const homeWon = liveScore.home > liveScore.away, awayWon = liveScore.away > liveScore.home;

    const allReportEvents = [...report.events, ...subEventsRef.current].sort((a, b) => a.minute - b.minute);

    const renderEventRow = (evt: MatchEvent, i: number) => {
      const isHomeEvt = evt.teamId === homeTeam.id;
      const teamColor = isHomeEvt ? '#6aa8ff' : '#ff6b63';
      let icon: string, text: string, rowBg = 'transparent', textColor = '#c2cbe0', bold = false;

      if (evt.type === 'goal') {
        const teamName = isHomeEvt ? homeTeam.name : awayTeam.name;
        icon = '⚽';
        bold = true;
        rowBg = `${teamColor}18`;
        textColor = '#fff';
        if (evt.detail === 'penalty')   text = `GOAL (Penalty) — ${evt.playerName}`;
        else if (evt.detail === 'freekick') text = `GOAL (Free kick) — ${evt.playerName}`;
        else if (evt.detail === 'owngoal')  text = `OWN GOAL — ${evt.playerName}`;
        else text = `GOAL — ${evt.playerName}`;
        text += `  ·  ${teamName}`;
      } else if (evt.type === 'yellow') {
        icon = '🟨'; text = `Yellow card — ${evt.playerName}`;
      } else if (evt.type === 'red') {
        icon = '🟥'; text = `Red card — ${evt.playerName}${evt.detail === '2Y' ? ' (2nd yellow)' : ''}`;
        rowBg = 'rgba(239,68,68,0.08)'; textColor = '#fca5a5';
      } else if (evt.type === 'missed_penalty') {
        icon = '❌'; text = `Penalty missed — ${evt.playerName}`;
      } else if (evt.type === 'injury') {
        icon = '🚑'; text = `Injury — ${evt.playerName}`;
      } else if (evt.type === 'sub') {
        icon = '🔄'; text = `Substitution — ${evt.playerName} ↓  ${evt.detail} ↑`;
        textColor = '#a78bfa';
      } else {
        icon = '⏱'; text = evt.playerName;
      }

      return (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '36px 22px 1fr', gap: 6, padding: '5px 8px', borderRadius: 6, background: rowBg }}>
          <div style={{ fontFamily: "'JetBrains Mono', Consolas, monospace", fontSize: 12, fontWeight: 700, color: bold ? teamColor : '#4b5675', alignSelf: 'center' }}>{evt.minute}'</div>
          <div style={{ fontSize: 14, alignSelf: 'center' }}>{icon}</div>
          <div style={{ fontSize: 13, color: textColor, fontWeight: bold ? 700 : 400, alignSelf: 'center' }}>{text}</div>
        </div>
      );
    };

    return (
      <div style={{ height: '100%', display: 'flex', background: '#070b16', fontFamily: 'Barlow, system-ui' }}>
        <div style={{ width: '44%', flexShrink: 0, background: '#0f1628', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid #1c2640', padding: '20px', gap: 12 }}>
          <img src={img(resultImg)} style={{ maxWidth: '100%', maxHeight: '46%', objectFit: 'contain', imageRendering: 'pixelated' }} alt="" />
          <div style={{ fontFamily: "'Big Shoulders Display', Impact, Arial Black", fontWeight: 900, fontSize: 32, color: resultAccent, letterSpacing: 3 }}>{resultLabel}</div>

          {/* Styled scoreboard */}
          <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 14, background: '#131c33' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
              <div style={{ fontFamily: "'Big Shoulders Display', Impact", fontWeight: 800, fontSize: 22, textTransform: 'uppercase', color: homeWon ? '#c8f53d' : '#e8edf7' }}>{homeTeam.name}</div>
              {homeGoalEvents.length > 0 && <div style={{ fontSize: 11, color: homeWon ? '#9cc4ff' : '#5a6585', textAlign: 'right', lineHeight: 1.4 }}>{fmtScorers(homeGoalEvents)}</div>}
            </div>
            <div style={{ fontFamily: "'Big Shoulders Display', Impact", fontWeight: 900, fontSize: 48, lineHeight: 1, whiteSpace: 'nowrap', display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ color: homeWon ? '#c8f53d' : awayWon ? '#3a4768' : '#e8edf7' }}>{liveScore.home}</span>
              <span style={{ color: '#3a4768', fontSize: 36 }}> – </span>
              <span style={{ color: awayWon ? '#c8f53d' : homeWon ? '#3a4768' : '#e8edf7' }}>{liveScore.away}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ fontFamily: "'Big Shoulders Display', Impact", fontWeight: 800, fontSize: 22, textTransform: 'uppercase', color: awayWon ? '#c8f53d' : '#e8edf7' }}>{awayTeam.name}</div>
              {awayGoalEvents.length > 0 && <div style={{ fontSize: 11, color: awayWon ? '#ff9d97' : '#5a6585', lineHeight: 1.4 }}>{fmtScorers(awayGoalEvents)}</div>}
            </div>
          </div>

          {/* Points + position badges */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ padding: '5px 12px', borderRadius: 8, background: pointsEarned === 3 ? 'rgba(200,245,61,0.15)' : pointsEarned === 1 ? 'rgba(96,165,250,0.15)' : 'rgba(255,90,82,0.1)', border: `1px solid ${pointsEarned === 3 ? 'rgba(200,245,61,0.4)' : pointsEarned === 1 ? 'rgba(96,165,250,0.35)' : 'rgba(255,90,82,0.3)'}`, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 13, color: pointsEarned === 3 ? '#c8f53d' : pointsEarned === 1 ? '#60a5fa' : '#ff7a6b' }}>
              {pointsEarned > 0 ? '+' : ''}{pointsEarned} {pointsEarned === 1 ? 'point' : 'points'}
            </div>
            {myPosAfter !== myPosBefore && (
              <div style={{ padding: '5px 12px', borderRadius: 8, background: '#131c33', border: '1px solid #2a3656', fontSize: 13, color: '#c2cbe0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{ordinal(myPosBefore)}</span>
                <span style={{ color: posChange > 0 ? '#c8f53d' : '#ff7a6b' }}>{posChange > 0 ? '↑' : '↓'}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{ordinal(myPosAfter)}</span>
                <span style={{ color: '#5a6585' }}>in the table</span>
              </div>
            )}
            {myPosAfter === myPosBefore && (
              <div style={{ padding: '5px 12px', borderRadius: 8, background: '#131c33', border: '1px solid #2a3656', fontSize: 13, color: '#5a6585' }}>
                {ordinal(myPosBefore)} in the table
              </div>
            )}
          </div>

          <div style={{ fontSize: 12, color: '#8d99b5', textAlign: 'center' }}>
            ⭐ Man of the Match<br />
            <span style={{ color: '#f5c76b', fontWeight: 700 }}>{report.manOfMatch}</span>
          </div>
          <button onClick={onContinue} style={{ marginTop: 4, background: '#c8f53d', border: 'none', color: '#070b16', padding: '12px 36px', fontSize: 15, fontWeight: 900, cursor: 'pointer', borderRadius: 10, fontFamily: "'Big Shoulders Display', Impact", letterSpacing: 2 }}>
            CONTINUE →
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0f1d' }}>
          <div style={{ flexShrink: 0, padding: '10px 18px', borderBottom: '1px solid #1c2640', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, color: '#8d99b5', fontWeight: 700, letterSpacing: 2 }}>MATCH REPORT</span>
            <span style={{ fontSize: 11, color: '#6aa8ff' }}>{homeTeam.name}</span>
            <span style={{ fontSize: 11, color: '#4b5675' }}>vs</span>
            <span style={{ fontSize: 11, color: '#ff6b63' }}>{awayTeam.name}</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {allReportEvents.length === 0 ? (
              <div style={{ padding: '20px 8px', color: '#4b5675', fontSize: 13, fontStyle: 'italic' }}>No notable events recorded.</div>
            ) : (
              allReportEvents.map((evt, i) => renderEventRow(evt, i))
            )}
          </div>
        </div>
      </div>
    );
  }

  const feedRows = commentary.map((line, i) => {
    const isGoal = line.startsWith('⚽ GOAL!') || line.startsWith('⚽ OWN GOAL!');
    const isYellow = line.startsWith('🟨');
    const isRed = line.startsWith('🟥');
    const isMiss = line.startsWith('❌');
    const isInj = line.startsWith('🚑');
    const isSub = line.startsWith('🔄');
    const min = line.match(/(\d+)'/)?.[1] ?? '';
    const text = line.replace(/^[⚽🟨🟥❌🚑🔄⏱🏁]\s*/, '').replace(/^\d+'\s*/, '');
    return { key: i, isGoal, isYellow, isRed, isMiss, isInj, isSub, min, text };
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

  // Substitution screen derived data
  const fitColorSub = (v: number) => v >= 80 ? '#5fd49a' : v >= 65 ? '#f5c76b' : '#ff7a6b';
  const outPlayer = matchSquad.find(p => p.id === selectedOut) ?? null;
  const inPlayer  = matchBench.find(p => p.id === selectedIn)  ?? null;
  const outStamina = outPlayer ? Math.max(30, 100 - Math.round((liveMinute / 90) * 55) + Math.floor(outPlayer.skill * 0.25)) : 0;
  const inFitness  = inPlayer  ? Math.min(99, 80 + Math.floor(inPlayer.skill * 2)) : 0;
  const bookedPlayers = new Set(
    report.events.filter(e => e.type === 'yellow' && e.teamId === managedTeamId && e.minute <= liveMinute).map(e => e.playerName)
  );
  const subbedOff = new Set(subEventsRef.current.map(e => e.playerName));
  const subReady = !!(outPlayer && inPlayer && subsLeft > 0);

  // Half-time derived data
  const htEvents = [
    { m: 0, t: 'Kick off', tag: '', team: '', kind: 'info' as const },
    ...report.events.filter(e => e.minute <= 45).map(e => {
      const isHomeEvt = e.teamId === homeTeam.id;
      let t = '', tag = '';
      if (e.type === 'goal') { t = `Goal — ${e.playerName}`; tag = e.detail === 'penalty' ? 'Penalty' : e.detail === 'freekick' ? 'Free kick' : e.detail === 'owngoal' ? 'Own goal' : ''; }
      else if (e.type === 'yellow') t = `Yellow card — ${e.playerName}`;
      else if (e.type === 'red') t = `Red card — ${e.playerName}`;
      else if (e.type === 'missed_penalty') t = `Penalty missed — ${e.playerName}`;
      else if (e.type === 'injury') t = `Injury — ${e.playerName}`;
      else t = e.playerName;
      return { m: e.minute, t, tag, team: isHomeEvt ? homeTeam.name : awayTeam.name, kind: isHomeEvt ? 'home' as const : 'away' as const };
    }),
  ].map(e => {
    const isHome = e.kind === 'home', isInfo = e.kind === 'info';
    return {
      ...e,
      bg: isHome ? 'rgba(106,168,255,0.12)' : isInfo ? 'transparent' : 'rgba(255,90,82,0.16)',
      mb: isHome ? '#6aa8ff' : isInfo ? '#1f2945' : '#ff5a52',
      mc: isHome ? '#070b16' : isInfo ? '#a9b3cb' : '#ffffff',
      tc: isInfo ? '#a9b3cb' : '#ffffff', fw: isInfo ? 500 : 700,
      sc: isHome ? '#9cc4ff' : '#ff9d97',
    };
  });
  const htDiff = myGoals - oppGoals;
  const htPrefix = htDiff > 1 ? `${htDiff} up at half time. Hold firm.`
    : htDiff === 1 ? 'One up. Hold firm and take your chances.'
    : htDiff === 0 ? 'Level at the break. Push for the winner.'
    : htDiff === -1 ? 'One down. Make your changes now, or use'
    : `${Math.abs(htDiff)} down. Make your changes now, or use`;

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
          <img src={img('tribcrowd.png')} style={{
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
            paddingTop: '2%',
            zIndex: 10, pointerEvents: 'none',
          }}>
            {goalFlash ? (
              <div style={{ color: '#ffffff', fontSize: '40px', fontWeight: 'bold', letterSpacing: '10px', fontFamily: 'Arial Black, Arial', textShadow: '0 0 24px #ffdd00, 0 2px 8px #000', textAlign: 'center', whiteSpace: 'nowrap' }}>
                G O A L ! ! !
              </div>
            ) : (
              <div style={{ width: '96%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', gap: 4 }}>
                {/* Home */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 0 }}>
                  <div style={{ width: 46, height: 46, borderRadius: '50%', border: '2px solid #6aa8ff', background: '#14244a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <img src={img(`wappen${String(homeTeam.id).padStart(2, '0')}.png`)} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3, imageRendering: 'pixelated' }} alt="" />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#e8edf7', textAlign: 'center', lineHeight: 1.1, fontFamily: "'Big Shoulders Display', sans-serif", textTransform: 'uppercase', overflow: 'hidden', maxWidth: '100%', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{homeTeam.name}</div>
                </div>
                {/* Score + minute */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                  <div style={{ fontSize: '30px', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#fff', lineHeight: 1, letterSpacing: 2 }}>{liveScore.home}<span style={{ color: '#475569', margin: '0 2px' }}>:</span>{liveScore.away}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#c8f53d', animation: 'livepulse 1.2s ease-in-out infinite' }} />
                    <div style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: '#c8f53d', fontWeight: 700 }}>{liveMinute}'</div>
                  </div>
                </div>
                {/* Away */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 0 }}>
                  <div style={{ width: 46, height: 46, borderRadius: '50%', border: '2px solid #ff6b63', background: '#3a1418', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <img src={img(`wappen${String(awayTeam.id).padStart(2, '0')}.png`)} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3, imageRendering: 'pixelated' }} alt="" />
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#e8edf7', textAlign: 'center', lineHeight: 1.1, fontFamily: "'Big Shoulders Display', sans-serif", textTransform: 'uppercase', overflow: 'hidden', maxWidth: '100%', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{awayTeam.name}</div>
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

          {/* Sponsor hoarding — covers crowd/pitch junction + white strip */}
          <div style={{ position: 'absolute', top: '59%', left: 0, right: 0, height: '5%', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 2, zIndex: 8, overflow: 'hidden' }}>
            {[0, 1, 2, 3].map(k => {
              const deal = borderSponsors[k];
              const s: BoardStyle = deal ? (BOARD_STYLES[deal.name] ?? BOARD_EMPTY) : BOARD_EMPTY;
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, height: '100%', background: s.bg, color: s.fg, fontFamily: s.font, fontStyle: s.fi, fontWeight: s.fw, letterSpacing: s.ls, fontSize: 8, textTransform: s.tt as 'uppercase' | 'none', whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: 1 }}>
                  {s.pre && <span style={{ color: s.ac }}>{s.pre}</span>}
                  <span>{s.text}</span>
                  {s.post && <span style={{ color: s.ac, fontSize: '0.6em' }}>{s.post}</span>}
                </div>
              );
            })}
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
          <div
            style={{ position: 'absolute', left: '7%', right: '7%', top: '63%', bottom: '3%', overflow: 'hidden', cursor: calibMode ? 'crosshair' : 'default' }}
            onClick={calibMode ? (e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
              const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
              const label = String(calibPoints.length + 1);
              const pt = { x, y, label };
              setCalibPoints(prev => [...prev, pt]);
              console.log(`Calib #${label}: x=${x} y=${y}`);
            } : undefined}
          >
            <img src={img('ball.png')} alt="" style={{
              position: 'absolute', left: `${ballPos.x}%`, top: `${ballPos.y}%`,
              width: 20, height: 20,
              transform: 'translate(-50%, -50%)',
              transition: phase === 'playing' ? 'left 0.16s linear, top 0.16s linear' : 'none',
              zIndex: 10, pointerEvents: 'none',
            }} />
            {calibMode && calibPoints.map(pt => (
              <div key={pt.label} style={{
                position: 'absolute', left: `${pt.x}%`, top: `${pt.y}%`,
                transform: 'translate(-50%, -50%)', zIndex: 30, pointerEvents: 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff0', border: '2px solid #000' }} />
                <div style={{ fontSize: 9, fontWeight: 700, color: '#ff0', background: 'rgba(0,0,0,0.7)', padding: '1px 3px', borderRadius: 2, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                  #{pt.label} x={pt.x} y={pt.y}
                </div>
              </div>
            ))}
            {calibMode && (
              <div style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,200,0,0.9)', color: '#000', fontWeight: 700, fontSize: 11, padding: '2px 8px', borderRadius: 4, zIndex: 40, pointerEvents: 'none', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                CALIBRATION · Pitch level {pitchLevel} — click to place dots · press C to exit
              </div>
            )}
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
                <button onClick={onTogglePause} style={{
                  flex: 1, padding: '6px 0', fontSize: '11px', fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  background: paused ? '#6aa8ff' : '#1c2640',
                  color: paused ? '#070b16' : '#94a3b8',
                  border: `1px solid ${paused ? '#6aa8ff' : '#2a3650'}`,
                  borderRadius: 4, cursor: 'pointer',
                }}>{paused ? '▶' : '⏸'}</button>
                {([1, 2, 4] as const).map(s => (
                  <button key={s} onClick={() => onSpeedChange(s)} style={{
                    flex: 1, padding: '6px 0', fontSize: '11px', fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    background: !paused && speed === s ? '#c8f53d' : '#1c2640',
                    color: !paused && speed === s ? '#070b16' : '#94a3b8',
                    border: `1px solid ${!paused && speed === s ? '#c8f53d' : '#2a3650'}`,
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
                borderLeft: `2px solid ${row.isGoal ? '#c8f53d' : row.isYellow ? '#f59e0b' : row.isRed ? '#ef4444' : row.isSub ? '#7c3aed' : 'transparent'}`,
              }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: '#64748b', textAlign: 'right', paddingTop: 1 }}>{row.min ? `${row.min}'` : ''}</div>
                <div style={{ fontSize: '11px', color: row.isGoal ? '#c8f53d' : row.isYellow ? '#fbbf24' : row.isRed ? '#fca5a5' : row.isInj ? '#5eead4' : row.isSub ? '#c4b5fd' : '#94a3b8', fontFamily: "'Barlow', sans-serif", lineHeight: 1.4, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{row.text}</div>
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
        <div style={{ position: 'absolute', inset: 0, zIndex: 160, overflow: 'hidden', fontFamily: "'Barlow', system-ui, sans-serif" }}>
          {/* Blurred background */}
          <img src={img('halftime_bg.jpg')} alt="" aria-hidden style={{ position: 'absolute', inset: -20, width: 'calc(100% + 40px)', height: 'calc(100% + 40px)', objectFit: 'cover', filter: 'blur(8px)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 70% at 50% 50%, rgba(7,11,22,0.72), rgba(7,11,22,0.94))' }} />

          {/* Referee chip */}
          <div style={{ position: 'absolute', left: 16, top: 16, zIndex: 10, display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px 6px 6px', borderRadius: 10, background: 'rgba(7,11,22,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <img src={img(referee.img)} style={{ width: 32, height: 44, borderRadius: 8, objectFit: 'cover', imageRendering: 'pixelated' }} alt="" />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#e8edf7' }}>{referee.name}</div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: referee.color }}>{referee.style.toUpperCase()}</div>
            </div>
          </div>

          {/* Modal card */}
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: 920, display: 'flex', flexDirection: 'column', borderRadius: 22, overflow: 'hidden', background: 'rgba(15,22,40,0.96)', border: '1px solid #2a3656', boxShadow: '0 30px 90px rgba(0,0,0,0.65)' }}>

            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '26px 32px 24px', background: 'linear-gradient(180deg, rgba(127,178,255,0.1), transparent)', borderBottom: '1px solid #1c2640' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>Matchday {currentMatchday}</span>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#3a4768', display: 'inline-block' }} />
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 6, background: '#7fb2ff', color: '#070b16', fontSize: 12, fontWeight: 800, letterSpacing: '0.14em' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/></svg>
                  HALF TIME
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', alignItems: 'center', gap: 28, width: '100%' }}>
                {/* Home */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 34, textTransform: 'uppercase', lineHeight: 1, color: '#e8edf7' }}>{homeTeam.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: myIsHome ? '#c8f53d' : '#9cc4ff' }}>{myIsHome ? 'YOU · HOME' : 'HOME'}</div>
                  </div>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', border: '3px solid #6aa8ff', background: '#14244a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 19, color: '#6aa8ff', flexShrink: 0 }}>{homeAbbr}</div>
                </div>
                {/* Score */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 88, lineHeight: 0.9 }}>
                  <span style={{ color: myIsHome && liveScore.home < liveScore.away ? '#ff8a83' : '#e8edf7' }}>{liveScore.home}</span>
                  <span style={{ color: '#3a4768', fontSize: 56 }}>–</span>
                  <span style={{ color: !myIsHome && liveScore.away < liveScore.home ? '#ff8a83' : '#e8edf7' }}>{liveScore.away}</span>
                </div>
                {/* Away */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', border: '3px solid #ff6b63', background: '#3a1418', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 19, color: '#ff8a83', flexShrink: 0 }}>{awayAbbr}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 34, textTransform: 'uppercase', lineHeight: 1, color: '#e8edf7' }}>{awayTeam.name}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: !myIsHome ? '#c8f53d' : '#ff9d97' }}>{!myIsHome ? 'YOU · AWAY' : 'AWAY'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px' }}>
              {/* Events */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '22px 28px', borderRight: '1px solid #1c2640' }}>
                <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>First half</div>
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ position: 'absolute', left: 25, top: 10, bottom: 10, width: 2, background: '#1f2945' }} />
                  {htEvents.map((e, i) => (
                    <div key={i} style={{ position: 'relative', display: 'grid', gridTemplateColumns: '52px minmax(0,1fr)', gap: 12, alignItems: 'center', minHeight: 44 }}>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span style={{ position: 'relative', padding: '3px 7px', borderRadius: 6, background: e.mb, color: e.mc, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12 }}>{e.m}'</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: e.bg }}>
                        <span style={{ fontWeight: e.fw, fontSize: 15, color: e.tc, flexGrow: 1 }}>{e.t}</span>
                        {e.tag && <span style={{ padding: '2px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.08)', color: '#c2cbe0', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{e.tag}</span>}
                        {e.team && <span style={{ fontSize: 12, color: e.sc, fontWeight: 600, flexShrink: 0 }}>{e.team}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '22px 24px' }}>
                <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>Stats</div>
                {matchStats.filter(s => s.label !== 'Corners').map(s => (
                  <div key={s.label} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#9cc4ff' }}>{s.a}</span>
                      <span style={{ color: '#8d99b5' }}>{s.label}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#ff9d97' }}>{s.b}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 3, height: 5 }}>
                      <div style={{ width: `${s.pa}%`, background: '#6aa8ff', borderRadius: 3 }} />
                      <div style={{ flexGrow: 1, background: '#ff5a52', borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 28px', background: '#0a0f1d', borderTop: '1px solid #1c2640' }}>
              <div style={{ flexGrow: 1, fontSize: 14, color: '#a9b3cb' }}>
                {htPrefix}{htDiff >= 0 ? '' : <> <span style={{ fontWeight: 700, color: '#e8edf7' }}>Action</span> during the second half.</>}
              </div>
              <button onClick={() => setShowAction(true)} style={{ height: 52, padding: '0 20px', borderRadius: 12, border: '1px solid #2a3656', background: '#131c33', color: '#e8edf7', fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: "'Barlow', sans-serif" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4v13"/><path d="M3 13l4 4 4-4"/><path d="M17 20V7"/><path d="M21 11l-4-4-4 4"/></svg>
                Substitutions
              </button>
              <button onClick={onResumeHalftime} style={{ height: 52, padding: '0 26px', borderRadius: 12, background: '#c8f53d', color: '#070b16', fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 16, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 10, border: 0, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8z"/></svg>
                Kick off 2nd half
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Substitution Panel Overlay ── */}
      {showAction && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 170, background: '#070b16', display: 'flex', flexDirection: 'column', fontFamily: "'Barlow', system-ui, sans-serif" }}>

          {/* Sub-header */}
          <div style={{ height: 76, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 20, padding: '0 28px', background: '#0a0f1d', borderBottom: '1px solid #1c2640' }}>
            <button onClick={() => { setShowAction(false); setSelectedOut(null); setSelectedIn(null); }} style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid #2a3656', background: 'transparent', color: '#e8edf7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 32, textTransform: 'uppercase', lineHeight: 1, letterSpacing: '0.04em' }}>Substitutions</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#a9b3cb' }}>
                <span style={{ display: 'flex', gap: 4 }}>
                  {[0,1,2].map(k => <span key={k} style={{ width: 18, height: 6, borderRadius: 3, background: k < subsLeft ? '#c8f53d' : '#1f2945', display: 'inline-block' }} />)}
                </span>
                {subsLeft} of 3 changes left
              </div>
            </div>
            <div style={{ flexGrow: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', borderRadius: 12, background: '#131c33', border: '1px solid #1c2640' }}>
              <span style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 18, color: myIsHome ? '#9cc4ff' : '#ff9d97' }}>{homeAbbr}</span>
              <span style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 26, lineHeight: 1 }}>
                <span style={{ color: myIsHome && liveScore.home < liveScore.away ? '#ff8a83' : '#e8edf7' }}>{liveScore.home}</span>
                <span style={{ color: '#3a4768' }}> – </span>
                <span style={{ color: !myIsHome && liveScore.away < liveScore.home ? '#ff8a83' : '#e8edf7' }}>{liveScore.away}</span>
              </span>
              <span style={{ fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 800, fontSize: 18, color: !myIsHome ? '#9cc4ff' : '#ff9d97' }}>{awayAbbr}</span>
              <span style={{ padding: '3px 8px', borderRadius: 6, background: '#7fb2ff', color: '#070b16', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12 }}>
                {halftime ? "45' · HT" : `${liveMinute}'`}
              </span>
            </div>
          </div>

          {/* Main 3-column layout */}
          <div style={{ flexGrow: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 420px minmax(0,1fr)', gap: 18, padding: '18px 28px 22px' }}>

            {/* Left: On the pitch */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 14, borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', minHeight: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '2px 4px 6px', flexShrink: 0 }}>
                <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>On the pitch</div>
                <div style={{ fontSize: 12, color: '#6b7797' }}>Tap to take off</div>
              </div>
              <div style={{ flexGrow: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {matchSquad.map(p => {
                  const stamina = Math.max(30, 100 - Math.round((liveMinute / 90) * 55) + Math.floor(p.skill * 0.25));
                  const isSelected = selectedOut === p.id;
                  const fitC = fitColorSub(stamina);
                  const isBooked = bookedPlayers.has(p.name);
                  return (
                    <button key={p.id} onClick={() => subsLeft > 0 && setSelectedOut(isSelected ? null : p.id)}
                      style={{ display: 'grid', gridTemplateColumns: '36px 44px minmax(0,1fr) 96px 26px', gap: 12, alignItems: 'center', height: 54, padding: '0 12px', borderRadius: 10, border: `2px solid ${isSelected ? '#ff8a83' : 'transparent'}`, background: isSelected ? '#131c33' : 'transparent', color: '#e8edf7', textAlign: 'left', cursor: 'pointer', opacity: subsLeft <= 0 && !isSelected ? 0.45 : 1, fontFamily: "'Barlow', sans-serif", flexShrink: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: POS_COLOR[p.position] + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: POS_COLOR[p.position] }}>{p.name[0]}</div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, color: POS_COLOR[p.position] }}>{POS_LABEL[p.position]}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        {p.name}
                        {isBooked && <span style={{ width: 9, height: 12, borderRadius: 2, background: '#f7d154', flexShrink: 0, display: 'inline-block' }} />}
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8d99b5' }}>
                          <span>Fitness</span><span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: fitC }}>{stamina}%</span>
                        </span>
                        <span style={{ height: 5, borderRadius: 3, background: '#1f2945', overflow: 'hidden', display: 'block' }}><span style={{ display: 'block', height: 5, width: `${stamina}%`, background: fitC, borderRadius: 3 }} /></span>
                      </span>
                      <span style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14 }}>{p.skill}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Center */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0, overflow: 'hidden' }}>

              {/* OFF / ON cards + substitute button */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 18, borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* OFF */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: '#ff8a83' }}>OFF</div>
                    {outPlayer ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 14, borderRadius: 14, background: '#131c33', border: '2px solid #ff8a83' }}>
                        <div style={{ width: 96, height: 96, borderRadius: 12, background: POS_COLOR[outPlayer.position] + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 900, color: POS_COLOR[outPlayer.position] }}>{outPlayer.name[0]}</div>
                        <div style={{ fontWeight: 700, fontSize: 17 }}>{outPlayer.name}</div>
                        <div style={{ display: 'flex', gap: 10, fontSize: 12, color: '#a9b3cb' }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: POS_COLOR[outPlayer.position] }}>{POS_LABEL[outPlayer.position]}</span>
                          <span>Skill <b style={{ color: '#ffffff' }}>{outPlayer.skill}</b></span>
                          <span>Fit <b style={{ color: fitColorSub(outStamina) }}>{outStamina}%</b></span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ height: 168, boxSizing: 'border-box', borderRadius: 14, border: '2px dashed #2a3656', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 14px', fontSize: 13, color: '#6b7797' }}>
                        {subsLeft > 0 ? 'Pick a player on the pitch' : 'No changes left'}
                      </div>
                    )}
                  </div>
                  {/* Swap icon */}
                  <div style={{ alignSelf: 'center', marginTop: 22, width: 40, height: 40, flexShrink: 0, borderRadius: '50%', background: '#1f2945', color: '#c8f53d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h14"/><path d="M14 4l4 4-4 4"/><path d="M20 16H6"/><path d="M10 12l-4 4 4 4"/></svg>
                  </div>
                  {/* ON */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '1 1 0' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: '#c8f53d' }}>ON</div>
                    {inPlayer ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 14, borderRadius: 14, background: '#131c33', border: '2px solid #c8f53d' }}>
                        <div style={{ width: 96, height: 96, borderRadius: 12, background: POS_COLOR[inPlayer.position] + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 900, color: POS_COLOR[inPlayer.position] }}>{inPlayer.name[0]}</div>
                        <div style={{ fontWeight: 700, fontSize: 17 }}>{inPlayer.name}</div>
                        <div style={{ display: 'flex', gap: 10, fontSize: 12, color: '#a9b3cb' }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: POS_COLOR[inPlayer.position] }}>{POS_LABEL[inPlayer.position]}</span>
                          <span>Skill <b style={{ color: '#ffffff' }}>{inPlayer.skill}</b></span>
                          <span>Fit <b style={{ color: fitColorSub(inFitness) }}>{inFitness}%</b></span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ height: 168, boxSizing: 'border-box', borderRadius: 14, border: '2px dashed #2a3656', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 14px', fontSize: 13, color: '#6b7797' }}>
                        {subsLeft > 0 ? 'Pick a player from the bench' : 'No changes left'}
                      </div>
                    )}
                  </div>
                </div>
                {/* Position mismatch warning */}
                {outPlayer && inPlayer && outPlayer.position !== inPlayer.position && (
                  <div style={{ padding: '9px 12px', borderRadius: 10, background: 'rgba(245,185,74,0.12)', color: '#f5c76b', fontSize: 13, fontWeight: 600 }}>
                    {inPlayer.name} plays {POS_LABEL[inPlayer.position]}, not {POS_LABEL[outPlayer.position]}. He'll be out of position.
                  </div>
                )}
                <button
                  onClick={() => {
                    if (!subReady || !snap) return;
                    const outP = outPlayer!;
                    const inP = inPlayer!;
                    setMatchSquad(sq => sq.map(p => p.id === outP.id ? inP : p));
                    setMatchBench(b => b.map(p => p.id === inP.id ? outP : p));
                    setSubsLeft(s => s - 1);
                    const subMin = Math.max(1, Math.floor(physRef.current.minute));
                    const subEvt: MatchEvent = { minute: subMin, type: 'sub', teamId: managedTeamId, playerName: outP.name, detail: inP.name };
                    subEventsRef.current = [...subEventsRef.current, subEvt];
                    commentaryRef.current = [`🔄 ${subMin}' Sub — ${outP.name} ↓  ${inP.name} ↑`, ...commentaryRef.current.slice(0, 49)];
                    setCommentary([...commentaryRef.current]);
                    setSelectedOut(null); setSelectedIn(null);
                  }}
                  style={{ height: 56, borderRadius: 12, border: 0, background: subReady ? '#c8f53d' : '#1f2945', color: subReady ? '#070b16' : '#6b7797', fontFamily: "'Big Shoulders Display', Impact, sans-serif", fontWeight: 900, fontSize: 22, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: subReady ? 'pointer' : 'default' }}
                >
                  {subsLeft <= 0 ? 'No changes left' : subReady ? 'Make substitution' : 'Pick both players'}
                </button>
              </div>

              {/* Aggression */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 18px', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>Team Aggression</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 15, color: aggression > 70 ? '#ff8a83' : aggression > 40 ? '#f5c76b' : '#5fd49a' }}>
                    {aggression}% · {aggression <= 20 ? 'Gentle' : aggression <= 40 ? 'Careful' : aggression <= 60 ? 'Balanced' : aggression <= 80 ? 'Physical' : 'Reckless'}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '44px minmax(0,1fr) 44px', gap: 12, alignItems: 'center' }}>
                  <button onClick={() => !aggressionLocked && onAggressionChange(Math.max(0, aggression - 10))} disabled={aggressionLocked} style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid #2a3656', background: '#131c33', color: aggressionLocked ? '#3a4768' : '#e8edf7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: aggressionLocked ? 'default' : 'pointer' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M5 12h14"/></svg>
                  </button>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, minmax(0,1fr))', gap: 3 }}>
                    {Array.from({ length: 10 }, (_, k) => {
                      const filled = k < aggression / 10;
                      return <span key={k} style={{ height: 14, borderRadius: 3, background: filled ? (k >= 7 ? '#ff7a6b' : k >= 4 ? '#f5b94a' : '#5fd49a') : '#1f2945', display: 'block' }} />;
                    })}
                  </div>
                  <button onClick={() => !aggressionLocked && onAggressionChange(Math.min(100, aggression + 10))} disabled={aggressionLocked} style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid #2a3656', background: '#131c33', color: aggressionLocked ? '#3a4768' : '#e8edf7', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: aggressionLocked ? 'default' : 'pointer' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                  </button>
                </div>
              </div>

              {/* Changes made */}
              <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: '16px 18px', borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', overflow: 'hidden' }}>
                <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600, flexShrink: 0 }}>Changes made</div>
                {subEventsRef.current.length === 0
                  ? <div style={{ fontSize: 14, color: '#6b7797' }}>No changes yet.</div>
                  : subEventsRef.current.map((e, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, padding: '6px 0', borderTop: '1px solid #1c2640' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, color: '#7fb2ff', flexShrink: 0 }}>{e.minute}'</span>
                      <span style={{ color: '#ff8a83', fontWeight: 700 }}>↓ {e.playerName}</span>
                      <span style={{ color: '#c8f53d', fontWeight: 700 }}>↑ {e.detail}</span>
                    </div>
                  ))
                }
                <div style={{ flexGrow: 1 }} />
                <button onClick={() => { setShowAction(false); setSelectedOut(null); setSelectedIn(null); }} style={{ height: 48, borderRadius: 12, border: '1px solid #2a3656', background: 'transparent', color: '#e8edf7', fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: "'Barlow', sans-serif", flexShrink: 0 }}>
                  Done · back to half time
                </button>
              </div>
            </section>

            {/* Right: Bench */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 14, borderRadius: 16, background: '#0f1628', border: '1px solid #1c2640', minHeight: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '2px 4px 6px', flexShrink: 0 }}>
                <div style={{ fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8d99b5', fontWeight: 600 }}>Bench</div>
                <div style={{ fontSize: 12, color: '#6b7797' }}>Tap to bring on</div>
              </div>
              <div style={{ flexGrow: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
                {matchBench.length === 0
                  ? <div style={{ padding: 24, fontSize: 13, color: '#3a4768', textAlign: 'center' }}>No reserves available</div>
                  : matchBench.map(p => {
                    const benchFit = Math.min(99, 80 + Math.floor(p.skill * 2));
                    const fitC = fitColorSub(benchFit);
                    const isSelected = selectedIn === p.id;
                    const wasSubbedOff = subbedOff.has(p.name);
                    const benchDisabled = subsLeft <= 0 || wasSubbedOff;
                    return (
                      <button key={p.id} onClick={() => !benchDisabled && setSelectedIn(isSelected ? null : p.id)}
                        style={{ display: 'grid', gridTemplateColumns: '36px 44px minmax(0,1fr) 96px 26px', gap: 12, alignItems: 'center', height: 54, padding: '0 12px', borderRadius: 10, border: `2px solid ${isSelected ? '#c8f53d' : 'transparent'}`, background: isSelected ? '#131c33' : 'transparent', color: '#e8edf7', textAlign: 'left', cursor: benchDisabled ? 'not-allowed' : 'pointer', opacity: benchDisabled && !isSelected ? 0.35 : 1, fontFamily: "'Barlow', sans-serif", flexShrink: 0 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: POS_COLOR[p.position] + '33', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: POS_COLOR[p.position] }}>{p.name[0]}</div>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, color: POS_COLOR[p.position] }}>{POS_LABEL[p.position]}</span>
                        <span style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                        <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8d99b5' }}>
                            <span>Fitness</span><span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: fitC }}>{benchFit}%</span>
                          </span>
                          <span style={{ height: 5, borderRadius: 3, background: '#1f2945', overflow: 'hidden', display: 'block' }}><span style={{ display: 'block', height: 5, width: `${benchFit}%`, background: fitC, borderRadius: 3 }} /></span>
                        </span>
                        <span style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14 }}>{p.skill}</span>
                      </button>
                    );
                  })
                }
              </div>
            </section>
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
