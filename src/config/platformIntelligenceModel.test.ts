import { describe, expect, it } from 'vitest';
import {
  ARTIFACT_RELATIONSHIP_EDGES,
  PLATFORM_INTELLIGENCE_MODULES,
  TECHNICAL_DEBT_REGISTRY,
  UNIFIED_ARTIFACT_ENTITY_TYPES,
  auditPlatformIntelligence,
  buildPlatformIntelligenceAssessment,
} from './platformIntelligenceModel';

describe('platformIntelligenceModel', () => {
  it('registers all 20 prompts (117–136)', () => {
    expect(PLATFORM_INTELLIGENCE_MODULES).toHaveLength(20);
    expect(PLATFORM_INTELLIGENCE_MODULES[0].prompt).toBe(117);
    expect(PLATFORM_INTELLIGENCE_MODULES[19].prompt).toBe(136);
  });

  it('builds assessments for every module with artifacts', () => {
    const assessment = buildPlatformIntelligenceAssessment();
    expect(assessment.modules).toHaveLength(20);
    expect(assessment.overallScore).toBeGreaterThan(0);
    assessment.modules.forEach((module) => {
      expect(module.assessment.kpis.length).toBeGreaterThan(0);
      expect(module.assessment.artifacts).toBeTruthy();
    });
  });

  it('defines governed artifact registry and relationships', () => {
    expect(UNIFIED_ARTIFACT_ENTITY_TYPES.length).toBeGreaterThanOrEqual(10);
    expect(ARTIFACT_RELATIONSHIP_EDGES.length).toBeGreaterThanOrEqual(8);
    expect(TECHNICAL_DEBT_REGISTRY.length).toBeGreaterThanOrEqual(5);
  });

  it('includes platform convergence corrective actions', () => {
    const assessment = buildPlatformIntelligenceAssessment();
    expect(assessment.summary.convergenceActions?.length).toBeGreaterThan(0);
    const convergence = assessment.modules.find((m) => m.id === 'platform_convergence');
    expect(convergence.assessment.artifacts.correctiveActions.length).toBeGreaterThan(0);
  });

  it('produces audit artifact for prompts 117–136', () => {
    const audit = auditPlatformIntelligence();
    expect(audit.promptsCovered).toEqual([
      117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136,
    ]);
    expect(Object.keys(audit.moduleScores)).toHaveLength(20);
  });
});
