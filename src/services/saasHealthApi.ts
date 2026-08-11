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

const SAAS_HEALTH_CHECK_IDS = Object.freeze([
  'frontend',
  'backend',
  'api',
  'integrations',
  'tenant',
  'ai',
  'simulation',
]);

export const SAAS_HEALTH_FALLBACK = Object.freeze({
  status: 'critical',
  label: 'Critical',
  generatedAt: null,
  summary: { healthy: 0, warning: 0, critical: 7, total: 7 },
  checks: SAAS_HEALTH_CHECK_IDS.map((id) => ({
    id,
    label: SAAS_HEALTH_CHECK_LABELS[id],
    status: 'critical',
    displayStatus: 'Critical',
    summary: 'SaaS health endpoint is unavailable.',
    evidence: ['source=fallback'],
  })),
  source: { status: 'fallback' },
});

// A 403 here means the request never reached a real health check -- the
// current role lacks VIEW_OPERATIONS/VIEW_OBSERVABILITY (see MB-K9). That is
// a genuinely different situation from SAAS_HEALTH_FALLBACK's "the endpoint
// itself is unreachable/erroring": showing 7 red "Critical" badges implies an
// active outage, when the true state is "not authorized to check." `status`
// deliberately uses a value healthCheckStatusToWidgetTone() doesn't
// recognize, which falls through to a neutral tone rather than critical/red.
export const SAAS_HEALTH_ACCESS_RESTRICTED = Object.freeze({
  status: 'restricted',
  label: 'Access restricted',
  generatedAt: null,
  summary: { healthy: 0, warning: 0, critical: 0, total: 7 },
  checks: SAAS_HEALTH_CHECK_IDS.map((id) => ({
    id,
    label: SAAS_HEALTH_CHECK_LABELS[id],
    status: 'restricted',
    displayStatus: 'Access restricted',
    summary: 'Your role does not have permission to view platform health.',
    evidence: ['source=access-restricted'],
  })),
  source: { status: 'access-restricted' },
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
        data: response.status === 403 ? SAAS_HEALTH_ACCESS_RESTRICTED : SAAS_HEALTH_FALLBACK,
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
