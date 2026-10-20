import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GamePhase, Formation, Player, TableRow, Fixture, MatchReport, GameEvent, FinanceEntry, Position, EuropeanCupState } from '../types/game';

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

const ALL_FORMATIONS: Formation[] = ['4-4-2', '4-3-3', '3-5-2', '5-3-2', '4-5-1'];

// After injuries/suspensions, keep preferred players and fill gaps with best bench.
// Falls back to alternative formations if the current one can't be filled.
function revalidateXI(
  currentXI: string[],
  players: Player[],
  currentFormation: Formation,
): { xi: string[]; formation: Formation } {
  const playerMap = new Map(players.map(p => [p.id, p]));
  const available = players.filter(p => !p.injuredFor && !p.suspended);
  const availableSet = new Set(available.map(p => p.id));

  function tryFormation(formation: Formation, preferred: string[]): string[] | null {
    const lines = formation.split('-').map(Number);
    const needs: Record<Position, number> = { T: 1, V: lines[0], M: lines[1], S: lines[2] };
    const posCount: Record<Position, number> = { T: 0, V: 0, M: 0, S: 0 };
    const selected: string[] = [];
    const selectedSet = new Set<string>();

    // Keep preferred players that are still available and fit the position need
    for (const id of preferred) {
      if (!availableSet.has(id)) continue;
      const p = playerMap.get(id);
      if (!p || posCount[p.position] >= needs[p.position]) continue;
      selected.push(id);
      selectedSet.add(id);
      posCount[p.position]++;
    }

    // Fill remaining slots with best available bench players by position
    const bench = available.filter(p => !selectedSet.has(p.id)).sort((a, b) => b.skill - a.skill);
    for (const pos of POS_ORDER) {
      let needed = needs[pos] - posCount[pos];
      for (const p of bench) {
        if (needed <= 0) break;
        if (p.position === pos && !selectedSet.has(p.id)) {
          selected.push(p.id);
          selectedSet.add(p.id);
          needed--;
        }
      }
    }

    return selected.length === 11 ? selected : null;
  }

  // 1. Try current formation
  const xi = tryFormation(currentFormation, currentXI);
  if (xi) return { xi, formation: currentFormation };

  // 2. Try alternative formations
  for (const f of ALL_FORMATIONS) {
    if (f === currentFormation) continue;
    const alt = tryFormation(f, currentXI);
    if (alt) return { xi: alt, formation: f };
  }

  // 3. Not enough players — return whatever we can
  return { xi: computeXI(players, currentFormation), formation: currentFormation };
}
import { getTeamById, getSeasonTeamIds, getAllRosters, getRoster, pickShirtNumber } from '../data/teams';
import { GAME_EVENTS, CHAIRMAN_MESSAGES } from '../data/events';
import { STARTING_BALANCE, FOOD_PRICES, MERCH_PRICES, TICKET_PRICE_PRESETS, calcPlayerWage, calcTicketRevenue, calcTicketSalesByDemand, calcDemand, calcFoodSales, calcMerchSales, calcTotalAttendance } from '../data/finances';
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
  vipLounge: number;  // 0=not built, 1-3 (capped by seats level)
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
  borderOfferIdx: number;

  // Stadium
  stadium: StadiumState;

  // Staff
  staff: StaffState;
  pendingBet: { amount: number; winMultiplier: number } | null;
  eventLog: { matchday: number; text: string }[];
  lastEventId: number | null;
  practiceMatchBooked: boolean;

  // Media
  mediaDeal: MediaDeal | null;

  // Division / career
  division: 1 | 2;
  seasonsInDivision: number;

  // Stock
  foodStock: number[];
  shopStock: number[];

  // Magazine chairman — fixed portrait for the season, different from player's avatar
  chairmanPortraitIdx: number;

  // End-of-game state
  sackReason: string | null;

  // European Cup
  europeanCup: EuropeanCupState | null;

  startNewGame: (managerName: string, teamId: number, portrait?: string, difficulty?: Difficulty, division?: 1 | 2, seasonsInDivision?: number) => void;
  playMatchday: (liveReport?: MatchReport, bribed?: boolean) => void;
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
  advanceBorderOfferIdx: () => void;
  hirePlayer: (player: Player) => void;
  sellPlayer: (playerId: string) => void;
  upgradeStadium: (type: 'pitch' | 'seats' | 'facilities' | 'lights') => void;
  buyVipLounge: () => void;
  bribeReferee: () => void;
  resetGame: () => void;
  setStaff: (role: keyof Omit<StaffState, 'coach'>, tier: number) => void;
  setCoach: (coachId: number) => void;
  placeBet: (amount: number, winMultiplier: number) => void;
  cancelBet: () => void;
  signMediaDeal: (deal: MediaDeal) => void;
  cancelMediaDeal: () => void;
  bookPracticeMatch: () => void;
  startNewSeason: () => void;
  startEuropeanCup: () => void;
  playEuropeanCupMatch: (liveReport?: MatchReport) => void;
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

function pickEvent(ctx: {
  bribed?: boolean;
  staff: StaffState;
  stadium: StadiumState;
  table: TableRow[];
  managedTeamId: number;
  squad: Player[];
  lastEventId: number | null;
}): GameEvent | null {
  const { bribed, staff, stadium, table, managedTeamId, squad, lastEventId } = ctx;

  // #7 bribe-caught: only fires when player actually bribed, 35% chance
  if (bribed && Math.random() < 0.35) {
    return GAME_EVENTS.find(e => e.id === 7) ?? null;
  }

  // 65% chance no event at all
  if (Math.random() > 0.35) return null;

  // Compute position (1-based) for #8 guard
  const sorted = [...table].sort((a, b) =>
    b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst)
  );
  const myPos = sorted.findIndex(r => r.teamId === managedTeamId) + 1;

  const hasUpgrade = stadium.pitch > 1 || stadium.seats > 1 || stadium.facilities > 1 || stadium.lights > 1;
  const hasPlayers  = squad.length > 0;

  const pool = GAME_EVENTS.filter(e => {
    if (e.id === lastEventId) return false;       // no repeat of last event
    switch (e.id) {
      case 7:  return false;                      // bribe — handled above
      case 2:  return staff.fishChips > 0;        // fast food confiscated: need food stand
      case 4:  return staff.fanShop > 0;          // fan shop burns: need fan shop
      case 8:  return myPos > 0 && myPos <= 6;    // manager of the month: top 6 only
      case 27: return hasUpgrade;                 // planning permission: need an upgrade
      case 1: case 3: case 10: case 14:
      case 22: case 23: case 24: case 25: case 26:
        return hasPlayers;                        // player effects: need an active player
      default: return true;
    }
  });

  if (pool.length === 0) return null;
  const picked = pool[Math.floor(Math.random() * pool.length)];

  // #28 secretary mistake: extra 50% dampener so it's rarer
  if (picked.id === 28 && Math.random() < 0.5) return null;

  return picked;
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

const VIP_LOUNGE_COSTS = [0, 150_000, 350_000, 700_000];

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
      trainingMassage: 1,
      trainingSkills: 4,
      trainingShape: 2,
      transfersUsed: 0,
      shirtSponsor: null,
      borderSponsors: [],
      borderOfferIdx: 0,
      stadium: { pitch: 1, seats: 1, facilities: 1, lights: 1, vipLounge: 0 },
      staff: { fishChips: 0, fanShop: 0, ticketSales: 0, cheerleader: 0, coach: 0 },
      pendingBet: null,
      eventLog: [],
      lastEventId: null,
      practiceMatchBooked: false,
      mediaDeal: null,
      foodStock: Array(10).fill(0),
      shopStock: Array(10).fill(0),
      chairmanPortraitIdx: 0,
      sackReason: null,
      division: 1,
      seasonsInDivision: 1,
      europeanCup: null,

      startNewGame: (managerName, teamId, portrait, difficulty = 'intermediate', division = 1, seasonsInDivision = 1) => {
        const seasonTeamIds = getSeasonTeamIds(division, teamId);
        const rosters = getAllRosters(seasonTeamIds);
        const fixtures = generateFixtures(seasonTeamIds);
        const table = seasonTeamIds.map(id => makeTableRow(id));
        const defaultPortrait = `manag${((teamId - 1) % 6) + 1}`;
        // Pick a chairman portrait that's different from the player's avatar (20 portraits total)
        const playerIdx = (teamId - 1) % 20;
        let chairmanIdx = Math.floor(Math.random() * 19);
        if (chairmanIdx >= playerIdx) chairmanIdx++;
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
          trainingMassage: 1,
          trainingSkills: 4,
          trainingShape: 2,
          transfersUsed: 0,
          shirtSponsor: null,
          borderSponsors: [],
          borderOfferIdx: 0,
          stadium: { pitch: 1, seats: 1, facilities: 1, lights: 1, vipLounge: 0 },
          staff: { fishChips: 0, fanShop: 0, ticketSales: 0, cheerleader: 0, coach: 0 },
          pendingBet: null,
          eventLog: [],
          practiceMatchBooked: false,
          mediaDeal: null,
          foodStock: Array(10).fill(0),
          shopStock: Array(10).fill(0),
          chairmanPortraitIdx: chairmanIdx,
          sackReason: null,
          division,
          seasonsInDivision,
        });
      },

      playMatchday: (liveReport?: MatchReport, bribed?: boolean) => {
        const s = get();
        const { currentMatchday, totalMatchdays, fixtures, rosters, managedTeamId, formation, startingXI, table, balance, financeHistory, managerName, priceLevel, foodEnabled, merchandiseEnabled, trainingSkills, trainingShape, borderSponsors, stadium, difficulty, staff, pendingBet, eventLog, lastEventId, mediaDeal, foodStock, shopStock, practiceMatchBooked } = s;
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
          const homeTeam = getTeamById(fixture.homeTeamId)!;
          const awayTeam = getTeamById(fixture.awayTeamId)!;
          const homePlayers = rosters[fixture.homeTeamId] ?? [];
          const awayPlayers = rosters[fixture.awayTeamId] ?? [];

          let homeGoals: number, awayGoals: number;

          if (fixture.homeTeamId === managedTeamId || fixture.awayTeamId === managedTeamId) {
            const isHome = fixture.homeTeamId === managedTeamId;
            if (liveReport && liveReport.fixture.id === fixture.id) {
              homeGoals = liveReport.fixture.homeGoals!;
              awayGoals = liveReport.fixture.awayGoals!;
              lastMatch = liveReport;
            } else {
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
              if (staff.coach === 1) {
                const swing = Math.random() < 0.5 ? 1 : -1;
                if (isHome) homeGoals = Math.max(0, homeGoals + swing);
                else awayGoals = Math.max(0, awayGoals + swing);
              }
              lastMatch = { ...report, fixture: { ...report.fixture, homeGoals, awayGoals } };
            }
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
        const rawTicketRevenue = isHomeMatch ? calcTicketRevenue(priceLevel, demand, stadium.seats) : 0;
        const ticketRevenue = (() => {
          if (!isHomeMatch || stadium.vipLounge > 0) return rawTicketRevenue;
          const vipQty = calcTicketSalesByDemand(demand, priceLevel, stadium.seats)[7];
          return rawTicketRevenue - vipQty * TICKET_PRICE_PRESETS[priceLevel][7];
        })();
        const attendance    = isHomeMatch ? calcTotalAttendance(demand, priceLevel, stadium.seats) : 0;

        // Cap demand-based unit sales by actual stock on hand
        const rawFoodSales = isHomeMatch && staff.fishChips > 0 ? calcFoodSales(attendance, staff.fishChips) : null;
        const rawShopSales = isHomeMatch && staff.fanShop   > 0 ? calcMerchSales(attendance, staff.fanShop)  : null;
        const actualFoodSold = rawFoodSales ? rawFoodSales.unitsSold.map((qty, i) => Math.min(qty, foodStock[i])) : null;
        const actualShopSold = rawShopSales ? rawShopSales.unitsSold.map((qty, i) => Math.min(qty, shopStock[i])) : null;
        const foodRevenue = actualFoodSold ? actualFoodSold.reduce((sum, qty, i) => sum + qty * FOOD_PRICES[i], 0) : 0;
        const shopRevenue = actualShopSold ? actualShopSold.reduce((sum, qty, i) => sum + qty * MERCH_PRICES[i], 0) : 0;
        const newFoodStock = actualFoodSold ? foodStock.map((qty, i) => qty - actualFoodSold[i]) : [...foodStock];
        const newShopStock = actualShopSold ? shopStock.map((qty, i) => qty - actualShopSold[i]) : [...shopStock];

        const squad = rosters[managedTeamId] ?? [];
        const rawWages = squad.reduce((sum, p) => sum + (p.wage ?? calcPlayerWage(p.skill, p.age)), 0);
        const wages = Math.max(0, rawWages - (staff.coach === 4 ? 10_000 : 0)); // Mag Catcher (Torry) saves £10K
        const matchRevenue = ticketRevenue + foodRevenue + shopRevenue;
        const net = matchRevenue - wages;

        const activePlayers = squad.filter(p => !p.injuredFor && !p.suspended);
        const event = pickEvent({ bribed, staff, stadium, table, managedTeamId, squad: activePlayers, lastEventId });
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

        // Pick a random fit player to be the subject of player-affecting events
        const fitSquad = squad.filter(p => !p.injuredFor && !p.suspended);
        const eventPlayer = event?.text.includes('X')
          ? (fitSquad.length > 0 ? fitSquad[Math.floor(Math.random() * fitSquad.length)] : squad[0] ?? null)
          : null;
        const pendingEventResolved = event
          ? { ...event, text: event.text.replace(/X/g, eventPlayer?.name ?? 'a player') }
          : null;
        const newEventLog = pendingEventResolved
          ? [...eventLog, { matchday: currentMatchday, text: pendingEventResolved.text }]
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
        // Build entries with running balance tracked per line
        let runBal = balance;
        const entries: FinanceEntry[] = [];

        // Wages (every matchday)
        runBal -= wages;
        entries.push({ matchday: currentMatchday, description: 'Team wages', amount: -wages, running: runBal });

        // Home match revenues
        if (ticketRevenue > 0) {
          runBal += ticketRevenue;
          entries.push({ matchday: currentMatchday, description: 'Ticket sales', amount: ticketRevenue, running: runBal });
        }
        if (actualFoodSold && foodRevenue > 0) {
          runBal += foodRevenue;
          entries.push({ matchday: currentMatchday, description: 'Food stand sales', amount: foodRevenue, running: runBal });
        }
        if (actualShopSold && shopRevenue > 0) {
          runBal += shopRevenue;
          entries.push({ matchday: currentMatchday, description: 'Fan shop sales', amount: shopRevenue, running: runBal });
        }

        // Random event
        if (eventMoney !== 0) {
          runBal += eventMoney;
          entries.push({ matchday: currentMatchday, description: 'Club event', amount: eventMoney, running: runBal });
        }

        // Border sponsorship payments
        if (borderPayment > 0) {
          runBal += borderPayment;
          entries.push({
            matchday: currentMatchday,
            description: activeBorderSponsors.length === 1
              ? `Border: ${activeBorderSponsors[0].name}`
              : `Border deals (${activeBorderSponsors.length})`,
            amount: borderPayment,
            running: runBal,
          });
        }

        // Media deal
        if (mediaRevenue > 0) {
          runBal += mediaRevenue;
          entries.push({ matchday: currentMatchday, description: `Media: ${mediaDeal!.name}`, amount: mediaRevenue, running: runBal });
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
            // Injury chance for starters only; Diana Dancer (Flower Power) reduces from 8% to 5%
            const wasHealthy = next.injuredFor === 0;
            if (wasHealthy && !next.suspended && xiSet.has(p.id)) {
              const chance = staff.coach === 2 ? 0.05 : 0.08;
              if (Math.random() < chance) {
                next = { ...next, injuredFor: 1 + Math.floor(Math.random() * 3) };
              }
            }
            // Injury penalty: -0.5 skill at moment of injury (streaks unchanged)
            const justInjured = wasHealthy && next.injuredFor > 0;
            if (justInjured) {
              next = { ...next, skill: Math.max(3, next.skill - 0.5) };
            }
            return next;
          });

          // Apply player effect from random event
          if (event?.playerEffect && eventPlayer) {
            if (event.playerEffect === 'retire') {
              newRosters[managedTeamId] = newRosters[managedTeamId].filter(p => p.id !== eventPlayer.id);
            } else {
              const games = event.effectGames ?? (1 + Math.floor(Math.random() * 3));
              newRosters[managedTeamId] = newRosters[managedTeamId].map(p =>
                p.id === eventPlayer.id ? { ...p, injuredFor: Math.max(p.injuredFor, games) } : p
              );
            }
          }
        }

        // Training: practice booked → progress+1 (at 8 → +0.5 skill); miss → progress-1 + missStreak+1 (at 8 → -0.5 skill)
        // Injured players: streaks frozen; suspended: treated normally
        newRosters[managedTeamId] = (newRosters[managedTeamId] ?? []).map(p => {
          if (p.injuredFor > 0) return p; // frozen while injured
          if (practiceMatchBooked) {
            const prog = (p.trainingProgress ?? 0) + 1;
            if (prog >= 8) return { ...p, skill: Math.min(9, p.skill + 0.5), trainingProgress: 0, missStreak: 0 };
            return { ...p, trainingProgress: prog, missStreak: 0 };
          } else {
            const prog = Math.max(0, (p.trainingProgress ?? 0) - 1);
            const miss = (p.missStreak ?? 0) + 1;
            if (miss >= 8) return { ...p, skill: Math.max(3, p.skill - 0.5), trainingProgress: prog, missStreak: 0 };
            return { ...p, trainingProgress: prog, missStreak: miss };
          }
        });

        // Revalidate starting XI — replace unavailable players, fall back to alt formation if needed
        const { xi: newXI, formation: newFormation } = revalidateXI(
          startingXI,
          newRosters[managedTeamId] ?? [],
          formation,
        );

        // Determine end phase
        let endPhase: import('../types/game').GamePhase = 'result';
        let newSackReason: string | null = null;

        if (currentMatchday >= totalMatchdays) {
          endPhase = 'season_end';
        } else if (finalBalance < -1_000_000) {
          endPhase = 'sacked';
          newSackReason = `The club is £${Math.abs(Math.round(finalBalance / 1_000)).toLocaleString()}K in debt. The board cannot allow this to continue.`;
        }

        set({
          fixtures: updatedFixtures,
          table: adjustedTable,
          lastMatch,
          pendingEvent: pendingEventResolved,
          balance: finalBalance,
          financeHistory: [...financeHistory, ...entries, ...staffEntry, ...betEntry],
          currentMatchday: currentMatchday + 1,
          chairmanMessage: chairmanMsg(managerName, pos),
          rosters: newRosters,
          startingXI: newXI,
          formation: newFormation,
          phase: endPhase,
          sackReason: newSackReason,
          transfersUsed: 0,
          practiceMatchBooked: false,
          borderSponsors: newBorderSponsors,
          borderOfferIdx: 0,
          pendingBet: null,
          eventLog: newEventLog,
          lastEventId: event?.id ?? null,
          mediaDeal: newMediaDeal,
          foodStock: newFoodStock,
          shopStock: newShopStock,
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
          if (newProgress >= 8) return { ...p, skill: Math.min(9, p.skill + 0.5), trainingProgress: 0, missStreak: 0 };
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
        const { borderSponsors, borderOfferIdx } = get();
        if (borderSponsors.length >= 4) return;
        const cappedDeal = { ...deal, matchdays: Math.min(8, deal.matchdays), matchdaysLeft: Math.min(8, deal.matchdaysLeft) };
        set({ borderSponsors: [...borderSponsors, cappedDeal], borderOfferIdx: borderOfferIdx + 1 });
      },
      advanceBorderOfferIdx: () => set({ borderOfferIdx: get().borderOfferIdx + 1 }),

      hirePlayer: (player) => {
        const { rosters, managedTeamId, balance, transfersUsed, currentMatchday, financeHistory } = get();
        const cost = player.skill >= 8 ? Math.round(player.skill * player.skill * 20_000) : player.skill * 75_000;
        if (transfersUsed >= 3) return;
        const players = rosters[managedTeamId] ?? [];
        const usedNumbers = new Set(players.map(p => p.shirtNumber).filter((n): n is number => !!n));
        const playerWithShirt = { ...player, shirtNumber: pickShirtNumber(player.position as Position, usedNumbers), wage: calcPlayerWage(player.skill, player.age) };
        set({
          rosters: { ...rosters, [managedTeamId]: [...players, playerWithShirt] },
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
        const injuryFactor = player.injuredFor > 0 ? Math.max(0.3, 1 - player.injuredFor * 0.2) : 1;
        const sellPrice = Math.round(player.skill * 75_000 * injuryFactor);
        const { startingXI } = get();
        set({
          rosters: { ...rosters, [managedTeamId]: players.filter(p => p.id !== playerId) },
          startingXI: (startingXI ?? []).filter(id => id !== playerId),
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

      buyVipLounge: () => {
        const { stadium, balance, financeHistory, currentMatchday } = get();
        const nextLevel = stadium.vipLounge + 1;
        if (nextLevel > 3 || nextLevel > stadium.seats) return;
        const cost = VIP_LOUNGE_COSTS[nextLevel];
        if (balance < cost) return;
        set({
          stadium: { ...stadium, vipLounge: nextLevel },
          balance: balance - cost,
          financeHistory: [...financeHistory, {
            matchday: currentMatchday,
            description: `VIP Lounge Level ${nextLevel}`,
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
      resetGame: () => set({ phase: 'menu', managerName: '', managedTeamId: 1, sackReason: null }),
      startNewSeason: () => {
        const s = get();
        const {
          managerName, managedTeamId, portrait, difficulty, table, division, seasonsInDivision,
          balance, stadium, staff, rosters, formation,
          priceLevel, foodEnabled, merchandiseEnabled,
          trainingMassage, trainingSkills, trainingShape,
        } = s;
        const pos = table.findIndex(r => r.teamId === managedTeamId) + 1;

        let newDivision: 1 | 2 = division;
        let newSeasonsInDivision = division === 2 ? seasonsInDivision + 1 : seasonsInDivision;

        if (division === 1 && pos >= 18) {
          newDivision = 2;
          newSeasonsInDivision = 1;
        } else if (division === 2 && pos <= 3) {
          newDivision = 1;
          newSeasonsInDivision = 1;
        }

        if (newDivision === 2 && newSeasonsInDivision > 3) {
          set({
            phase: 'sacked',
            sackReason: 'Three seasons in the First Division without promotion. The board has made a change.',
          });
          return;
        }

        const seasonTeamIds = getSeasonTeamIds(newDivision, managedTeamId);
        const freshRosters = getAllRosters(seasonTeamIds);

        // Keep managed squad: age +1, renegotiate wages, reset yellow cards / suspensions / goals
        const myPlayers = (rosters[managedTeamId] ?? []).map(p => ({
          ...p,
          age: p.age + 1,
          wage: calcPlayerWage(p.skill, p.age + 1),
          yellowCards: 0,
          suspended: false,
          goals: 0,
        }));

        const newRosters = { ...freshRosters, [managedTeamId]: myPlayers };
        const fixtures = generateFixtures(seasonTeamIds);
        const newTable = seasonTeamIds.map(id => makeTableRow(id));

        const playerIdx = (managedTeamId - 1) % 20;
        let chairmanIdx = Math.floor(Math.random() * 19);
        if (chairmanIdx >= playerIdx) chairmanIdx++;

        const divChanged = newDivision !== division;
        const welcomeMsg = divChanged
          ? (newDivision === 1 ? `Welcome to the Premier League, ${managerName}!` : `A tough call, ${managerName}. Prove yourself in the First Division.`)
          : `Another season begins, ${managerName}. Let's go.`;

        set({
          phase: 'season',
          currentMatchday: 1,
          totalMatchdays: 38,
          rosters: newRosters,
          startingXI: computeXI(myPlayers, formation),
          table: newTable,
          fixtures,
          division: newDivision,
          seasonsInDivision: newSeasonsInDivision,
          // ── Carry over ──
          balance,
          stadium,
          staff,
          formation,
          priceLevel,
          foodEnabled,
          merchandiseEnabled,
          trainingMassage,
          trainingSkills,
          trainingShape,
          // ── Season reset ──
          financeHistory: [],
          pendingEvent: null,
          lastMatch: null,
          chairmanMessage: welcomeMsg,
          transfersUsed: 0,
          shirtSponsor: null,
          borderSponsors: [],
          borderOfferIdx: 0,
          mediaDeal: null,
          pendingBet: null,
          eventLog: [],
          practiceMatchBooked: false,
          foodStock: Array(10).fill(0),
          shopStock: Array(10).fill(0),
          sackReason: null,
          chairmanPortraitIdx: chairmanIdx,
          europeanCup: null,
        });
      },
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
      bookPracticeMatch: () => {
        const { balance, financeHistory, currentMatchday } = get();
        const cost = 87_300;
        if (balance < cost) return;
        set({
          balance: balance - cost,
          practiceMatchBooked: true,
          financeHistory: [...financeHistory, { matchday: currentMatchday, description: 'Practice match', amount: -cost, running: balance - cost }],
        });
      },

      startEuropeanCup: () => {
        const ids = [41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55];
        for (let i = ids.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ids[i], ids[j]] = [ids[j], ids[i]];
        }
        // finalOpponentId must be one of the other semi teams (the "winner" of SF1)
        const otherSemiWinner = Math.random() < 0.5 ? ids[1] : ids[2];
        set({
          europeanCup: {
            round: 'semi',
            semiOpponentId: ids[0],
            finalOpponentId: otherSemiWinner,
            otherSemiIds: [ids[1], ids[2]],
            semiResult: null,
            finalResult: null,
            lastMatchReport: null,
          },
        });
      },

      playEuropeanCupMatch: (liveReport) => {
        const s = get();
        const { europeanCup, managedTeamId, rosters, formation, startingXI, staff, trainingSkills, trainingShape, stadium, difficulty, balance, financeHistory } = s;
        if (!europeanCup || europeanCup.round === 'done') return;

        const opponentId = europeanCup.round === 'semi' ? europeanCup.semiOpponentId : europeanCup.finalOpponentId;
        const myTeam = getTeamById(managedTeamId)!;
        const oppTeam = getTeamById(opponentId)!;
        const myPlayers = rosters[managedTeamId] ?? [];
        const oppPlayers = getRoster(opponentId);

        const xiSet = new Set(startingXI ?? []);
        const xiMyPlayers = myPlayers.filter(p => xiSet.size > 0 ? xiSet.has(p.id) : true);

        const difficultyMod = difficulty === 'beginner' ? 1.12 : difficulty === 'expert' ? 0.88 : 1.0;
        const coachBonus = staff.coach === 3 ? 0.04 : 0;
        const trainingMod = (1 + trainingSkills * 0.008 + trainingShape * 0.005 + (stadium.pitch - 1) * 0.02 + coachBonus) * difficultyMod;

        const fakeFixture: Fixture = { id: `euro-${europeanCup.round}`, matchday: 0, homeTeamId: managedTeamId, awayTeamId: opponentId };

        const report = liveReport ?? simulateFullMatch(fakeFixture, myTeam, oppTeam, xiMyPlayers, oppPlayers, formation, trainingMod);
        const homeGoals = report.fixture.homeGoals!;
        const awayGoals = report.fixture.awayGoals!;

        // Draws in cup = away team wins (player loses unless they scored more)
        const won = homeGoals > awayGoals;
        const result: 'win' | 'loss' = won ? 'win' : 'loss';

        const prize = europeanCup.round === 'semi'
          ? (won ? 150_000 : 50_000)
          : (won ? 500_000 : 100_000);
        const prizeDesc = europeanCup.round === 'semi'
          ? (won ? 'European Cup: semi-final win' : 'European Cup: semi-final participation')
          : (won ? 'European Cup: winners bonus' : 'European Cup: final participation');

        const newBalance = balance + prize;
        const newRound: EuropeanCupState['round'] = europeanCup.round === 'semi'
          ? (won ? 'final' : 'done')
          : 'done';

        // Apply match effects to managed squad (injuries, cards, goals)
        const newRosters = { ...s.rosters };
        const matchEvents = report.events.filter(e => e.teamId === managedTeamId);
        const cardEvents = matchEvents.filter(e => e.type === 'yellow' || e.type === 'red');
        const goalEvents = matchEvents.filter(e => e.type === 'goal');
        newRosters[managedTeamId] = myPlayers.map(p => {
          let next = p.injuredFor > 0 ? { ...p, injuredFor: p.injuredFor - 1 } : { ...p };
          if (next.suspended) next = { ...next, suspended: false };
          for (const ev of cardEvents) {
            if (ev.playerName === p.name) {
              if (ev.type === 'red') {
                next = { ...next, suspended: true };
              } else {
                const newYellows = (next.yellowCards ?? 0) + 1;
                next = newYellows >= 2 ? { ...next, yellowCards: 0, suspended: true } : { ...next, yellowCards: newYellows };
              }
            }
          }
          const scored = goalEvents.filter(e => e.playerName === p.name).length;
          if (scored > 0) next = { ...next, goals: (next.goals ?? 0) + scored };
          const wasHealthy = next.injuredFor === 0;
          if (wasHealthy && !next.suspended && xiSet.has(p.id)) {
            const chance = staff.coach === 2 ? 0.05 : 0.08;
            if (Math.random() < chance) next = { ...next, injuredFor: 1 + Math.floor(Math.random() * 3) };
          }
          if (wasHealthy && next.injuredFor > 0) next = { ...next, skill: Math.max(3, next.skill - 0.5) };
          return next;
        });

        set({
          balance: newBalance,
          rosters: newRosters,
          financeHistory: [...financeHistory, { matchday: 99, description: prizeDesc, amount: prize, running: newBalance }],
          europeanCup: {
            ...europeanCup,
            round: newRound,
            semiResult: europeanCup.round === 'semi' ? result : europeanCup.semiResult,
            finalResult: europeanCup.round === 'final' ? result : europeanCup.finalResult,
            lastMatchReport: report,
          },
        });
      },
    }),
    {
      name: 'ifog-game-state',
      version: 7,
      migrate: (state: any) => {
        const total = (state.trainingMassage ?? 0) + (state.trainingSkills ?? 0) + (state.trainingShape ?? 0);
        if (total > 7) {
          state.trainingMassage = 1;
          state.trainingSkills = 4;
          state.trainingShape = 2;
        }
        if (!Array.isArray(state.foodStock)) state.foodStock = Array(10).fill(0);
        if (!Array.isArray(state.shopStock)) state.shopStock = Array(10).fill(0);
        if (typeof state.chairmanPortraitIdx !== 'number') state.chairmanPortraitIdx = 0;
        if (typeof state.stadium?.vipLounge !== 'number') {
          state.stadium = { ...(state.stadium ?? {}), vipLounge: 0 };
        }
        if (!state.division) state.division = 1;
        if (!state.seasonsInDivision) state.seasonsInDivision = 1;
        if (state.europeanCup === undefined) state.europeanCup = null;
        if (state.lastEventId === undefined) state.lastEventId = null;
        if (typeof state.practiceMatchBooked !== 'boolean') state.practiceMatchBooked = false;
        // Add missStreak to all existing players
        if (state.rosters && typeof state.rosters === 'object') {
          for (const teamId of Object.keys(state.rosters)) {
            state.rosters[teamId] = (state.rosters[teamId] ?? []).map((p: any) => ({
              ...p,
              missStreak: p.missStreak ?? 0,
              wage: p.wage ?? calcPlayerWage(p.skill ?? 5, p.age ?? 25),
            }));
          }
        }
        return state;
      },
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
