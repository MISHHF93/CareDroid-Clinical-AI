import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./apiClient', () => ({
  apiFetch: vi.fn(),
  parseApiResponse: vi.fn(async (response) => response._json ?? {}),
  getApiErrorMessage: vi.fn((err) => err?.message || 'API error'),
}));

vi.mock('../config/backendApiCapabilities', () => ({
  isBackendCapabilityEnabled: vi.fn(() => true),
}));

import { apiFetch } from './apiClient';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import { fetchBackendClinicalTools } from './clinicalToolsApi';

describe('clinicalToolsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isBackendCapabilityEnabled).mockReturnValue(true);
  });

  it('returns tools on success', async () => {
    apiFetch.mockResolvedValueOnce({
      ok: true,
      _json: { tools: [{ id: 'sofa-calculator' }], count: 1, tier: 'pro' },
    });

    const result = await fetchBackendClinicalTools();
    expect(result.ok).toBe(true);
    expect(result.tools).toHaveLength(1);
    expect(result.error).toBeUndefined();
    expect(apiFetch).toHaveBeenCalledWith('/api/tools', expect.any(Object));
  });

  it('returns empty tools and error message on HTTP failure', async () => {
    apiFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      _json: { message: 'Service unavailable' },
    });

    const result = await fetchBackendClinicalTools();
    expect(result.ok).toBe(false);
    expect(result.tools).toEqual([]);
    expect(result.error).toContain('Service unavailable');
  });

  it('returns network error without throwing (catalog can render static rows)', async () => {
    apiFetch.mockRejectedValueOnce(new Error('Failed to fetch'));

    const result = await fetchBackendClinicalTools();
    expect(result.ok).toBe(false);
    expect(result.tools).toEqual([]);
    expect(result.error).toBeTruthy();
  });

  it('skips fetch when capability disabled', async () => {
    vi.mocked(isBackendCapabilityEnabled).mockReturnValue(false);

    const result = await fetchBackendClinicalTools();
    expect(result.ok).toBe(false);
    expect(result.tools).toEqual([]);
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
