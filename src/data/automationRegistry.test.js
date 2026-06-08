import { describe, expect, it } from 'vitest';
import {
  AUTOMATION_REGISTRY,
  getAutomationById,
  getAutomationSolutionPackages,
  getWorkspaceAutomations,
  summarizeAutomationRegistry,
} from './automationRegistry';

describe('automationRegistry', () => {
  it('defines canonical automation metadata for every automation', () => {
    for (const automation of AUTOMATION_REGISTRY) {
      expect(automation).toEqual(
        expect.objectContaining({
          automationId: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
          workspace: expect.any(String),
          roles: expect.any(Array),
          department: expect.any(String),
          organizationTypes: expect.any(Array),
          trigger: expect.any(String),
          conditions: expect.any(Array),
          actions: expect.any(Array),
          aiInvolvement: expect.any(String),
          requiredAssets: expect.any(Array),
          requiredAI: expect.any(Array),
          requiredWorkflows: expect.any(Array),
          requiredIntegrations: expect.any(Array),
          riskLevel: expect.any(String),
          humanReviewRequired: expect.any(Boolean),
          subscriptionTier: expect.any(String),
          status: expect.any(String),
          workspaceVisibility: expect.any(Array),
        })
      );
    }
  });

  it('packages requested sellable healthcare solutions', () => {
    expect(getAutomationSolutionPackages().map((solution) => solution.title)).toEqual(
      expect.arrayContaining([
        'Emergency Department Solution',
        'Laboratory Intelligence Solution',
        'Medical IoT Solution',
        'Fleet Operations Solution',
        'Governance Solution',
        'Research Solution',
        'Education Solution',
      ])
    );
  });

  it('maps solution automations to the correct workspaces', () => {
    expect(getWorkspaceAutomations('emergency').map((automation) => automation.title)).toEqual(
      expect.arrayContaining([
        'Automated Triage Matrix',
        'Referral Routing',
        'Surge Staffing',
        'Simulation Academy',
        'Medical IoT Monitoring',
        'Documentation Integrity',
        'RAG Evidence Retrieval',
        'Virtual ED',
        'Discharge Summary Drafting',
        'Prior Authorization',
      ])
    );
    expect(getWorkspaceAutomations('laboratory').map((automation) => automation.title)).toContain('Critical Value Notification');
    expect(getWorkspaceAutomations('medical-iot').map((automation) => automation.title)).toContain('Telemetry Lost');
    expect(getWorkspaceAutomations('fleet').map((automation) => automation.title)).toContain('Dispatch Queue');
    expect(getWorkspaceAutomations('governance').map((automation) => automation.title)).toContain('AI Risk Escalation');
    expect(getAutomationById('emergency-automated-triage-matrix').outputs).toContain('risk profile');
    expect(getWorkspaceAutomations('emergency')).toHaveLength(10);
  });

  it('classifies every emergency automation for first-customer readiness', () => {
    for (const automation of getWorkspaceAutomations('emergency')) {
      expect(automation.readiness).toEqual(
        expect.objectContaining({
          classification: expect.stringMatching(/Ready to sell|Needs wiring|Needs integration|Future roadmap/),
          standaloneViability: expect.stringMatching(/yes|partial|no/),
          requiresEhrAccess: expect.any(Boolean),
          requiresIntegration: expect.any(Boolean),
          buyerPersonas: expect.arrayContaining([expect.any(String)]),
          firstCustomerNote: expect.any(String),
        })
      );
    }
  });

  it('packages the emergency department solution into product tiers', () => {
    const emergency = getAutomationSolutionPackages().find(
      (solution) => solution.solutionId === 'emergency-department-solution'
    );

    expect(emergency.patientJourney).toEqual([
      'patient',
      'arrival',
      'registration',
      'triage',
      'clinical-assessment',
      'orders',
      'results',
      'disposition',
      'discharge-admission',
    ]);
    expect(emergency.products.map((product) => product.title)).toEqual([
      'Emergency Core',
      'Emergency Professional',
      'Emergency Enterprise',
    ]);
    expect(emergency.coreMvpPackage.includedCapabilities.map((capability) => capability.label)).toEqual([
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
    expect(emergency.products.find((product) => product.title === 'Emergency Core')).toEqual(
      expect.objectContaining({
        mvpPackageId: 'emergency-core-mvp',
        automationIds: ['emergency-automated-triage-matrix'],
      })
    );
    expect(emergency.optionalAddOns.map((addOn) => addOn.title)).toEqual(
      expect.arrayContaining([
        'Documentation Integrity',
        'Discharge Summary Drafting',
        'Referral Routing',
        'Surge Staffing',
        'Simulation Academy',
        'Medical IoT Monitoring',
        'Virtual ED',
        'Prior Authorization',
      ])
    );
    expect(emergency.analyticsEvents).toEqual(
      expect.arrayContaining(['triage_volume', 'calculator_utilization', 'automation_execution'])
    );
  });

  it('summarizes automation catalog readiness', () => {
    const summary = summarizeAutomationRegistry();

    expect(summary.total).toBeGreaterThanOrEqual(25);
    expect(summary.workspaces).toEqual(
      expect.arrayContaining(['emergency', 'laboratory', 'medical-iot', 'fleet', 'governance'])
    );
    expect(summary.humanReviewRequired).toBeGreaterThan(0);
  });
});
