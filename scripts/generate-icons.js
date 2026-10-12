import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const source = new URL('../public/icon.svg', import.meta.url);
for (const size of [180, 192, 512]) {
  const target = new URL(`../public/icon-${size}.png`, import.meta.url);
  const result = await sharp(fileURLToPath(source)).resize(size, size).png().toFile(fileURLToPath(target));
  if (result.width !== size || result.height !== size) throw new Error(`Invalid ${size}px app icon`);
  console.log(`Generated icon-${size}.png (${result.width} x ${result.height})`);
}