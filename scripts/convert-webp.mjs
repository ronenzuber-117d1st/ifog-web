import sharp from 'sharp';
import { readdirSync, statSync, unlinkSync } from 'fs';
import { join, extname, basename } from 'path';

const dir = 'public/images';
const files = readdirSync(dir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));

let totalBefore = 0;
let totalAfter = 0;

for (const file of files) {
  const src = join(dir, file);
  const dest = join(dir, basename(file, extname(file)) + '.webp');
  const sizeBefore = statSync(src).size;

  await sharp(src).webp({ quality: 85 }).toFile(dest);

  const sizeAfter = statSync(dest).size;
  totalBefore += sizeBefore;
  totalAfter += sizeAfter;

  const pct = Math.round((1 - sizeAfter / sizeBefore) * 100);
  console.log(`${file} → ${basename(dest)}  ${(sizeBefore/1024).toFixed(0)}KB → ${(sizeAfter/1024).toFixed(0)}KB  (-${pct}%)`);
}

console.log(`\nTotal: ${(totalBefore/1024/1024).toFixed(1)}MB → ${(totalAfter/1024/1024).toFixed(1)}MB  (-${Math.round((1 - totalAfter/totalBefore)*100)}%)`);
console.log('\nOriginal files kept. Delete them manually once happy with results.');
