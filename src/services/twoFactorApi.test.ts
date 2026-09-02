import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetchJson = vi.fn();
const isBackendCapabilityEnabled = vi.fn();

vi.mock('./apiClient', () => ({
  apiFetchJson: (...args: unknown[]) => apiFetchJson(...args),
  getApiErrorMessage: (error: any, response: any) =>
    error?.message || `HTTP ${response?.status ?? 'error'}`,
}));

vi.mock('../config/backendApiCapabilities', () => ({
  isBackendCapabilityEnabled: (...args: unknown[]) => isBackendCapabilityEnabled(...args),
}));

const {
  disableTwoFactor,
  enableTwoFactor,
  fetchTwoFactorStatus,
  generateTwoFactorSecret,
} = await import('./twoFactorApi');

const ok = (data: unknown) => ({ response: { ok: true, status: 200 }, data });

describe('twoFactorApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isBackendCapabilityEnabled.mockReturnValue(true);
  });

  it('reads status from the live TwoFactorController route', async () => {
    apiFetchJson.mockResolvedValue(
      ok({ enabled: true, backupCodesRemaining: 7, lastUsedAt: '2026-09-01T10:00:00.000Z' }),
    );

    const result = await fetchTwoFactorStatus();

    expect(apiFetchJson.mock.calls[0][0]).toBe('/api/two-factor/status');
    expect(result.ok).toBe(true);
    expect(result.data?.backupCodesRemaining).toBe(7);
  });

  it('sends the secret alongside the code when enabling, and returns the one-time backup codes', async () => {
    // The backend verifies against the secret the client was handed rather than
    // re-reading a stored one, so dropping it from the body silently fails to
    // enable while still returning 200-shaped errors.
    apiFetchJson.mockResolvedValue(ok({ backupCodes: ['AAAA1111', 'BBBB2222'] }));

    const result = await enableTwoFactor('BASE32SECRET', '123456');

    const [path, options] = apiFetchJson.mock.calls[0];
    expect(path).toBe('/api/two-factor/enable');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ secret: 'BASE32SECRET', token: '123456' });
    expect(result.data?.backupCodes).toHaveLength(2);
  });

  it('disables over DELETE, which is the verb the controller exposes', async () => {
    apiFetchJson.mockResolvedValue(ok({ success: true }));

    await disableTwoFactor('654321');

    const [path, options] = apiFetchJson.mock.calls[0];
    expect(path).toBe('/api/two-factor/disable');
    expect(options.method).toBe('DELETE');
  });

  it('surfaces the backend message on a rejected code instead of a generic failure', async () => {
    // A wrong TOTP is the common case here, and the user needs to know the code
    // was wrong rather than that "something went wrong".
    apiFetchJson.mockResolvedValue({
      response: { ok: false, status: 401 },
      data: { message: 'Invalid verification code' },
    });

    const result = await enableTwoFactor('BASE32SECRET', '000000');

    expect(result.ok).toBe(false);
    expect(result.message).toBe('Invalid verification code');
  });

  it('does not call the network when the capability is off', async () => {
    isBackendCapabilityEnabled.mockReturnValue(false);

    const result = await generateTwoFactorSecret();

    expect(apiFetchJson).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/not available/i);
  });

  it('reports a thrown transport error rather than rejecting', async () => {
    apiFetchJson.mockRejectedValue(new Error('Network down'));

    const result = await fetchTwoFactorStatus();

    expect(result.ok).toBe(false);
    expect(result.message).toBe('Network down');
  });
});
