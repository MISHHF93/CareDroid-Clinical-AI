import { describe, expect, it } from 'vitest';
import { SAAS_HEALTH_FALLBACK } from './saasHealthApi';

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
