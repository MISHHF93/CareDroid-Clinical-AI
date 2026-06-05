import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductCatalogApi } from './productCatalogApi';
import { apiFetch } from './apiClient';

vi.mock('./apiClient', () => ({
  apiFetch: vi.fn(),
}));

describe('ProductCatalogApi builder helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetch.mockResolvedValue(new Response('[]', { status: 200 }));
  });

  it('lists product builder graphs with organization scope', async () => {
    await ProductCatalogApi.listProductBuilder('org-1');
    expect(apiFetch).toHaveBeenCalledWith('/api/products/builder?organizationId=org-1');
  });

  it('gets product builder detail by slug', async () => {
    apiFetch.mockResolvedValue(new Response('{}', { status: 200 }));
    await ProductCatalogApi.getProductBuilder('icu-suite', 'org-1');
    expect(apiFetch).toHaveBeenCalledWith('/api/products/icu-suite/builder?organizationId=org-1');
  });

  it('lists asset pack builder graphs', async () => {
    await ProductCatalogApi.listAssetPackBuilder('org-1');
    expect(apiFetch).toHaveBeenCalledWith('/api/asset-packs?organizationId=org-1');
  });
});
