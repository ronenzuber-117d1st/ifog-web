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
  const usedMinutes = new Set<number>();

  const addGoalEvents = (count: number, teamId: number, squad: Player[]) => {
    const scorers = squad.filter(p => p.position === 'S' || p.position === 'M');
    for (let i = 0; i < count; i++) {
      let min: number;
      do { min = 1 + Math.floor(Math.random() * 90); } while (usedMinutes.has(min));
      usedMinutes.add(min);
      const scorer = scorers[Math.floor(Math.random() * scorers.length)] ?? squad[0];
      events.push({ minute: min, type: 'goal', teamId, playerName: scorer?.name ?? 'Unknown' });
    }
  };

  addGoalEvents(homeGoals, homeTeam.id, homePlayers.length > 0 ? homePlayers : []);
  addGoalEvents(awayGoals, awayTeam.id, awayPlayers.length > 0 ? awayPlayers : []);

  if (Math.random() < 0.6) {
    const all = [...homePlayers, ...awayPlayers];
    const recipient = all[Math.floor(Math.random() * all.length)];
    if (recipient) {
      const teamId = homePlayers.includes(recipient) ? homeTeam.id : awayTeam.id;
      let min: number;
      do { min = 1 + Math.floor(Math.random() * 90); } while (usedMinutes.has(min));
      usedMinutes.add(min);
      events.push({ minute: min, type: 'yellow', teamId, playerName: recipient.name });
    }
  }

  events.sort((a, b) => a.minute - b.minute);

  const allPlayers = [...homePlayers, ...awayPlayers];
  const manOfMatch = allPlayers[Math.floor(Math.random() * allPlayers.length)]?.name ?? 'Unknown';

  const played: Fixture = { ...fixture, homeGoals, awayGoals };
  return { fixture: played, events, manOfMatch };
}
