import { describe, expect, it } from 'vitest';
import WorkspaceDataPipelineService, {
  getWorkspaceAIContext,
  getWorkspaceAlerts,
  getWorkspaceAnalytics,
  getWorkspaceRecommendations,
  normalizeWorkspaceData,
} from './workspaceDataPipelineService';

describe('WorkspaceDataPipelineService', () => {
  it('normalizes workspace data through the canonical pipeline stages', () => {
    const data = normalizeWorkspaceData('emergency');

    expect(data.pipelineStages).toEqual([
      'Source',
      'Ingestion',
      'Normalization',
      'Workspace Context',
      'Asset Recommendations',
      'Dashboard Widgets',
      'Alerts',
      'AI Context',
      'Reports',
    ]);
    expect(data.workspace.id).toBe('emergency');
    expect(data.mode.modeName).toMatch(/Emergency/);
    expect(data.recommendations.some((item) => item.assetId === 'qsofa')).toBe(true);
    expect(data.analytics.counts.automations).toBe(10);
    expect(data.analytics.solutionPackage.title).toBe('Emergency Department Solution');
    expect(data.emergency.patientJourney.map((stage) => stage.id)).toContain('disposition');
    expect(data.emergency.dashboardWidgets.map((widget) => widget.label)).toEqual(
      expect.arrayContaining(['Waiting Room', 'Active Patients', 'Documentation Queue'])
    );
    expect(data.emergency.commandCenterWidgets.map((widget) => widget.label)).toEqual([
      'Waiting Patients',
      'High Risk Queue',
      'Critical Alerts',
      'Recent Assessments',
      'Recommended Actions',
      'Protocol Guidance',
    ]);
    expect(data.emergency.commandCenterWidgets[0]).toEqual(
      expect.objectContaining({
        targetSurface: 'triage',
        primaryAction: expect.objectContaining({
          label: 'Start triage review',
          target: '/workspace/emergency/triage',
        }),
        secondaryAction: expect.objectContaining({
          actionType: 'assistant',
        }),
      })
    );
    expect(data.emergency.triageOrchestrator.calculatorSequence.map((calculator) => calculator.id)).toEqual(
      expect.arrayContaining(['qsofa', 'news2', 'heart-score', 'wells-pe', 'wells-dvt-calculator', 'shock-index'])
    );
    expect(data.emergency.ragComplaintContext.map((context) => context.complaint)).toEqual(
      expect.arrayContaining(['Chest Pain', 'Stroke Symptoms', 'Sepsis Concern', 'Trauma', 'Shortness of Breath'])
    );
    expect(data.emergency.chiefComplaintRoutes.map((route) => route.complaint)).toEqual([
      'Chest Pain',
      'Stroke Symptoms',
      'Sepsis Concern',
      'Shortness of Breath',
    ]);
    expect(data.emergency.chiefComplaintRoutes[0]).toEqual(
      expect.objectContaining({
        calculators: [expect.objectContaining({ label: 'HEART' })],
        workflows: ['ACS Workflow'],
        referrals: ['Cardiology Referral'],
        safetyStatement: expect.stringMatching(/does not diagnose/i),
      })
    );
    expect(data.emergency.aiCopilot).toEqual(
      expect.objectContaining({
        copilotId: 'emergency-ai-copilot',
        inputSchema: ['complaint', 'vitals', 'workspaceContext', 'selectedCalculators'],
        sampleGuidance: expect.objectContaining({
          recommendedTools: expect.arrayContaining([expect.objectContaining({ label: 'HEART' })]),
          reasoning: expect.any(Array),
        }),
      })
    );
    expect(data.emergency.productTiers.map((tier) => tier.title)).toEqual([
      'Emergency Core',
      'Emergency Professional',
      'Emergency Enterprise',
    ]);
    expect(data.emergency.mvpPackage).toEqual(
      expect.objectContaining({
        packageId: 'emergency-core-mvp',
        billingMetric: expect.stringMatching(/ED site/i),
        implementationDependency: 'Low',
        integrationDependency: 'Not required for MVP pilot',
        humanReviewRequirement: 'Required for every clinical output',
      })
    );
    expect(data.emergency.mvpPackage.includedCapabilities[0]).toEqual(
      expect.objectContaining({
        label: 'qSOFA',
        reason: expect.stringMatching(/sepsis screening/i),
        dependencyPosture: 'Standalone/manual input',
      })
    );
    expect(data.emergency.mvpPackage.includedCapabilities.map((capability) => capability.label)).toEqual([
      'qSOFA',
      'NEWS2',
      'HEART',
      'Wells PE',
      'Wells DVT',
      'Shock Index',
      'AI Assistant',
      'Protocol Retrieval',
      'Workflow Guidance',
      'Workspace Dashboard',
    ]);
    expect(data.emergency.optionalAddOns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Documentation Integrity',
          billingMetric: 'Module add-on per ED site per month',
          implementationDependency: 'Medium',
        }),
        expect.objectContaining({
          title: 'Referral Routing',
          trialPosture: expect.stringMatching(/Core acceptance/i),
        }),
        expect.objectContaining({
          title: 'Prior Authorization',
          implementationDependency: 'High',
        }),
      ])
    );
    expect(data.emergency.customerReadiness.summary).toEqual(
      expect.objectContaining({
        readyToSell: expect.any(Number),
        needsWiring: expect.any(Number),
        needsIntegration: expect.any(Number),
        futureRoadmap: expect.any(Number),
      })
    );
    expect(data.emergency.customerReadiness.fastestToMarketOfferings.map((offering) => offering.title)).toEqual(
      expect.arrayContaining(['ED Triage Calculator Pack', 'ED Evidence Companion'])
    );
    expect(data.emergency.customerReadiness.capabilities.every((capability) => capability.classification)).toBe(true);
    expect(data.alerts.length).toBeGreaterThan(0);
  });

  it('returns honest backend status labels instead of claiming unavailable live services', () => {
    const data = WorkspaceDataPipelineService.getWorkspaceData('medical-iot');

    expect(data.backendConnections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'devices',
          status: 'demo-local-fallback',
          statusLabel: 'Demo/local fallback',
          isBackendWired: false,
        }),
      ])
    );
    expect(data.sourceStatus).toMatch(/demo\/local fallback/i);
  });

  it('returns non-null AI context for operational workspaces', () => {
    for (const workspaceId of ['emergency', 'laboratory', 'medical-iot', 'fleet', 'governance']) {
      const context = getWorkspaceAIContext(workspaceId);
      expect(context.workspaceId).toBe(workspaceId);
      expect(context.assistantContext).toEqual(expect.any(String));
      expect(context.assistantContext.length).toBeGreaterThan(12);
      expect(context.tools.length).toBeGreaterThan(0);
      expect(context.automations).toEqual(expect.any(Array));
    }
    expect(getWorkspaceAIContext('emergency').emergency.chiefComplaintRoutes.map((route) => route.complaint)).toEqual(
      expect.arrayContaining(['Chest Pain', 'Sepsis Concern', 'Shortness of Breath'])
    );
    expect(getWorkspaceAIContext('emergency').emergency.aiCopilot).toEqual(
      expect.objectContaining({
        copilotId: 'emergency-ai-copilot',
        safetyBoundary: expect.stringMatching(/No autonomous/i),
      })
    );
  });

  it('returns workspace-specific asset, alert, and analytics slices', () => {
    expect(getWorkspaceRecommendations('laboratory').map((item) => item.assetId)).toContain('lab-interp');
    expect(getWorkspaceRecommendations('fleet').map((item) => item.assetId)).toContain('fleet-live-map');
    expect(getWorkspaceRecommendations('governance').map((item) => item.assetId)).toEqual(
      expect.arrayContaining(['ai-governance', 'ai-security'])
    );
    expect(getWorkspaceAlerts('medical-iot').map((item) => item.label).join(' ')).toMatch(/telemetry|offline|battery/i);
    expect(getWorkspaceAnalytics('fleet').counts.tools).toBeGreaterThan(0);
  });
});
