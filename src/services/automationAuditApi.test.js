import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, parseApiResponse } from './apiClient';
import { createAutomationAuditEvent, fetchAutomationAuditEntries } from './automationAuditApi';

vi.mock('./apiClient', () => ({
  apiFetch: vi.fn(),
  getApiErrorMessage: vi.fn(() => 'API error'),
  parseApiResponse: vi.fn(),
}));

vi.mock('../config/backendApiCapabilities', () => ({
  isBackendCapabilityEnabled: vi.fn(() => true),
  UNSUPPORTED_CAPABILITY_MESSAGE: 'Capability disabled.',
}));

const backendEvent = {
  id: 'audit-backend-1',
  triggerFired: 'High NEWS2 threshold reached',
  conditionsEvaluated: [{ label: 'Patient is admitted', result: true }],
  actionSelected: 'Notify clinician escalation pool',
  userId: 'user-1',
  userName: 'Demo Clinician',
  tenantId: 'tenant-demo-hospital',
  tenantName: 'Demo Hospital',
  workspaceId: 'emergency',
  workspaceName: 'CareDroid',
  aiInvolved: true,
  aiSummary: 'AI reviewed deterioration context.',
  toolCalled: 'news2',
  backendEndpoint: '/api/clinical/alerts',
  status: 'success',
  timestamp: '2026-06-06T17:40:00.000Z',
  reviewerRequired: false,
  reviewerName: '',
  reason: '',
  error: '',
};

describe('automationAuditApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetch.mockResolvedValue({ ok: true, headers: new Headers() });
  });

  it('fetches and maps backend automation audit entries', async () => {
    parseApiResponse.mockResolvedValue({ data: [backendEvent] });

    const result = await fetchAutomationAuditEntries({ tenantId: 'tenant-demo-hospital' });

    expect(apiFetch).toHaveBeenCalledWith('/api/automation-audit?tenantId=tenant-demo-hospital', expect.any(Object));
    expect(result.ok).toBe(true);
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: 'audit-backend-1',
        tenant: { id: 'tenant-demo-hospital', name: 'Demo Hospital' },
        aiInvolvement: { involved: true, summary: 'AI reviewed deterioration context.' },
      })
    );
  });

  it('posts automation audit events using the backend payload contract', async () => {
    parseApiResponse.mockResolvedValue({ data: backendEvent });

    const result = await createAutomationAuditEvent({
      triggerFired: backendEvent.triggerFired,
      conditionsEvaluated: backendEvent.conditionsEvaluated,
      actionSelected: backendEvent.actionSelected,
      user: { id: backendEvent.userId, name: backendEvent.userName },
      tenant: { id: backendEvent.tenantId, name: backendEvent.tenantName },
      workspace: { id: backendEvent.workspaceId, name: backendEvent.workspaceName },
      aiInvolvement: { involved: backendEvent.aiInvolved, summary: backendEvent.aiSummary },
      toolCalled: backendEvent.toolCalled,
      backendEndpoint: backendEvent.backendEndpoint,
      status: backendEvent.status,
      timestamp: backendEvent.timestamp,
      reviewer: { required: backendEvent.reviewerRequired, name: backendEvent.reviewerName },
    });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/automation-audit',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"tenant":{"id":"tenant-demo-hospital","name":"Demo Hospital"}'),
      })
    );
    expect(result.ok).toBe(true);
    expect(result.data.id).toBe('audit-backend-1');
  });
});
