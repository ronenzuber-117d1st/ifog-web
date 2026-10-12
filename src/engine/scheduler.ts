import type { Fixture } from '../types/game';
import { SCHEDULE } from '../data/schedule';

export function generateFixtures(teamIds: number[]): Fixture[] {
  return SCHEDULE.map(s => ({
    id: `${s.matchday}-${s.home}-${s.away}`,
    matchday: s.matchday,
    homeTeamId: teamIds[s.home - 1],
    awayTeamId: teamIds[s.away - 1],
  }));
}
