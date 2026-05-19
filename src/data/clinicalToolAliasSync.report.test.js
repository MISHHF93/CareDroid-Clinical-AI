/**
 * CLI report runner (invoked via npm run alias-sync:report).
 * Prints drift summary and optionally writes the synchronized alias map JSON.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { describe, it } from 'vitest';
import {
  buildClinicalToolAliasSyncReport,
  exportSynchronizedAliasMapJson,
  formatAliasSyncReport,
} from './clinicalToolAliasSync';

describe('clinicalToolAliasSync report', () => {
  it('prints conflict report to stdout', () => {
    const report = buildClinicalToolAliasSyncReport();
    console.log(formatAliasSyncReport(report));

    const writePath = process.env.ALIAS_SYNC_WRITE_MAP;
    if (writePath) {
      mkdirSync(dirname(writePath), { recursive: true });
      writeFileSync(writePath, `${exportSynchronizedAliasMapJson()}\n`, 'utf8');
      console.log(`\nWrote synchronized alias map → ${writePath}`);
    }

    if (!report.isClean) {
      throw new Error('NLU alias sync drift detected — see report above');
    }
  });
});
