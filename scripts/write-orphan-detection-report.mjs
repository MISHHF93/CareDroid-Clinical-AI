#!/usr/bin/env node
/**
 * Regenerate docs/orphan-detection-report.md
 *
 * Usage: npm run orphan-detection:write-docs
 */

import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'npm',
  ['run', 'test:run', '--', 'src/data/orphanDetectionAudit.report.test.ts'],
  {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ORPHAN_DETECTION_WRITE_DOCS: '1' },
  },
);

process.exit(result.status ?? 1);
