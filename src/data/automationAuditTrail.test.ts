import { beforeEach, describe, expect, it } from 'vitest';
import {
  AUTOMATION_AUDIT_STATUSES,
  getAutomationAuditEntries,
  logAutomationAuditEvent,
  resetAutomationAuditTrail,
} from './automationAuditTrail';

const baseEvent = {
  triggerFired: 'Manual automation audit test trigger',
  conditionsEvaluated: [{ label: 'Tenant scope present', result: true }],
  actionSelected: 'Record audit event',
  user: { id: 'user-audit-tester', name: 'Audit Tester' },
  tenant: { id: 'tenant-audit', name: 'Audit Tenant' },
  workspace: { id: 'governance', name: 'Governance Workspace' },
  aiInvolvement: { involved: true, summary: 'AI selected an audit summary.' },
  toolCalled: 'automation-audit',
  backendEndpoint: '/automation-audit',
  timestamp: '2026-06-06T18:20:00.000Z',
  reviewer: { required: false, name: '' },
};

describe('automationAuditTrail', () => {
  beforeEach(() => {
    resetAutomationAuditTrail([]);
  });

  it('logs automation events with required audit fields', () => {
    const entry = logAutomationAuditEvent({
      ...baseEvent,
      status: AUTOMATION_AUDIT_STATUSES.SUCCESS,
    });

    expect(entry).toMatchObject({
      triggerFired: baseEvent.triggerFired,
      actionSelected: baseEvent.actionSelected,
      status: AUTOMATION_AUDIT_STATUSES.SUCCESS,
      toolCalled: 'automation-audit',
      backendEndpoint: '/automation-audit',
      tenant: { id: 'tenant-audit' },
      user: { id: 'user-audit-tester' },
      workspace: { id: 'governance' },
    });
    expect(entry.conditionsEvaluated).toEqual([{ label: 'Tenant scope present', result: true }]);
    expect(entry.aiInvolvement.involved).toBe(true);
    expect(getAutomationAuditEntries()).toHaveLength(1);
  });

  it('logs blocked automation events with a reason and reviewer state', () => {
    const entry = logAutomationAuditEvent({
      ...baseEvent,
      status: AUTOMATION_AUDIT_STATUSES.BLOCKED,
      reason: 'Feature flag disabled for this tenant.',
      reviewer: { required: true, name: 'Governance reviewer' },
    });

    expect(entry.status).toBe(AUTOMATION_AUDIT_STATUSES.BLOCKED);
    expect(entry.reason).toBe('Feature flag disabled for this tenant.');
    expect(entry.reviewer).toEqual({ required: true, name: 'Governance reviewer' });
  });

  it('requires blocked automation events to include a reason', () => {
    expect(() =>
      logAutomationAuditEvent({
        ...baseEvent,
        status: AUTOMATION_AUDIT_STATUSES.BLOCKED,
      })
    ).toThrow(/blocked automation audit entries require a reason/i);
  });

  it('logs failed automation events with an error', () => {
    const entry = logAutomationAuditEvent({
      ...baseEvent,
      status: AUTOMATION_AUDIT_STATUSES.FAILED,
      error: 'Backend endpoint returned 500.',
    });

    expect(entry.status).toBe(AUTOMATION_AUDIT_STATUSES.FAILED);
    expect(entry.error).toBe('Backend endpoint returned 500.');
  });

  it('requires failed automation events to include an error', () => {
    expect(() =>
      logAutomationAuditEvent({
        ...baseEvent,
        status: AUTOMATION_AUDIT_STATUSES.FAILED,
      })
    ).toThrow(/failed automation audit entries require an error/i);
  });

  it('filters audit entries by tenant scope', () => {
    logAutomationAuditEvent({
      ...baseEvent,
      id: 'tenant-a-event',
      tenant: { id: 'tenant-audit-a', name: 'Tenant A' },
      status: AUTOMATION_AUDIT_STATUSES.SUCCESS,
    });
    logAutomationAuditEvent({
      ...baseEvent,
      id: 'tenant-b-event',
      tenant: { id: 'tenant-audit-b', name: 'Tenant B' },
      status: AUTOMATION_AUDIT_STATUSES.SUCCESS,
    });

    expect(getAutomationAuditEntries({ tenantId: 'tenant-audit-a' })).toHaveLength(1);
    expect(getAutomationAuditEntries({ tenantId: 'tenant-audit-a' })[0].tenant.id).toBe('tenant-audit-a');
    expect(getAutomationAuditEntries({ tenantId: 'tenant-audit-b' })[0].tenant.id).toBe('tenant-audit-b');
  });
});
