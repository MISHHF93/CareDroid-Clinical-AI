#!/usr/bin/env node
/**
 * Regenerate docs/feature-coverage-matrix.md from canonical sources.
 *
 * Usage: npm run feature-coverage-matrix:write-docs
 */

import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'npm',
  ['run', 'test:run', '--', 'src/data/featureCoverageMatrix.report.test.ts'],
  {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, FEATURE_COVERAGE_WRITE_DOCS: '1' },
  }
);

process.exit(result.status ?? 1);
