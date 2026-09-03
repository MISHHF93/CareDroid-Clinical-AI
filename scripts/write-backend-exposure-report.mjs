#!/usr/bin/env node
/**
 * Regenerate backend exposure + endpoint matrix + tool contract docs.
 * Usage: npm run exposure:write-docs
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
    'src/data/backendFrontendExposure.report.test.ts',
  ],
  {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, EXPOSURE_WRITE_DOCS: '1', CONTRACT_WRITE_DOCS: '1' },
  },
);

process.exit(result.status ?? 1);
