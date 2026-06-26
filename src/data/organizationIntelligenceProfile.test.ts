import { describe, expect, it } from 'vitest';
import { buildOrganizationIntelligenceProfile } from './organizationIntelligenceProfile';

const analytics = {
  enabledPackIds: ['core-platform'],
  dashboards: {
    adoption: {
      enabledPackCount: 1,
      enabledAssetCount: 4,
      totalAssetCount: 12,
      adoptionScore: 33,
    },
    engagement: {
      aiUsageCount: 0,
      simulationCompletionCount: 0,
      dashboardEngagementCount: 0,
    },
    underusedAssets: [
      {
        id: 'unused-tool',
        label: 'Unused Tool',
        count: 0,
        metadata: { route: '/tools/unused-tool', assetType: 'workflow' },
      },
    ],
    topAssets: [{ id: 'qsofa', label: 'qSOFA', count: 18 }],
  },
  dimensions: {
    assetUsage: [{ id: 'qsofa', label: 'qSOFA', count: 18 }],
    aiUsage: [],
    packUsage: [{ id: 'core-platform', label: 'Core Platform', count: 18 }],
    workspaceUsage: [{ id: 'emergency', label: 'Emergency', count: 10 }],
  },
};

const customerSuccess = {
  health: { score: 46, status: 'at-risk', retentionRisk: 'high' },
  metrics: {
    adoption: { value: 33, enabledPackCount: 1, enabledAssetCount: 4, totalAssetCount: 12 },
    activeUsers: { value: 9 },
    assetUsage: { value: 18 },
    aiUsage: { value: 0 },
    simulationsCompleted: { value: 0 },
    workflowsCompleted: { value: 0 },
  },
};

describe('buildOrganizationIntelligenceProfile', () => {
  it('composes organization, usage, adoption, and adaptive recommendations', () => {
    const profile = buildOrganizationIntelligenceProfile({
      organizationContext: {
        organization: {
          id: 'org-1',
          name: 'Demo Hospital',
          organizationType: 'hospital',
          slug: 'demo-hospital',
        },
        subscription: { tier: 'enterprise' },
        tenant: { tenantId: 'demo-hospital' },
      },
      userIdentity: {
        platformContext: {
          entitledPackIds: ['core-platform'],
          defaultAiAgentId: 'agent-clinical',
          availablePacks: [
            { id: 'core-platform', name: 'Core Platform', assetIds: ['qsofa'] },
            {
              id: 'simulation-training-pack',
              name: 'Simulation Training Pack',
              assetIds: ['simulation-suite'],
              workspaceIds: ['education'],
              organizationTypes: ['hospital'],
            },
          ],
        },
      },
      workspaceContext: {
        activeWorkspaceId: 'emergency',
        workspaces: [{ id: 'emergency', name: 'Emergency', toolIds: ['qsofa'] }],
      },
      analytics,
      customerSuccess,
      tenantAdministration: {
        departments: ['emergency', 'icu'],
        workspaces: [{ id: 'education', name: 'Education', enabledToolIds: [] }],
      },
    });

    expect(profile.organization.name).toBe('Demo Hospital');
    expect(profile.organization.organizationType).toBe('hospital');
    expect(profile.departments).toHaveLength(2);
    expect(profile.adoption.score).toBe(33);
    expect(profile.usage.totals.aiUsage).toBe(0);
    expect(profile.recommendations.missingPacks[0].title).toMatch(/Simulation Training Pack/i);
    expect(profile.recommendations.underusedAssets[0].title).toMatch(/Unused Tool/i);
    expect(profile.recommendations.workflowOpportunities).toHaveLength(1);
    expect(profile.recommendations.simulationOpportunities).toHaveLength(1);
    expect(profile.recommendations.automationOpportunities).toHaveLength(1);
    expect(profile.recommendations.aiAssistOpportunities).toHaveLength(1);
    expect(profile.adaptationSignals.map((signal) => signal.id)).toEqual(
      expect.arrayContaining(['workspace-focus', 'adoption-posture', 'health-posture'])
    );
  });
});
