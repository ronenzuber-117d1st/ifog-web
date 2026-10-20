import type { Team, Player, Position } from '../types/game';
import { calcPlayerWage } from './finances';

export const LEAGUE_TEAMS: Team[] = [
  { id: 1,  name: 'Gunners',      managerName: 'Bruce Rock',      baseSkill: 60, color: '#EF4444' },
  { id: 2,  name: 'The Villans',  managerName: 'Little Brian',    baseSkill: 60, color: '#7C3AED' },
  { id: 3,  name: 'Rovers',       managerName: 'Ray Halfords',    baseSkill: 59, color: '#1D4ED8' },
  { id: 4,  name: 'The Blues',    managerName: 'Rude Gullit',     baseSkill: 59, color: '#2563EB' },
  { id: 5,  name: 'Sky Blues',    managerName: 'Ron Katinson',    baseSkill: 58, color: '#0EA5E9' },
  { id: 6,  name: 'The Rams',     managerName: 'Jim Sniff',       baseSkill: 58, color: '#DC2626' },
  { id: 7,  name: 'The Toffees',  managerName: 'Jelly Royle',     baseSkill: 57, color: '#1E40AF' },
  { id: 8,  name: 'United',       managerName: 'Howard Milkinson',baseSkill: 57, color: '#FBBF24' },
  { id: 9,  name: 'Foxes',        managerName: 'Martino Neill',   baseSkill: 56, color: '#2563EB' },
  { id: 10, name: 'Reds',         managerName: 'Roy Evens',       baseSkill: 56, color: '#EF4444' },
  { id: 11, name: 'Red Devils',   managerName: 'Fergus Alexson',  baseSkill: 55, color: '#DC2626' },
  { id: 12, name: 'Magpies',      managerName: 'Kevin Kneegan',   baseSkill: 55, color: '#CBD5E1' },
  { id: 13, name: 'Forest',       managerName: 'Frank Clerk',     baseSkill: 54, color: '#DC2626' },
  { id: 14, name: 'The Owls',     managerName: 'David Plate',     baseSkill: 54, color: '#1D4ED8' },
  { id: 15, name: 'The Saints',   managerName: 'Graham Soonis',   baseSkill: 53, color: '#DC2626' },
  { id: 16, name: 'Rokermen',     managerName: 'Peter Reed',      baseSkill: 53, color: '#DC2626' },
  { id: 17, name: 'Spurs',        managerName: 'Gerry Prances',   baseSkill: 52, color: '#F8FAFC' },
  { id: 18, name: 'The Hammers',  managerName: 'Harry Redneck',   baseSkill: 52, color: '#7C3AED' },
  { id: 19, name: 'Boro',         managerName: 'Brian Robinson',  baseSkill: 51, color: '#DC2626' },
  { id: 20, name: 'The Dons',     managerName: 'Joe King-Lear',   baseSkill: 51, color: '#F59E0B' },
];

export const DIV2_TEAMS: Team[] = [
  { id: 21, name: 'Town',          managerName: 'George Burly',     baseSkill: 51, color: '#3B82F6' },
  { id: 22, name: 'The Tykes',     managerName: 'Danny Swilon',     baseSkill: 50, color: '#EF4444' },
  { id: 23, name: 'Pompey',        managerName: 'Terry Fenquick',   baseSkill: 50, color: '#1D4ED8' },
  { id: 24, name: 'The Royals',    managerName: 'Jimmy Twin',       baseSkill: 50, color: '#60A5FA' },
  { id: 25, name: 'The Rovers',    managerName: 'John Oldbridge',   baseSkill: 50, color: '#F59E0B' },
  { id: 26, name: 'Wolves',        managerName: 'Mark Maggie',      baseSkill: 50, color: '#D97706' },
  { id: 27, name: 'The Trotters',  managerName: 'Colin Dott',       baseSkill: 50, color: '#94A3B8' },
  { id: 28, name: 'The Potters',   managerName: 'Lou Calamari',     baseSkill: 50, color: '#DC2626' },
  { id: 29, name: 'Blues',         managerName: 'Tremor Francis',   baseSkill: 50, color: '#2563EB' },
  { id: 30, name: "The U's",       managerName: 'Dennis Sniff',     baseSkill: 50, color: '#EAB308' },
  { id: 31, name: 'The Eagles',    managerName: 'Dave Battess',     baseSkill: 50, color: '#B91C1C' },
  { id: 32, name: 'The Canaries',  managerName: 'Mike Talker',      baseSkill: 49, color: '#CA8A04' },
  { id: 33, name: 'Rangers',       managerName: 'Ray Silkwin',      baseSkill: 49, color: '#1E40AF' },
  { id: 34, name: 'Robins',        managerName: 'Steve McDarn',     baseSkill: 49, color: '#EF4444' },
  { id: 35, name: 'Addicks',       managerName: 'Alan Kerby-Lee',   baseSkill: 49, color: '#DC2626' },
  { id: 36, name: 'Valiants',      managerName: 'John Fudge',       baseSkill: 49, color: '#A16207' },
  { id: 37, name: 'Albion',        managerName: 'Alan Buckle',      baseSkill: 49, color: '#16A34A' },
  { id: 38, name: 'The Latics',    managerName: 'Graham S. Harp',   baseSkill: 49, color: '#3B82F6' },
  { id: 39, name: 'The Shrimpers', managerName: 'Ronny Wheelan',    baseSkill: 49, color: '#0EA5E9' },
  { id: 40, name: 'The Terriers',  managerName: 'Brian Shorten',    baseSkill: 40, color: '#6366F1' },
];

export const EUROPEAN_TEAMS: Team[] = [
  { id: 41, name: 'Bayern',     managerName: 'Maestro',      baseSkill: 80, color: '#DC2626' },
  { id: 42, name: 'Dortmund',   managerName: 'Hitzig',       baseSkill: 58, color: '#F59E0B' },
  { id: 43, name: 'Stuttgart',  managerName: 'Hinterlader',  baseSkill: 57, color: '#DC2626' },
  { id: 44, name: 'Schalke',    managerName: 'Thaler',       baseSkill: 60, color: '#1D4ED8' },
  { id: 45, name: 'Barcelona',  managerName: 'Croif',        baseSkill: 50, color: '#A855F7' },
  { id: 46, name: 'Madrid',     managerName: 'Henkes',       baseSkill: 51, color: '#CBD5E1' },
  { id: 47, name: 'Milano',     managerName: 'Raiuno',       baseSkill: 52, color: '#1F2937' },
  { id: 48, name: 'Amsterdam',  managerName: 'Keskop',       baseSkill: 53, color: '#DC2626' },
  { id: 49, name: 'Eindhoven',  managerName: 'Ademoos',      baseSkill: 54, color: '#DC2626' },
  { id: 50, name: 'Genua',      managerName: 'Dagama',       baseSkill: 55, color: '#DC2626' },
  { id: 51, name: 'Wien',       managerName: 'Schneckerl',   baseSkill: 56, color: '#7C3AED' },
  { id: 52, name: 'Paris',      managerName: 'Cirak',        baseSkill: 48, color: '#1D4ED8' },
  { id: 53, name: 'Nantes',     managerName: 'Dantes',       baseSkill: 49, color: '#F59E0B' },
  { id: 54, name: 'Porto',      managerName: 'Bermejo',      baseSkill: 54, color: '#1D4ED8' },
  { id: 55, name: 'Dublin',     managerName: 'Firehead',     baseSkill: 55, color: '#16A34A' },
];

export const ALL_TEAMS: Team[] = [...LEAGUE_TEAMS, ...DIV2_TEAMS, ...EUROPEAN_TEAMS];

export function getTeamById(id: number): Team | undefined {
  return ALL_TEAMS.find(t => t.id === id);
}

export function getSeasonTeamIds(division: 1 | 2, playerTeamId: number): number[] {
  const divTeams = division === 1 ? LEAGUE_TEAMS : DIV2_TEAMS;
  const ids = divTeams.map(t => t.id);
  if (ids.includes(playerTeamId)) return ids;
  // Player's team is from the other division — replace weakest native team
  return [...ids.slice(0, 19), playerTeamId];
}

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

const GK_NAMES = ['Kopke','Iliushin','Kalvin','Napper','Sherman','Vickers','Cobben','Davis','Lavender','Paul','Taylor','Walker','Bright','Dennis','Lewis','Mally'];
const DEF_NAMES = ['Amaretto','Cruff','Eddie','Henman','Johnson','Moore','Vincent','Ward','Adams','Ginger','Lawson','Peel','Reynolds','Thorn','Blake','Dunning','Kavanagh','Melvin','Small','Vaughan','Atkins','Finnigan','Jenkins','Marks','Rafferty','Trevors','Black','Ely','Kenneth','Norman'];
const MID_NAMES = ['De Toto','Romarino','Allen','Campbell','Jones','Myers','Smith','Vine','Beesley','Foster','Jacobs','Newman','Stanners','Wheeler','Collins','Edwards','Kieron','Leonard','Ray','Thomas','Anderson','Calvers','Justin','Neil','Stapleton','Vale','Barrett','Davidson','Kenny','Parker'];
const STR_NAMES = ['Klinsman','Yuruba','Donaldson','Ellis','Lee','Osbourne','Quentin','Walters','Court','Evergreen','Murdoch','Dell','Peters','Forrest','Haynes','Niall','Goldman','Finchley','Gilbert','Oakley','Phillips','Grant','Herman','Gordon','Ainsley','Jacks','Kershaw','Dickson','James','Arthur'];

// Must be defined before HARDCODED (which calls buildRoster → assignShirtNumbers at module init)
const SHIRT_POOLS: Record<Position, number[]> = {
  T: [1, 0, 13, 23, 30],
  V: [2, 3, 4, 5, 6, 12, 15, 16, 17],
  M: [7, 8, 14, 18, 19, 20, 21, 28, 29],
  S: [9, 10, 11, 22, 24, 25, 26, 27],
};

export function assignShirtNumbersToRoster(players: Player[]): Player[] {
  return assignShirtNumbers(players);
}

export function pickShirtNumber(position: Position, usedNumbers: Set<number>): number {
  const pool = SHIRT_POOLS[position];
  for (const num of pool) {
    if (num > 0 && !usedNumbers.has(num)) return num;
  }
  let overflow = 31;
  while (usedNumbers.has(overflow)) overflow++;
  return overflow;
}

function assignShirtNumbers(players: Player[]): Player[] {
  const used = new Set<number>();
  const counters: Record<Position, number> = { T: 0, V: 0, M: 0, S: 0 };
  let overflow = 31;
  return players.map(p => {
    const pool = SHIRT_POOLS[p.position];
    const idx = counters[p.position]++;
    let num = pool[idx] ?? overflow++;
    while (used.has(num)) num = overflow++;
    used.add(num);
    return { ...p, shirtNumber: num };
  });
}

const HARDCODED: Record<number, Player[]> = {
  1: buildRoster(1, [
    ['Heman','T',9,32],['Lookick','T',6,35],
    ['Dickson','V',5,32],['Mould','V',4,33],['Sharmall','V',5,23],['Linament','V',6,34],
    ['Mercenary','M',5,28],['Helga','M',4,27],['Parper','M',5,23],['Pratt','M',6,32],
    ['Kite','S',7,32],['Basecamp','S',9,27],['Arson','S',6,21],
  ]),
  2: buildRoster(2, [
    ['Bostitch','T',8,24],['Spokes','T',5,22],
    ['Chortles','V',6,26],['McGruff','V',4,36],['Southfork','V',6,25],['Aeiou','V',6,23],
    ['Dripper','M',4,25],['Landsend','M',4,33],['Carsick','M',5,24],['Family','M',5,21],
    ['Jonson','S',5,25],['Imlovesick','S',7,23],['Rocking','S',6,21],
  ]),
  3: buildRoster(3, [
    ['Cowers','T',7,29],['Spins','T',5,32],
    ['Henna','V',4,26],['Iceberg','V',5,26],['Bendy','V',8,30],['Coalman','V',6,26],
    ['Adonis','M',5,27],['Fiddley','M',5,28],['Shewould','M',4,27],['Hayloft','M',6,23],
    ['Hahaford','S',5,21],['Galloper','S',6,29],['Venton','S',5,22],
  ]),
  4: buildRoster(4, [
    ['Margarine','T',7,28],['Pitchcock','T',7,33],
    ['Pullit','V',7,34],['Lark','V',5,33],['LeBeef','V',6,28],['Dewberry','V',6,25],
    ['Spies','M',7,29],['Stopcock','M',5,28],['Nicepatio','M',8,26],['Rowcastle','M',5,29],
    ['Finale','S',9,32],['Hugh','S',6,32],['Spender','S',7,25],
  ]),
  5: buildRoster(5, [
    ['Oldonatic','T',5,38],['Feelan','T',6,26],
    ['Daysh','V',5,27],['Burrows','V',4,35],['Billions','V',5,25],['Barrows','V',6,27],
    ['McAllstar','M',7,31],['Oregano','M',5,27],['Hissaias','M',5,32],['Strapon','M',5,39],
    ['Nudelove','S',6,23],['Wheelon','S',7,21],['Doubling','S',5,27],
  ]),
};

function buildRoster(teamId: number, data: [string, string, number, number][]): Player[] {
  const raw = data.map(([name, pos, skill, age], i) => ({
    id: `t${teamId}-p${i}`,
    name,
    position: pos as Position,
    skill,
    age,
    injuredFor: 0,
    suspended: false,
    yellowCards: 0,
    shirtNumber: 0,
    goals: 0,
    trainingProgress: 0,
    missStreak: 0,
    wage: calcPlayerWage(skill, age),
  }));
  return assignShirtNumbers(raw);
}

function generateRoster(teamId: number, baseSkill: number): Player[] {
  const rng = seeded(teamId * 7919);
  const scale = (baseSkill - 40) / 40;
  const minSkill = Math.max(1, Math.round(3 + scale * 4));
  const maxSkill = Math.min(9, Math.round(5 + scale * 4));

  const randSkill = () => minSkill + Math.floor(rng() * (maxSkill - minSkill + 1));
  const randAge = () => 18 + Math.floor(rng() * 18);

  const players: Player[] = [];
  const positions: [Position, string[], number][] = [
    ['T', GK_NAMES, 2],
    ['V', DEF_NAMES, 4],
    ['M', MID_NAMES, 4],
    ['S', STR_NAMES, 3],
  ];

  let _idx = 0;
  for (const [pos, namePool, count] of positions) {
    const used = new Set<string>();
    for (let i = 0; i < count; i++) {
      let name = pick(namePool, rng);
      while (used.has(name)) name = pick(namePool, rng);
      used.add(name);
      const skill = randSkill();
      const age = randAge();
      players.push({
        id: `t${teamId}-p${_idx}`,
        name,
        position: pos,
        skill,
        age,
        injuredFor: 0,
        suspended: false,
        yellowCards: 0,
        shirtNumber: 0,
        goals: 0,
        trainingProgress: 0,
        missStreak: 0,
        wage: calcPlayerWage(skill, age),
      });
      _idx++;
    }
  }
  return assignShirtNumbers(players);
}

export function getRoster(teamId: number): Player[] {
  if (HARDCODED[teamId]) return HARDCODED[teamId].map(p => ({ ...p }));
  const team = ALL_TEAMS.find(t => t.id === teamId)!;
  return generateRoster(teamId, team.baseSkill);
}

export function getAllRosters(teamIds?: number[]): Record<number, Player[]> {
  const ids = teamIds ?? ALL_TEAMS.map(t => t.id);
  const result: Record<number, Player[]> = {};
  for (const id of ids) {
    result[id] = getRoster(id);
  }
  return result;
}
