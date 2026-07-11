import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformAssetsApi } from './platformAssetsApi';
import { apiFetch } from './apiClient';

vi.mock('./apiClient', () => ({
  apiFetch: vi.fn(),
}));

describe('PlatformAssetsApi marketplace helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiFetch).mockResolvedValue(new Response('[]', { status: 200 }));
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
    vi.mocked(apiFetch).mockResolvedValue(new Response('{}', { status: 200 }));

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
    vi.mocked(apiFetch).mockResolvedValue(new Response('{}', { status: 200 }));

    await PlatformAssetsApi.getDepartment('emergency', { organizationId: 'org-1' });

    expect(apiFetch).toHaveBeenCalledWith('/api/platform/departments/emergency?organizationId=org-1');
  });

  it('lists service lines with organization scope', async () => {
    await PlatformAssetsApi.listServiceLines({ organizationId: 'org-1' });

    expect(apiFetch).toHaveBeenCalledWith('/api/platform/service-lines?organizationId=org-1');
  });

  it('loads service line details with organization scope', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response('{}', { status: 200 }));

    await PlatformAssetsApi.getServiceLine('emergency-medicine', { organizationId: 'org-1' });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/platform/service-lines/emergency-medicine?organizationId=org-1'
    );
  });

  it('loads tenant administration by organization scope', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response('{}', { status: 200 }));

    await PlatformAssetsApi.getTenantAdministration('org-1');

    expect(apiFetch).toHaveBeenCalledWith('/api/organizations/org-1/tenant-admin');
  });

  it('loads customer success dashboard with a period', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response('{}', { status: 200 }));

    await PlatformAssetsApi.getCustomerSuccessDashboard('org-1', 'week');

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/platform/organizations/org-1/customer-success?period=week'
    );
  });

  it('lists assets by lifecycle state', async () => {
    await PlatformAssetsApi.listAssets({ assetType: 'workflow', lifecycle: 'beta' });

    expect(apiFetch).toHaveBeenCalledWith('/api/platform/assets?assetType=workflow&lifecycle=beta');
  });

  it('updates asset lifecycle state', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response('{}', { status: 200 }));

    await PlatformAssetsApi.updateAssetLifecycle('agent-clinical', 'archived');

    expect(apiFetch).toHaveBeenCalledWith('/api/platform/assets/agent-clinical/lifecycle', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lifecycle: 'archived' }),
    });
  });

  it('loads governance registry with filters', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response('{}', { status: 200 }));

    await PlatformAssetsApi.getGovernanceRegistry({
      query: 'qsofa',
      riskLevel: 'clinical-decision-support',
      assetType: 'calculator',
    });

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/platform/governance-registry?query=qsofa&riskLevel=clinical-decision-support&assetType=calculator'
    );
  });

  it('updates tenant administration by organization scope', async () => {
    vi.mocked(apiFetch).mockResolvedValue(new Response('{}', { status: 200 }));
    const payload = { departments: ['emergency'] };

    await PlatformAssetsApi.updateTenantAdministration('org-1', payload);

    expect(apiFetch).toHaveBeenCalledWith('/api/organizations/org-1/tenant-admin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });
});
