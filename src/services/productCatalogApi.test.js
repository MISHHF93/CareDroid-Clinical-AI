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

  it('lists care pathways', async () => {
    await ProductCatalogApi.listCarePathways();
    expect(apiFetch).toHaveBeenCalledWith('/api/care-pathways');
  });

  it('loads integration readiness', async () => {
    await ProductCatalogApi.getIntegrationReadiness();
    expect(apiFetch).toHaveBeenCalledWith('/api/integration-readiness');
  });

  it('loads asset dependency graph', async () => {
    await ProductCatalogApi.getAssetDependencyGraph();
    expect(apiFetch).toHaveBeenCalledWith('/api/dependency-graph');
  });

  it('gets care pathway detail by slug', async () => {
    apiFetch.mockResolvedValue(new Response('{}', { status: 200 }));
    await ProductCatalogApi.getCarePathway('sepsis');
    expect(apiFetch).toHaveBeenCalledWith('/api/care-pathways/sepsis');
  });

  it('lists specialties for onboarding selection', async () => {
    await ProductCatalogApi.listSpecialties();
    expect(apiFetch).toHaveBeenCalledWith('/api/specialties');
  });

  it('posts onboarding payload to configure tenant profile', async () => {
    apiFetch.mockResolvedValue(new Response('{}', { status: 200 }));
    const payload = {
      name: 'North EMS',
      slug: 'north-ems',
      organizationType: 'ems',
      specialties: ['emergency', 'operations'],
    };

    await ProductCatalogApi.completeOnboarding(payload);

    expect(apiFetch).toHaveBeenCalledWith('/api/organizations/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });
});
