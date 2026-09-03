import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAutomationAuditEntries, resetAutomationAuditTrail } from '../data/automationAuditTrail';
import { createAutomationAuditEvent } from './automationAuditApi';
import { recordAutomationBlocked, recordAutomationFailure } from './automationAuditLogger';

vi.mock('./automationAuditApi', () => ({
  createAutomationAuditEvent: vi.fn(),
}));

vi.mock('./tenantContextStore', () => ({
  getTenantContext: vi.fn(() => ({
    organizationId: 'tenant-audit',
    workspaceId: 'workspace-audit',
    userId: 'user-audit',
  })),
}));

describe('automationAuditLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAutomationAuditTrail([]);
  });

  it('falls back to local audit entries for blocked automation decisions', async () => {
    vi.mocked(createAutomationAuditEvent).mockResolvedValue({
      ok: false,
      message: 'API unavailable',
    } as any);

    await recordAutomationBlocked({
      triggerFired: 'Notification stream subscription requested',
      actionSelected: 'Subscribe to real-time notification stream',
      toolCalled: 'notifications',
      backendEndpoint: '/api/notifications/stream',
      reason: 'Real-time notification stream is not available on this server.',
    });

    const entries = getAutomationAuditEntries({ tenantId: 'tenant-audit' });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(
      expect.objectContaining({
        status: 'blocked',
        reason: 'Real-time notification stream is not available on this server.',
        user: { id: 'user-audit', name: 'Current user' },
      }),
    );
  });

  it('falls back to local audit entries for failed automation decisions', async () => {
    vi.mocked(createAutomationAuditEvent).mockRejectedValue(new Error('network down'));

    await recordAutomationFailure({
      triggerFired: 'Offline sync failed',
      actionSelected: 'Sync offline tool result',
      toolCalled: 'offline-sync',
      backendEndpoint: '/api/tools/results',
      error: new Error('Failed to sync tool result: 500'),
    });

    const entries = getAutomationAuditEntries({ tenantId: 'tenant-audit' });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(
      expect.objectContaining({
        status: 'failed',
        error: 'Failed to sync tool result: 500',
      }),
    );
  });
});
