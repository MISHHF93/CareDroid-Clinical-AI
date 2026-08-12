import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetch = vi.hoisted(() => vi.fn());
const parseApiResponse = vi.hoisted(() => vi.fn());
const isBackendCapabilityEnabled = vi.hoisted(() => vi.fn());

vi.mock('./apiClient', () => ({
  apiFetch,
  ApiResponseError: class ApiResponseError extends Error {
    constructor(message) {
      super(message);
      this.name = 'ApiResponseError';
    }
  },
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

  it('soft-fails to a local demo session when Smart Intake is disabled, without calling the runtime', async () => {
    const result = await SmartIntakeApi.createSession('RN');

    expect(result).toMatchObject({ ok: true, localDemo: true });
    expect(isBackendCapabilityEnabled).toHaveBeenCalledWith('emergencySmartIntakeIdentitySession');
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('posts to the Smart Intake runtime when capability is enabled', async () => {
    isBackendCapabilityEnabled.mockReturnValue(true);
    apiFetch.mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ sessionId: 'session-1' }),
    });

    await expect(SmartIntakeApi.createSession('RN')).resolves.toEqual({ sessionId: 'session-1' });

    expect(apiFetch).toHaveBeenCalledWith('/api/emergency/intake/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff: 'RN' }),
    });
  });

  it('returns clinician-safe errors when the transport layer throws internal runtime errors', async () => {
    isBackendCapabilityEnabled.mockReturnValue(true);
    apiFetch.mockResolvedValue(undefined);

    await expect(SmartIntakeApi.createSession('RN')).rejects.toThrow(
      'The API did not return a valid response. Check backend availability or the request mock.',
    );
  });

  // Regression: the backend's real failure mode when Mongo isn't configured
  // (the documented default, ENABLE_MONGOOSE_EMERGENCY_OS unset) is a 503 from
  // assertMongoReady() -- this used to fall outside the 401/404/501 fallback
  // list, so any role that reached SmartIntake got a hard thrown Error instead
  // of the local-demo degradation the code otherwise appears designed to provide.
  it('falls back to a local demo session on a 503 (Mongo not configured), instead of throwing', async () => {
    isBackendCapabilityEnabled.mockReturnValue(true);
    apiFetch.mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => JSON.stringify({ message: 'Smart Intake requires MongoDB' }),
    });

    const result = await SmartIntakeApi.createSession('RN');

    expect(result).toMatchObject({ ok: true, localDemo: true });
  });

  it('falls back to a local demo session on a 503 for a GET (verifyField/audit-style) request too', async () => {
    isBackendCapabilityEnabled.mockReturnValue(true);
    apiFetch.mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => JSON.stringify({ message: 'Smart Intake requires MongoDB' }),
    });

    const result = await SmartIntakeApi.fetchAuditLog('session-1');

    expect(result).toMatchObject({ ok: true, localDemo: true, degraded: true });
  });
});
