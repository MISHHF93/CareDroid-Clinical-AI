import { describe, expect, it } from 'vitest';
import {
  ARTIFACT_RELATIONSHIP_EDGES,
  PLATFORM_INTELLIGENCE_MODULES,
  TECHNICAL_DEBT_REGISTRY,
  UNIFIED_ARTIFACT_ENTITY_TYPES,
  assessDataLineage,
  assessTechnicalDebtRegistry,
  auditPlatformIntelligence,
  buildPlatformIntelligenceAssessment,
} from './platformIntelligenceModel';
import {
  PLATFORM_INTELLIGENCE_MODULE_PROVENANCE,
  PLATFORM_INTELLIGENCE_PROVENANCE,
} from './platformIntelligenceRegistry';
import { buildDataLineageExplorer } from '../data/dataLineageExplorer';

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
    if (!convergence) throw new Error('expected platform_convergence module');
    expect(convergence.assessment.artifacts.correctiveActions.length).toBeGreaterThan(0);
  });

  it('derives the data-lineage module from the real /data-lineage explorer, not a stale sample list', () => {
    // Was a hardcoded 3-item sample list whose ids ('qsofa-calculator-trace',
    // 'simulation-debrief-trace') no longer matched the real page's flows
    // (renamed to 'news2-calculator-trace'/'simulation-protocol-trace') --
    // now reads the same builder DataLineageExplorer.tsx renders from.
    const explorer = buildDataLineageExplorer();
    const module = assessDataLineage();
    const flowsKpi = module.kpis.find((k) => k.id === 'lineage-flows');
    const stagesKpi = module.kpis.find((k) => k.id === 'stage-coverage');
    expect(flowsKpi.value).toBe(explorer.flows.length);
    expect(stagesKpi.value).toBe(explorer.stages.length);
    expect(module.artifacts.sampleFlows.map((f) => f.id)).toEqual(
      explorer.flows.map((f) => f.id),
    );
  });

  it('marks the connector-registry tiering debt item resolved, matching integrationStatusRegistry.ts', () => {
    // Regression: TD-005 described work ("registry now distinguishes
    // implemented, partial, and roadmap surfaces") that's already true --
    // integrationStatusRegistry.ts's INTEGRATION_STATUS already has 3
    // distinct tiers applied consistently across all real entries -- but
    // status was still 'mitigating'.
    const td005 = TECHNICAL_DEBT_REGISTRY.find((d) => d.id === 'TD-005');
    expect(td005?.status).toBe('resolved');
    expect(assessTechnicalDebtRegistry().kpis.find((k) => k.id === 'debt-items').value).toBe(
      TECHNICAL_DEBT_REGISTRY.length,
    );
  });

  it('produces audit artifact for prompts 117–136', () => {
    const audit = auditPlatformIntelligence();
    expect(audit.promptsCovered).toEqual([
      117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136,
    ]);
    expect(Object.keys(audit.moduleScores)).toHaveLength(20);
  });
});

describe('module score provenance', () => {
  // Half these modules score themselves from lists inside the model file.
  // The hub prints an overall number, so it has to be able to say how much of
  // it is measured -- and that claim is only worth anything if every module
  // carries a label and the counts add up. assessReportingStudio was shipped
  // as LIVE by mistake (it takes no arguments and returns 100 from a hardcoded
  // template list); this is what would have caught it.
  it('labels every module and the counts reconcile', () => {
    const assessment = buildPlatformIntelligenceAssessment({});
    const values = Object.values(PLATFORM_INTELLIGENCE_PROVENANCE);

    for (const module of assessment.modules) {
      expect(values, `${module.id} has no provenance`).toContain(module.provenance);
      expect(PLATFORM_INTELLIGENCE_MODULE_PROVENANCE[module.id]).toBe(module.provenance);
    }

    expect(Object.keys(PLATFORM_INTELLIGENCE_MODULE_PROVENANCE)).toHaveLength(
      assessment.modules.length,
    );
    expect(
      assessment.summary.liveModuleCount + assessment.summary.registryModuleCount,
    ).toBe(assessment.modules.length);
  });
});
