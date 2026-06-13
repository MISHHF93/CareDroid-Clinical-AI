import { describe, expect, it } from 'vitest';
import {
  EMERGENCY_AI_COPILOT,
  EMERGENCY_ANALYTICS_EVENTS,
  EMERGENCY_ANALYTICS_MVP,
  EMERGENCY_CHIEF_COMPLAINT_ROUTES,
  EMERGENCY_DEMO_TENANT,
  EMERGENCY_FIRST_CUSTOMER_DEPLOYMENT,
  EMERGENCY_FLOW_INTELLIGENCE_PLATFORM,
  EMERGENCY_ONBOARDING_EXPERIENCE,
  EMERGENCY_ROI_ESTIMATOR,
  buildDynamicRiskBundle,
  buildEmergencyCopilotGuidance,
  estimateEmergencyRoi,
  routeEmergencyChiefComplaint,
} from './emergencyOperatingSystem';

describe('emergencyOperatingSystem complaint router', () => {
  it('defines the required complaint-driven workflow routes', () => {
    expect(EMERGENCY_CHIEF_COMPLAINT_ROUTES.map((route) => route.complaint)).toEqual([
      'Chest Pain',
      'Stroke Symptoms',
      'Sepsis Concern',
      'Trauma',
      'Shortness of Breath',
      'Abdominal Pain',
      'Psychiatric Crisis',
    ]);
  });

  it('routes required chief complaints to workflow guidance without diagnosis', () => {
    expect(routeEmergencyChiefComplaint('chest pressure')).toEqual(
      expect.objectContaining({
        complaint: 'Chest Pain',
        calculators: [expect.objectContaining({ label: 'HEART' })],
        workflows: ['ACS Workflow'],
        referrals: ['Cardiology Referral'],
        routingMode: 'complaint-first-workflow-guidance',
        navigationSteps: ['Complaint', 'Workflow', 'Calculators', 'Protocols', 'Referrals', 'AI Copilot'],
        safetyStatement: expect.stringMatching(/does not diagnose ACS/i),
      })
    );
    expect(routeEmergencyChiefComplaint('facial droop and slurred speech')).toEqual(
      expect.objectContaining({
        complaint: 'Stroke Symptoms',
        calculators: [expect.objectContaining({ label: 'NIHSS' })],
        workflows: ['Stroke Workflow'],
        safetyStatement: expect.stringMatching(/does not diagnose stroke/i),
      })
    );
    expect(routeEmergencyChiefComplaint('possible sepsis')).toEqual(
      expect.objectContaining({
        complaint: 'Sepsis Concern',
        calculators: [
          expect.objectContaining({ label: 'qSOFA' }),
          expect.objectContaining({ label: 'NEWS2' }),
        ],
        workflows: ['Sepsis Workflow'],
        safetyStatement: expect.stringMatching(/does not diagnose sepsis/i),
      })
    );
    expect(routeEmergencyChiefComplaint('dyspnea')).toEqual(
      expect.objectContaining({
        complaint: 'Shortness of Breath',
        calculators: [expect.objectContaining({ label: 'Wells PE' })],
        protocols: expect.arrayContaining(['Respiratory Protocol']),
        safetyStatement: expect.stringMatching(/does not diagnose PE/i),
      })
    );
    expect(routeEmergencyChiefComplaint('trauma activation')).toEqual(
      expect.objectContaining({
        complaint: 'Trauma',
        workflows: ['Trauma Pathway'],
        protocols: expect.arrayContaining(['Trauma Pathway']),
        simulations: expect.arrayContaining(['trauma bay team simulation']),
        referrals: ['Trauma surgery review'],
        safetyStatement: expect.stringMatching(/does not diagnose injuries/i),
      })
    );
    expect(routeEmergencyChiefComplaint('abdominal pain')).toEqual(
      expect.objectContaining({
        complaint: 'Abdominal Pain',
        workflows: ['Abdominal Pain Workflow'],
        calculators: expect.arrayContaining([expect.objectContaining({ label: 'BISAP' })]),
        referrals: ['Surgery or GI referral review'],
        safetyStatement: expect.stringMatching(/does not diagnose surgical abdomen/i),
      })
    );
    expect(routeEmergencyChiefComplaint('psychiatric crisis')).toEqual(
      expect.objectContaining({
        complaint: 'Psychiatric Crisis',
        workflows: ['Psychiatric Crisis Workflow'],
        calculators: expect.arrayContaining([expect.objectContaining({ label: 'C-SSRS' })]),
        referrals: ['Psychiatry or crisis team referral'],
        safetyStatement: expect.stringMatching(/does not diagnose/i),
      })
    );
  });

  it('returns null for unsupported complaint text', () => {
    expect(routeEmergencyChiefComplaint('medication refill')).toBeNull();
  });

  it('builds one Dynamic Risk Bundle Engine profile from complaint, age, vitals, and risk factors', () => {
    expect(
      buildDynamicRiskBundle({
        chiefComplaint: 'chest pain',
        age: 58,
        vitals: 'BP 92/58, HR 124',
        riskFactors: 'diabetes and diaphoresis',
      }).emergencyRiskProfile
    ).toEqual(
      expect.objectContaining({
        title: 'Emergency Risk Profile',
        consolidated: true,
        complaint: 'Chest Pain',
        calculators: [
          expect.objectContaining({ label: 'HEART' }),
          expect.objectContaining({ label: 'Shock Index' }),
        ],
        noDisconnectedCalculators: true,
      })
    );
    expect(buildDynamicRiskBundle({ chiefComplaint: 'stroke symptoms' }).riskBundle.map((item) => item.label)).toEqual([
      'NIHSS',
      'GCS',
    ]);
    expect(buildDynamicRiskBundle({ chiefComplaint: 'possible sepsis' }).riskBundle.map((item) => item.label)).toEqual([
      'qSOFA',
      'NEWS2',
    ]);
  });

  it('builds explainable ED Copilot workflow guidance without autonomous decisions', () => {
    expect(EMERGENCY_AI_COPILOT.inputSchema).toEqual([
      'complaint',
      'vitals',
      'workspaceContext',
      'surfacedCalculators',
    ]);
    expect(EMERGENCY_AI_COPILOT.outputSchema).toEqual(
      expect.arrayContaining([
        'complaint',
        'workflow',
        'surfacedCalculators',
        'protocols',
        'referrals',
        'aiCopilot',
        'escalationSuggestions',
        'reasoning',
      ])
    );

    const guidance = buildEmergencyCopilotGuidance({
      complaint: 'chest pressure',
      vitals: 'HR 118, RR 22, SpO2 94%',
      workspaceContext: 'Emergency Command Center',
      surfacedCalculators: ['HEART'],
    });

    expect(guidance).toEqual(
      expect.objectContaining({
        copilotId: 'emergency-ai-copilot',
        matchedRouteId: 'chief-complaint-chest-pain',
        navigationMode: 'complaint-first',
        workflow: 'ACS Workflow',
        referrals: expect.arrayContaining(['Cardiology Referral']),
        aiCopilot: 'ED AI Copilot',
        surfacedCalculators: expect.arrayContaining([expect.objectContaining({ label: 'HEART' })]),
        protocols: expect.arrayContaining(['ACS/chest pain pathway']),
        nextWorkflowStep: expect.stringMatching(/ACS Workflow/i),
        safetyBoundary: expect.stringMatching(/No autonomous diagnosis/i),
      })
    );
    expect(guidance.recommendedTools.map((tool) => tool.label)).toContain('HEART');
    expect(guidance.escalationSuggestions.join(' ')).toMatch(/verify whether any local escalation threshold/i);
    expect(guidance.reasoning.every((reason) => reason.explanation)).toBe(true);
  });

  it('defines the Emergency Analytics MVP adoption and ROI contract', () => {
    expect(EMERGENCY_ANALYTICS_MVP.route).toBe('/workspace/emergency/analytics');
    expect(EMERGENCY_ANALYTICS_EVENTS).toEqual([
      'assessments_completed',
      'calculators_used',
      'protocol_retrievals',
      'workflow_launches',
      'ai_requests',
      'simulation_completion',
    ]);
    expect(EMERGENCY_ANALYTICS_MVP.metrics.map((metric) => metric.label)).toEqual([
      'Assessments completed',
      'Calculators used',
      'Protocol retrievals',
      'Workflow launches',
      'AI requests',
      'Simulation completion',
    ]);
    expect(EMERGENCY_ANALYTICS_MVP.roiSummary.valueProof).toMatch(/time saved/i);
    expect(EMERGENCY_ANALYTICS_MVP.humanReviewStatement).toMatch(/do not score autonomous clinical quality/i);
  });

  it('defines a 10-minute hospital onboarding walkthrough for Emergency OS', () => {
    expect(EMERGENCY_ONBOARDING_EXPERIENCE.route).toBe('/workspace/emergency/onboarding');
    expect(EMERGENCY_ONBOARDING_EXPERIENCE.goal).toMatch(/10 minutes/i);
    expect(EMERGENCY_ONBOARDING_EXPERIENCE.sections.map((section) => section.label)).toEqual([
      'Emergency OS overview',
      'Calculators',
      'Protocols',
      'AI Copilot',
      'Workflows',
      'Analytics',
    ]);
    expect(EMERGENCY_ONBOARDING_EXPERIENCE.walkthrough.map((step) => step.minute)).toEqual([
      '0-1',
      '1-3',
      '3-5',
      '5-7',
      '7-9',
      '9-10',
    ]);
    expect(EMERGENCY_ONBOARDING_EXPERIENCE.walkthrough.at(-1).targetRoute).toBe('/workspace/emergency/analytics');
  });

  it('defines a fully labeled Emergency demo tenant for prospect evaluation without integrations', () => {
    expect(EMERGENCY_DEMO_TENANT).toEqual(
      expect.objectContaining({
        tenantId: 'emergency-demo-tenant',
        tenantName: 'Emergency OS Demo Hospital',
        workspaceRoute: '/workspace/emergency/demo',
        dataPosture: expect.stringMatching(/No live EHR/i),
      })
    );

    const demoCollections = [
      EMERGENCY_DEMO_TENANT.samplePatients,
      EMERGENCY_DEMO_TENANT.sampleAlerts,
      EMERGENCY_DEMO_TENANT.sampleWorkflows,
      EMERGENCY_DEMO_TENANT.sampleProtocols,
      EMERGENCY_DEMO_TENANT.sampleAnalytics,
    ];

    expect(demoCollections.every((collection) => collection.length > 0)).toBe(true);
    demoCollections.flat().forEach((item) => {
      expect(item).toEqual(
        expect.objectContaining({
          dataLabel: 'Demo data',
          tenantLabel: 'Demo tenant',
          integrationLabel: 'No live integration',
        })
      );
    });
  });

  it('estimates ED ROI from sales and onboarding discovery inputs', () => {
    expect(EMERGENCY_ROI_ESTIMATOR.route).toBe('/workspace/emergency/roi');
    expect(EMERGENCY_ROI_ESTIMATOR.inputFields.map((field) => field.id)).toEqual([
      'annualEdVolume',
      'physicianCount',
      'nursingCount',
      'averageAssessmentsPerDay',
    ]);
    expect(EMERGENCY_ROI_ESTIMATOR.outputDefinitions.map((output) => output.label)).toEqual([
      'Estimated time saved',
      'Workflow efficiency',
      'Adoption potential',
    ]);

    const estimate = estimateEmergencyRoi({
      annualEdVolume: 50000,
      physicianCount: 40,
      nursingCount: 90,
      averageAssessmentsPerDay: 130,
    });

    expect(estimate.outputs.estimatedTimeSavedHours).toBeGreaterThan(3000);
    expect(estimate.outputs.workflowEfficiencyPercent).toBeGreaterThanOrEqual(20);
    expect(estimate.outputs.adoptionPotential).toBe('High');
    expect(estimate.summary.estimatedTimeSaved).toMatch(/hours\/year/i);
    expect(estimate.disclaimer).toMatch(/planning estimate/i);
  });

  it('defines the first customer deployment blueprint as phased low-risk rollout', () => {
    expect(EMERGENCY_FIRST_CUSTOMER_DEPLOYMENT.route).toBe('/workspace/emergency/deployment');
    expect(EMERGENCY_FIRST_CUSTOMER_DEPLOYMENT.phases.map((phase) => phase.title)).toEqual([
      'Standalone Emergency OS',
      'Protocol Library',
      'AI Copilot',
      'Analytics',
      'Optional Integrations',
    ]);
    expect(EMERGENCY_FIRST_CUSTOMER_DEPLOYMENT.phases[0]).toEqual(
      expect.objectContaining({
        operationalRisk: 'Minimal',
        integrationRequirement: 'No integrations required',
      })
    );
    expect(EMERGENCY_FIRST_CUSTOMER_DEPLOYMENT.phases.at(-1).acceptance).toMatch(/No live writeback/i);
    expect(EMERGENCY_FIRST_CUSTOMER_DEPLOYMENT.acceptance).toMatch(/without requiring a full hospital-wide deployment/i);
  });

  it('defines the Emergency Flow Intelligence platform across all 10 solution areas', () => {
    expect(EMERGENCY_FLOW_INTELLIGENCE_PLATFORM.route).toBe('/workspace/emergency/flow');
    expect(EMERGENCY_FLOW_INTELLIGENCE_PLATFORM.patientFlow).toEqual([
      'Arrival',
      'Triage',
      'Assessment',
      'Orders',
      'Results',
      'Disposition',
      'Admission/Discharge',
    ]);
    expect(EMERGENCY_FLOW_INTELLIGENCE_PLATFORM.solutions.map((solution) => solution.title)).toEqual([
      'Pre-Hospital Intelligence',
      'EMS-to-ED Handoff',
      'Dynamic Triage',
      'Bed Flow Intelligence',
      'Referral Automation',
      'Discharge Acceleration',
      'Equipment Intelligence',
      'Surge Prediction',
      'ED Copilot',
      'ED Command Center',
    ]);
    expect(EMERGENCY_FLOW_INTELLIGENCE_PLATFORM.automationRegistry).toHaveLength(10);
    expect(EMERGENCY_FLOW_INTELLIGENCE_PLATFORM.dashboardModel.widgets).toHaveLength(10);
    expect(EMERGENCY_FLOW_INTELLIGENCE_PLATFORM.aiModel.agents).toHaveLength(10);
    expect(EMERGENCY_FLOW_INTELLIGENCE_PLATFORM.marketPains).toEqual(
      expect.arrayContaining(['Too many patients', 'Too much cognitive load'])
    );
    expect(EMERGENCY_FLOW_INTELLIGENCE_PLATFORM.valueDrivers.map((driver) => driver.title)).toEqual([
      'Throughput',
      'Capacity',
      'Coordination',
      'Cognitive Load',
    ]);
    expect(EMERGENCY_FLOW_INTELLIGENCE_PLATFORM.operatingPrinciples).toEqual(
      expect.arrayContaining([expect.stringMatching(/Do not build isolated/i)])
    );
    expect(EMERGENCY_FLOW_INTELLIGENCE_PLATFORM.firstCustomerReadiness.noIntegrationPosture).toMatch(
      /without ADT, EHR, EMS CAD/i
    );
    expect(EMERGENCY_FLOW_INTELLIGENCE_PLATFORM.integrationPosture).toMatch(/without hospital-wide deployment/i);
    expect(EMERGENCY_FLOW_INTELLIGENCE_PLATFORM.saasPackagingModel.productName).toBe(
      'Emergency Flow Intelligence Platform'
    );
    expect(EMERGENCY_FLOW_INTELLIGENCE_PLATFORM.saasPackagingModel.firstCustomerReadiness.sellableNow).toMatch(
      /Emergency Flow Starter/i
    );
    expect(EMERGENCY_FLOW_INTELLIGENCE_PLATFORM.saasPackagingModel.packages.at(-1).solutionIds).toHaveLength(10);
    expect(
      EMERGENCY_FLOW_INTELLIGENCE_PLATFORM.automationRegistry.every((automation) =>
        automation.flowStages.every((stage) => EMERGENCY_FLOW_INTELLIGENCE_PLATFORM.patientFlow.includes(stage))
      )
    ).toBe(true);
    expect(EMERGENCY_FLOW_INTELLIGENCE_PLATFORM.aiModel.safetyBoundary).toMatch(/never makes autonomous/i);
    expect(EMERGENCY_FLOW_INTELLIGENCE_PLATFORM.acceptance).toMatch(/rather than a collection of calculators/i);
  });
});
