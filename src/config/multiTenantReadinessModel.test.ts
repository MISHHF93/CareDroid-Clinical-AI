import { describe, expect, it } from 'vitest';
import {
  MULTI_TENANT_CONFIG_DOMAIN,
  MULTI_TENANT_READINESS,
  MULTI_TENANT_SURFACE_REGISTRY,
  auditMultiTenantExposure,
  auditMultiTenantReadiness,
  evaluateMultiTenantReadiness,
} from './multiTenantReadinessModel';

describe('multiTenantReadinessModel', () => {
  it('registers all five configuration domains', () => {
    const domains = new Set(MULTI_TENANT_SURFACE_REGISTRY.map((surface) => surface.domain));
    expect(domains).toEqual(
      new Set([
        MULTI_TENANT_CONFIG_DOMAIN.SETTINGS,
        MULTI_TENANT_CONFIG_DOMAIN.BRANDING,
        MULTI_TENANT_CONFIG_DOMAIN.THRESHOLDS,
        MULTI_TENANT_CONFIG_DOMAIN.INTEGRATIONS,
        MULTI_TENANT_CONFIG_DOMAIN.ROLES,
      ]),
    );
  });

  it('marks white-label branding and org feature flags as ready', () => {
    const evaluation = evaluateMultiTenantReadiness();
    const branding = evaluation.domains.find((domain) => domain.domain === 'branding');
    const settings = evaluation.domains.find((domain) => domain.domain === 'settings');

    expect(branding?.readyCount).toBeGreaterThan(0);
    expect(settings?.readyCount).toBeGreaterThan(0);
    expect(
      MULTI_TENANT_SURFACE_REGISTRY.find((surface) => surface.id === 'branding-white-label')
        ?.readiness,
    ).toBe(MULTI_TENANT_READINESS.READY);
  });

  it('marks emergency RBAC and ED thresholds as org-configurable after harmonization', () => {
    const audit = auditMultiTenantReadiness();
    expect(audit.domainVerdict.roles.canConfigurePerOrganization).toBe(true);
    expect(audit.domainVerdict.thresholds.canConfigurePerOrganization).toBe(true);
    expect(audit.domainVerdict.settings.canConfigurePerOrganization).toBe(true);
    expect(audit.overallReadinessScore).toBeGreaterThanOrEqual(80);
    expect(audit.passesAudit).toBe(true);
  });

  it('documents tenant infrastructure and org settings shape', () => {
    const exposure = auditMultiTenantExposure();
    expect(exposure.tenantInfrastructure.length).toBeGreaterThan(3);
    expect(exposure.orgSettingsShape.emergencyOs).toContain('thresholds');
  });

  it('reports full multi-tenant readiness after harmonization', () => {
    const audit = auditMultiTenantReadiness();
    expect(audit.overallReadinessScore).toBe(100);
    expect(audit.passesAudit).toBe(true);
    expect(audit.conclusion).toContain('org-configurable');
  });
});
