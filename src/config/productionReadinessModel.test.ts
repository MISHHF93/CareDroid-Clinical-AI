import { describe, expect, it } from 'vitest';
import {
  PRODUCTION_DEPLOYMENT_BLOCKER_CATALOG,
  PRODUCTION_QUICK_WIN_CATALOG,
  PRODUCTION_RISK_CATALOG,
  auditProductionReadiness,
  scoreProductionReadiness,
} from './productionReadinessModel';
import { auditIntegrationDiscovery } from './integrationStatusRegistry';

describe('productionReadinessModel', () => {
  it('catalogs exactly 50 risks, quick wins, and deployment blockers', () => {
    expect(PRODUCTION_RISK_CATALOG).toHaveLength(50);
    expect(PRODUCTION_QUICK_WIN_CATALOG).toHaveLength(50);
    expect(PRODUCTION_DEPLOYMENT_BLOCKER_CATALOG).toHaveLength(50);
  });

  it('scores nine production dimensions', () => {
    const scores = scoreProductionReadiness();
    expect(Object.keys(scores.dimensions)).toEqual([
      'architecture',
      'frontend',
      'backend',
      'responsiveness',
      'integrations',
      'securityControls',
      'auditability',
      'operationalAwareness',
      'pilotReadiness',
    ]);
    expect(scores.overall).toBeGreaterThan(0);
    expect(scores.overall).toBeLessThanOrEqual(100);
  });

  it('derives the integrations dimension from the live integration registry, not a static number', () => {
    // Was a hardcoded constant that only ever moved if someone remembered
    // to bump it by hand -- now tracks integrationStatusRegistry.ts's
    // actual implemented/partial/placeholder counts directly, using the
    // same partial-credit weighting evaluateMultiTenantReadiness() already
    // uses for its own readinessScore.
    const discovery = auditIntegrationDiscovery();
    const implemented = discovery.byStatus.implemented || 0;
    const partial = discovery.byStatus.partial || 0;
    const expected = Math.round(((implemented + partial * 0.5) / discovery.totalPoints) * 100);

    const scores = scoreProductionReadiness();
    expect(scores.dimensions.integrations.score).toBe(expected);
    expect(scores.dimensions.integrations.baseScore).toBe(expected);
  });

  it('raises security and backend scores when emergency API is authenticated', () => {
    const baseline = scoreProductionReadiness();
    const secured = scoreProductionReadiness({ emergencyApiAuthenticated: true });
    expect(secured.dimensions.securityControls.score).toBeGreaterThan(
      baseline.dimensions.securityControls.score,
    );
    expect(secured.dimensions.backend.score).toBeGreaterThan(baseline.dimensions.backend.score);
  });

  it('fails production audit until critical blockers are resolved', () => {
    const blocked = auditProductionReadiness();
    expect(blocked.summary.passesProductionAudit).toBe(false);
    expect(blocked.summary.unresolvedCriticalBlockerCount).toBeGreaterThan(0);

    const cleared = auditProductionReadiness({
      emergencyApiAuthenticated: true,
      viteApiUrlConfigured: true,
      orgScopedEmergencySettingsService: true,
      productionSecretsConfigured: true,
      edRbacWired: true,
    });
    expect(cleared.summary.unresolvedSignalBlockerIds).toEqual([]);
  });
});
