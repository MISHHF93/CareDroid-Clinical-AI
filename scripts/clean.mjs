/**
 * Remove frontend build artifacts and Vite cache so the next build is fresh.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

for (const rel of ['dist', 'backend/dist', 'node_modules/.vite']) {
  const target = path.join(root, rel);
  try {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`Removed ${rel}`);
  } catch (e) {
    console.warn(`Skip ${rel}:`, e.message);
  }
}
