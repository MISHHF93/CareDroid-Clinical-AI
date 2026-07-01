import { describe, expect, it } from 'vitest';
import {
  ENTERPRISE_PLATFORM_MODULES,
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

  it('includes anonymized benchmarking without track identifiers', () => {
    const assessment = buildEnterpriseOperatingPlatformAssessment();
    const benchmarking = assessment.modules.find((m) => m.id === 'operational_benchmarking');
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
