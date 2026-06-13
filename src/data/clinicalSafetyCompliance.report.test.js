/**
 * CLI report runner (invoked via npm run safety-compliance:report).
 */

import { describe, expect, it } from 'vitest';
import { buildClinicalSafetyComplianceReport } from './clinicalSafetyComplianceReport';

describe('clinicalSafetyCompliance report', () => {
  it('builds compliance report', () => {
    const report = buildClinicalSafetyComplianceReport();
    expect(report.markdown).toContain('#');

    if (report.riskLevel !== 'low' || report.summary.totalFailing > 0) {
      throw new Error(
        `Clinical safety compliance failed (risk=${report.riskLevel}, failing=${report.summary.totalFailing})`
      );
    }
  });
});
