#!/usr/bin/env node
/**
 * Regenerate docs/saas-bottleneck-implementation-audit.md
 *
 * Usage: npm run saas-bottleneck-audit:write-docs
 */

import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'npm',
  ['run', 'test:run', '--', 'src/data/saasBottleneckImplementationAudit.report.test.js'],
  {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, SAAS_BOTTLENECK_AUDIT_WRITE_DOCS: '1' },
  },
);

process.exit(result.status ?? 1);

