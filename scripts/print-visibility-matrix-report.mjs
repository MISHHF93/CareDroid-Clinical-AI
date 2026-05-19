#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'npm',
  ['run', 'test:run', '--', 'src/data/toolVisibilityMatrix.report.test.js'],
  { stdio: 'inherit', shell: true }
);

process.exit(result.status ?? 1);
