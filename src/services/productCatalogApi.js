import { apiFetch } from './apiClient';

export const ProductCatalogApi = {
  async getPackProductMap() {
    const response = await apiFetch('/api/products/pack-map');
    if (!response.ok) throw new Error(`Pack product map failed (${response.status})`);
    return response.json();
  },

  async listProductBuilder(organizationId) {
    const qs = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
    const response = await apiFetch(`/api/products/builder${qs}`);
    if (!response.ok) throw new Error(`Product builder failed (${response.status})`);
    return response.json();
  },

  async getProductBuilder(slug, organizationId) {
    const qs = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
    const response = await apiFetch(`/api/products/${encodeURIComponent(slug)}/builder${qs}`);
    if (!response.ok) throw new Error(`Product builder detail failed (${response.status})`);
    return response.json();
  },

  async listAssetPackBuilder(organizationId) {
    const qs = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
    const response = await apiFetch(`/api/asset-packs${qs}`);
    if (!response.ok) throw new Error(`Asset pack builder failed (${response.status})`);
    return response.json();
  },

  async listProducts() {
    const response = await apiFetch('/api/products');
    if (!response.ok) throw new Error(`List products failed (${response.status})`);
    return response.json();
  },

  async getProduct(slug) {
    const response = await apiFetch(`/api/products/${encodeURIComponent(slug)}`);
    if (!response.ok) throw new Error(`Get product failed (${response.status})`);
    return response.json();
  },

  async getProductAssets(slug, organizationId) {
    const qs = organizationId ? `?organizationId=${encodeURIComponent(organizationId)}` : '';
    const response = await apiFetch(`/api/products/${encodeURIComponent(slug)}/assets${qs}`);
    if (!response.ok) throw new Error(`Get product assets failed (${response.status})`);
    return response.json();
  },

  async listCommercialPlans() {
    const response = await apiFetch('/api/commercial-plans');
    if (!response.ok) throw new Error(`List plans failed (${response.status})`);
    return response.json();
  },

  async getCommercialPlan(id) {
    const response = await apiFetch(`/api/commercial-plans/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error(`Get plan failed (${response.status})`);
    return response.json();
  },

  async listSpecialties() {
    const response = await apiFetch('/api/specialties');
    if (!response.ok) throw new Error(`List specialties failed (${response.status})`);
    return response.json();
  },

  async getSpecialty(slug) {
    const response = await apiFetch(`/api/specialties/${encodeURIComponent(slug)}`);
    if (!response.ok) throw new Error(`Get specialty failed (${response.status})`);
    return response.json();
  },

  async listCarePathways() {
    const response = await apiFetch('/api/care-pathways');
    if (!response.ok) throw new Error(`List pathways failed (${response.status})`);
    return response.json();
  },

  async getCarePathway(slug) {
    const response = await apiFetch(`/api/care-pathways/${encodeURIComponent(slug)}`);
    if (!response.ok) throw new Error(`Get pathway failed (${response.status})`);
    return response.json();
  },

  async listAgents() {
    const response = await apiFetch('/api/agents');
    if (!response.ok) throw new Error(`List agents failed (${response.status})`);
    return response.json();
  },

  async listIntegrations(category) {
    const qs = category ? `?category=${encodeURIComponent(category)}` : '';
    const response = await apiFetch(`/api/integrations-marketplace${qs}`);
    if (!response.ok) throw new Error(`List integrations failed (${response.status})`);
    return response.json();
  },

  async getIntegrationReadiness() {
    const response = await apiFetch('/api/integration-readiness');
    if (!response.ok) throw new Error(`Integration readiness failed (${response.status})`);
    return response.json();
  },

  async getAssetDependencyGraph() {
    const response = await apiFetch('/api/dependency-graph');
    if (!response.ok) throw new Error(`Asset dependency graph failed (${response.status})`);
    return response.json();
  },

  async getMaturityQuestionnaire() {
    const response = await apiFetch('/api/maturity-assessments/questionnaire');
    if (!response.ok) throw new Error(`Maturity questionnaire failed (${response.status})`);
    return response.json();
  },

  async submitMaturityAssessment(answers, organizationId) {
    const response = await apiFetch('/api/maturity-assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, organizationId }),
    });
    if (!response.ok) throw new Error(`Maturity assessment failed (${response.status})`);
    return response.json();
  },

  async completeOnboarding(payload) {
    const response = await apiFetch('/api/organizations/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Onboarding failed (${response.status})`);
    return response.json();
  },

  async getOrganizationOutcomes(organizationId) {
    const response = await apiFetch(`/api/organizations/${organizationId}/outcomes`);
    if (!response.ok) throw new Error(`Outcomes failed (${response.status})`);
    return response.json();
  },

  async updateOrganizationConfiguration(organizationId, payload) {
    const response = await apiFetch(`/api/organizations/${organizationId}/configuration`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`Update configuration failed (${response.status})`);
    return response.json();
  },

  async requestIntegration(organizationId, integrationSlug) {
    const response = await apiFetch(
      `/api/organizations/${organizationId}/integrations/request`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationSlug }),
      }
    );
    if (!response.ok) throw new Error(`Request integration failed (${response.status})`);
    return response.json();
  },
};
