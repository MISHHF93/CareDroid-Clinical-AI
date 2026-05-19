#!/usr/bin/env node
/**
 * Print reverse-engineered platform inventory (registry, NLU, calculators, features).
 *
 * Usage: npm run inventory:report
 */

import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'npm',
  ['run', 'test:run', '--', 'src/data/platformInventory.report.test.js'],
  { stdio: 'inherit', shell: true, env: process.env }
);

process.exit(result.status ?? 1);
