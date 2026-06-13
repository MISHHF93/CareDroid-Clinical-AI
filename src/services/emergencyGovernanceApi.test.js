import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetchJson = vi.hoisted(() => vi.fn());

vi.mock('./apiClient', () => ({
  apiFetchJson: (...args) => apiFetchJson(...args),
  getApiErrorMessage: () => 'API error',
}));

const {
  fetchAIGovernanceRegistry,
  fetchAIGovernanceSafetyRules,
  fetchEmergencyGovernanceCompliance,
  fetchEmergencyGovernanceViolations,
  validateEmergencyGovernancePrompts,
} = await import('./emergencyGovernanceApi');

describe('emergencyGovernanceApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetchJson.mockResolvedValue({
      response: { ok: true },
      data: { status: 'ok' },
    });
  });

  it('uses the formal enterprise AI governance API routes', async () => {
    await fetchAIGovernanceRegistry();
    await fetchAIGovernanceSafetyRules();
    await fetchEmergencyGovernanceCompliance(14);
    await fetchEmergencyGovernanceViolations(5);
    await validateEmergencyGovernancePrompts();

    expect(apiFetchJson).toHaveBeenNthCalledWith(1, '/api/v1/governance/registry', expect.any(Object));
    expect(apiFetchJson).toHaveBeenNthCalledWith(2, '/api/v1/governance/safety-rules', expect.any(Object));
    expect(apiFetchJson).toHaveBeenNthCalledWith(
      3,
      '/api/v1/governance/compliance?days=14',
      expect.any(Object),
    );
    expect(apiFetchJson).toHaveBeenNthCalledWith(
      4,
      '/api/v1/governance/violations?limit=5',
      expect.any(Object),
    );
    expect(apiFetchJson).toHaveBeenNthCalledWith(
      5,
      '/api/v1/governance/validate-prompts',
      expect.any(Object),
    );
  });
});
