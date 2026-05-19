/**
 * CLI report runner (invoked via npm run safety-compliance:report).
 */

import { describe, it } from 'vitest';
import { buildClinicalSafetyComplianceReport } from './clinicalSafetyComplianceReport';

describe('clinicalSafetyCompliance report', () => {
  it('prints compliance report to stdout', () => {
    const report = buildClinicalSafetyComplianceReport();
    console.log(report.markdown);

    if (report.riskLevel !== 'low' || report.summary.totalFailing > 0) {
      throw new Error(
        `Clinical safety compliance failed (risk=${report.riskLevel}, failing=${report.summary.totalFailing})`
      );
    }
  });
});
