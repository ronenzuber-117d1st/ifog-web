import type { Team, Player, Position } from '../types/game';

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
  { id: 12, name: 'Magpies',      managerName: 'Kevin Kneegan',   baseSkill: 55, color: '#111827' },
  { id: 13, name: 'Forest',       managerName: 'Frank Clerk',     baseSkill: 54, color: '#DC2626' },
  { id: 14, name: 'The Owls',     managerName: 'David Plate',     baseSkill: 54, color: '#1D4ED8' },
  { id: 15, name: 'The Saints',   managerName: 'Graham Soonis',   baseSkill: 53, color: '#DC2626' },
  { id: 16, name: 'Rokermen',     managerName: 'Peter Reed',      baseSkill: 53, color: '#DC2626' },
  { id: 17, name: 'Spurs',        managerName: 'Gerry Prances',   baseSkill: 52, color: '#F8FAFC' },
  { id: 18, name: 'The Hammers',  managerName: 'Harry Redneck',   baseSkill: 52, color: '#7C3AED' },
  { id: 19, name: 'Boro',         managerName: 'Brian Robinson',  baseSkill: 51, color: '#DC2626' },
  { id: 20, name: 'The Dons',     managerName: 'Joe King-Lear',   baseSkill: 51, color: '#F59E0B' },
];

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

const GK_NAMES = ['Brickwall','Dropshot','Fumbles','Ironpalms','Lastman','Nethergate','Oilslick','Safehands','Woodwork','Flapper','Glovesworth','Quickcatch','Palmtree','Reflex','Stretcher'];
const DEF_NAMES = ['Blockhead','Bulldoze','Cement','Crunch','Deadleg','Elbow','Flatfoot','Granite','Hardcase','Ironwood','Legwork','Lumber','Noggin','Pillar','Stopper','Tackle','Wallop','Slab','Obstacle','Redbrick'];
const MID_NAMES = ['Compass','Dribbles','Dynamo','Energize','Grafter','Halfback','Legsman','Liaison','Linchpin','Navigator','Passmore','Playmaker','Runabout','Spinner','Stamina','Trickster','Turnover','Twinkle','Workhorse','Zippy'];
const STR_NAMES = ['Backheel','Bangers','Clincher','Deadball','Diver','Finisher','Goalgetter','Headcase','Hitman','Kapow','Marksman','Netbuster','Nutmeg','Poacher','Predator','Quickdraw','Scorer','Sniper','Topgun','Volley'];

const HARDCODED: Record<number, Player[]> = {
  1: buildRoster(1, [
    ['Heman','T',9,32],['Lookick','T',6,35],['Blandrews','T',0,25],
    ['Dickson','V',5,32],['Mould','V',4,33],['Sharmall','V',5,23],['Linament','V',6,34],['Tantrums','V',6,29],
    ['Mercenary','M',5,28],['Helga','M',4,27],['Parper','M',5,23],['Pratt','M',6,32],['Tomorrow','M',5,26],
    ['Kite','S',7,32],['Basecamp','S',9,27],['Arson','S',6,21],['Wikomya','S',5,26],['Shore','S',6,22],
  ]),
  2: buildRoster(2, [
    ['Bostitch','T',8,24],['Spokes','T',5,22],['Fourbes','T',0,18],
    ['Chortles','V',6,26],['McGruff','V',4,36],['Southfork','V',6,25],['Aeiou','V',6,23],['Standon','V',5,27],
    ['Dripper','M',4,25],['Landsend','M',4,33],['Carsick','M',5,24],['Family','M',5,21],['Car','M',4,29],
    ['Jonson','S',5,25],['Imlovesick','S',7,23],['Rocking','S',6,21],['Dorke','S',9,24],['Scimeca','S',5,21],
  ]),
  3: buildRoster(3, [
    ['Cowers','T',7,29],['Spins','T',5,32],['Cowvin','T',1,27],
    ['Henna','V',4,26],['Iceberg','V',5,26],['Bendy','V',8,30],['Coalman','V',6,26],['Bigtoe','V',6,28],
    ['Adonis','M',5,27],['Fiddley','M',5,28],['Shewould','M',4,27],['Hayloft','M',6,23],['Boeing','M',7,29],
    ['Hahaford','S',5,21],['Galloper','S',6,29],['Venton','S',5,22],['Button','S',6,23],['Pillbox','S',5,25],
  ]),
  4: buildRoster(4, [
    ['Margarine','T',7,28],['Pitchcock','T',7,33],['Snapper','T',1,24],
    ['Pullit','V',7,34],['Lark','V',5,33],['LeBeef','V',6,28],['Dewberry','V',6,25],['Detestyou','V',6,28],
    ['Spies','M',7,29],['Stopcock','M',5,28],['Nicepatio','M',8,26],['Rowcastle','M',5,29],['Barley','M',5,24],
    ['Finale','S',9,32],['Hugh','S',6,32],['Spender','S',7,25],['Spine','S',5,30],['Flea','S',4,26],
  ]),
  5: buildRoster(5, [
    ['Oldonatic','T',5,38],['Feelan','T',6,26],['Sermon','T',2,22],
    ['Daysh','V',5,27],['Burrows','V',4,35],['Billions','V',5,25],['Barrows','V',6,27],['Penny','V',7,32],
    ['McAllstar','M',7,31],['Oregano','M',5,27],['Hissaias','M',5,32],['Strapon','M',5,39],['Mess','M',5,25],
    ['Nudelove','S',6,23],['Wheelon','S',7,21],['Doubling','S',5,27],["O'Kneel",'S',4,27],['Pilchardson','S',4,23],
  ]),
};

function buildRoster(teamId: number, data: [string, string, number, number][]): Player[] {
  return data.map(([name, pos, skill, age], i) => ({
    id: `t${teamId}-p${i}`,
    name,
    position: pos as Position,
    skill,
    age,
    injuredFor: 0,
    suspended: false,
    trainingProgress: 0,
  }));
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
    ['T', GK_NAMES, 3],
    ['V', DEF_NAMES, 5],
    ['M', MID_NAMES, 5],
    ['S', STR_NAMES, 5],
  ];

  let _idx = 0;
  for (const [pos, namePool, count] of positions) {
    const used = new Set<string>();
    for (let i = 0; i < count; i++) {
      let name = pick(namePool, rng);
      while (used.has(name)) name = pick(namePool, rng);
      used.add(name);
      players.push({
        id: `t${teamId}-p${_idx}`,
        name,
        position: pos,
        skill: randSkill(),
        age: randAge(),
        injuredFor: 0,
        suspended: false,
        trainingProgress: 0,
      });
      _idx++;
    }
  }
  return players;
}

export function getRoster(teamId: number): Player[] {
  if (HARDCODED[teamId]) return HARDCODED[teamId].map(p => ({ ...p }));
  const team = LEAGUE_TEAMS.find(t => t.id === teamId)!;
  return generateRoster(teamId, team.baseSkill);
}

export function getAllRosters(): Record<number, Player[]> {
  const result: Record<number, Player[]> = {};
  for (const team of LEAGUE_TEAMS) {
    result[team.id] = getRoster(team.id);
  }
  return result;
}
