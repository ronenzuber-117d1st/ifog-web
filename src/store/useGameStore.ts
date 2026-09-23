import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GamePhase, Formation, Player, TableRow, Fixture, MatchReport, GameEvent, FinanceEntry } from '../types/game';
import { LEAGUE_TEAMS, getAllRosters } from '../data/teams';
import { GAME_EVENTS, CHAIRMAN_MESSAGES } from '../data/events';
import { STARTING_BALANCE, WAGES_PER_MATCHDAY, calcMatchRevenue } from '../data/finances';
import { generateFixtures } from '../engine/scheduler';
import { simulateFullMatch, simulateMatch } from '../engine/matchEngine';

export interface GameStore {
  phase: GamePhase;
  managerName: string;
  managedTeamId: number;
  currentMatchday: number;
  totalMatchdays: number;
  rosters: Record<number, Player[]>;
  formation: Formation;
  table: TableRow[];
  fixtures: Fixture[];
  balance: number;
  financeHistory: FinanceEntry[];
  pendingEvent: GameEvent | null;
  lastMatch: MatchReport | null;
  chairmanMessage: string;
  priceLevel: 'low' | 'medium' | 'high';
  foodEnabled: boolean;
  merchandiseEnabled: boolean;

  startNewGame: (managerName: string, teamId: number) => void;
  playMatchday: () => void;
  setFormation: (f: Formation) => void;
  trainPlayer: (playerId: string) => void;
  dismissEvent: () => void;
  setPhase: (p: GamePhase) => void;
  setPriceLevel: (l: 'low' | 'medium' | 'high') => void;
  setFoodEnabled: (v: boolean) => void;
  setMerchandiseEnabled: (v: boolean) => void;
  resetGame: () => void;
}

function makeTableRow(teamId: number): TableRow {
  return { teamId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
}

function sortTable(table: TableRow[]): TableRow[] {
  return [...table].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goalsFor - a.goalsAgainst;
    const gdB = b.goalsFor - b.goalsAgainst;
    if (gdB !== gdA) return gdB - gdA;
    return b.goalsFor - a.goalsFor;
  });
}

function applyResult(row: TableRow, gf: number, ga: number): TableRow {
  const won = gf > ga ? 1 : 0;
  const drawn = gf === ga ? 1 : 0;
  const lost = gf < ga ? 1 : 0;
  return {
    ...row,
    played: row.played + 1,
    won: row.won + won,
    drawn: row.drawn + drawn,
    lost: row.lost + lost,
    goalsFor: row.goalsFor + gf,
    goalsAgainst: row.goalsAgainst + ga,
    points: row.points + (won ? 3 : drawn ? 1 : 0),
  };
}

function pickEvent(): GameEvent | null {
  if (Math.random() > 0.35) return null;
  return GAME_EVENTS[Math.floor(Math.random() * GAME_EVENTS.length)];
}

function chairmanMsg(name: string, position: number): string {
  const _bias = Math.min(CHAIRMAN_MESSAGES.length - 1, Math.floor(position / 2));
  const template = CHAIRMAN_MESSAGES[(_bias + Math.floor(Math.random() * 3)) % CHAIRMAN_MESSAGES.length];
  return template.replace('{name}', name);
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      phase: 'menu',
      managerName: '',
      managedTeamId: 1,
      currentMatchday: 1,
      totalMatchdays: 38,
      rosters: {},
      formation: '4-4-2',
      table: [],
      fixtures: [],
      balance: STARTING_BALANCE,
      financeHistory: [],
      pendingEvent: null,
      lastMatch: null,
      chairmanMessage: 'Welcome to the club!',
      priceLevel: 'medium',
      foodEnabled: true,
      merchandiseEnabled: true,

      startNewGame: (managerName, teamId) => {
        const rosters = getAllRosters();
        const teamIds = LEAGUE_TEAMS.map(t => t.id);
        const fixtures = generateFixtures(teamIds);
        const table = LEAGUE_TEAMS.map(t => makeTableRow(t.id));
        set({
          phase: 'season',
          managerName,
          managedTeamId: teamId,
          currentMatchday: 1,
          totalMatchdays: 38,
          rosters,
          formation: '4-4-2',
          table,
          fixtures,
          balance: STARTING_BALANCE,
          financeHistory: [],
          pendingEvent: null,
          lastMatch: null,
          chairmanMessage: `Welcome, ${managerName}! The season starts now.`,
          priceLevel: 'medium',
          foodEnabled: true,
          merchandiseEnabled: true,
        });
      },

      playMatchday: () => {
        const s = get();
        const { currentMatchday, fixtures, rosters, managedTeamId, formation, table, balance, financeHistory, managerName, priceLevel, foodEnabled, merchandiseEnabled } = s;

        const dayFixtures = fixtures.filter(f => f.matchday === currentMatchday && !f.homeGoals && f.homeGoals !== 0);
        if (dayFixtures.length === 0) return;

        let newTable = [...table];
        let lastMatch: MatchReport | null = null;
        const updatedFixtures = [...fixtures];

        for (const fixture of dayFixtures) {
          const homeTeam = LEAGUE_TEAMS.find(t => t.id === fixture.homeTeamId)!;
          const awayTeam = LEAGUE_TEAMS.find(t => t.id === fixture.awayTeamId)!;
          const homePlayers = rosters[fixture.homeTeamId] ?? [];
          const awayPlayers = rosters[fixture.awayTeamId] ?? [];

          let homeGoals: number, awayGoals: number;

          if (fixture.homeTeamId === managedTeamId || fixture.awayTeamId === managedTeamId) {
            const isHome = fixture.homeTeamId === managedTeamId;
            const report = simulateFullMatch(
              fixture, homeTeam, awayTeam, homePlayers, awayPlayers,
              isHome ? formation : '4-4-2',
            );
            homeGoals = report.fixture.homeGoals!;
            awayGoals = report.fixture.awayGoals!;
            lastMatch = report;
          } else {
            const result = simulateMatch(homeTeam, awayTeam, homePlayers, awayPlayers, '4-4-2', '4-4-2');
            homeGoals = result.homeGoals;
            awayGoals = result.awayGoals;
          }

          const fixtureIdx = updatedFixtures.findIndex(f => f.id === fixture.id);
          updatedFixtures[fixtureIdx] = { ...fixture, homeGoals, awayGoals };

          newTable = newTable.map(row => {
            if (row.teamId === fixture.homeTeamId) return applyResult(row, homeGoals, awayGoals);
            if (row.teamId === fixture.awayTeamId) return applyResult(row, awayGoals, homeGoals);
            return row;
          });
        }

        newTable = sortTable(newTable);

        // Finance update
        const isHomeMatch = dayFixtures.some(f => f.homeTeamId === managedTeamId);
        const matchRevenue = calcMatchRevenue(isHomeMatch, priceLevel, foodEnabled, merchandiseEnabled);
        const wages = WAGES_PER_MATCHDAY;
        const net = matchRevenue - wages;

        const event = pickEvent();
        const eventMoney = event ? event.moneyEffect : 0;
        const eventPoints = event ? event.pointsEffect : 0;

        const newBalance = balance + net + eventMoney;

        let adjustedTable = newTable;
        if (eventPoints !== 0) {
          adjustedTable = newTable.map(row =>
            row.teamId === managedTeamId
              ? { ...row, points: Math.max(0, row.points + eventPoints) }
              : row
          );
          adjustedTable = sortTable(adjustedTable);
        }

        const pos = adjustedTable.findIndex(r => r.teamId === managedTeamId) + 1;
        const entry: FinanceEntry = {
          matchday: currentMatchday,
          description: isHomeMatch ? 'Home match revenue' : 'Away match (wages only)',
          amount: net + eventMoney,
          running: newBalance,
        };

        // Heal injured players
        const newRosters = { ...rosters };
        if (newRosters[managedTeamId]) {
          newRosters[managedTeamId] = newRosters[managedTeamId].map(p =>
            p.injuredFor > 0 ? { ...p, injuredFor: p.injuredFor - 1 } : p
          );
        }

        set({
          fixtures: updatedFixtures,
          table: adjustedTable,
          lastMatch,
          pendingEvent: event,
          balance: newBalance,
          financeHistory: [...financeHistory, entry],
          currentMatchday: currentMatchday + 1,
          chairmanMessage: chairmanMsg(managerName, pos),
          rosters: newRosters,
          phase: 'result',
        });
      },

      setFormation: (formation) => set({ formation }),

      trainPlayer: (playerId) => {
        const { rosters, managedTeamId, balance } = get();
        const cost = 10_000;
        if (balance < cost) return;
        const players = rosters[managedTeamId] ?? [];
        const updated = players.map(p => {
          if (p.id !== playerId) return p;
          const newProgress = p.trainingProgress + 1;
          if (newProgress >= 5) {
            return { ...p, skill: Math.min(9, p.skill + 1), trainingProgress: 0 };
          }
          return { ...p, trainingProgress: newProgress };
        });
        set({
          rosters: { ...rosters, [managedTeamId]: updated },
          balance: balance - cost,
        });
      },

      dismissEvent: () => set({ pendingEvent: null }),
      setPhase: (phase) => set({ phase }),
      setPriceLevel: (priceLevel) => set({ priceLevel }),
      setFoodEnabled: (foodEnabled) => set({ foodEnabled }),
      setMerchandiseEnabled: (merchandiseEnabled) => set({ merchandiseEnabled }),
      resetGame: () => set({ phase: 'menu', managerName: '', managedTeamId: 1 }),
    }),
    { name: 'ifog-game-state' }
  )
);
