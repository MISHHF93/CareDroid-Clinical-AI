#!/usr/bin/env node
/**
 * Regenerate docs/product-packaging-audit.md
 *
 * Usage: npm run product-packaging-audit:write-docs
 */

import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'npm',
  ['run', 'test:run', '--', 'src/data/productPackagingAudit.report.test.ts'],
  {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PRODUCT_PACKAGING_AUDIT_WRITE_DOCS: '1' },
  }
);

process.exit(result.status ?? 1);
