#!/usr/bin/env node
/**
 * Regenerate docs/tool-visibility-matrix.md from canonical JS sources.
 *
 * Usage: npm run visibility-matrix:write-docs
 */

import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'npm',
  ['run', 'test:run', '--', 'src/data/toolVisibilityMatrix.report.test.js'],
  {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, VISIBILITY_MATRIX_WRITE_DOCS: '1' },
  }
);

process.exit(result.status ?? 1);
