import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.hoisted(() => vi.fn());
const parseApiResponse = vi.hoisted(() => vi.fn());
const isBackendCapabilityEnabled = vi.hoisted(() => vi.fn());

vi.mock('./apiClient', () => ({
  apiFetch,
  getApiErrorMessage: () => 'Request failed',
  parseApiResponse,
}));

vi.mock('../config/backendApiCapabilities', () => ({
  isBackendCapabilityEnabled,
}));

import SmartIntakeApi from './smartIntakeApi';

describe('SmartIntakeApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isBackendCapabilityEnabled.mockReturnValue(false);
    parseApiResponse.mockResolvedValue({ sessionId: 'session-1' });
  });

  it('does not call optional CareDroid runtime when Smart Intake is disabled', async () => {
    await expect(SmartIntakeApi.createSession('RN')).rejects.toThrow(
      'Backend Smart Intake endpoint is not available yet.'
    );

    expect(isBackendCapabilityEnabled).toHaveBeenCalledWith('emergencySmartIntakeIdentitySession');
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('posts to the Smart Intake runtime when capability is enabled', async () => {
    isBackendCapabilityEnabled.mockReturnValue(true);
    apiFetch.mockResolvedValue({ ok: true });

    await expect(SmartIntakeApi.createSession('RN')).resolves.toEqual({ sessionId: 'session-1' });

    expect(apiFetch).toHaveBeenCalledWith('/api/emergency/intake/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff: 'RN' }),
    });
  });
});
