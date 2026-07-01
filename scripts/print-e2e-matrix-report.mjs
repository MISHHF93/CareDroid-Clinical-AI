#!/usr/bin/env node
/**
 * Print E2E tool validation matrix (exit 1 on wiring failures).
 *
 * Usage: npm run e2e-matrix:report
 */

import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'npm',
  ['run', 'test:run', '--', 'src/data/e2eToolValidationMatrix.report.test.ts'],
  { stdio: 'inherit', shell: true, env: process.env }
);

process.exit(result.status ?? 1);
