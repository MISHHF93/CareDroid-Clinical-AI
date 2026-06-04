#!/usr/bin/env node
/**
 * Regenerate docs/duplicate-system-audit.md
 *
 * Usage: npm run duplicate-system-audit:write-docs
 */

import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'npm',
  ['run', 'test:run', '--', 'src/data/duplicateSystemAudit.report.test.js'],
  {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, DUPLICATE_SYSTEM_AUDIT_WRITE_DOCS: '1' },
  }
);

process.exit(result.status ?? 1);
