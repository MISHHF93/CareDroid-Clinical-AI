import { describe, expect, it } from 'vitest';
import {
  ENTERPRISE_PLATFORM_MODULES,
  ENTERPRISE_RISK_REGISTER,
  auditEnterpriseOperatingPlatform,
  buildEnterpriseOperatingPlatformAssessment,
} from './enterpriseOperatingPlatformModel';

describe('enterpriseOperatingPlatformModel', () => {
  it('registers all 18 prompts (99–116)', () => {
    expect(ENTERPRISE_PLATFORM_MODULES).toHaveLength(18);
    expect(ENTERPRISE_PLATFORM_MODULES[0].prompt).toBe(99);
    expect(ENTERPRISE_PLATFORM_MODULES[17].prompt).toBe(116);
  });

  it('builds assessments for every module', () => {
    const assessment = buildEnterpriseOperatingPlatformAssessment();
    expect(assessment.modules).toHaveLength(18);
    expect(assessment.overallScore).toBeGreaterThan(0);
    expect(assessment.summary.kpisTotal).toBeGreaterThan(0);
    assessment.modules.forEach((module) => {
      expect(module.assessment.score).toBeGreaterThanOrEqual(0);
      expect(module.assessment.kpis.length).toBeGreaterThan(0);
      expect(module.assessment.artifacts).toBeTruthy();
    });
  });

  it('marks the emergency API auth risk resolved, matching the AuthGuard already applied on EmergencyOsController', () => {
    // Regression: R-003 was stuck at status 'open' describing a JWT
    // AuthGuard rollout that's actually already live (verified directly
    // against backend/src/modules/emergency-os/emergency-os.controller.ts's
    // @UseGuards(AuthGuard('jwt'), AuthorizationGuard)) -- a different,
    // stale copy of the same fact TD-002 in the technical debt registry
    // already had correctly marked 'resolved'.
    const r003 = ENTERPRISE_RISK_REGISTER.find((r) => r.id === 'R-003');
    expect(r003?.status).toBe('resolved');

    const assessment = buildEnterpriseOperatingPlatformAssessment();
    const riskModule = assessment.modules.find((m) => m.id === 'risk_management');
    if (!riskModule) throw new Error('expected risk_management module');
    expect(riskModule.assessment.artifacts.openRisks.some((r) => r.id === 'R-003')).toBe(false);
  });

  it('includes anonymized benchmarking without track identifiers', () => {
    const assessment = buildEnterpriseOperatingPlatformAssessment();
    const benchmarking = assessment.modules.find((m) => m.id === 'operational_benchmarking');
    if (!benchmarking) throw new Error('expected operational_benchmarking module');
    expect(benchmarking.assessment.artifacts.anonymized).toBe(true);
    expect(benchmarking.assessment.artifacts.cohorts.length).toBeGreaterThan(0);
  });

  it('produces audit artifact covering prompts 99–116', () => {
    const audit = auditEnterpriseOperatingPlatform();
    expect(audit.promptsCovered).toEqual([
      99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116,
    ]);
    expect(Object.keys(audit.moduleScores)).toHaveLength(18);
  });
});
