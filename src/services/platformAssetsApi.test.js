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

  it('lists departments with organization scope', async () => {
    await PlatformAssetsApi.listDepartments({ organizationId: 'org-1' });

    expect(apiFetch).toHaveBeenCalledWith('/api/platform/departments?organizationId=org-1');
  });

  it('loads department details with organization scope', async () => {
    apiFetch.mockResolvedValue(new Response('{}', { status: 200 }));

    await PlatformAssetsApi.getDepartment('emergency', { organizationId: 'org-1' });

    expect(apiFetch).toHaveBeenCalledWith('/api/platform/departments/emergency?organizationId=org-1');
  });

  it('lists service lines with organization scope', async () => {
    await PlatformAssetsApi.listServiceLines({ organizationId: 'org-1' });

    expect(apiFetch).toHaveBeenCalledWith('/api/platform/service-lines?organizationId=org-1');
  });

  it('loads service line details with organization scope', async () => {
    apiFetch.mockResolvedValue(new Response('{}', { status: 200 }));

    await PlatformAssetsApi.getServiceLine('emergency-medicine', { organizationId: 'org-1' });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/platform/service-lines/emergency-medicine?organizationId=org-1'
    );
  });
});
