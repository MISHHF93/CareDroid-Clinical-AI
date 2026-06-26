/**
 * CLI report runner (invoked via npm run alias-sync:report).
 * Prints drift summary and optionally writes the synchronized alias map JSON.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildClinicalToolAliasSyncReport,
  exportSynchronizedAliasMapJson,
  formatAliasSyncReport,
} from './clinicalToolAliasSync';

describe('clinicalToolAliasSync report', () => {
  it('builds conflict report', () => {
    const report = buildClinicalToolAliasSyncReport();
    expect(formatAliasSyncReport(report)).toContain('Clinical tool alias sync report');

    const writePath = process.env.ALIAS_SYNC_WRITE_MAP;
    if (writePath) {
      mkdirSync(dirname(writePath), { recursive: true });
      writeFileSync(writePath, `${exportSynchronizedAliasMapJson()}\n`, 'utf8');
    }

    if (!report.isClean) {
      throw new Error(`NLU alias sync drift detected: ${formatAliasSyncReport(report)}`);
    }
  });
});
