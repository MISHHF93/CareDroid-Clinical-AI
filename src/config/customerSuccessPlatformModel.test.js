import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_SUCCESS_CAPABILITY,
  CUSTOMER_SUCCESS_KPIS,
  FEATURE_UTILIZATION_REGISTRY,
  auditCustomerSuccessPlatform,
  buildCustomerSuccessPlatformAssessment,
  evaluateCustomerSuccessKpis,
} from './customerSuccessPlatformModel.js';

describe('customerSuccessPlatformModel', () => {
  it('defines six customer success capabilities', () => {
    expect(Object.keys(CUSTOMER_SUCCESS_CAPABILITY)).toHaveLength(6);
    expect(FEATURE_UTILIZATION_REGISTRY.length).toBeGreaterThanOrEqual(10);
    expect(Object.keys(CUSTOMER_SUCCESS_KPIS)).toHaveLength(7);
  });

  it('builds a full platform assessment with all capability sections', () => {
    const assessment = buildCustomerSuccessPlatformAssessment({
      dashboard: {
        health: { score: 82, status: 'healthy', retentionRisk: 'low' },
        metrics: {
          adoption: { value: 75, enabledAssetCount: 12, totalAssetCount: 16 },
          activeUsers: { value: 42 },
          assetUsage: {
            value: 128,
            topAssets: [{ id: 'whiteboard', label: 'Whiteboard', count: 20, route: '/emergency/whiteboard' }],
          },
          aiUsage: { value: 31 },
          simulationsCompleted: { value: 9 },
          workflowsCompleted: { value: 17 },
          underusedProducts: [],
        },
        signals: [],
      },
      context: {
        organization: { id: 'org-1', name: 'Demo Hospital' },
        workspaces: [{ id: 'ed', settings: { enabledToolIds: ['whiteboard'] } }],
        products: [{}],
        packs: [{}],
        integrations: [{ status: 'requested' }],
        subscription: { status: 'active' },
        roleProfile: { id: 'nurse' },
      },
      organizationName: 'Demo Hospital',
    });

    expect(assessment.capabilities[CUSTOMER_SUCCESS_CAPABILITY.ONBOARDING].percent).toBeGreaterThan(0);
    expect(assessment.capabilities[CUSTOMER_SUCCESS_CAPABILITY.ADOPTION].adoptionScore).toBe(75);
    expect(assessment.capabilities[CUSTOMER_SUCCESS_CAPABILITY.FEATURE_UTILIZATION].totalFeatures).toBe(
      FEATURE_UTILIZATION_REGISTRY.length,
    );
    expect(assessment.capabilities[CUSTOMER_SUCCESS_CAPABILITY.HEALTH_SCORE].score).toBeGreaterThan(0);
    expect(assessment.capabilities[CUSTOMER_SUCCESS_CAPABILITY.SUPPORT_TRACKING].openCount).toBeGreaterThanOrEqual(0);
    expect(assessment.capabilities[CUSTOMER_SUCCESS_CAPABILITY.RENEWAL_READINESS].score).toBeGreaterThan(0);
    expect(assessment.kpiEvaluation.totalCount).toBe(7);
  });

  it('evaluates KPI pass/fail against targets', () => {
    const kpis = evaluateCustomerSuccessKpis({
      onboarding: { percent: 90 },
      adoption: { adoptionScore: 80, activeUsers: 10 },
      utilization: { utilizationRate: 70 },
      health: { score: 82 },
      support: { openCount: 2 },
      renewal: { score: 78 },
    });
    expect(kpis.passedCount).toBeGreaterThanOrEqual(5);
    expect(kpis.kpis.find((kpi) => kpi.id === 'healthScore')?.passes).toBe(true);
  });

  it('produces an audit artifact for QA reporting', () => {
    const audit = auditCustomerSuccessPlatform();
    expect(audit.assessment.summary.healthScore).toBeGreaterThan(0);
    expect(audit.kpiTargets.healthScore.target).toBe(75);
    expect(audit.featureRegistryCount).toBe(FEATURE_UTILIZATION_REGISTRY.length);
  });
});
