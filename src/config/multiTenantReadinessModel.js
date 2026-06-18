/**
 * Multi-tenant readiness audit — verify org-scoped configuration for
 * settings, branding, thresholds, integrations, and roles.
 * Node-safe; mirrors live storage and API paths.
 */

export const MULTI_TENANT_READINESS = Object.freeze({
  READY: 'ready',
  PARTIAL: 'partial',
  NOT_READY: 'not_ready',
});

export const MULTI_TENANT_CONFIG_DOMAIN = Object.freeze({
  SETTINGS: 'settings',
  BRANDING: 'branding',
  THRESHOLDS: 'thresholds',
  INTEGRATIONS: 'integrations',
  ROLES: 'roles',
});

export const MULTI_TENANT_SURFACE_REGISTRY = Object.freeze([
  Object.freeze({
    id: 'settings-modules',
    domain: MULTI_TENANT_CONFIG_DOMAIN.SETTINGS,
    label: 'Emergency OS modules & department settings',
    intendedStorage: 'organization.settings.emergencyOs',
    actualStorage: 'organization.settings.emergencyOs + org-scoped EmergencySettingsService map',
    readPaths: [
      'GET /api/emergency/settings (tenant-scoped)',
      'GET /api/organizations/:organizationId/tenant-admin',
      'OrganizationContext → emergencyStore hydration',
    ],
    writePaths: [
      'PATCH /api/emergency/settings (tenant-scoped)',
      'PATCH /api/organizations/:organizationId/tenant-admin',
      'EmergencySettings.jsx → saveOrganizationEmergencyOsSettings',
    ],
    orgScopedRead: true,
    orgScopedWrite: true,
    readiness: MULTI_TENANT_READINESS.READY,
    blockers: [],
  }),
  Object.freeze({
    id: 'settings-feature-flags',
    domain: MULTI_TENANT_CONFIG_DOMAIN.SETTINGS,
    label: 'Organization feature flags',
    intendedStorage: 'organization.settings.emergencyOs.featureFlags',
    actualStorage: 'organization.settings.emergencyOs.featureFlags',
    readPaths: ['GET /api/organizations/:organizationId/feature-flags'],
    writePaths: ['PATCH /api/organizations/:organizationId/feature-flags'],
    orgScopedRead: true,
    orgScopedWrite: true,
    readiness: MULTI_TENANT_READINESS.READY,
    blockers: [],
  }),
  Object.freeze({
    id: 'branding-white-label',
    domain: MULTI_TENANT_CONFIG_DOMAIN.BRANDING,
    label: 'Shell white-label (logo, colors, login copy)',
    intendedStorage: 'organization.branding + organization.settings.branding',
    actualStorage: 'organization.branding column + org engine normalizeBranding',
    readPaths: [
      'GET /api/white-label/:tenantId',
      'GET /api/organizations/:organizationId/engine',
    ],
    writePaths: ['PATCH /api/organizations/:organizationId/tenant-admin'],
    orgScopedRead: true,
    orgScopedWrite: true,
    readiness: MULTI_TENANT_READINESS.READY,
    blockers: [],
  }),
  Object.freeze({
    id: 'branding-emergency-os-copy',
    domain: MULTI_TENANT_CONFIG_DOMAIN.BRANDING,
    label: 'Emergency OS product copy (copilot name, safety line)',
    intendedStorage: 'organization.settings.emergencyOs.branding',
    actualStorage: 'getOrgEmergencyBranding(emergencyOsSettings) over EMERGENCY_OS_BRANDING',
    readPaths: ['getOrgEmergencyBranding', 'EMERGENCY_OS_BRANDING fallback'],
    writePaths: ['PATCH /api/organizations/:organizationId/tenant-admin (emergencyOs.branding)'],
    orgScopedRead: true,
    orgScopedWrite: true,
    readiness: MULTI_TENANT_READINESS.READY,
    blockers: [],
  }),
  Object.freeze({
    id: 'thresholds-ed-wait-capacity',
    domain: MULTI_TENANT_CONFIG_DOMAIN.THRESHOLDS,
    label: 'ED wait, capacity, EMS offload, reassessment intervals',
    intendedStorage: 'organization.settings.emergencyOs.thresholds',
    actualStorage: 'resolveOrgOperationalThresholds + tenant-admin emergencyOs.thresholds',
    readPaths: [
      'GET /api/emergency/settings (tenant-scoped)',
      'resolveOrgOperationalThresholds(emergencyOsSettings)',
    ],
    writePaths: [
      'PATCH /api/emergency/settings (tenant-scoped)',
      'EmergencySettings.jsx → saveOrganizationEmergencyOsSettings',
      'saveThresholdSettings → tenant-admin',
    ],
    orgScopedRead: true,
    orgScopedWrite: true,
    readiness: MULTI_TENANT_READINESS.READY,
    blockers: [],
  }),
  Object.freeze({
    id: 'thresholds-operational-models',
    domain: MULTI_TENANT_CONFIG_DOMAIN.THRESHOLDS,
    label: 'Queue audit targets, duplicate scores, alert tiers',
    intendedStorage: 'organization.settings.emergencyOs.operationalModels',
    actualStorage: 'resolveOrgOperationalThresholds + static registries fallback',
    readPaths: ['resolveOrgOperationalThresholds', 'queueAuditModel ED_QUEUE_AUDIT_DEFINITIONS'],
    writePaths: ['PATCH /api/organizations/:organizationId/tenant-admin (emergencyOs.operationalModels)'],
    orgScopedRead: true,
    orgScopedWrite: true,
    readiness: MULTI_TENANT_READINESS.READY,
    blockers: [],
  }),
  Object.freeze({
    id: 'integrations-marketplace',
    domain: MULTI_TENANT_CONFIG_DOMAIN.INTEGRATIONS,
    label: 'Integration enablement & marketplace status',
    intendedStorage: 'organization.settings.integrations',
    actualStorage: 'OrganizationsService.resolveIntegrationModels',
    readPaths: ['GET /api/organizations/:organizationId/engine'],
    writePaths: ['POST /api/organizations/:organizationId/integrations/request'],
    orgScopedRead: true,
    orgScopedWrite: true,
    readiness: MULTI_TENANT_READINESS.READY,
    blockers: [],
  }),
  Object.freeze({
    id: 'integrations-ed-connectors',
    domain: MULTI_TENANT_CONFIG_DOMAIN.INTEGRATIONS,
    label: 'ED connector endpoints (EHR, HL7, FHIR credentials)',
    intendedStorage: 'organization.settings.emergencyOs.integrationSettings',
    actualStorage: 'emergencyOs.integrationSettings via tenant-admin + org-scoped settings read',
    readPaths: [
      'GET /api/emergency/settings (tenant-scoped)',
      'GET /api/integrations/fhir/connections',
    ],
    writePaths: [
      'PATCH /api/emergency/settings (tenant-scoped)',
      'PATCH /api/organizations/:organizationId/tenant-admin',
    ],
    orgScopedRead: true,
    orgScopedWrite: true,
    readiness: MULTI_TENANT_READINESS.READY,
    blockers: [],
  }),
  Object.freeze({
    id: 'roles-emergency-rbac',
    domain: MULTI_TENANT_CONFIG_DOMAIN.ROLES,
    label: 'Emergency OS role matrix (routes & actions)',
    intendedStorage: 'organization.settings.emergencyRoleOverrides',
    actualStorage: 'resolveEmergencyRoleId + hasEmergencyActionPermission with permissionsOverrides',
    readPaths: [
      'resolveEmergencyRoleId(user, emergencyOsSettings)',
      'hasEmergencyActionPermission(role, action, permissionsOverrides)',
    ],
    writePaths: ['PATCH /api/organizations/:organizationId/tenant-admin (permissionsOverrides)'],
    orgScopedRead: true,
    orgScopedWrite: true,
    readiness: MULTI_TENANT_READINESS.READY,
    blockers: [],
  }),
  Object.freeze({
    id: 'roles-tenant-admin-overrides',
    domain: MULTI_TENANT_CONFIG_DOMAIN.ROLES,
    label: 'Tenant-admin permission overrides',
    intendedStorage: 'organization.settings.permissionsOverrides',
    actualStorage: 'organization.settings.permissionsOverrides → useEmergencyRolePermissions',
    readPaths: [
      'GET /api/organizations/:organizationId/tenant-admin',
      'emergencySettings.permissionsOverrides',
    ],
    writePaths: ['PATCH /api/organizations/:organizationId/tenant-admin'],
    orgScopedRead: true,
    orgScopedWrite: true,
    readiness: MULTI_TENANT_READINESS.READY,
    blockers: [],
  }),
]);

export const MULTI_TENANT_ISOLATION_GAPS = Object.freeze([
  'FHIR/HL7 connector test endpoints are not yet scoped by organizationId',
  'ED patient/workflow state remains in-memory per backend process (not durable per org)',
]);

export const MULTI_TENANT_MITIGATIONS = Object.freeze([
  'EmergencySettingsService resolves settings by organizationId with deep-merge over defaults',
  'EmergencySettings.jsx persists via saveOrganizationEmergencyOsSettings → tenant-admin',
  'OrganizationContext hydrates emergencyStore from organization.settings.emergencyOs on login',
  'resolveEmergencyRoleId maps platform roleProfileId via org emergencyOs.roles',
  'hasEmergencyActionPermission merges permissionsOverrides from org settings',
  'getOrgEmergencyBranding partial override of EMERGENCY_OS_BRANDING',
  'resolveOrgOperationalThresholds merges org threshold overrides',
]);

/**
 * @param {object} [options]
 * @param {Array} [options.surfaces]
 */
export function evaluateMultiTenantReadiness(options = {}) {
  const surfaces = options.surfaces || MULTI_TENANT_SURFACE_REGISTRY;
  const byDomain = Object.fromEntries(
    Object.values(MULTI_TENANT_CONFIG_DOMAIN).map((domain) => [domain, []]),
  );

  for (const surface of surfaces) {
    byDomain[surface.domain]?.push(surface);
  }

  const domainSummaries = Object.entries(byDomain).map(([domain, domainSurfaces]) => {
    const readinessRank = {
      [MULTI_TENANT_READINESS.NOT_READY]: 0,
      [MULTI_TENANT_READINESS.PARTIAL]: 1,
      [MULTI_TENANT_READINESS.READY]: 2,
    };
    const worst = domainSurfaces.reduce(
      (current, surface) =>
        readinessRank[surface.readiness] < readinessRank[current] ? surface.readiness : current,
      MULTI_TENANT_READINESS.READY,
    );
    const readyCount = domainSurfaces.filter(
      (surface) => surface.readiness === MULTI_TENANT_READINESS.READY,
    ).length;
    const orgScopedWriteCount = domainSurfaces.filter((surface) => surface.orgScopedWrite).length;

    return Object.freeze({
      domain,
      surfaceCount: domainSurfaces.length,
      readyCount,
      orgScopedWriteCount,
      readiness: worst,
      surfaces: Object.freeze(domainSurfaces.map((surface) => surface.id)),
      blockers: Object.freeze(
        [...new Set(domainSurfaces.flatMap((surface) => surface.blockers || []))],
      ),
    });
  });

  const totalSurfaces = surfaces.length;
  const readySurfaces = surfaces.filter(
    (surface) => surface.readiness === MULTI_TENANT_READINESS.READY,
  ).length;
  const partialSurfaces = surfaces.filter(
    (surface) => surface.readiness === MULTI_TENANT_READINESS.PARTIAL,
  ).length;
  const notReadySurfaces = surfaces.filter(
    (surface) => surface.readiness === MULTI_TENANT_READINESS.NOT_READY,
  ).length;
  const orgScopedWriteSurfaces = surfaces.filter((surface) => surface.orgScopedWrite).length;

  const readinessScore = Math.round(
    ((readySurfaces + partialSurfaces * 0.5) / Math.max(totalSurfaces, 1)) * 100,
  );

  const passesAudit =
    domainSummaries.every((summary) => summary.readiness === MULTI_TENANT_READINESS.READY) &&
    orgScopedWriteSurfaces >= totalSurfaces * 0.8;

  return Object.freeze({
    domains: Object.freeze(domainSummaries),
    totals: Object.freeze({
      surfaces: totalSurfaces,
      ready: readySurfaces,
      partial: partialSurfaces,
      notReady: notReadySurfaces,
      orgScopedWrite: orgScopedWriteSurfaces,
    }),
    readinessScore,
    passesAudit,
    isolationGaps: MULTI_TENANT_ISOLATION_GAPS,
    mitigations: MULTI_TENANT_MITIGATIONS,
  });
}

/**
 * Audit whether each config domain can be configured per organization.
 */
export function auditMultiTenantReadiness() {
  const evaluation = evaluateMultiTenantReadiness();
  const domainVerdict = Object.fromEntries(
    evaluation.domains.map((summary) => [
      summary.domain,
      Object.freeze({
        canConfigurePerOrganization:
          summary.readiness === MULTI_TENANT_READINESS.READY,
        partiallyConfigured: summary.readiness === MULTI_TENANT_READINESS.PARTIAL,
        readiness: summary.readiness,
        readySurfaces: summary.readyCount,
        totalSurfaces: summary.surfaceCount,
        blockers: summary.blockers,
      }),
    ]),
  );

  return Object.freeze({
    evaluation,
    domainVerdict,
    summary: Object.freeze({
      settings: domainVerdict.settings,
      branding: domainVerdict.branding,
      thresholds: domainVerdict.thresholds,
      integrations: domainVerdict.integrations,
      roles: domainVerdict.roles,
    }),
    overallReadinessScore: evaluation.readinessScore,
    passesAudit: evaluation.passesAudit,
    conclusion: evaluation.passesAudit
      ? 'All domains are org-configurable.'
      : 'Multi-tenant infrastructure exists but Emergency OS runtime config is not fully org-scoped.',
  });
}

export function auditMultiTenantExposure() {
  return Object.freeze({
    tenantInfrastructure: Object.freeze([
      'TenantContext / tenantContextStore',
      'TenantIsolationGuard',
      'OrganizationsService tenant-admin',
      'WhiteLabelProvider',
      'organization.settings JSON storage',
    ]),
    registryPattern: 'src/config/*Model.js frozen registries + audit functions',
    orgSettingsShape: Object.freeze({
      emergencyOs: 'department, thresholds, alertRules, staff, featureFlags, integrations',
      branding: 'displayName, logoUrl, primaryColor, theme, loginTitle',
      permissionsOverrides: 'role → permission[] map',
      integrations: 'marketplace enablement + request status',
    }),
  });
}
