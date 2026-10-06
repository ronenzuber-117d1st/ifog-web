export const TICKET_TYPES = [
  { name: 'Reduced Seats',         capacity: 2000 },
  { name: 'Club Members',          capacity: 3000 },
  { name: 'Stand',                 capacity: 8000 },
  { name: 'Terrace',               capacity: 10000 },
  { name: 'Season Ticket Members', capacity: 2000 },
  { name: 'Season Ticket Stand',   capacity: 2000 },
  { name: 'Season Ticket Terrace', capacity: 2000 },
  { name: 'VIP Lounge',            capacity: 500  },
];

export const TICKET_PRICE_PRESETS = {
  low:    [4,   7,  12,  18, 100, 180, 250,  600],
  medium: [5,  10,  18,  25, 150, 250, 350, 1000],
  high:   [7,  14,  25,  35, 200, 340, 480, 1500],
};

export const FOOD_ITEMS = ['Bubble Gum','Fries','Water','Coke','Beer','Sc. Longbread','Beef Burger','Fish \'n Chips','Hamburger','? Chicken'];
export const FOOD_PRICES = [1, 3, 2, 4, 5, 5, 4, 8, 10, 8];

export const MERCH_ITEMS = ['Balls','Posters','Shirts','Glassware','Flags','Caps','Stickers','Autographs','Pillows','Computergames'];
export const MERCH_PRICES = [40, 10, 100, 50, 100, 40, 10, 10, 100, 40];

export const STARTING_BALANCE = 2_000_000;

/**
 * Per-player wage per matchday.
 * Base = skill² × 150  (steep skill curve)
 * Potential bonus = max(0, 32 − age) × skill × 40  (young + skilled costs more)
 * Examples: skill 9 / age 20 → £20,550  |  skill 5 / age 25 → £6,750  |  skill 3 / age 35 → £1,350
 */
export function calcPlayerWage(skill: number, age: number): number {
  const base      = skill * skill * 150;
  const potential = Math.max(0, 32 - age) * skill * 40;
  return base + potential;
}

// Wholesale cost as fraction of sell price
const FOOD_WHOLESALE_RATE = 0.30;
const MERCH_WHOLESALE_RATE = 0.40;

// Item popularity weights (relative, not absolute)
const FOOD_POP  = [1.0, 1.2, 1.8, 1.6, 2.0, 0.6, 1.3, 1.7, 1.2, 1.0]; // Bubble Gum → ?Chicken
const MERCH_POP = [1.0, 1.5, 3.0, 0.5, 1.8, 1.6, 1.2, 0.5, 0.4, 0.8]; // Balls → Computergames

export interface StockSaleResult {
  revenue: number;
  stockCost: number;
  unitsSold: number[];
}

// ~0.6 food items per fan at tier 3; tiers scale: 0.4 / 0.7 / 1.0
export function calcFoodSales(attendance: number, tier: number): StockSaleResult {
  const mult = [0, 0.4, 0.7, 1.0][tier] ?? 0;
  const total = Math.floor(attendance * 0.6 * mult);
  const sumPop = FOOD_POP.reduce((a, b) => a + b, 0);
  const unitsSold = FOOD_POP.map(p => Math.floor(total * p / sumPop));
  const revenue  = unitsSold.reduce((s, qty, i) => s + qty * FOOD_PRICES[i], 0);
  const stockCost = Math.round(revenue * FOOD_WHOLESALE_RATE);
  return { revenue, stockCost, unitsSold };
}

// ~0.045 merch items per fan at tier 3; same tier scale
export function calcMerchSales(attendance: number, tier: number): StockSaleResult {
  const mult = [0, 0.4, 0.7, 1.0][tier] ?? 0;
  const total = Math.floor(attendance * 0.045 * mult);
  const sumPop = MERCH_POP.reduce((a, b) => a + b, 0);
  const unitsSold = MERCH_POP.map(p => Math.floor(total * p / sumPop));
  const revenue  = unitsSold.reduce((s, qty, i) => s + qty * MERCH_PRICES[i], 0);
  const stockCost = Math.round(revenue * MERCH_WHOLESALE_RATE);
  return { revenue, stockCost, unitsSold };
}

export function calcTotalAttendance(demand: number, priceLevel: 'low' | 'medium' | 'high', seatsLevel: number): number {
  return calcTicketSalesByDemand(demand, priceLevel, seatsLevel).reduce((s, n) => s + n, 0);
}

// Seat capacity multiplier by seats upgrade level (1–3)
export const SEAT_SCALE = [1.0, 1.6, 2.5];

// Price elasticity: higher = attendance falls more steeply as team gets worse
const PRICE_ELASTICITY: Record<string, number> = { low: 0.5, medium: 1.0, high: 2.0 };

/**
 * Demand factor 0.05–1.0 based on league position and points-per-game.
 * position: 1 (top) – 20 (bottom)
 * pointsPerGame: 0–3
 */
export function calcDemand(position: number, pointsPerGame: number): number {
  const posFactor  = (20 - position) / 19;        // 1st = 1.0, 20th ≈ 0.05
  const formFactor = Math.min(1, pointsPerGame / 3); // 3 pts/game = 1.0
  return Math.max(0.05, Math.min(1.0, 0.55 * posFactor + 0.45 * formFactor));
}

/**
 * Tickets sold per category, accounting for demand, price elasticity, and seat level.
 * fillRate = demand ^ elasticity  (great team + high prices → still ~81% fill)
 */
export function calcTicketSalesByDemand(
  demand: number,
  priceLevel: 'low' | 'medium' | 'high',
  seatsLevel: number,
): number[] {
  const fillRate = Math.pow(demand, PRICE_ELASTICITY[priceLevel]);
  const scale    = SEAT_SCALE[seatsLevel - 1];
  return TICKET_TYPES.map(t => Math.round(t.capacity * scale * fillRate));
}

export function calcTicketRevenue(
  priceLevel: 'low' | 'medium' | 'high',
  demand: number,
  seatsLevel: number,
): number {
  const prices = TICKET_PRICE_PRESETS[priceLevel];
  const sales  = calcTicketSalesByDemand(demand, priceLevel, seatsLevel);
  return sales.reduce((sum, qty, i) => sum + qty * prices[i], 0);
}

