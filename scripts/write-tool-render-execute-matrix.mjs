#!/usr/bin/env node
/**
 * Regenerate docs/tool-render-execute-*.md from canonical JS sources.
 *
 * Usage: npm run tool-matrix:write-docs
 */

import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'npm',
  ['run', 'test:run', '--', 'src/data/toolRenderExecuteMatrix.report.test.ts'],
  {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, TOOL_MATRIX_WRITE_DOCS: '1' },
  }
);

process.exit(result.status ?? 1);
