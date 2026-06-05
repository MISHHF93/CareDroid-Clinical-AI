import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformAssetsApi } from './platformAssetsApi';
import { apiFetch } from './apiClient';

vi.mock('./apiClient', () => ({
  apiFetch: vi.fn(),
}));

describe('PlatformAssetsApi marketplace helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetch.mockResolvedValue(new Response('[]', { status: 200 }));
  });

  it('lists marketplace packs with organization scope', async () => {
    await PlatformAssetsApi.listMarketplacePacks({
      organizationId: 'org-1',
      organizationType: 'hospital',
    });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/platform/marketplace/packs?organizationId=org-1&organizationType=hospital'
    );
  });

  it('loads marketplace pack details', async () => {
    apiFetch.mockResolvedValue(new Response('{}', { status: 200 }));

    await PlatformAssetsApi.getMarketplacePack('icu-pack', { organizationId: 'org-1' });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/platform/marketplace/packs/icu-pack?organizationId=org-1'
    );
  });
});
