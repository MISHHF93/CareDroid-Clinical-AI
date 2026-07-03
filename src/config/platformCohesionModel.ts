/**
 * Platform cohesion contract — canonical stacks and integration boundaries.
 * Use this to avoid parallel implementations across hooks, guards, nav, and services.
 */

export const PLATFORM_COHESION_ENGINE_ID = 'caredroid-platform-cohesion' as const;

export const PLATFORM_COHESION_METHODOLOGY = Object.freeze([
  'understand-existing',
  'consolidate-canonical',
  'improve-in-place',
  'validate-contracts',
] as const);

export const PLATFORM_COHESION_CONTRACT = Object.freeze({
  engineId: PLATFORM_COHESION_ENGINE_ID,
  methodology: PLATFORM_COHESION_METHODOLOGY,
  stacks: Object.freeze({
    identity: Object.freeze({
      canonical: 'UserContext',
      demoCatalog: 'useCareDroidUser',
      note: 'Demo user switching must update UserContext; local-only permission state is forbidden.',
    }),
    access: Object.freeze({
      canonical: 'useSecurityAccess',
      emergencyRuntime: 'useEmergencyRolePermissions',
      compatShim: 'useRolePermissions',
      backendBridge: 'securityPermissionBridge',
      backendCatalog: 'backendPermissionCatalog',
      backendRoleMap: 'backendRolePermissions',
      service: 'securityAccessService',
    }),
    routeGuards: Object.freeze({
      caredroid: 'CareDroidRouteGuard',
      profile: 'ProfileRouteGuard',
      trackmind: 'TrackMindRouteGuard',
      deniedUi: 'AccessDeniedPanel',
    }),
    navigation: Object.freeze({
      canonical: 'unified-navigation.config.ts',
      compat: 'navigation.config.ts',
      routes: 'routes.config.ts',
      inShellRedirects: 'IN_SHELL_ROUTE_REDIRECTS',
      mountTable: 'app/router.tsx',
    }),
    workflows: Object.freeze({
      patient: 'unifiedPatientWorkflowOrchestrator',
      automation: 'unifiedWorkflowAutomationEngine',
      intelligence: 'unifiedOperationalIntelligenceEngine',
      knowledge: 'unifiedApplicationKnowledgeGraph',
    }),
    observability: Object.freeze({
      engine: 'caredroid-observability',
      service: 'observabilityService',
      trace: 'observabilityTrace',
    }),
    security: Object.freeze({
      engine: 'caredroid-security',
      phi: 'phiAccessService',
      audit: 'securityAuditService',
    }),
    configuration: Object.freeze({
      registry: 'canonicalConfigurationModel',
      audit: 'canonicalConfigurationAudit',
    }),
    documentation: Object.freeze({
      engine: 'living-documentation',
      service: 'livingDocumentationService',
    }),
  }),
  antiPatterns: Object.freeze([
    'Parallel permission checks outside useSecurityAccess / UserContext bridge',
    'Inline EmergencyRouteGuard duplicates in router.tsx',
    'Navigation item arrays defined in page components',
    'Duplicate route alias tables outside routes.config.ts',
    'Inline Navigate redirects in router.tsx instead of IN_SHELL_ROUTE_REDIRECTS',
    'Local-only demo user state without UserContext sync',
  ]),
});