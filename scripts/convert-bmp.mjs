import Jimp from 'jimp';
import { readdir, mkdir } from 'fs/promises';
import { join } from 'path';

const SRC = 'C:/Users/ronen/Claude Code/Projects/IFOG/cd/PIC/HI';
const DEST = 'C:/Users/ronen/Claude Code/Projects/ifog-web/public/images';

const INCLUDE = [
  // Team badges
  ...Array.from({ length: 55 }, (_, i) => `WAPPEN${String(i + 1).padStart(2, '0')}.BMP`),
  // Pitch / field
  'FELD1.BMP', 'FELD2.BMP', 'FELD3.BMP',
  'FELDA1.BMP', 'FELDA2.BMP', 'FELDA3.BMP',
  // Stadium / crowd
  'ZUSCHAU.BMP', 'ZUSCHAU1.BMP', 'FANS.BMP',
  // Scoreboard
  'ANZEIG1.BMP', 'ANZEIG2.BMP', 'ANZEIG3.BMP',
  // Celebrations
  'CHAMPION.BMP', 'CHEER1.BMP', 'CHEER2.BMP', 'CHEER3.BMP',
  // Ball, cups
  'BALL.BMP', 'CUP3.BMP', 'CUP4.BMP',
  // Manager portraits (6 types × 3 variants)
  ...Array.from({ length: 6 }, (_, i) =>
    Array.from({ length: 3 }, (_, j) => `MANAG${i + 1}_${j + 1}.BMP`)
  ).flat(),
  // Female manager portraits (4 types × 3 variants)
  ...Array.from({ length: 4 }, (_, i) =>
    Array.from({ length: 3 }, (_, j) => `MANAK${i + 1}_${j + 1}.BMP`)
  ).flat(),
  // Team photos
  'MANNSCH1.BMP', 'MANNSCH2.BMP', 'MANNSCH3.BMP',
  // Player cards by position
  'TORWART1.BMP', 'TORWART2.BMP', 'TORWART3.BMP', 'TORWART4.BMP',
  'MITTELF1.BMP', 'MITTELF2.BMP', 'MITTELF3.BMP', 'MITTELF4.BMP',
  'STURM1.BMP', 'STURM2.BMP', 'STURM3.BMP', 'STURM4.BMP',
  'KONDI1.BMP', 'KONDI2.BMP', 'KONDI3.BMP',
  'SUPERM0.BMP', 'SUPERM1.BMP', 'SUPERM2.BMP', 'SUPERM3.BMP',
  'MOTIVA1.BMP', 'MOTIVA2.BMP', 'MOTIVA3.BMP', 'MOTIVA4.BMP',
  'SPIELER0.BMP',
  // Office / desk scenes
  'OFFICE.BMP', 'SEKRETBA.BMP',
  // Textures
  'STONE24M.BMP', 'TAPESTRM.BMP', 'PAPER10.BMP',
  'GRASSL.BMP', 'GRASSM.BMP', 'GRASSS.BMP',
  // Stands / stadium parts
  'TRIB1.BMP', 'TRIB2.BMP', 'TRIB3.BMP',
  'STLI1.BMP', 'STLI2.BMP', 'STLI3.BMP',
  'STRE1.BMP', 'STRE2.BMP', 'STRE3.BMP',
  // Result screens
  'SIEG.BMP', 'LOSER.BMP', 'GEFEUERT.BMP', 'GLEICH.BMP',
  // Icons
  'IFOG.BMP', 'DISK.BMP', 'INFO.BMP', 'EXIT.BMP',
  // Referee / match
  'SCHIEDS1.BMP', 'SCHIEDS2.BMP', 'SCHIEDS3.BMP',
  // Personnel characters
  'MASSAGE1.BMP', 'MASSAGE2.BMP', 'MASSAGE3.BMP',
  'POMMES0.BMP', 'POMMES1.BMP', 'POMMES2.BMP',
  'FANBUDE0.BMP', 'FANBUDE1.BMP', 'VERKAUF.BMP',
  // Goalkeeper in training
  'COTRAI3.BMP', 'COTRAI4.BMP', 'COTRAI5.BMP', 'COTRAI6.BMP',
];

await mkdir(DEST, { recursive: true });

const available = new Set(await readdir(SRC));
let ok = 0, skip = 0, fail = 0;

for (const file of INCLUDE) {
  if (!available.has(file)) { skip++; continue; }
  const src = join(SRC, file);
  const dest = join(DEST, file.replace('.BMP', '.png').toLowerCase());
  try {
    const image = await Jimp.read(src);
    await image.writeAsync(dest);
    console.log(`✓ ${file}`);
    ok++;
  } catch (e) {
    console.error(`✗ ${file}: ${e.message}`);
    fail++;
  }
}

console.log(`\nDone: ${ok} converted, ${skip} skipped, ${fail} failed.`);
