import { describe, expect, it } from 'vitest';
import {
  PRODUCTION_DEPLOYMENT_BLOCKER_CATALOG,
  PRODUCTION_QUICK_WIN_CATALOG,
  PRODUCTION_RISK_CATALOG,
  auditProductionReadiness,
  scoreProductionReadiness,
} from './productionReadinessModel';

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
