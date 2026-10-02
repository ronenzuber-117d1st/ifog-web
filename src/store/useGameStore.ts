import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GamePhase, Formation, Player, TableRow, Fixture, MatchReport, GameEvent, FinanceEntry, Position } from '../types/game';

const POS_ORDER: Position[] = ['T', 'V', 'M', 'S'];

function computeXI(players: Player[], formation: Formation): string[] {
  const lines = formation.split('-').map(Number);
  const needs = [1, lines[0], lines[1], lines[2]];
  const ids: string[] = [];
  POS_ORDER.forEach((pos, i) => {
    players
      .filter(p => p.position === pos && !p.injuredFor && !p.suspended)
      .sort((a, b) => b.skill - a.skill)
      .slice(0, needs[i])
      .forEach(p => ids.push(p.id));
  });
  return ids;
}
import { LEAGUE_TEAMS, getAllRosters } from '../data/teams';
import { GAME_EVENTS, CHAIRMAN_MESSAGES } from '../data/events';
import { STARTING_BALANCE, WAGES_PER_MATCHDAY, calcMatchRevenue, calcDemand } from '../data/finances';
import { generateFixtures } from '../engine/scheduler';
import { simulateFullMatch, simulateMatch } from '../engine/matchEngine';

export interface SponsorDeal {
  name: string;
  amount: number;
  matchdays: number;
  matchdaysLeft: number;
}

export interface MediaDeal {
  name: string;
  revenuePerMatch: number;
  matchdays: number;
  matchdaysLeft: number;
}

export interface StadiumState {
  pitch: number;      // 1-3
  seats: number;      // 1-3
  facilities: number; // 1-3
  lights: number;     // 1-3
}

export interface StaffState {
  fishChips: number;    // 0=none, 1/2/3=tier
  fanShop: number;
  ticketSales: number;
  cheerleader: number;
  coach: number;        // 0=none, 1-4=coach index (cotrai3/4/5/6)
}

export type Difficulty = 'beginner' | 'intermediate' | 'expert';

export interface GameStore {
  phase: GamePhase;
  managerName: string;
  managedTeamId: number;
  portrait: string; // e.g., 'manag3' or 'manak2'
  difficulty: Difficulty;
  currentMatchday: number;
  totalMatchdays: number;
  rosters: Record<number, Player[]>;
  formation: Formation;
  startingXI: string[];
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

  // Staff
  staff: StaffState;
  pendingBet: { amount: number; winMultiplier: number } | null;
  eventLog: { matchday: number; text: string }[];

  // Media
  mediaDeal: MediaDeal | null;

  startNewGame: (managerName: string, teamId: number, portrait?: string, difficulty?: Difficulty) => void;
  playMatchday: () => void;
  setFormation: (f: Formation) => void;
  setStartingXI: (ids: string[]) => void;
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
  upgradeStadium: (type: 'pitch' | 'seats' | 'facilities' | 'lights') => void;
  bribeReferee: () => void;
  resetGame: () => void;
  setStaff: (role: keyof Omit<StaffState, 'coach'>, tier: number) => void;
  setCoach: (coachId: number) => void;
  placeBet: (amount: number, winMultiplier: number) => void;
  cancelBet: () => void;
  signMediaDeal: (deal: MediaDeal) => void;
  cancelMediaDeal: () => void;
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
  pitch:      [0, 200_000, 500_000],
  seats:      [0, 400_000, 800_000],
  facilities: [0, 100_000, 250_000],
  lights:     [0, 150_000, 350_000],
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      phase: 'menu',
      managerName: '',
      managedTeamId: 1,
      portrait: 'manag1',
      difficulty: 'intermediate',
      currentMatchday: 1,
      totalMatchdays: 38,
      rosters: {},
      formation: '4-4-2',
      startingXI: [],
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
      stadium: { pitch: 1, seats: 1, facilities: 1, lights: 1 },
      staff: { fishChips: 0, fanShop: 0, ticketSales: 0, cheerleader: 0, coach: 0 },
      pendingBet: null,
      eventLog: [],
      mediaDeal: null,

      startNewGame: (managerName, teamId, portrait, difficulty = 'intermediate') => {
        const rosters = getAllRosters();
        const teamIds = LEAGUE_TEAMS.map(t => t.id);
        const fixtures = generateFixtures(teamIds);
        const table = LEAGUE_TEAMS.map(t => makeTableRow(t.id));
        const defaultPortrait = `manag${((teamId - 1) % 6) + 1}`;
        const startingBalances: Record<Difficulty, number> = {
          beginner:     3_000_000,
          intermediate: STARTING_BALANCE,
          expert:         750_000,
        };
        set({
          phase: 'season',
          managerName,
          managedTeamId: teamId,
          portrait: portrait ?? defaultPortrait,
          difficulty,
          currentMatchday: 1,
          totalMatchdays: 38,
          rosters,
          formation: '4-4-2',
          startingXI: computeXI(rosters[teamId] ?? [], '4-4-2'),
          table,
          fixtures,
          balance: startingBalances[difficulty],
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
          stadium: { pitch: 1, seats: 1, facilities: 1, lights: 1 },
          staff: { fishChips: 0, fanShop: 0, ticketSales: 0, cheerleader: 0, coach: 0 },
          pendingBet: null,
          eventLog: [],
          mediaDeal: null,
        });
      },

      playMatchday: () => {
        const s = get();
        const { currentMatchday, fixtures, rosters, managedTeamId, formation, startingXI, table, balance, financeHistory, managerName, priceLevel, foodEnabled, merchandiseEnabled, trainingSkills, trainingShape, borderSponsors, stadium, difficulty, staff, pendingBet, eventLog, mediaDeal } = s;
        const xiSet = new Set(startingXI ?? []);

        const dayFixtures = fixtures.filter(f => f.matchday === currentMatchday && !f.homeGoals && f.homeGoals !== 0);
        if (dayFixtures.length === 0) return;

        let newTable = [...table];
        let lastMatch: MatchReport | null = null;
        const updatedFixtures = [...fixtures];

        const difficultyMod = difficulty === 'beginner' ? 1.12 : difficulty === 'expert' ? 0.88 : 1.0;
        const coachTrainingBonus = staff.coach === 3 ? 0.04 : 0; // Kelvin Kneegan
        const trainingMod = (1 + (trainingSkills * 0.008) + (trainingShape * 0.005) + (stadium.pitch - 1) * 0.02 + coachTrainingBonus) * difficultyMod;

        for (const fixture of dayFixtures) {
          const homeTeam = LEAGUE_TEAMS.find(t => t.id === fixture.homeTeamId)!;
          const awayTeam = LEAGUE_TEAMS.find(t => t.id === fixture.awayTeamId)!;
          const homePlayers = rosters[fixture.homeTeamId] ?? [];
          const awayPlayers = rosters[fixture.awayTeamId] ?? [];

          let homeGoals: number, awayGoals: number;

          if (fixture.homeTeamId === managedTeamId || fixture.awayTeamId === managedTeamId) {
            const isHome = fixture.homeTeamId === managedTeamId;
            const xiHomePlayers = isHome
              ? homePlayers.filter(p => xiSet.size > 0 ? xiSet.has(p.id) : true)
              : homePlayers;
            const xiAwayPlayers = !isHome
              ? awayPlayers.filter(p => xiSet.size > 0 ? xiSet.has(p.id) : true)
              : awayPlayers;
            const report = simulateFullMatch(
              fixture, homeTeam, awayTeam, xiHomePlayers, xiAwayPlayers,
              isHome ? formation : '4-4-2',
              trainingMod,
            );
            homeGoals = report.fixture.homeGoals!;
            awayGoals = report.fixture.awayGoals!;
            // Bob Robinson (Chaotic): ±1 goal swing
            if (staff.coach === 1) {
              const swing = Math.random() < 0.5 ? 1 : -1;
              if (isHome) homeGoals = Math.max(0, homeGoals + swing);
              else awayGoals = Math.max(0, awayGoals + swing);
            }
            lastMatch = { ...report, fixture: { ...report.fixture, homeGoals, awayGoals } };
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
        const myRow = table.find(r => r.teamId === managedTeamId);
        const myPosition = table.findIndex(r => r.teamId === managedTeamId) + 1;
        const ppg = myRow && myRow.played > 0 ? myRow.points / myRow.played : 1.5;
        const demand = calcDemand(myPosition > 0 ? myPosition : 10, ppg);
        const matchRevenue = calcMatchRevenue(
          isHomeMatch, priceLevel, demand, stadium.seats,
          staff.fishChips > 0, staff.fanShop > 0,
        );
        const wages = WAGES_PER_MATCHDAY - (staff.coach === 4 ? 10_000 : 0); // Mag Catcher (Torry)
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

        const STAFF_COSTS_TABLE = {
          fishChips:   [0, 250, 750, 1500],
          fanShop:     [0, 250, 750, 1500],
          ticketSales: [0, 250, 750, 1500],
          cheerleader: [0, 5000, 10000, 20000],
        };
        const staffCost = (
          STAFF_COSTS_TABLE.fishChips[staff.fishChips] +
          STAFF_COSTS_TABLE.fanShop[staff.fanShop] +
          STAFF_COSTS_TABLE.ticketSales[staff.ticketSales] +
          STAFF_COSTS_TABLE.cheerleader[staff.cheerleader] +
          (staff.coach > 0 ? 5000 : 0)
        );

        // Media deal: pays on home matches, ticks down every matchday
        const mediaRevenue = (mediaDeal && isHomeMatch) ? mediaDeal.revenuePerMatch : 0;
        const newMediaDeal = mediaDeal
          ? (mediaDeal.matchdaysLeft <= 1 ? null : { ...mediaDeal, matchdaysLeft: mediaDeal.matchdaysLeft - 1 })
          : null;

        const newBalance = balance + net + eventMoney + borderPayment + mediaRevenue - staffCost;

        let betResult = 0;
        const betEntry: FinanceEntry[] = [];
        if (pendingBet && lastMatch) {
          const isHomeTeam = lastMatch.fixture.homeTeamId === managedTeamId;
          const myGoals = isHomeTeam ? lastMatch.fixture.homeGoals! : lastMatch.fixture.awayGoals!;
          const oppGoals = isHomeTeam ? lastMatch.fixture.awayGoals! : lastMatch.fixture.homeGoals!;
          const won = myGoals > oppGoals;
          betResult = won ? Math.round(pendingBet.amount * (pendingBet.winMultiplier - 1)) : -pendingBet.amount;
          const balanceAfterBet = newBalance + betResult;
          betEntry.push({
            matchday: currentMatchday,
            description: won ? `Bet won! (×${pendingBet.winMultiplier.toFixed(2)})` : 'Bet lost',
            amount: betResult,
            running: balanceAfterBet,
          });
        }

        const staffEntry: FinanceEntry[] = staffCost > 0 ? [{
          matchday: currentMatchday,
          description: 'Personnel costs',
          amount: -staffCost,
          running: newBalance,
        }] : [];

        const finalBalance = newBalance + betResult;

        const newEventLog = event
          ? [...eventLog, { matchday: currentMatchday, text: event.text.replace(/X/g, lastMatch?.events?.find(e => e.type === 'goal')?.playerName ?? 'a player') }]
          : eventLog;

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
        if (mediaRevenue > 0) {
          entries.push({
            matchday: currentMatchday,
            description: `Media: ${mediaDeal!.name}`,
            amount: mediaRevenue,
            running: newBalance,
          });
        }

        const newRosters = { ...rosters };
        if (newRosters[managedTeamId]) {
          const matchEvents = lastMatch?.events.filter(e => e.teamId === managedTeamId) ?? [];
          const cardEvents = matchEvents.filter(e => e.type === 'yellow' || e.type === 'red');
          const goalEvents = matchEvents.filter(e => e.type === 'goal');
          const xiSet = new Set(startingXI ?? []);
          newRosters[managedTeamId] = newRosters[managedTeamId].map(p => {
            let next = p.injuredFor > 0 ? { ...p, injuredFor: p.injuredFor - 1 } : { ...p };
            // Clear suspension after sitting out
            if (next.suspended) next = { ...next, suspended: false };
            // Apply cards from this match
            for (const ev of cardEvents) {
              if (ev.playerName === p.name) {
                if (ev.type === 'red') {
                  next = { ...next, suspended: true };
                } else {
                  const newYellows = (next.yellowCards ?? 0) + 1;
                  next = newYellows >= 2
                    ? { ...next, yellowCards: 0, suspended: true }
                    : { ...next, yellowCards: newYellows };
                }
              }
            }
            // Accumulate goals from match events
            const scored = goalEvents.filter(e => e.playerName === p.name).length;
            if (scored > 0) next = { ...next, goals: (next.goals ?? 0) + scored };
            // Injury chance: 8%/2% normally; Diana Dancer (Flower Power) reduces to 5%/1%
            if (next.injuredFor === 0 && !next.suspended) {
              const chance = xiSet.has(p.id) ? (staff.coach === 2 ? 0.05 : 0.08) : (staff.coach === 2 ? 0.01 : 0.02);
              if (Math.random() < chance) {
                next = { ...next, injuredFor: 1 + Math.floor(Math.random() * 3) };
              }
            }
            return next;
          });
        }

        set({
          fixtures: updatedFixtures,
          table: adjustedTable,
          lastMatch,
          pendingEvent: event,
          balance: finalBalance,
          financeHistory: [...financeHistory, ...entries, ...staffEntry, ...betEntry],
          currentMatchday: currentMatchday + 1,
          chairmanMessage: chairmanMsg(managerName, pos),
          rosters: newRosters,
          phase: 'result',
          transfersUsed: 0,
          borderSponsors: newBorderSponsors,
          pendingBet: null,
          eventLog: newEventLog,
          mediaDeal: newMediaDeal,
        });
      },

      setFormation: (formation) => {
        const { rosters, managedTeamId } = get();
        set({ formation, startingXI: computeXI(rosters[managedTeamId] ?? [], formation) });
      },
      setStartingXI: (ids) => set({ startingXI: ids }),

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

      bribeReferee: () => {
        const { balance, financeHistory, currentMatchday } = get();
        const cost = 100_000;
        if (balance < cost) return;
        set({
          balance: balance - cost,
          financeHistory: [...financeHistory, {
            matchday: currentMatchday,
            description: 'Referee bribe',
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
      setStaff: (role, tier) => {
        const { staff } = get();
        set({ staff: { ...staff, [role]: tier } });
      },
      setCoach: (coachId) => {
        const { staff } = get();
        set({ staff: { ...staff, coach: coachId } });
      },
      placeBet: (amount, winMultiplier) => set({ pendingBet: { amount, winMultiplier } }),
      cancelBet: () => set({ pendingBet: null }),
      signMediaDeal: (deal) => set({ mediaDeal: deal }),
      cancelMediaDeal: () => set({ mediaDeal: null }),
    }),
    {
      name: 'ifog-game-state',
      storage: {
        getItem: (key) => {
          try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
          } catch {
            localStorage.removeItem(key);
            return null;
          }
        },
        setItem: (key, value) => {
          try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
        },
        removeItem: (key) => {
          try { localStorage.removeItem(key); } catch {}
        },
      },
    }
  )
);
