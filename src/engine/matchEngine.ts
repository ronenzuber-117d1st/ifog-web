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

export function simulateMatch(
  homeTeam: Team,
  awayTeam: Team,
  homePlayers: Player[],
  awayPlayers: Player[],
  homeFormation: Formation,
  awayFormation: Formation,
  managedTeamMod = 1,
): { homeGoals: number; awayGoals: number } {
  const homeAtk = teamEffectiveSkill(homeTeam, homePlayers, homeFormation) * managedTeamMod;
  const awayAtk = teamEffectiveSkill(awayTeam, awayPlayers, awayFormation);
  const homeDef = teamDefSkill(homeTeam, homePlayers, homeFormation) * managedTeamMod;
  const awayDef = teamDefSkill(awayTeam, awayPlayers, awayFormation);

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
): MatchReport {
  const { homeGoals, awayGoals } = simulateMatch(
    homeTeam, awayTeam, homePlayers, awayPlayers, formation, '4-4-2', managedTeamMod,
  );

  const events: MatchEvent[] = [];
  const used = new Set<number>();

  // -- Goals --
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

  // -- Yellow cards (average 2-3 per match) --
  const yellowCount = Math.max(1, poisson(2.2));
  const yellowedPlayers = new Map<string, number>();

  for (let i = 0; i < yellowCount; i++) {
    const all = [...homePlayers, ...awayPlayers];
    if (all.length === 0) break;
    const p = pick(all);
    const teamId = homePlayers.includes(p) ? homeTeam.id : awayTeam.id;
    const prev = yellowedPlayers.get(p.name) ?? 0;
    if (prev >= 1) {
      events.push({ minute: freshMinute(used), type: 'red', teamId, playerName: p.name, detail: '2Y' });
      yellowedPlayers.set(p.name, 2);
    } else {
      events.push({ minute: freshMinute(used), type: 'yellow', teamId, playerName: p.name });
      yellowedPlayers.set(p.name, prev + 1);
    }
  }

  // -- Straight red card (8% chance) --
  if (Math.random() < 0.08) {
    const all = [...homePlayers, ...awayPlayers];
    if (all.length > 0) {
      const p = pick(all);
      if ((yellowedPlayers.get(p.name) ?? 0) < 2) {
        const teamId = homePlayers.includes(p) ? homeTeam.id : awayTeam.id;
        events.push({ minute: freshMinute(used), type: 'red', teamId, playerName: p.name });
      }
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

  events.sort((a, b) => a.minute - b.minute);

  const allPlayers = [...homePlayers, ...awayPlayers];
  const manOfMatch = allPlayers[Math.floor(Math.random() * allPlayers.length)]?.name ?? 'Unknown';

  const played: Fixture = { ...fixture, homeGoals, awayGoals };
  return { fixture: played, events, manOfMatch };
}
