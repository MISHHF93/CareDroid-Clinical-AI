#!/usr/bin/env node
/**
 * Print clinical safety & compliance audit (exit 1 on findings).
 *
 * Usage: npm run safety-compliance:report
 */

import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'npm',
  ['run', 'test:run', '--', 'src/data/clinicalSafetyCompliance.report.test.js'],
  { stdio: 'inherit', shell: true, env: process.env }
);

process.exit(result.status ?? 1);
