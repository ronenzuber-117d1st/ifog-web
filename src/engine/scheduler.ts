import type { Fixture } from '../types/game';
import { SCHEDULE } from '../data/schedule';

export function generateFixtures(_teamIds: number[]): Fixture[] {
  return SCHEDULE.map(s => ({
    id: `${s.matchday}-${s.home}-${s.away}`,
    matchday: s.matchday,
    homeTeamId: s.home,
    awayTeamId: s.away,
  }));
}
