import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, parseApiResponse } from './apiClient';
import { fetchIdentityProviderRegistry } from './enterpriseIdentityApi';

vi.mock('./apiClient', () => ({
  apiFetch: vi.fn(),
  getApiErrorMessage: vi.fn(() => 'Request failed'),
  parseApiResponse: vi.fn(),
}));

describe('enterpriseIdentityApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetch.mockResolvedValue({ ok: true });
    parseApiResponse.mockResolvedValue({ providers: [] });
  });

  it('fetches the identity provider registry', async () => {
    await fetchIdentityProviderRegistry();

    expect(apiFetch).toHaveBeenCalledWith('/api/auth/identity-providers');
  });
});
