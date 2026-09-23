import type { Fixture } from '../types/game';

export function generateFixtures(teamIds: number[]): Fixture[] {
  const n = teamIds.length;
  const fixtures: Fixture[] = [];
  const teams = [...teamIds];
  if (n % 2 !== 0) teams.push(-1); // bye
  const half = teams.length - 1;

  const rotate = (arr: number[]) => {
    const last = arr.pop()!;
    arr.splice(1, 0, last);
  };

  const t = [...teams];

  for (let round = 0; round < half; round++) {
    for (let i = 0; i < t.length / 2; i++) {
      const home = t[i];
      const away = t[t.length - 1 - i];
      if (home !== -1 && away !== -1) {
        fixtures.push({
          id: `${round + 1}-${home}-${away}`,
          matchday: round + 1,
          homeTeamId: home,
          awayTeamId: away,
        });
      }
    }
    rotate(t);
  }

  // Return leg — swap home/away
  const firstLeg = fixtures.slice();
  firstLeg.forEach(f => {
    fixtures.push({
      id: `${f.matchday + half}-${f.awayTeamId}-${f.homeTeamId}`,
      matchday: f.matchday + half,
      homeTeamId: f.awayTeamId,
      awayTeamId: f.homeTeamId,
    });
  });

  fixtures.sort((a, b) => a.matchday - b.matchday || a.homeTeamId - b.homeTeamId);
  return fixtures;
}
