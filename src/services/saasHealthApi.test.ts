import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SAAS_HEALTH_FALLBACK, SAAS_HEALTH_ACCESS_RESTRICTED, fetchSaasHealthCenter } from './saasHealthApi';

vi.mock('./apiClient', () => ({
  apiFetchJson: vi.fn(),
  getApiErrorMessage: vi.fn(() => 'error'),
}));

/**
 * Regression coverage for a real bug found by rendering /saas-health
 * (roadmap item #22): the fallback health-check labels used to be derived
 * with `${id.charAt(0).toUpperCase()}${id.slice(1)} Health`, a blind
 * capitalize-first-letter transform that reads correctly for ordinary words
 * ("frontend" -> "Frontend Health") but produced "Api Health" / "Ai Health"
 * for the 2 checks whose id is itself an acronym.
 */
describe('SAAS_HEALTH_FALLBACK', () => {
  it('capitalizes acronym check labels correctly (API, AI), not just their first letter', () => {
    const labels = Object.fromEntries(SAAS_HEALTH_FALLBACK.checks.map((c) => [c.id, c.label]));
    expect(labels.api).toBe('API Health');
    expect(labels.ai).toBe('AI Health');
  });

  it('still capitalizes ordinary-word check labels correctly', () => {
    const labels = Object.fromEntries(SAAS_HEALTH_FALLBACK.checks.map((c) => [c.id, c.label]));
    expect(labels.frontend).toBe('Frontend Health');
    expect(labels.backend).toBe('Backend Health');
    expect(labels.integrations).toBe('Integrations Health');
    expect(labels.tenant).toBe('Tenant Health');
    expect(labels.simulation).toBe('Simulation Health');
  });

  it('covers exactly the 7 known checks, all critical by default', () => {
    expect(SAAS_HEALTH_FALLBACK.checks).toHaveLength(7);
    expect(SAAS_HEALTH_FALLBACK.checks.every((c) => c.status === 'critical')).toBe(true);
  });
});

describe('SAAS_HEALTH_ACCESS_RESTRICTED', () => {
  it('uses a status healthCheckStatusToWidgetTone does not recognize as critical', () => {
    // Regression: a 403 (role lacks VIEW_OPERATIONS/VIEW_OBSERVABILITY, see
    // MB-K9) is not the same situation as the endpoint being genuinely down --
    // showing 7 red "Critical" badges implies an active outage when the real
    // state is "not authorized to check." `status: 'restricted'` deliberately
    // falls through healthCheckStatusToWidgetTone's unmapped default (neutral)
    // instead of matching its 'critical'/'failed'/'error' branch.
    expect(SAAS_HEALTH_ACCESS_RESTRICTED.checks).toHaveLength(7);
    expect(SAAS_HEALTH_ACCESS_RESTRICTED.checks.every((c) => c.status === 'restricted')).toBe(
      true,
    );
    expect(SAAS_HEALTH_ACCESS_RESTRICTED.checks.every((c) => c.status !== 'critical')).toBe(true);
  });

  it('carries an honest, non-alarming message distinct from the generic fallback', () => {
    expect(SAAS_HEALTH_ACCESS_RESTRICTED.checks[0].summary).toMatch(/permission/i);
    expect(SAAS_HEALTH_FALLBACK.checks[0].summary).not.toMatch(/permission/i);
  });
});

describe('fetchSaasHealthCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the access-restricted fallback on a 403, not the generic critical fallback', async () => {
    const { apiFetchJson } = await import('./apiClient');
    vi.mocked(apiFetchJson).mockResolvedValue({
      response: { ok: false, status: 403 } as Response,
      data: null,
    });

    const result = await fetchSaasHealthCenter();

    expect(result.ok).toBe(false);
    expect(result.data).toBe(SAAS_HEALTH_ACCESS_RESTRICTED);
  });

  it('returns the generic fallback on a non-403 failure (e.g. 500 or network error)', async () => {
    const { apiFetchJson } = await import('./apiClient');
    vi.mocked(apiFetchJson).mockResolvedValue({
      response: { ok: false, status: 500 } as Response,
      data: null,
    });

    const result = await fetchSaasHealthCenter();

    expect(result.ok).toBe(false);
    expect(result.data).toBe(SAAS_HEALTH_FALLBACK);
  });

  it('returns the real data on success', async () => {
    const { apiFetchJson } = await import('./apiClient');
    const realData = { status: 'healthy', checks: [] };
    vi.mocked(apiFetchJson).mockResolvedValue({
      response: { ok: true, status: 200 } as Response,
      data: realData,
    });

    const result = await fetchSaasHealthCenter();

    expect(result.ok).toBe(true);
    expect(result.data).toBe(realData);
  });
});
