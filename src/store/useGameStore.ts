import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GamePhase, Formation, Player, TableRow, Fixture, MatchReport, GameEvent, FinanceEntry } from '../types/game';
import { LEAGUE_TEAMS, getAllRosters } from '../data/teams';
import { GAME_EVENTS, CHAIRMAN_MESSAGES } from '../data/events';
import { STARTING_BALANCE, WAGES_PER_MATCHDAY, calcMatchRevenue } from '../data/finances';
import { generateFixtures } from '../engine/scheduler';
import { simulateFullMatch, simulateMatch } from '../engine/matchEngine';

export interface SponsorDeal {
  name: string;
  amount: number;
  matchdays: number;
  matchdaysLeft: number;
}

export interface StadiumState {
  pitch: number;      // 1-3
  seats: number;      // 1-3
  facilities: number; // 1-3
}

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

  // Training allocation
  trainingMassage: number;
  trainingSkills: number;
  trainingShape: number;

  // Transfers
  transfersUsed: number;

  // Sponsorship
  shirtSponsor: SponsorDeal | null;
  borderSponsors: SponsorDeal[];

  // Stadium
  stadium: StadiumState;

  startNewGame: (managerName: string, teamId: number) => void;
  playMatchday: () => void;
  setFormation: (f: Formation) => void;
  trainPlayer: (playerId: string) => void;
  setTraining: (type: 'massage' | 'skills' | 'shape', value: number) => void;
  dismissEvent: () => void;
  setPhase: (p: GamePhase) => void;
  setPriceLevel: (l: 'low' | 'medium' | 'high') => void;
  setFoodEnabled: (v: boolean) => void;
  setMerchandiseEnabled: (v: boolean) => void;
  acceptShirtSponsor: (deal: SponsorDeal) => void;
  acceptBorderDeal: (deal: SponsorDeal) => void;
  hirePlayer: (player: Player) => void;
  sellPlayer: (playerId: string) => void;
  upgradeStadium: (type: 'pitch' | 'seats' | 'facilities') => void;
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

const STADIUM_UPGRADE_COST: Record<string, number[]> = {
  pitch: [0, 200_000, 500_000],
  seats: [0, 400_000, 800_000],
  facilities: [0, 100_000, 250_000],
};

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
      trainingMassage: 3,
      trainingSkills: 4,
      trainingShape: 3,
      transfersUsed: 0,
      shirtSponsor: null,
      borderSponsors: [],
      stadium: { pitch: 1, seats: 1, facilities: 1 },

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
          trainingMassage: 3,
          trainingSkills: 4,
          trainingShape: 3,
          transfersUsed: 0,
          shirtSponsor: null,
          borderSponsors: [],
          stadium: { pitch: 1, seats: 1, facilities: 1 },
        });
      },

      playMatchday: () => {
        const s = get();
        const { currentMatchday, fixtures, rosters, managedTeamId, formation, table, balance, financeHistory, managerName, priceLevel, foodEnabled, merchandiseEnabled, trainingSkills, trainingShape, borderSponsors, stadium } = s;

        const dayFixtures = fixtures.filter(f => f.matchday === currentMatchday && !f.homeGoals && f.homeGoals !== 0);
        if (dayFixtures.length === 0) return;

        let newTable = [...table];
        let lastMatch: MatchReport | null = null;
        const updatedFixtures = [...fixtures];

        const trainingMod = 1 + (trainingSkills * 0.008) + (trainingShape * 0.005) + (stadium.pitch - 1) * 0.02;

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
              trainingMod,
            );
            homeGoals = report.fixture.homeGoals!;
            awayGoals = report.fixture.awayGoals!;
            lastMatch = report;
          } else {
            const result = simulateMatch(homeTeam, awayTeam, homePlayers, awayPlayers, '4-4-2', '4-4-2', 1);
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

        const isHomeMatch = dayFixtures.some(f => f.homeTeamId === managedTeamId);
        const seatBonus = (stadium.seats - 1) * 0.15;
        const matchRevenue = calcMatchRevenue(isHomeMatch, priceLevel, foodEnabled, merchandiseEnabled) * (1 + seatBonus);
        const wages = WAGES_PER_MATCHDAY;
        const net = matchRevenue - wages;

        const event = pickEvent();
        const eventMoney = event ? event.moneyEffect : 0;
        const eventPoints = event ? event.pointsEffect : 0;

        // Border sponsor payments from all active deals
        const activeBorderSponsors = borderSponsors.filter(d => d.matchdaysLeft > 0);
        const borderPayment = activeBorderSponsors.reduce((sum, d) => sum + d.amount, 0);
        const newBorderSponsors = activeBorderSponsors
          .map(d => ({ ...d, matchdaysLeft: d.matchdaysLeft - 1 }))
          .filter(d => d.matchdaysLeft > 0);

        const newBalance = balance + net + eventMoney + borderPayment;

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
        const entries: FinanceEntry[] = [
          {
            matchday: currentMatchday,
            description: isHomeMatch ? 'Home match revenue' : 'Away match (wages only)',
            amount: net + eventMoney,
            running: newBalance - borderPayment,
          },
        ];
        if (borderPayment > 0) {
          entries.push({
            matchday: currentMatchday,
            description: activeBorderSponsors.length === 1
              ? `Border: ${activeBorderSponsors[0].name}`
              : `Border deals (${activeBorderSponsors.length})`,
            amount: borderPayment,
            running: newBalance,
          });
        }

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
          financeHistory: [...financeHistory, ...entries],
          currentMatchday: currentMatchday + 1,
          chairmanMessage: chairmanMsg(managerName, pos),
          rosters: newRosters,
          phase: 'result',
          transfersUsed: 0,
          borderSponsors: newBorderSponsors,
        });
      },

      setFormation: (formation) => set({ formation }),

      setTraining: (type, value) => {
        const s = get();
        const total = s.trainingMassage + s.trainingSkills + s.trainingShape;
        const oldVal = type === 'massage' ? s.trainingMassage : type === 'skills' ? s.trainingSkills : s.trainingShape;
        const newTotal = total - oldVal + value;
        if (newTotal <= 10 && value >= 0 && value <= 10) {
          set({
            trainingMassage: type === 'massage' ? value : s.trainingMassage,
            trainingSkills:  type === 'skills'  ? value : s.trainingSkills,
            trainingShape:   type === 'shape'   ? value : s.trainingShape,
          });
        }
      },

      trainPlayer: (playerId) => {
        const { rosters, managedTeamId, balance } = get();
        const cost = 10_000;
        if (balance < cost) return;
        const players = rosters[managedTeamId] ?? [];
        const updated = players.map(p => {
          if (p.id !== playerId) return p;
          const newProgress = p.trainingProgress + 1;
          if (newProgress >= 5) return { ...p, skill: Math.min(9, p.skill + 1), trainingProgress: 0 };
          return { ...p, trainingProgress: newProgress };
        });
        set({ rosters: { ...rosters, [managedTeamId]: updated }, balance: balance - cost });
      },

      acceptShirtSponsor: (deal) => {
        const { balance, financeHistory, currentMatchday } = get();
        set({
          shirtSponsor: deal,
          balance: balance + deal.amount,
          financeHistory: [...financeHistory, {
            matchday: currentMatchday,
            description: `Shirt sponsor: ${deal.name}`,
            amount: deal.amount,
            running: balance + deal.amount,
          }],
        });
      },

      acceptBorderDeal: (deal) => {
        const { borderSponsors } = get();
        if (borderSponsors.length >= 3) return;
        const cappedDeal = { ...deal, matchdays: Math.min(8, deal.matchdays), matchdaysLeft: Math.min(8, deal.matchdaysLeft) };
        set({ borderSponsors: [...borderSponsors, cappedDeal] });
      },

      hirePlayer: (player) => {
        const { rosters, managedTeamId, balance, transfersUsed, currentMatchday, financeHistory } = get();
        const cost = player.skill * 75_000;
        if (transfersUsed >= 3 || balance < cost) return;
        const players = rosters[managedTeamId] ?? [];
        set({
          rosters: { ...rosters, [managedTeamId]: [...players, player] },
          balance: balance - cost,
          transfersUsed: transfersUsed + 1,
          financeHistory: [...financeHistory, {
            matchday: currentMatchday,
            description: `Transfer in: ${player.name}`,
            amount: -cost,
            running: balance - cost,
          }],
        });
      },

      sellPlayer: (playerId) => {
        const { rosters, managedTeamId, balance, transfersUsed, currentMatchday, financeHistory } = get();
        if (transfersUsed >= 3) return;
        const players = rosters[managedTeamId] ?? [];
        const player = players.find(p => p.id === playerId);
        if (!player) return;
        const sellPrice = player.skill * 75_000;
        set({
          rosters: { ...rosters, [managedTeamId]: players.filter(p => p.id !== playerId) },
          balance: balance + sellPrice,
          transfersUsed: transfersUsed + 1,
          financeHistory: [...financeHistory, {
            matchday: currentMatchday,
            description: `Transfer out: ${player.name}`,
            amount: sellPrice,
            running: balance + sellPrice,
          }],
        });
      },

      upgradeStadium: (type) => {
        const { stadium, balance } = get();
        const current = stadium[type];
        if (current >= 3) return;
        const cost = STADIUM_UPGRADE_COST[type][current];
        if (balance < cost) return;
        set({
          stadium: { ...stadium, [type]: current + 1 },
          balance: balance - cost,
          financeHistory: [...get().financeHistory, {
            matchday: get().currentMatchday,
            description: `Stadium upgrade: ${type}`,
            amount: -cost,
            running: balance - cost,
          }],
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
