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
    vi.mocked(apiFetch).mockResolvedValue({ ok: true } as any);
    vi.mocked(parseApiResponse).mockResolvedValue({ providers: [] });
  });

  it('fetches the identity provider registry', async () => {
    await fetchIdentityProviderRegistry();

    expect(apiFetch).toHaveBeenCalledWith('/api/auth/identity-providers');
  });
});
