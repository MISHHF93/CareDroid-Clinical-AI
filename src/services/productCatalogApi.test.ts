import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductCatalogApi } from './productCatalogApi';
import { apiFetch } from './apiClient';

vi.mock('./apiClient', () => ({
  apiFetch: vi.fn(),
}));

describe('ProductCatalogApi builder helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiFetch).mockResolvedValue(new Response('[]', { status: 200 }));
  });

  it('lists product builder graphs with organization scope', async () => {
    await ProductCatalogApi.listProductBuilder('org-1');
    expect(apiFetch).toHaveBeenCalledWith('/api/products/builder?organizationId=org-1');
  });

  it('gets product builder detail by slug', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response('{}', { status: 200 }));
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

  it('loads asset dependency graph with organization scope', async () => {
    // getAssetDependencyGraph's untyped default param infers as `undefined`-only;
    // cast is required to exercise the organization-scoped call path.
    await ProductCatalogApi.getAssetDependencyGraph('org-1' as unknown as undefined);
    expect(apiFetch).toHaveBeenCalledWith('/api/dependency-graph?organizationId=org-1');
  });

  it('posts hospital solution recommendation input', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response('{}', { status: 200 }));
    const payload = { organizationId: 'org-1', hospitalType: 'hospital' };

    await ProductCatalogApi.getHospitalSolutionRecommendation(payload);

    expect(apiFetch).toHaveBeenCalledWith('/api/solution-builder/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });

  it('posts hospital solution apply payload', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response('{}', { status: 200 }));
    const payload = { organizationId: 'org-1', commercialPlanId: 'enterprise' };

    await ProductCatalogApi.applyHospitalSolution(payload);

    expect(apiFetch).toHaveBeenCalledWith('/api/solution-builder/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });

  it('gets care pathway detail by slug', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response('{}', { status: 200 }));
    await ProductCatalogApi.getCarePathway('sepsis');
    expect(apiFetch).toHaveBeenCalledWith('/api/care-pathways/sepsis');
  });

  it('loads organization value tracking by period', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response('{}', { status: 200 }));

    await ProductCatalogApi.getOrganizationValueTracking('org-1', 'week');

    expect(apiFetch).toHaveBeenCalledWith('/api/organizations/org-1/value-tracking?period=week');
  });

  it('lists specialties for onboarding selection', async () => {
    await ProductCatalogApi.listSpecialties();
    expect(apiFetch).toHaveBeenCalledWith('/api/specialties');
  });

  it('posts onboarding payload to configure tenant profile', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response('{}', { status: 200 }));
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
