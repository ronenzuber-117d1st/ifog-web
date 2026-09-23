import Jimp from 'jimp';
import { readdir, mkdir } from 'fs/promises';
import { join } from 'path';

const SRC = 'C:/Users/ronen/Claude Code/Projects/IFOG/cd/PIC/HI';
const DEST = 'C:/Users/ronen/Claude Code/Projects/ifog-web/public/images';

// Only convert the files we actually need in the game
const INCLUDE = [
  // Team badges (all 40 English league teams + some international)
  ...Array.from({ length: 55 }, (_, i) => `WAPPEN${String(i + 1).padStart(2, '0')}.BMP`),
  // Pitch / field
  'FELD1.BMP', 'FELD2.BMP', 'FELD3.BMP',
  // Stadium / crowd
  'ZUSCHAU.BMP', 'ZUSCHAU1.BMP', 'FANS.BMP',
  // Scoreboard
  'ANZEIG1.BMP', 'ANZEIG2.BMP', 'ANZEIG3.BMP',
  // Celebrations
  'CHAMPION.BMP', 'CHEER1.BMP', 'CHEER2.BMP', 'CHEER3.BMP',
  // Ball
  'BALL.BMP',
  // Cups
  'CUP3.BMP', 'CUP4.BMP',
  // Manager portraits
  'COTRAI3.BMP', 'COTRAI4.BMP', 'COTRAI5.BMP', 'COTRAI6.BMP',
  // Stands
  'TRIB1.BMP', 'TRIB2.BMP', 'TRIB3.BMP',
  // Fan shop / food stand
  'FANBUDE0.BMP', 'FANBUDE1.BMP', 'VERKAUF.BMP',
];

await mkdir(DEST, { recursive: true });

const available = new Set(await readdir(SRC));
let ok = 0, fail = 0;

for (const file of INCLUDE) {
  if (!available.has(file)) { console.log(`SKIP (not found): ${file}`); continue; }
  const src = join(SRC, file);
  const dest = join(DEST, file.replace('.BMP', '.png').toLowerCase());
  try {
    const img = await Jimp.read(src);
    await img.writeAsync(dest);
    console.log(`✓ ${file}`);
    ok++;
  } catch (e) {
    console.error(`✗ ${file}: ${e.message}`);
    fail++;
  }
}

console.log(`\nDone: ${ok} converted, ${fail} failed.`);
