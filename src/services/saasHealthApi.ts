import { apiFetchJson, getApiErrorMessage } from './apiClient';

// Explicit labels rather than deriving from `id` (e.g. `${id[0].toUpperCase()}${id.slice(1)}`):
// a blind capitalize-first-letter transform reads correctly for ordinary words
// ("frontend" -> "Frontend Health") but produces "Api Health" / "Ai Health" for
// the 2 checks whose id is itself an acronym. A small, fixed, enumerable set is
// safer made correct by construction than by a smarter-but-still-fragile heuristic.
const SAAS_HEALTH_CHECK_LABELS = Object.freeze({
  frontend: 'Frontend Health',
  backend: 'Backend Health',
  api: 'API Health',
  integrations: 'Integrations Health',
  tenant: 'Tenant Health',
  ai: 'AI Health',
  simulation: 'Simulation Health',
});

export const SAAS_HEALTH_FALLBACK = Object.freeze({
  status: 'critical',
  label: 'Critical',
  generatedAt: null,
  summary: { healthy: 0, warning: 0, critical: 7, total: 7 },
  checks: [
    'frontend',
    'backend',
    'api',
    'integrations',
    'tenant',
    'ai',
    'simulation',
  ].map((id) => ({
    id,
    label: SAAS_HEALTH_CHECK_LABELS[id],
    status: 'critical',
    displayStatus: 'Critical',
    summary: 'SaaS health endpoint is unavailable.',
    evidence: ['source=fallback'],
  })),
  source: { status: 'fallback' },
});

export async function fetchSaasHealthCenter() {
  try {
    const { response, data } = await apiFetchJson('/api/saas-health', {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return {
        ok: false,
        data: SAAS_HEALTH_FALLBACK,
        message: getApiErrorMessage(null, response),
      };
    }

    return { ok: true, data, message: '' };
  } catch (error: any) {
    return {
      ok: false,
      data: SAAS_HEALTH_FALLBACK,
      message: getApiErrorMessage(error),
    };
  }
}
