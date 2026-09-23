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

export function calcTicketRevenue(priceLevel: 'low' | 'medium' | 'high'): number {
  const prices = TICKET_PRICE_PRESETS[priceLevel];
  return TICKET_TYPES.reduce((sum, t, i) => {
    const seatsThisMatch = t.name.startsWith('Season') ? t.capacity / 38 : t.capacity;
    return sum + seatsThisMatch * prices[i];
  }, 0);
}

export function calcMatchRevenue(
  isHome: boolean,
  priceLevel: 'low' | 'medium' | 'high',
  foodEnabled: boolean,
  merchandiseEnabled: boolean,
): number {
  if (!isHome) return 0;
  return (
    calcTicketRevenue(priceLevel) +
    (foodEnabled ? FOOD_REVENUE_PER_MATCH : 0) +
    (merchandiseEnabled ? MERCH_REVENUE_PER_MATCH : 0)
  );
}
