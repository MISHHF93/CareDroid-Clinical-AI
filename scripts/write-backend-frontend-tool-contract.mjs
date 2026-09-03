#!/usr/bin/env node
/**
 * Regenerate docs/architecture/backend-frontend-tool-contract.md and
 * docs/architecture/tool-contract-matrix.md from canonical JS sources.
 *
 * Usage: npm run contract:write-docs
 */

import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'npm',
  [
    'run',
    'test:run',
    '--',
    '--testTimeout',
    '120000',
    'src/data/backendFrontendToolContract.report.test.ts',
  ],
  {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, CONTRACT_WRITE_DOCS: '1' },
  },
);

process.exit(result.status ?? 1);
