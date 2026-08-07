import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetchJson = vi.hoisted(() => vi.fn());

vi.mock('./apiClient', () => ({
  apiFetchJson: (...args) => apiFetchJson(...args),
  getApiErrorMessage: () => 'API error',
}));

const { fetchPlatformGovernanceSurface, evaluatePlatformGate } = await import('./platformGovernanceApi');

describe('platformGovernanceApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetchJson.mockResolvedValue({
      response: { ok: true },
      data: { status: 'synthetic_ready' },
    });
  });

  it('uses the planned public API contracts for governance surfaces', async () => {
    await fetchPlatformGovernanceSurface('governance', '/ai-governance');
    await fetchPlatformGovernanceSurface('ai-security', '/security');
    await fetchPlatformGovernanceSurface('interoperability', '/integrations');
    await fetchPlatformGovernanceSurface('regulatory', '/regulatory');
    await fetchPlatformGovernanceSurface('equity', '/equity');
    await fetchPlatformGovernanceSurface('review', '/human-review');
    await fetchPlatformGovernanceSurface('privacy', '/privacy');
    await fetchPlatformGovernanceSurface('observability', '/system-health');
    await fetchPlatformGovernanceSurface('governance', '/governance/clinical/policies');
    await fetchPlatformGovernanceSurface('review', '/patients/patient-1/review');
    await fetchPlatformGovernanceSurface('privacy', '/privacy/requests');
    await fetchPlatformGovernanceSurface('audit', '/audit/ai');
    await fetchPlatformGovernanceSurface('observability', '/operations/service-health');

    expect(apiFetchJson).toHaveBeenNthCalledWith(
      1,
      '/api/ai-governance/summary',
      expect.any(Object),
    );
    expect(apiFetchJson).toHaveBeenNthCalledWith(2, '/api/security/summary', expect.any(Object));
    expect(apiFetchJson).toHaveBeenNthCalledWith(3, '/api/interoperability/summary', expect.any(Object));
    expect(apiFetchJson).toHaveBeenNthCalledWith(4, '/api/regulatory/summary', expect.any(Object));
    expect(apiFetchJson).toHaveBeenNthCalledWith(5, '/api/equity/summary', expect.any(Object));
    expect(apiFetchJson).toHaveBeenNthCalledWith(6, '/api/human-review/items', expect.any(Object));
    expect(apiFetchJson).toHaveBeenNthCalledWith(7, '/api/privacy/summary', expect.any(Object));
    expect(apiFetchJson).toHaveBeenNthCalledWith(8, '/api/system-health', expect.any(Object));
    expect(apiFetchJson).toHaveBeenNthCalledWith(
      9,
      '/api/governance/clinical/policies',
      expect.any(Object),
    );
    expect(apiFetchJson).toHaveBeenNthCalledWith(
      10,
      '/api/patients/patient-1/review-items',
      expect.any(Object),
    );
    expect(apiFetchJson).toHaveBeenNthCalledWith(11, '/api/privacy/requests', expect.any(Object));
    expect(apiFetchJson).toHaveBeenNthCalledWith(12, '/api/audit/runs/demo-run', expect.any(Object));
    expect(apiFetchJson).toHaveBeenNthCalledWith(13, '/api/operations/service-health', expect.any(Object));
  });

  it('classifies the interoperability surface as demo, not live, when the backend returns synthetic_ready', async () => {
    apiFetchJson.mockResolvedValue({
      response: { ok: true },
      data: { status: 'synthetic_ready' },
    });

    const result = await fetchPlatformGovernanceSurface('interoperability', '/integrations');

    expect(result.sourceStatus).toBe('demo');
  });

  it('still classifies a real demo status as demo, and a genuinely live status as live', async () => {
    apiFetchJson.mockResolvedValue({ response: { ok: true }, data: { status: 'demo_ready' } });
    expect((await fetchPlatformGovernanceSurface('governance', '/ai-governance')).sourceStatus).toBe(
      'demo',
    );

    apiFetchJson.mockResolvedValue({ response: { ok: true }, data: { status: 'ready' } });
    expect((await fetchPlatformGovernanceSurface('governance', '/ai-governance')).sourceStatus).toBe(
      'live',
    );
  });

  it('evaluates platform gates through the enterprise LLM security contract', async () => {
    await evaluatePlatformGate({ capabilityId: 'clinical-chat', prompt: 'hello' });

    expect(apiFetchJson).toHaveBeenCalledWith(
      '/api/security/evaluate',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
