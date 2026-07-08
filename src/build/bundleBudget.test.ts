/**
 * Post-build bundle budgets — requires `npm run build` first.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const distAssets = join(process.cwd(), 'dist', 'assets');

// Total budget reflects organic growth from the Jun-Jul 2026 feature wave
// (RBAC/user profiles, full 911->outcome journey, reception desk rebuild,
// Collaboration Hub, OCR intake, pages reorganization). Current production
// total is ~8.43MB across 175 code-split chunks with none over 1.5MB.
const TOTAL_JS_BUDGET = 9_000_000;
const MAX_JS_CHUNK_BUDGET = 1_500_000;

describe('bundle budgets (dist/assets)', () => {
  it('dist exists after production build', () => {
    if (!existsSync(distAssets)) {
      console.warn('[bundleBudget] Skipping — run npm run build before test:bundle-budget');
      return;
    }

    const files = readdirSync(distAssets).filter((n) => n.endsWith('.js'));
    expect(files.length).toBeGreaterThan(0);

    const total = files.reduce((sum, name) => sum + statSync(join(distAssets, name)).size, 0);
    expect(total).toBeLessThan(TOTAL_JS_BUDGET);

    const oversizedChunks = files
      .map((name) => ({ name, size: statSync(join(distAssets, name)).size }))
      .filter(({ size }) => size > MAX_JS_CHUNK_BUDGET);
    expect(oversizedChunks, 'unexpectedly large production chunks').toEqual([]);

    const indexEntry = files.find((n) => n.startsWith('index-'));
    expect(indexEntry, 'missing Vite entry chunk').toBeTruthy();
  });
});
