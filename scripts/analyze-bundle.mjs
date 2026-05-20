#!/usr/bin/env node
/**
 * Post-build bundle size report. Fails when chunks exceed budgets (raw bytes).
 * Run: npm run build:analyze
 */

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const distAssets = join(process.cwd(), 'dist', 'assets');

/** Max raw JS size per chunk name substring (bytes). */
const CHUNK_BUDGETS = Object.freeze({
  'vendor-firebase': 900_000,
  vendor: 1_200_000,
  'vendor-react': 500_000,
  calculators: 800_000,
  'clinical-catalog': 600_000,
  dashboard: 600_000,
});

const ENTRY_BUDGET = 400_000;
const TOTAL_JS_BUDGET = 5_000_000;

function listJsFiles(dir) {
  try {
    return readdirSync(dir)
      .filter((name) => name.endsWith('.js'))
      .map((name) => {
        const path = join(dir, name);
        return { name, path, size: statSync(path).size };
      })
      .sort((a, b) => b.size - a.size);
  } catch {
    console.error('[analyze-bundle] dist/assets not found — run npm run build first');
    process.exit(1);
  }
}

const files = listJsFiles(distAssets);
const total = files.reduce((sum, f) => sum + f.size, 0);
const errors = [];

console.log('CareDroid bundle analysis (dist/assets/*.js)\n');
for (const file of files.slice(0, 20)) {
  const kb = (file.size / 1024).toFixed(1);
  console.log(`  ${file.name.padEnd(48)} ${kb} KB`);
}
console.log(`\n  Total JS: ${(total / 1024 / 1024).toFixed(2)} MB (${files.length} files)\n`);

if (total > TOTAL_JS_BUDGET) {
  errors.push(`Total JS ${total} exceeds budget ${TOTAL_JS_BUDGET}`);
}

for (const file of files) {
  if (file.name.startsWith('index-') && file.size > ENTRY_BUDGET) {
    errors.push(`Entry ${file.name} ${file.size} exceeds ${ENTRY_BUDGET}`);
  }
  for (const [needle, budget] of Object.entries(CHUNK_BUDGETS)) {
    if (file.name.includes(needle) && file.size > budget) {
      errors.push(`Chunk ${file.name} (${file.size}) exceeds ${needle} budget ${budget}`);
    }
  }
}

if (errors.length > 0) {
  console.error('Bundle budget failures:\n');
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log('Bundle budgets: OK');
