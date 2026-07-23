import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  buildFeatureCoverageRows,
  formatFeatureCoverageMatrixMarkdown,
  getFeatureCoverageDocument,
} from './featureCoverageMatrix';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../..');
const docsDir = join(repoRoot, 'docs', 'architecture');

describe('featureCoverageMatrix report', () => {
  it('builds rows from canonical inventory', () => {
    const rows = buildFeatureCoverageRows();
    expect(rows.length).toBeGreaterThan(50);
    expect(rows.some((r) => r.kind === 'Calculator' || r.kind === 'Tool')).toBe(true);
  });

  it('does not mislabel Tier B chat-only calculators as a component gap (Cycle 157)', () => {
    // canadian-c-spine and grace-acs are intentionally chat-guided with no
    // dedicated form (canadianCSpineWiring.test.ts / graceAcsWiring.test.ts).
    // Gaining a backend executor flips their computed launchType away from
    // chat-assisted, which previously made this matrix mislabel them as
    // broken ("Route only (component gap)") even though nothing regressed.
    const rows = buildFeatureCoverageRows();
    const canadianCSpine = rows.find((r) => r.inventoryId === 'canadian-c-spine');
    const graceAcs = rows.find((r) => r.inventoryId === 'grace-acs');
    expect(canadianCSpine?.frontendStatus).toMatch(/chat-guided/i);
    expect(graceAcs?.frontendStatus).toMatch(/chat-guided/i);
    expect(canadianCSpine?.frontendStatus).not.toMatch(/component gap/i);
    expect(graceAcs?.frontendStatus).not.toMatch(/component gap/i);
  });

  it('writes docs/feature-coverage-matrix.md when FEATURE_COVERAGE_WRITE_DOCS=1', () => {
    if (!process.env.FEATURE_COVERAGE_WRITE_DOCS) return;

    const doc = getFeatureCoverageDocument();
    mkdirSync(docsDir, { recursive: true });
    writeFileSync(
      join(docsDir, 'feature-coverage-matrix.md'),
      `${formatFeatureCoverageMatrixMarkdown(doc)}\n`
    );
    expect(existsSync(join(docsDir, 'feature-coverage-matrix.md'))).toBe(true);
  });
});
