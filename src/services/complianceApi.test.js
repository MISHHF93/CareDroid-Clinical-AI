import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./apiClient', () => ({
  apiFetch: vi.fn(),
  parseApiResponse: vi.fn(async (r) => r._json ?? {}),
  getApiErrorMessage: vi.fn(() => 'Network error'),
}));

import { apiFetch } from './apiClient';
import { recordConsentPreferences, updateConsentPreference } from './complianceApi';

describe('complianceApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts to /api/compliance/consent', async () => {
    apiFetch.mockResolvedValueOnce({ ok: true, status: 200, _json: { success: true } });

    const result = await updateConsentPreference('data_processing', true);

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/compliance/consent',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ consentType: 'data_processing', granted: true }),
      }),
    );
    expect(result.ok).toBe(true);
  });

  it('recordConsentPreferences batches supported types', async () => {
    apiFetch.mockResolvedValue({ ok: true, status: 200, _json: { success: true } });

    const result = await recordConsentPreferences({
      dataProcessing: true,
      marketing: false,
    });

    expect(result.ok).toBe(true);
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });
});
