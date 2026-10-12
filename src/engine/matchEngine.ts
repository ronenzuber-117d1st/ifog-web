import type { Team, Player, Formation, MatchReport, Fixture, MatchEvent } from '../types/game';

const FORMATION_MODS: Record<Formation, { atk: number; def: number }> = {
  '4-4-2': { atk: 1.00, def: 1.00 },
  '4-3-3': { atk: 1.15, def: 0.88 },
  '3-5-2': { atk: 1.05, def: 0.95 },
  '5-3-2': { atk: 0.88, def: 1.15 },
  '4-5-1': { atk: 0.80, def: 1.10 },
};

function poisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function freshMinute(used: Set<number>, lo = 1, hi = 90): number {
  let m: number;
  do { m = lo + Math.floor(Math.random() * (hi - lo + 1)); } while (used.has(m));
  used.add(m);
  return m;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickPos(squad: Player[], positions: string[]): Player {
  const pool = squad.filter(p => positions.includes(p.position));
  return pick(pool.length > 0 ? pool : squad);
}

function teamEffectiveSkill(team: Team, players: Player[], formation: Formation): number {
  const fit = players.filter(p => !p.injuredFor && !p.suspended);
  const avgPlayerSkill = fit.length > 0 ? fit.reduce((s, p) => s + p.skill, 0) / fit.length : 5;
  const mods = FORMATION_MODS[formation];
  return (team.baseSkill + avgPlayerSkill * 2) * mods.atk;
}

function teamDefSkill(team: Team, players: Player[], formation: Formation): number {
  const fit = players.filter(p => !p.injuredFor && !p.suspended);
  const avgPlayerSkill = fit.length > 0 ? fit.reduce((s, p) => s + p.skill, 0) / fit.length : 5;
  const mods = FORMATION_MODS[formation];
  return (team.baseSkill + avgPlayerSkill * 2) * mods.def;
}

/**
 * Weighted fraction of full-strength player-time over 90 minutes.
 * Red card at minute 2  → ~0.91 (team plays most of match down a man)
 * Red card at minute 45 → ~0.955 (only second half affected)
 * No red cards          → 1.0
 */
function calcPlayerFactor(redCardMinutes: number[]): number {
  const sorted = [...redCardMinutes].sort((a, b) => a - b);
  let sum = 0;
  let prevMin = 0;
  let players = 11;

  for (const min of sorted) {
    sum += players * (min - prevMin);
    players = Math.max(7, players - 1);
    prevMin = min;
  }
  sum += players * (90 - prevMin);

  return sum / (90 * 11);
}

export function simulateMatch(
  homeTeam: Team,
  awayTeam: Team,
  homePlayers: Player[],
  awayPlayers: Player[],
  homeFormation: Formation,
  awayFormation: Formation,
  managedTeamMod = 1,
  aggression = 50,
  playerIsHome = true,
  homePlayerFactor = 1,
  awayPlayerFactor = 1,
): { homeGoals: number; awayGoals: number } {
  const aggrRatio = aggression / 100;
  const aggrAtkMod = 0.85 + aggrRatio * 0.30;
  const aggrDefMod = 1.10 - aggrRatio * 0.20;

  const homeAtk = teamEffectiveSkill(homeTeam, homePlayers, homeFormation) * managedTeamMod * (playerIsHome ? aggrAtkMod : 1) * homePlayerFactor;
  const awayAtk = teamEffectiveSkill(awayTeam, awayPlayers, awayFormation) * (!playerIsHome ? aggrAtkMod : 1) * awayPlayerFactor;
  const homeDef = teamDefSkill(homeTeam, homePlayers, homeFormation) * managedTeamMod * (playerIsHome ? aggrDefMod : 1) * homePlayerFactor;
  const awayDef = teamDefSkill(awayTeam, awayPlayers, awayFormation) * (!playerIsHome ? aggrDefMod : 1) * awayPlayerFactor;

  const homeAdv = 5;
  const expHome = Math.max(0.1, (homeAtk + homeAdv - awayDef) / 20 + 0.8);
  const expAway = Math.max(0.1, (awayAtk - homeDef) / 20 + 0.5);

  return { homeGoals: poisson(expHome), awayGoals: poisson(expAway) };
}

export function simulateFullMatch(
  fixture: Fixture,
  homeTeam: Team,
  awayTeam: Team,
  homePlayers: Player[],
  awayPlayers: Player[],
  formation: Formation,
  managedTeamMod = 1,
  aggression = 50,
  playerIsHome = true,
): MatchReport {
  const aggrRatio = aggression / 100;
  const events: MatchEvent[] = [];
  const used = new Set<number>();
  const yellowedPlayers = new Map<string, number>();

  // -- Step 1: Generate card events first so red cards inform the score calculation --
  const cardMod = 0.5 + aggrRatio * 1.3;
  const yellowCount = Math.max(0, poisson(2.2 * cardMod));

  for (let i = 0; i < yellowCount; i++) {
    const all = [...homePlayers, ...awayPlayers];
    if (all.length === 0) break;
    const p = pick(all);
    const teamId = homePlayers.includes(p) ? homeTeam.id : awayTeam.id;
    const prev = yellowedPlayers.get(p.name) ?? 0;
    if (prev >= 2) continue;
    if (prev >= 1) {
      events.push({ minute: freshMinute(used), type: 'red', teamId, playerName: p.name, detail: '2Y' });
      yellowedPlayers.set(p.name, 2);
    } else {
      events.push({ minute: freshMinute(used), type: 'yellow', teamId, playerName: p.name });
      yellowedPlayers.set(p.name, prev + 1);
    }
  }

  // Straight red card — 2% at gentle, 14% at reckless
  if (Math.random() < 0.02 + aggrRatio * 0.12) {
    const all = [...homePlayers, ...awayPlayers];
    if (all.length > 0) {
      const p = pick(all);
      if ((yellowedPlayers.get(p.name) ?? 0) < 2) {
        const teamId = homePlayers.includes(p) ? homeTeam.id : awayTeam.id;
        events.push({ minute: freshMinute(used), type: 'red', teamId, playerName: p.name });
        yellowedPlayers.set(p.name, 2);
      }
    }
  }

  // -- Step 2: Derive player-count factors from red card timing --
  const homeRedMins = events
    .filter(e => e.type === 'red' && e.teamId === homeTeam.id)
    .map(e => e.minute);
  const awayRedMins = events
    .filter(e => e.type === 'red' && e.teamId === awayTeam.id)
    .map(e => e.minute);

  const homePlayerFactor = calcPlayerFactor(homeRedMins);
  const awayPlayerFactor = calcPlayerFactor(awayRedMins);

  // -- Step 3: Score, now aware of each team's effective strength --
  const { homeGoals, awayGoals } = simulateMatch(
    homeTeam, awayTeam, homePlayers, awayPlayers, formation, '4-4-2',
    managedTeamMod, aggression, playerIsHome,
    homePlayerFactor, awayPlayerFactor,
  );

  // -- Step 4: Goal events --
  const addGoals = (count: number, teamId: number, squad: Player[], oppSquad: Player[]) => {
    for (let i = 0; i < count; i++) {
      const min = freshMinute(used);
      const r = Math.random();
      if (r < 0.06 && oppSquad.length > 0) {
        const scorer = pickPos(oppSquad, ['V', 'T', 'M']);
        events.push({ minute: min, type: 'goal', teamId, playerName: scorer.name, detail: 'owngoal' });
      } else if (r < 0.20) {
        const scorer = pickPos(squad, ['S', 'M']);
        events.push({ minute: min, type: 'goal', teamId, playerName: scorer.name, detail: 'penalty' });
      } else if (r < 0.36) {
        const scorer = pickPos(squad, ['M', 'S']);
        events.push({ minute: min, type: 'goal', teamId, playerName: scorer.name, detail: 'freekick' });
      } else if (squad.length > 0) {
        const scorer = pickPos(squad, ['S', 'M']);
        events.push({ minute: min, type: 'goal', teamId, playerName: scorer.name });
      }
    }
  };

  addGoals(homeGoals, homeTeam.id, homePlayers, awayPlayers);
  addGoals(awayGoals, awayTeam.id, awayPlayers, homePlayers);

  // -- Missed penalty (25% chance per match) --
  if (Math.random() < 0.25) {
    const isHomeTeam = Math.random() > 0.5;
    const squad = isHomeTeam ? homePlayers : awayPlayers;
    const teamId = isHomeTeam ? homeTeam.id : awayTeam.id;
    if (squad.length > 0) {
      events.push({ minute: freshMinute(used), type: 'missed_penalty', teamId, playerName: pickPos(squad, ['S', 'M']).name });
    }
  }

  // -- Injury (35% chance) --
  if (Math.random() < 0.35) {
    const all = [...homePlayers, ...awayPlayers];
    if (all.length > 0) {
      const p = pick(all);
      const teamId = homePlayers.includes(p) ? homeTeam.id : awayTeam.id;
      events.push({ minute: freshMinute(used), type: 'injury', teamId, playerName: p.name });
    }
  }

  // -- Sort then strip any events for already-dismissed players --
  events.sort((a, b) => a.minute - b.minute);

  const sentOff = new Set<string>();
  const filteredEvents = events.filter(evt => {
    if (sentOff.has(evt.playerName)) return false;
    if (evt.type === 'red') sentOff.add(evt.playerName);
    return true;
  });
  events.length = 0;
  events.push(...filteredEvents);

  const allPlayers = [...homePlayers, ...awayPlayers];
  const manOfMatch = allPlayers[Math.floor(Math.random() * allPlayers.length)]?.name ?? 'Unknown';

  const played: Fixture = { ...fixture, homeGoals, awayGoals };
  return { fixture: played, events, manOfMatch };
}
