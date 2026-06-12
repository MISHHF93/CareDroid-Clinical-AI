/**
 * Post-build bundle budgets — requires `npm run build` first.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const distAssets = join(process.cwd(), 'dist', 'assets');

const TOTAL_JS_BUDGET = 6_500_000;
const CALCULATORS_CHUNK_BUDGET = 950_000;

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

    const indexEntry = files.find((n) => n.startsWith('index-'));
    expect(indexEntry, 'missing Vite entry chunk').toBeTruthy();

    const calculatorEntries = files.filter((n) => n.startsWith('calculators-'));
    expect(calculatorEntries.length, 'missing lazy calculator hub chunks').toBeGreaterThan(0);
    for (const calculatorsEntry of calculatorEntries) {
      expect(statSync(join(distAssets, calculatorsEntry)).size).toBeLessThan(
        CALCULATORS_CHUNK_BUDGET
      );
    }
  });
});
