import { apiFetch } from './apiClient';

export const PlatformAssetsApi = {
  async getContext() {
    const response = await apiFetch('/api/platform/context');
    if (!response.ok) {
      throw new Error(`Platform context failed (${response.status})`);
    }
    return response.json();
  },

  async listAssets(params = {}) {
    const search = new URLSearchParams();
    if (params.query) search.set('query', params.query);
    if (params.assetType) search.set('assetType', params.assetType);
    if (params.packId) search.set('packId', params.packId);
    if (params.lifecycle) search.set('lifecycle', params.lifecycle);
    const qs = search.toString();
    const response = await apiFetch(`/api/platform/assets${qs ? `?${qs}` : ''}`);
    if (!response.ok) throw new Error(`List assets failed (${response.status})`);
    return response.json();
  },

  async listRoleProfiles() {
    const response = await apiFetch('/api/platform/role-profiles');
    if (!response.ok) throw new Error(`List role profiles failed (${response.status})`);
    return response.json();
  },

  async listPacks(params = {}) {
    const search = new URLSearchParams();
    if (params.organizationType) search.set('organizationType', params.organizationType);
    if (params.publishedOnly === false) search.set('publishedOnly', 'false');
    const qs = search.toString();
    const response = await apiFetch(`/api/platform/packs${qs ? `?${qs}` : ''}`);
    if (!response.ok) throw new Error(`List packs failed (${response.status})`);
    return response.json();
  },

  async listMarketplacePacks(params = {}) {
    const search = new URLSearchParams();
    if (params.organizationId) search.set('organizationId', params.organizationId);
    if (params.organizationType) search.set('organizationType', params.organizationType);
    if (params.publishedOnly === false) search.set('publishedOnly', 'false');
    const qs = search.toString();
    const response = await apiFetch(`/api/platform/marketplace/packs${qs ? `?${qs}` : ''}`);
    if (!response.ok) throw new Error(`Marketplace packs failed (${response.status})`);
    return response.json();
  },

  async getMarketplacePack(packId, params = {}) {
    const search = new URLSearchParams();
    if (params.organizationId) search.set('organizationId', params.organizationId);
    const qs = search.toString();
    const response = await apiFetch(
      `/api/platform/marketplace/packs/${encodeURIComponent(packId)}${qs ? `?${qs}` : ''}`
    );
    if (!response.ok) throw new Error(`Marketplace pack failed (${response.status})`);
    return response.json();
  },

  async installPack(organizationId, packId) {
    const response = await apiFetch(
      `/api/platform/organizations/${organizationId}/packs/${packId}/install`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error(`Install pack failed (${response.status})`);
    return response.json();
  },

  async removePack(organizationId, packId) {
    const response = await apiFetch(
      `/api/platform/organizations/${organizationId}/packs/${packId}/remove`,
      { method: 'POST' }
    );
    if (!response.ok) throw new Error(`Remove pack failed (${response.status})`);
    return response.json();
  },

  async updateAssetLifecycle(assetId, lifecycle) {
    const response = await apiFetch(`/api/platform/assets/${assetId}/lifecycle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lifecycle }),
    });
    if (!response.ok) throw new Error(`Update lifecycle failed (${response.status})`);
    return response.json();
  },

  async getDigitalTwin(organizationId) {
    const qs = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
    const response = await apiFetch(`/api/platform/digital-twin${qs}`);
    if (!response.ok) throw new Error(`Digital twin failed (${response.status})`);
    return response.json();
  },

  async getOrganizationAnalytics(organizationId) {
    const response = await apiFetch(`/api/platform/organizations/${organizationId}/analytics`);
    if (!response.ok) throw new Error(`Organization analytics failed (${response.status})`);
    return response.json();
  },

  async listOrganizations() {
    const response = await apiFetch('/api/organizations');
    if (!response.ok) throw new Error(`List organizations failed (${response.status})`);
    return response.json();
  },

  async createOrganization(payload) {
    const response = await apiFetch('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Create organization failed (${response.status})`);
    return response.json();
  },

  async updateOrganization(organizationId, payload) {
    const response = await apiFetch(`/api/organizations/${organizationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Update organization failed (${response.status})`);
    return response.json();
  },

  async getMyAssets() {
    const response = await apiFetch('/api/platform/users/me/assets');
    if (!response.ok) throw new Error(`My assets failed (${response.status})`);
    return response.json();
  },

  async getMyRecommendations(limit = 12) {
    const response = await apiFetch(`/api/platform/users/me/recommendations?limit=${limit}`);
    if (!response.ok) throw new Error(`Recommendations failed (${response.status})`);
    return response.json();
  },

  async getCurrentOrganization() {
    const response = await apiFetch('/api/organizations/current');
    if (!response.ok) throw new Error(`Current organization failed (${response.status})`);
    return response.json();
  },

  async getCurrentOrganizationEngine() {
    const response = await apiFetch('/api/organizations/current/engine');
    if (!response.ok) throw new Error(`Organization engine failed (${response.status})`);
    return response.json();
  },

  async getOrganizationEngine(organizationId) {
    const response = await apiFetch(`/api/organizations/${organizationId}/engine`);
    if (!response.ok) throw new Error(`Organization engine failed (${response.status})`);
    return response.json();
  },

  async updateOrganizationSettings(organizationId, payload) {
    const response = await apiFetch(`/api/organizations/${organizationId}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Update organization settings failed (${response.status})`);
    return response.json();
  },

  async setRoleProfile(roleProfileId) {
    const response = await apiFetch('/api/platform/me/role-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleProfileId }),
    });
    if (!response.ok) throw new Error(`Set role profile failed (${response.status})`);
    return response.json();
  },
};
