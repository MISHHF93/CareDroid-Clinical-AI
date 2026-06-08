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
    expect(data.analytics.solutionPackage.title).toBe('Emergency Flow Intelligence Platform');
    expect(data.emergency.patientJourney.map((stage) => stage.id)).toContain('disposition');
    expect(data.emergency.dashboardWidgets.map((widget) => widget.label)).toEqual(
      expect.arrayContaining(['Waiting Room', 'Active Patients', 'Documentation Queue'])
    );
    expect(data.emergency.commandCenterWidgets.map((widget) => widget.label)).toEqual([
      'Current Patients',
      'Waiting Room',
      'High Risk Queue',
      'EMS Arrivals',
      'Referral Queue',
      'Bed Pressure',
      'Equipment Status',
      'Staffing Pressure',
      'Alerts',
    ]);
    expect(data.emergency.commandCenterWidgets[0]).toEqual(
      expect.objectContaining({
        targetSurface: 'patients',
        primaryAction: expect.objectContaining({
          label: 'Open patient flow',
          target: '/workspace/emergency/patients',
        }),
        secondaryAction: expect.objectContaining({
          actionType: 'assistant',
        }),
      })
    );
    expect(data.subpages.map((subpage) => subpage.id)).toEqual(
      expect.arrayContaining(['demo', 'deployment', 'flow', 'onboarding', 'roi'])
    );
    expect(data.emergency.demoTenant).toEqual(
      expect.objectContaining({
        tenantName: 'CareDroid Emergency Demo Hospital',
        dataPosture: expect.stringMatching(/Demo\/local data only/i),
        samplePatients: expect.arrayContaining([
          expect.objectContaining({ dataLabel: 'Demo data', integrationLabel: 'No live integration' }),
        ]),
        sampleAlerts: expect.arrayContaining([
          expect.objectContaining({ dataLabel: 'Demo data', integrationLabel: 'No live integration' }),
        ]),
        sampleWorkflows: expect.arrayContaining([
          expect.objectContaining({ dataLabel: 'Demo data', integrationLabel: 'No live integration' }),
        ]),
        sampleProtocols: expect.arrayContaining([
          expect.objectContaining({ dataLabel: 'Demo data', integrationLabel: 'No live integration' }),
        ]),
        sampleAnalytics: expect.arrayContaining([
          expect.objectContaining({ dataLabel: 'Demo data', integrationLabel: 'No live integration' }),
        ]),
      })
    );
    expect(data.emergency.firstCustomerDeployment).toEqual(
      expect.objectContaining({
        route: '/workspace/emergency/deployment',
        phases: expect.arrayContaining([
          expect.objectContaining({ title: 'Standalone Emergency Workspace' }),
          expect.objectContaining({ title: 'Protocol Library' }),
          expect.objectContaining({ title: 'AI Copilot' }),
          expect.objectContaining({ title: 'Analytics' }),
          expect.objectContaining({ title: 'Optional Integrations' }),
        ]),
        acceptance: expect.stringMatching(/without requiring a full hospital-wide deployment/i),
      })
    );
    expect(data.emergency.flowIntelligencePlatform).toEqual(
      expect.objectContaining({
        route: '/workspace/emergency/flow',
        primaryObjective: 'Reduce ED bottlenecks.',
        marketPains: expect.arrayContaining(['Too many patients', 'Too much coordination']),
        valueDrivers: expect.arrayContaining([
          expect.objectContaining({ title: 'Throughput' }),
          expect.objectContaining({ title: 'Capacity' }),
          expect.objectContaining({ title: 'Coordination' }),
          expect.objectContaining({ title: 'Cognitive Load' }),
        ]),
        firstCustomerReadiness: expect.objectContaining({
          noIntegrationPosture: expect.stringMatching(/without ADT, EHR, EMS CAD/i),
        }),
        solutions: expect.arrayContaining([
          expect.objectContaining({ title: 'Pre-Hospital Intelligence' }),
          expect.objectContaining({ title: 'EMS-to-ED Handoff' }),
          expect.objectContaining({ title: 'Dynamic Triage' }),
          expect.objectContaining({ title: 'Bed Flow Intelligence' }),
          expect.objectContaining({ title: 'Referral Automation' }),
          expect.objectContaining({ title: 'Discharge Acceleration' }),
          expect.objectContaining({ title: 'Equipment Intelligence' }),
          expect.objectContaining({ title: 'Surge Prediction' }),
          expect.objectContaining({ title: 'ED Copilot' }),
          expect.objectContaining({ title: 'ED Command Center' }),
        ]),
        automationRegistry: expect.arrayContaining([
          expect.objectContaining({ title: 'Dynamic Triage', humanReviewRequirement: expect.any(String) }),
        ]),
        saasPackagingModel: expect.objectContaining({
          productName: 'Emergency Flow Intelligence Platform',
        }),
      })
    );
    expect(data.emergency.flowIntelligencePlatform.solutions).toHaveLength(10);
    expect(data.emergency.flowIntelligencePlatform.workflowRegistry.length).toBeGreaterThan(10);
    expect(data.emergency.flowIntelligencePlatform.analyticsModel.events.length).toBeGreaterThan(10);
    expect(data.emergency.onboarding).toEqual(
      expect.objectContaining({
        route: '/workspace/emergency/onboarding',
        sections: expect.arrayContaining([
          expect.objectContaining({ label: 'Emergency Workspace overview' }),
          expect.objectContaining({ label: 'Calculators' }),
          expect.objectContaining({ label: 'Protocols' }),
          expect.objectContaining({ label: 'AI Copilot' }),
          expect.objectContaining({ label: 'Workflows' }),
          expect.objectContaining({ label: 'Analytics' }),
        ]),
        walkthrough: expect.arrayContaining([
          expect.objectContaining({
            minute: '9-10',
            targetRoute: '/workspace/emergency/analytics',
          }),
        ]),
      })
    );
    expect(data.emergency.roiEstimator).toEqual(
      expect.objectContaining({
        route: '/workspace/emergency/roi',
        inputFields: expect.arrayContaining([
          expect.objectContaining({ id: 'annualEdVolume' }),
          expect.objectContaining({ id: 'physicianCount' }),
          expect.objectContaining({ id: 'nursingCount' }),
          expect.objectContaining({ id: 'averageAssessmentsPerDay' }),
        ]),
      })
    );
    expect(data.emergency.roiEstimate.outputs).toEqual(
      expect.objectContaining({
        estimatedTimeSavedHours: expect.any(Number),
        workflowEfficiencyPercent: expect.any(Number),
        adoptionPotential: expect.stringMatching(/High|Medium|Low/),
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
    expect(data.analytics.emergency).toEqual(
      expect.objectContaining({
        route: '/workspace/emergency/analytics',
        trackedEvents: [
          'assessments_completed',
          'calculators_used',
          'protocol_retrievals',
          'workflow_launches',
          'ai_requests',
          'simulation_completion',
        ],
        metrics: expect.arrayContaining([
          expect.objectContaining({ label: 'Assessments completed' }),
          expect.objectContaining({ label: 'Calculators used' }),
          expect.objectContaining({ label: 'Protocol retrievals' }),
          expect.objectContaining({ label: 'Workflow launches' }),
          expect.objectContaining({ label: 'AI requests' }),
          expect.objectContaining({ label: 'Simulation completion' }),
        ]),
        roiSummary: expect.objectContaining({
          adoption: expect.stringMatching(/pilot signals/i),
          valueProof: expect.stringMatching(/time saved/i),
        }),
      })
    );
    expect(data.emergency.analyticsMvp).toBe(data.analytics.emergency);
    expect(data.emergency.productTiers.map((tier) => tier.title)).toEqual([
      'Emergency Flow Starter',
      'Emergency Flow Professional',
      'Emergency Flow Enterprise',
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
          trialPosture: expect.stringMatching(/Flow Starter acceptance/i),
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
      expect.arrayContaining(['Emergency Flow Starter', 'ED Evidence Companion'])
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
