import { apiFetchJson, getApiErrorMessage } from './apiClient';

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
    label: `${id.charAt(0).toUpperCase()}${id.slice(1)} Health`,
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
