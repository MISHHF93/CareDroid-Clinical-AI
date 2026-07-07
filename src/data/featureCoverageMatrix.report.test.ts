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
