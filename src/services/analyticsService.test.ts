import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from './analyticsService';
import { apiFetch } from './apiClient';
import { clearTenantContext, setTenantContext } from './tenantContextStore';

vi.mock('./apiClient', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('../utils/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('AnalyticsService privacy safety', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
    clearTenantContext();
    delete (window as any).analytics;
    vi.mocked(apiFetch).mockResolvedValue({ ok: true } as Response);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    clearTenantContext();
  });

  it('queues analytics events with hashed user ids and stripped PII parameters', async () => {
    const service = new AnalyticsService();

    service.setUser({
      userId: 'user-123',
      email: 'clinician@example.com',
      role: 'physician',
    });
    service.trackEvent({
      eventName: 'tool_usage',
      userId: 'user-123',
      parameters: {
        toolId: 'qsofa',
        patientId: 'patient-1',
        email: 'clinician@example.com',
        queryText: 'raw clinical search',
        count: 1,
      },
    });

    await service.flush();

    const requestOptions = vi.mocked(apiFetch).mock.calls[0][1] as { body?: BodyInit };
    const body = JSON.parse(String(requestOptions?.body));
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).toMatchObject({
      eventName: 'tool_usage',
      userIdHash: expect.stringMatching(/^anon-/),
      parameters: {
        toolId: 'qsofa',
        count: 1,
      },
    });
    expect(JSON.stringify(body)).not.toContain('user-123');
    expect(JSON.stringify(body)).not.toContain('clinician@example.com');
    expect(JSON.stringify(body)).not.toContain('patient-1');
    expect(JSON.stringify(body)).not.toContain('raw clinical search');
  });

  it('identifies Segment users with hashed ids and no email trait', () => {
    const identify = vi.fn();
    (window as any).analytics = { identify, track: vi.fn(), page: vi.fn() };
    const service = new AnalyticsService();

    service.setUser({
      userId: 'user-123',
      email: 'clinician@example.com',
      role: 'physician',
    });

    expect(identify).toHaveBeenCalledWith(expect.stringMatching(/^anon-/), {
      role: 'physician',
    });
    expect(JSON.stringify(identify.mock.calls)).not.toContain('user-123');
    expect(JSON.stringify(identify.mock.calls)).not.toContain('clinician@example.com');
  });

  it('adds sanitized tenant dimensions to analytics events', async () => {
    setTenantContext({
      organizationId: 'org-1',
      workspaceId: 'workspace-1',
      userId: 'user-123',
      role: 'physician',
      subscriptionPlan: 'institutional',
      source: 'resolved',
    });
    const service = new AnalyticsService();

    service.trackEvent({
      eventName: 'dashboard_loaded',
      parameters: { page: 'dashboard' },
    });
    await service.flush();

    const requestOptions = vi.mocked(apiFetch).mock.calls[0][1] as { body?: BodyInit };
    const body = JSON.parse(String(requestOptions?.body));
    expect(body.events[0]).toMatchObject({
      organizationId: 'org-1',
      workspaceId: 'workspace-1',
      role: 'physician',
      subscriptionPlan: 'institutional',
      parameters: expect.objectContaining({
        organizationId: 'org-1',
        workspaceId: 'workspace-1',
        tenantSource: 'resolved',
      }),
    });
    expect(JSON.stringify(body)).not.toContain('user-123');
  });
});
