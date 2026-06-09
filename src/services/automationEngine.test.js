import { beforeEach, describe, expect, it } from 'vitest';
import {
  getAutomationAuditEntries,
  resetAutomationAuditTrail,
} from '../data/automationAuditTrail';
import AutomationEngine from './automationEngine';

describe('AutomationEngine', () => {
  beforeEach(() => {
    resetAutomationAuditTrail([]);
  });

  it('runs an active automation and logs an audit event', () => {
    const result = AutomationEngine.runAutomation('emergency-automated-triage-matrix', {
      workspaceId: 'emergency',
      subscriptionTier: 'professional',
      humanReviewAvailable: true,
      integrationsEnabled: true,
    });

    expect(result.ok).toBe(true);
    expect(result.outputs).toEqual(expect.arrayContaining(['risk profile', 'calculator recommendations']));
    expect(result.patientJourneyStates).toEqual(
      expect.arrayContaining(['arrival', 'registration', 'triage', 'waiting', 'assessment'])
    );
    expect(result.auditEntry).toEqual(
      expect.objectContaining({
        workspace: expect.objectContaining({ id: 'emergency' }),
        status: 'success',
        toolCalled: 'qsofa',
        patientJourneyStates: expect.arrayContaining(['triage', 'assessment']),
      })
    );
    expect(getAutomationAuditEntries()).toHaveLength(1);
  });

  it('blocks high-risk automation when human review is unavailable', () => {
    const result = AutomationEngine.runAutomation('governance-ai-risk-escalation', {
      workspaceId: 'governance',
      subscriptionTier: 'professional',
      humanReviewAvailable: false,
      integrationsEnabled: true,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe('blocked');
    expect(result.reason).toMatch(/human review/i);
    expect(result.auditEntry.status).toBe('blocked');
  });

  it('summarizes workspace automation state for hubs', () => {
    const state = AutomationEngine.getWorkspaceAutomationState('medical-iot');

    expect(state.activeAutomations.map((automation) => automation.title)).toEqual(
      expect.arrayContaining(['Device Offline', 'Battery Low', 'Telemetry Lost', 'Maintenance Due'])
    );
    expect(state.demoAutomations.map((automation) => automation.title)).toContain('Calibration Due');
    expect(state.settings.highRisk).toBeGreaterThan(0);
  });
});
