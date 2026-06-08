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
          requiredWorkflows: expect.any(Array),
          requiredIntegrations: expect.any(Array),
          riskLevel: expect.any(String),
          humanReviewRequired: expect.any(Boolean),
          subscriptionTier: expect.any(String),
          status: expect.any(String),
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
        'Sepsis Detection Workflow',
        'Stroke Escalation Workflow',
        'Chest Pain Workflow',
        'High NEWS2 Alert',
        'Critical Deterioration Alert',
      ])
    );
    expect(getWorkspaceAutomations('laboratory').map((automation) => automation.title)).toContain('Critical Value Notification');
    expect(getWorkspaceAutomations('medical-iot').map((automation) => automation.title)).toContain('Telemetry Lost');
    expect(getWorkspaceAutomations('fleet').map((automation) => automation.title)).toContain('Dispatch Queue');
    expect(getWorkspaceAutomations('governance').map((automation) => automation.title)).toContain('AI Risk Escalation');
    expect(getAutomationById('emergency-sepsis-detection-workflow').outputs).toContain('AI guidance');
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
