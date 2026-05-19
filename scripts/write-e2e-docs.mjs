#!/usr/bin/env node
/**
 * Regenerate docs/e2e-*.md from canonical JS sources.
 *
 * Usage: npm run e2e-matrix:write-docs
 */

import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'npm',
  ['run', 'test:run', '--', 'src/data/e2eToolValidationMatrix.report.test.js'],
  {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, E2E_MATRIX_WRITE_DOCS: '1' },
  }
);

process.exit(result.status ?? 1);
