#!/usr/bin/env node
/**
 * Regenerate docs/saas-compliance-audit.md from canonical sources.
 *
 * Usage: npm run saas-compliance-audit:write-docs
 */

import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'npm',
  ['run', 'test:run', '--', 'src/data/saasComplianceAudit.report.test.ts'],
  {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, SAAS_COMPLIANCE_WRITE_DOCS: '1' },
  }
);

process.exit(result.status ?? 1);
