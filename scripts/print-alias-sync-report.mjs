#!/usr/bin/env node
/**
 * Print frontend ↔ backend NLU alias drift report (exit 1 on drift).
 * Delegates to Vitest so ESM imports resolve like the test suite.
 *
 * Usage:
 *   npm run alias-sync:report
 *   ALIAS_SYNC_WRITE_MAP=docs/clinicalToolSynchronizedAliasMap.json npm run alias-sync:report
 */

import { spawnSync } from 'node:child_process';

const writeIdx = process.argv.indexOf('--write-map');
if (writeIdx >= 0 && process.argv[writeIdx + 1]) {
  process.env.ALIAS_SYNC_WRITE_MAP = process.argv[writeIdx + 1];
}

const result = spawnSync(
  'npm',
  ['run', 'test:run', '--', 'src/data/clinicalToolAliasSync.report.test.ts'],
  { stdio: 'inherit', shell: true, env: process.env }
);

process.exit(result.status ?? 1);
