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
export const WAGES_PER_MATCHDAY = 120_000;
export const FOOD_REVENUE_PER_MATCH = 65_000;
export const MERCH_REVENUE_PER_MATCH = 45_000;

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

export function calcMatchRevenue(
  isHome: boolean,
  priceLevel: 'low' | 'medium' | 'high',
  demand: number,
  seatsLevel: number,
  foodEnabled: boolean,
  merchandiseEnabled: boolean,
): number {
  if (!isHome) return 0;
  return (
    calcTicketRevenue(priceLevel, demand, seatsLevel) +
    (foodEnabled ? FOOD_REVENUE_PER_MATCH : 0) +
    (merchandiseEnabled ? MERCH_REVENUE_PER_MATCH : 0)
  );
}
