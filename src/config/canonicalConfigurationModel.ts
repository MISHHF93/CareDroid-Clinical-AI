/**
 * Canonical configuration registry — single inventory of authoritative config sources.
 * Use `canonicalConfiguration.ts` for imports; this module is the audit source of truth.
 */

export type CanonicalConfigurationDomain =
  | 'environment'
  | 'feature-flags'
  | 'routes'
  | 'navigation'
  | 'auth'
  | 'api'
  | 'roles'
  | 'permissions'
  | 'ai'
  | 'design-tokens'
  | 'services'
  | 'platform'
  | 'workflow'
  | 'interaction'
  | 'documentation'
  | 'layout';

export type CanonicalConfigurationLayer =
  | 'parser'
  | 'projection'
  | 'registry'
  | 'barrel'
  | 'compat'
  | 'audit';

export type CanonicalConfigurationEntry = Readonly<{
  id: string;
  domain: CanonicalConfigurationDomain;
  path: string;
  purpose: string;
  layer: CanonicalConfigurationLayer;
  exportKeys?: readonly string[];
  supersedes?: readonly string[];
  consumers?: readonly string[];
}>;

export type CanonicalEnvVarEntry = Readonly<{
  key: string;
  parserModule: string;
  purpose: string;
  aliases?: readonly string[];
  documentedIn: 'env.example' | 'appConfig-only' | 'module-direct';
}>;

export const CANONICAL_CONFIGURATION_DOMAINS: readonly CanonicalConfigurationDomain[] = Object.freeze([
  'environment',
  'feature-flags',
  'routes',
  'navigation',
  'auth',
  'api',
  'roles',
  'permissions',
  'ai',
  'design-tokens',
  'services',
  'platform',
  'workflow',
  'interaction',
  'documentation',
  'layout',
]);

/** Authoritative frontend configuration modules — extend when adding new registries. */
export const CANONICAL_CONFIGURATION_REGISTRY: readonly CanonicalConfigurationEntry[] = Object.freeze([
  // ── Environment & flags ───────────────────────────────────────────────────
  Object.freeze({
    id: 'app-config',
    domain: 'environment',
    path: 'src/config/appConfig.ts',
    purpose: 'Parses VITE_* environment variables from import.meta.env.',
    layer: 'parser',
    exportKeys: ['default', 'SUPPORTED_APP_ENVIRONMENTS', 'normalizeAppEnvironment'],
    consumers: ['featureFlags.config', 'env.config', 'auth.config', 'apiEnv'],
  }),
  Object.freeze({
    id: 'env-config',
    domain: 'environment',
    path: 'src/config/env.config.ts',
    purpose: 'Stable ENV_CONFIG projection for auth, API, and feature-gating consumers.',
    layer: 'projection',
    exportKeys: ['ENV_CONFIG', 'shouldExposeDemoAuth'],
    supersedes: ['src/config/appConfig.ts (direct feature reads)'],
    consumers: ['auth.config', 'apiClient', 'devBackendAuth'],
  }),
  Object.freeze({
    id: 'env-example',
    domain: 'environment',
    path: '.env.example',
    purpose: 'Documents deployable VITE_* keys and local dev defaults.',
    layer: 'audit',
    consumers: ['canonicalConfigurationAudit', 'backendFrontendExposure.test'],
  }),
  Object.freeze({
    id: 'feature-flags',
    domain: 'feature-flags',
    path: 'src/config/featureFlags.config.ts',
    purpose: 'FEATURE_FLAGS projection and FEATURE_FLAG_REGISTRY catalog.',
    layer: 'registry',
    exportKeys: ['FEATURE_FLAGS', 'FEATURE_FLAG_REGISTRY', 'shouldExposeDemoAuthFlag'],
    supersedes: ['src/config/appConfig.ts (direct features.* reads)'],
    consumers: ['env.config', 'unified-navigation.config', 'AppShell'],
  }),
  Object.freeze({
    id: 'suite-entitlements',
    domain: 'feature-flags',
    path: 'src/config/suiteFeatureEntitlements.config.ts',
    purpose: 'SaaS suite entitlement keys aligned to platform packaging flags.',
    layer: 'registry',
    consumers: ['unified-navigation.config', 'practitionerSurfaceVisibility'],
  }),

  // ── Routes & navigation ───────────────────────────────────────────────────
  Object.freeze({
    id: 'routes',
    domain: 'routes',
    path: 'src/config/routes.config.ts',
    purpose: 'CANONICAL_ROUTES, ROUTE_RECORDS, alias groups, and help topic bindings.',
    layer: 'registry',
    exportKeys: ['CANONICAL_ROUTES', 'ROUTE_RECORDS', 'ROUTE_ALIAS_GROUPS', 'getRouteAliasTarget'],
    consumers: ['router.tsx', 'routeHealth', 'navigation.config', 'auth.config'],
  }),
  Object.freeze({
    id: 'profile-console-routes',
    domain: 'routes',
    path: 'src/config/profileConsoleRoutes.ts',
    purpose: 'Profile, billing, and SaaS settings console route table.',
    layer: 'registry',
    exportKeys: ['PROFILE_CONSOLE_ROUTES', 'PROFILE_CONSOLE_REDIRECT_ROUTES'],
    consumers: ['profileConsoleRouteTree'],
  }),
  Object.freeze({
    id: 'public-console-routes',
    domain: 'routes',
    path: 'src/config/publicConsoleRoutes.ts',
    purpose: 'Public legal notices, help center, and build metadata routes.',
    layer: 'registry',
    exportKeys: ['PUBLIC_CONSOLE_ROUTES', 'PUBLIC_CONSOLE_REDIRECT_ROUTES'],
    consumers: ['publicConsoleRouteTree'],
  }),
  Object.freeze({
    id: 'admin-console-routes',
    domain: 'routes',
    path: 'src/config/adminConsoleRoutes.ts',
    purpose: 'Nested admin operations console child routes and redirects.',
    layer: 'registry',
    exportKeys: ['ADMIN_CONSOLE_CHILD_ROUTES', 'ADMIN_CONSOLE_REDIRECT_ROUTES'],
    consumers: ['router.tsx', 'adminOperationsHome'],
  }),
  Object.freeze({
    id: 'training-console-routes',
    domain: 'routes',
    path: 'src/config/trainingConsoleRoutes.ts',
    purpose: 'Training, simulation, competency, and credentialing console routes.',
    layer: 'registry',
    exportKeys: ['TRAINING_CONSOLE_ROUTES', 'TRAINING_CONSOLE_ROUTE_PATHS'],
    consumers: ['router.tsx', 'medicalSimulationSuite'],
  }),
  Object.freeze({
    id: 'app-startup',
    domain: 'routes',
    path: 'src/config/appStartupModel.ts',
    purpose: 'Canonical startup landing resolver and ED journey page order.',
    layer: 'registry',
    exportKeys: ['APP_PAGE_JOURNEY_ORDER', 'resolveAppStartupRoute'],
    consumers: ['router.tsx', 'PlatformEntryHub'],
  }),
  Object.freeze({
    id: 'ed-application',
    domain: 'routes',
    path: 'src/config/edApplication.config.ts',
    purpose: 'Single-application ED mode, core routes, and extension redirects.',
    layer: 'registry',
    exportKeys: ['ED_APPLICATION', 'ED_CORE_ROUTES', 'isEdSingleApplicationMode'],
    consumers: ['router.tsx', 'AppShell'],
  }),
  Object.freeze({
    id: 'page-architecture',
    domain: 'routes',
    path: 'src/config/caredroidPageArchitecture.config.ts',
    purpose: 'Page purpose, owner roles, and workflow bindings for living documentation.',
    layer: 'registry',
    consumers: ['livingDocumentationService', 'HelpHub'],
  }),
  Object.freeze({
    id: 'unified-navigation',
    domain: 'navigation',
    path: 'src/config/unified-navigation.config.ts',
    purpose: 'NAVIGATION_ITEMS, pilot mode filtering, and role-aware nav visibility.',
    layer: 'registry',
    exportKeys: ['NAVIGATION_ITEMS', 'getVisibleNavigation', 'PILOT_CUSTOMER_MODE'],
    consumers: ['AppShell', 'Sidebar', 'commandPalette.config'],
  }),
  Object.freeze({
    id: 'navigation-compat',
    domain: 'navigation',
    path: 'src/config/navigation.config.ts',
    purpose: 'Compatibility projections (APP_SHELL_NAV_ITEMS, QUICK_COMMAND_DESTINATION_ITEMS).',
    layer: 'compat',
    supersedes: ['src/config/unified-navigation.config.ts'],
    consumers: ['AppShell', 'Sidebar', 'Header', 'duplicateSystemAudit'],
  }),
  Object.freeze({
    id: 'primary-navigation-compat',
    domain: 'navigation',
    path: 'src/navigation/primaryNavigation.ts',
    purpose: 'Legacy re-export shim for navigation.config projections.',
    layer: 'compat',
    supersedes: ['src/config/navigation.config.ts'],
    consumers: [],
  }),
  Object.freeze({
    id: 'role-cluster-nav',
    domain: 'navigation',
    path: 'src/config/roleClusterNav.config.ts',
    purpose: 'Role-cluster navigation groupings for operational dashboards.',
    layer: 'registry',
    consumers: ['roleOperationalDashboardModel'],
  }),
  Object.freeze({
    id: 'emergency-role-navigation',
    domain: 'navigation',
    path: 'src/config/emergencyRoleNavigationModel.ts',
    purpose: 'Emergency role default routes and navigation emphasis.',
    layer: 'registry',
    consumers: ['emergencyRoleScreenMatrix', 'AppShell'],
  }),

  // ── Auth & API ────────────────────────────────────────────────────────────
  Object.freeze({
    id: 'auth',
    domain: 'auth',
    path: 'src/config/auth.config.ts',
    purpose: 'AUTH_CONFIG — routes, token keys, and demo auth exposure.',
    layer: 'registry',
    exportKeys: ['AUTH_CONFIG'],
    consumers: ['apiClient', 'clinicalToolsApi', 'router.tsx'],
  }),
  Object.freeze({
    id: 'api-routes',
    domain: 'api',
    path: 'src/config/api.config.ts',
    purpose: 'API_ROUTES constants and normalizeApiPath for Nest /api prefix.',
    layer: 'registry',
    exportKeys: ['API_ROUTES', 'normalizeApiPath'],
    consumers: ['apiClient', 'configService', 'clinicalOrchestratorApi'],
  }),
  Object.freeze({
    id: 'api-env',
    domain: 'api',
    path: 'src/config/apiEnv.ts',
    purpose: 'API origin resolution, timeout, and WebSocket origin helpers.',
    layer: 'parser',
    exportKeys: ['DEFAULT_API_TIMEOUT_MS', 'resolveApiRoot', 'resolveWebSocketOrigin'],
    consumers: ['api.config', 'apiClient'],
  }),
  Object.freeze({
    id: 'backend-capabilities',
    domain: 'api',
    path: 'src/config/backendApiCapabilities.ts',
    purpose: 'BACKEND_API_CAPABILITY_STATUS — REAL/DEMO/DISABLED route inventory.',
    layer: 'registry',
    exportKeys: ['BACKEND_API_CAPABILITY_STATUS', 'getBackendCapabilityStatus'],
    consumers: ['pageApiBinding.registry', 'livingDocumentationService'],
  }),
  Object.freeze({
    id: 'page-api-bindings',
    domain: 'api',
    path: 'src/config/pageApiBinding.registry.ts',
    purpose: 'Page ↔ endpoint wiring with wired/partial/local-only modes.',
    layer: 'registry',
    exportKeys: ['PAGE_API_BINDINGS'],
    consumers: ['livingDocumentationService', 'backendFrontendExposure'],
  }),

  // ── Roles & permissions ───────────────────────────────────────────────────
  Object.freeze({
    id: 'emergency-permissions',
    domain: 'permissions',
    path: 'src/config/emergencyPermissionRegistry.ts',
    purpose: 'EMERGENCY_PERMISSION_KEYS and permission registry catalog.',
    layer: 'registry',
    exportKeys: ['EMERGENCY_PERMISSION_REGISTRY', 'EMERGENCY_PERMISSION_KEYS', 'listPermissionsForRole'],
    consumers: ['emergencyRolePermissions', 'AdministrativeAutomationReviewPanel'],
  }),
  Object.freeze({
    id: 'security-model',
    domain: 'permissions',
    path: 'src/config/securityModel.ts',
    purpose: 'Unified security contract — PHI actions, session policy, and vocabulary registry.',
    layer: 'registry',
    exportKeys: ['SECURITY_CONTRACT', 'SECURITY_ENGINE_ID', 'BACKEND_PERMISSION_KEYS'],
    consumers: ['securityPermissionBridge', 'securityAccessService', 'phiAccessService'],
  }),
  Object.freeze({
    id: 'security-barrel',
    domain: 'permissions',
    path: 'src/config/security.ts',
    purpose: 'Security barrel — re-exports securityModel, bridge, and backend catalog.',
    layer: 'barrel',
    exportKeys: ['SECURITY_CONTRACT', 'normalizePermission', 'Permission'],
    supersedes: ['src/config/securityModel.ts (direct imports)', 'src/config/backendPermissionCatalog.ts (direct imports)'],
    consumers: ['canonicalConfiguration.ts', 'PermissionGate'],
  }),
  Object.freeze({
    id: 'security-permission-bridge',
    domain: 'permissions',
    path: 'src/config/securityPermissionBridge.ts',
    purpose: 'Maps emergency dot, CareDroid colon, and backend RBAC permission keys.',
    layer: 'projection',
    exportKeys: ['normalizePermission', 'expandPermissionAliases'],
    supersedes: ['src/contexts/UserContext.tsx (inline RolePermissions fallback)'],
    consumers: ['securityAccessService', 'PermissionGate', 'useSecurityAccess'],
  }),
  Object.freeze({
    id: 'backend-permission-catalog',
    domain: 'permissions',
    path: 'src/config/backendPermissionCatalog.ts',
    purpose: 'Frontend mirror of backend Permission enum strings.',
    layer: 'registry',
    exportKeys: ['Permission'],
    supersedes: ['src/contexts/UserContext.tsx (inline Permission enum)'],
    consumers: ['backendRolePermissions', 'Settings', 'Profile'],
  }),
  Object.freeze({
    id: 'backend-role-permissions',
    domain: 'permissions',
    path: 'src/lib/users/backendRolePermissions.ts',
    purpose: 'Backend role → permission fallback map for securityAccessService.',
    layer: 'projection',
    exportKeys: ['BACKEND_ROLE_PERMISSIONS', 'hasBackendRolePermission'],
    consumers: ['securityAccessService'],
  }),
  Object.freeze({
    id: 'emergency-role-permissions',
    domain: 'roles',
    path: 'src/config/emergencyRolePermissions.ts',
    purpose: 'EMERGENCY_ROLE_IDS, labels, and role-to-permission resolution.',
    layer: 'registry',
    exportKeys: ['EMERGENCY_ROLE_IDS', 'EMERGENCY_ROLE_LABELS', 'resolveEmergencyRoleId'],
    consumers: ['AppShell', 'emergencyStore', 'HelpHub'],
  }),
  Object.freeze({
    id: 'legacy-role-permissions-utils',
    domain: 'roles',
    path: 'src/utils/emergencyRolePermissions.ts',
    purpose: 'Legacy MD/RN boolean flags — delegates to canonical permission registry.',
    layer: 'compat',
    supersedes: ['src/config/emergencyPermissionRegistry.ts'],
    consumers: [],
  }),
  Object.freeze({
    id: 'emergency-role-action-matrix',
    domain: 'permissions',
    path: 'src/config/emergencyRoleActionMatrix.ts',
    purpose: 'Role × action matrix for emergency operational surfaces.',
    layer: 'registry',
    consumers: ['emergencyRoleScreenMatrix'],
  }),
  Object.freeze({
    id: 'emergency-role-screen-matrix',
    domain: 'permissions',
    path: 'src/config/emergencyRoleScreenMatrix.ts',
    purpose: 'Role × screen visibility matrix for ED surfaces.',
    layer: 'registry',
    consumers: ['AppShell', 'emergencyNavCoverageAudit.test'],
  }),
  Object.freeze({
    id: 'practitioner-surface-policy',
    domain: 'permissions',
    path: 'src/config/practitionerRoleSurfacePolicy.ts',
    purpose: 'Practitioner role surface visibility and cleanup policy.',
    layer: 'registry',
    consumers: ['practitionerCleanup.config', 'practitionerSurfaceVisibility'],
  }),

  // ── AI ────────────────────────────────────────────────────────────────────
  Object.freeze({
    id: 'ai-chief-orchestration',
    domain: 'ai',
    path: 'src/config/aiChiefOrchestrationModel.ts',
    purpose: 'AI Chief monitoring domains, safety statement, and endpoint bindings.',
    layer: 'registry',
    exportKeys: ['AI_CHIEF_MONITORING_DOMAINS', 'AI_CHIEF_ORCHESTRATION_CONTRACT'],
    consumers: ['aiChiefOrchestrator', 'livingDocumentationService'],
  }),
  Object.freeze({
    id: 'unified-ai-node',
    domain: 'ai',
    path: 'src/config/careDroidUnifiedAiNode.config.ts',
    purpose: 'PLATFORM_AI_SERVICE_NODE_MAP — 17 governed platform AI services.',
    layer: 'registry',
    exportKeys: ['PLATFORM_AI_SERVICE_NODE_MAP', 'CARE_DROID_UNIFIED_AI_NODE_ID'],
    consumers: ['careDroidCentralNode', 'CopilotPanel', 'unifiedAiNodeEntryAudit.test'],
  }),

  // ── Design tokens ─────────────────────────────────────────────────────────
  Object.freeze({
    id: 'theme-tokens',
    domain: 'design-tokens',
    path: 'src/config/theme.tokens.ts',
    purpose: 'THEME_CONFIG — CSS entry points and programmatic token projection.',
    layer: 'registry',
    exportKeys: ['THEME_CONFIG'],
    consumers: ['ThemeContext', 'designSystem'],
  }),
  Object.freeze({
    id: 'design-system',
    domain: 'design-tokens',
    path: 'src/config/designSystem.ts',
    purpose: 'Barrel for tokens, semantic colors, medical theme, and CDL exports.',
    layer: 'barrel',
    exportKeys: ['DESIGN_SYSTEM_CSS_ENTRY', 'DESIGN_DENSITY_PRESETS'],
    consumers: ['main.tsx', 'CareDroidPrimitives'],
  }),
  Object.freeze({
    id: 'design-language',
    domain: 'design-tokens',
    path: 'src/config/caredroidDesignLanguage.ts',
    purpose: 'CDL principles, semantic roles, shell zones, and component standards.',
    layer: 'registry',
    consumers: ['designSystem', 'caredroidDesignLanguage.test'],
  }),
  Object.freeze({
    id: 'semantic-colors',
    domain: 'design-tokens',
    path: 'src/config/semanticColorSystem.ts',
    purpose: 'Operational tone to semantic color role mapping.',
    layer: 'registry',
    consumers: ['designSystem', 'PatientCard'],
  }),
  Object.freeze({
    id: 'layout-design-tokens',
    domain: 'design-tokens',
    path: 'src/layout/designTokens.ts',
    purpose: 'Spacing, radii, typography, elevation, and breakpoint tokens.',
    layer: 'registry',
    consumers: ['theme.tokens', 'designSystem'],
  }),

  // ── Platform services & workflows ─────────────────────────────────────────
  Object.freeze({
    id: 'emergency-platform',
    domain: 'platform',
    path: 'src/config/emergencyPlatform.config.ts',
    purpose: 'Emergency platform barrel and EMERGENCY_PLATFORM_CONTRACT engine map.',
    layer: 'barrel',
    exportKeys: ['EMERGENCY_PLATFORM_CONTRACT'],
    consumers: ['emergencyStore', 'livingDocumentationService', 'HospitalCommandCenter'],
  }),
  Object.freeze({
    id: 'unified-service-registry',
    domain: 'services',
    path: 'src/config/unifiedServiceRegistry.config.ts',
    purpose: 'Health probes, service domains, and obsolete service redirects.',
    layer: 'registry',
    exportKeys: ['OBSOLETE_SERVICE_REDIRECTS', 'UNIFIED_SERVICE_REGISTRY_CONSUMERS'],
    consumers: ['hospitalOperatingSystemService', 'SystemHealth'],
  }),
  Object.freeze({
    id: 'unified-patient-workflow',
    domain: 'workflow',
    path: 'src/config/unifiedPatientWorkflowModel.ts',
    purpose: 'Arrival-to-discharge patient workflow steps and route bindings.',
    layer: 'registry',
    exportKeys: ['PATIENT_WORKFLOW_STEPS', 'UNIFIED_PATIENT_WORKFLOW_CONTRACT'],
    consumers: ['unifiedPatientWorkflowOrchestrator', 'EdJourneyProgressRail'],
  }),
  Object.freeze({
    id: 'unified-workflow-automation',
    domain: 'workflow',
    path: 'src/config/unifiedWorkflowAutomationModel.ts',
    purpose: 'Workflow automation domains, triggers, and safety contract.',
    layer: 'registry',
    exportKeys: ['WORKFLOW_AUTOMATION_DOMAINS', 'UNIFIED_WORKFLOW_AUTOMATION_CONTRACT'],
    consumers: ['unifiedWorkflowAutomationEngine', 'WorkflowAutomationCommandBar'],
  }),
  Object.freeze({
    id: 'unified-operational-intelligence',
    domain: 'workflow',
    path: 'src/config/unifiedOperationalIntelligenceModel.ts',
    purpose: 'Event-driven operational intelligence domains and contract.',
    layer: 'registry',
    exportKeys: ['UNIFIED_OPERATIONAL_INTELLIGENCE_DOMAINS', 'UNIFIED_OPERATIONAL_INTELLIGENCE_CONTRACT'],
    consumers: ['unifiedOperationalIntelligenceEngine', 'AppShell'],
  }),
  Object.freeze({
    id: 'unified-oi-metric-registry',
    domain: 'workflow',
    path: 'src/config/unifiedOperationalIntelligence.registry.ts',
    purpose: 'Bridges header/whiteboard metrics with command-center drill-down routes.',
    layer: 'projection',
    exportKeys: ['COMMAND_CENTER_METRIC_ROUTES', 'UNIFIED_OPERATIONAL_METRICS'],
    supersedes: [
      'src/config/operationalMetricsModel.ts (direct route wiring)',
      'src/config/hospitalCommandCenterRolePolicy.ts (direct metric routes)',
    ],
    consumers: ['HospitalCommandCenter', 'CommandCenterInsightsCharts', 'Header'],
  }),
  Object.freeze({
    id: 'operational-metrics-model',
    domain: 'workflow',
    path: 'src/config/operationalMetricsModel.ts',
    purpose: 'Header and whiteboard operational metric keys and route bindings.',
    layer: 'registry',
    exportKeys: ['OPERATIONAL_METRIC_KEYS', 'OPERATIONAL_METRIC_REGISTRY'],
    consumers: ['unifiedOperationalIntelligence.registry', 'AppShell'],
  }),
  Object.freeze({
    id: 'hospital-command-center-role-policy',
    domain: 'workflow',
    path: 'src/config/hospitalCommandCenterRolePolicy.ts',
    purpose: 'Command-center actionable metrics and role-scoped metric visibility.',
    layer: 'registry',
    exportKeys: ['HOSPITAL_COMMAND_ACTIONABLE_METRICS'],
    consumers: ['unifiedOperationalIntelligence.registry', 'HospitalCommandCenter'],
  }),
  Object.freeze({
    id: 'emergency-pipeline-model',
    domain: 'workflow',
    path: 'src/config/emergencyPipelineModel.ts',
    purpose: 'Reception pipeline stages, surface zones, and role landing resolution.',
    layer: 'registry',
    exportKeys: ['RECEPTION_PIPELINE_STAGES', 'EMERGENCY_SURFACE_ZONE'],
    consumers: ['ReceptionWorkspace', 'navigateToEmergencySurface', 'AppShell'],
  }),
  Object.freeze({
    id: 'care-droid-screen-mode-registry',
    domain: 'platform',
    path: 'src/config/careDroidScreenModeRegistry.ts',
    purpose: 'Canonical screen mode registry — widgets, actions, density, and PHI per role surface.',
    layer: 'registry',
    exportKeys: ['CARE_DROID_SCREEN_MODES', 'CARE_DROID_SCREEN_MODE_REGISTRY'],
    consumers: ['useScreenModeCapabilities', 'emergencyArchitectureRegistry'],
  }),
  Object.freeze({
    id: 'unified-knowledge-graph',
    domain: 'workflow',
    path: 'src/config/unifiedApplicationKnowledgeGraphModel.ts',
    purpose: 'Entity types, relationships, and knowledge graph contract.',
    layer: 'registry',
    exportKeys: ['KNOWLEDGE_GRAPH_ENTITY_TYPES', 'UNIFIED_APPLICATION_KNOWLEDGE_GRAPH_CONTRACT'],
    consumers: ['unifiedApplicationKnowledgeGraphService', 'LivingContextualHelpBanner'],
  }),
  Object.freeze({
    id: 'three-minute-mission',
    domain: 'workflow',
    path: 'src/config/threeMinuteMissionModel.ts',
    purpose: 'Three-minute mission timer phases and operational copy.',
    layer: 'registry',
    consumers: ['threeMinuteMissionService', 'ThreeMinuteMissionBar'],
  }),
  Object.freeze({
    id: 'hospital-operating-system',
    domain: 'workflow',
    path: 'src/config/hospitalOperatingSystemModel.ts',
    purpose: 'Hospital department model and patient journey position resolver.',
    layer: 'registry',
    consumers: ['hospitalOperatingSystemService', 'HospitalJourneyCommandBar'],
  }),
  Object.freeze({
    id: 'care-droid-interaction',
    domain: 'interaction',
    path: 'src/config/careDroidInteractionModel.ts',
    purpose: 'Feedback timing, confirmation copy, shortcuts, and guidance dismiss key.',
    layer: 'registry',
    exportKeys: ['CARE_DROID_INTERACTION', 'INTERACTION_SHORTCUTS'],
    consumers: ['careDroidInteractionFeedback', 'ConfirmDialogProvider', 'ContextualGuidance'],
  }),

  // ── Layout, workspace, documentation ──────────────────────────────────────
  Object.freeze({
    id: 'layout',
    domain: 'layout',
    path: 'src/config/layout.config.ts',
    purpose: 'LAYOUT_SCROLL_CONTRACT — viewport owner and scroll container rules.',
    layer: 'registry',
    exportKeys: ['LAYOUT_SCROLL_CONTRACT'],
    consumers: ['AppShell', 'canonicalConfig.contract.test'],
  }),
  Object.freeze({
    id: 'workspace',
    domain: 'layout',
    path: 'src/config/workspace.config.ts',
    purpose: 'CARE_WORKSPACES catalog for multi-workspace navigation.',
    layer: 'registry',
    exportKeys: ['CARE_WORKSPACES'],
    consumers: ['navigation.config', 'canonicalConfig.contract.test'],
  }),
  Object.freeze({
    id: 'living-documentation',
    domain: 'documentation',
    path: 'src/config/livingDocumentationModel.ts',
    purpose: 'Living doc sections, superseded static docs, and reusable component catalog.',
    layer: 'registry',
    exportKeys: ['LIVING_DOCUMENTATION_CONTRACT', 'LIVING_DOCUMENTATION_SECTIONS'],
    consumers: ['livingDocumentationService', 'HelpHub'],
  }),
  Object.freeze({
    id: 'living-documentation-contextual-help',
    domain: 'documentation',
    path: 'src/config/livingDocumentationContextualHelp.ts',
    purpose: 'Route-prefix contextual help entries linked to HelpHub and workflow steps.',
    layer: 'registry',
    exportKeys: ['LIVING_CONTEXTUAL_HELP_ENTRIES'],
    consumers: ['LivingContextualHelpBanner', 'HelpHubContext'],
  }),
  Object.freeze({
    id: 'canonical-configuration',
    domain: 'documentation',
    path: 'src/config/canonicalConfigurationModel.ts',
    purpose: 'This registry — authoritative inventory of all configuration sources.',
    layer: 'registry',
    exportKeys: ['CANONICAL_CONFIGURATION_REGISTRY', 'CANONICAL_ENV_VAR_REGISTRY'],
    consumers: ['canonicalConfigurationAudit', 'livingDocumentationService'],
  }),
  Object.freeze({
    id: 'emergency-architecture-registry',
    domain: 'documentation',
    path: 'src/config/emergencyArchitectureRegistry.ts',
    purpose: 'Harmonization audit — classifies duplicates, legacy, and future modules.',
    layer: 'audit',
    exportKeys: ['EMERGENCY_ARCHITECTURE_REGISTRY'],
    consumers: ['canonicalConfigurationAudit', 'duplicateSystemAudit'],
  }),
  Object.freeze({
    id: 'observability-model',
    domain: 'platform',
    path: 'src/config/observabilityModel.ts',
    purpose: 'Unified observability contract — events, workflow spans, API performance thresholds.',
    layer: 'registry',
    exportKeys: ['OBSERVABILITY_CONTRACT'],
    consumers: ['observabilityService', 'apiClient', 'AppShell'],
  }),
  Object.freeze({
    id: 'platform-cohesion',
    domain: 'platform',
    path: 'src/config/platformCohesionModel.ts',
    purpose: 'Canonical stack map — identity, access, navigation, and integration boundaries.',
    layer: 'registry',
    exportKeys: ['PLATFORM_COHESION_CONTRACT', 'PLATFORM_COHESION_ENGINE_ID'],
    consumers: ['platformCohesion.contract.test', 'duplicateSystemAudit'],
  }),
  Object.freeze({
    id: 'operational-role-simulation',
    domain: 'platform',
    path: 'src/config/operationalRoleSimulationModel.ts',
    purpose: 'Role simulation contract — nav, permissions, routes, and workflow spine per persona.',
    layer: 'registry',
    exportKeys: ['OPERATIONAL_WORKFLOW_SPINE', 'SIMULATED_OPERATIONAL_ROLE_IDS'],
    consumers: ['operationalRoleSimulation.test', 'platformCohesionModel'],
  }),
  Object.freeze({
    id: 'role-operational-dashboard',
    domain: 'platform',
    path: 'src/config/roleOperationalDashboardModel.ts',
    purpose: 'Role-based ED dashboard matrix — information hierarchy and primary surfaces.',
    layer: 'registry',
    consumers: ['StaffWorkloadPanel', 'roleClusterNav.config'],
  }),
  Object.freeze({
    id: 'layouts-app-shell-shim',
    domain: 'layout',
    path: 'src/layouts/AppShell.tsx',
    purpose: 'Thin re-export shim — implementation lives in src/components/AppShell.tsx.',
    layer: 'compat',
    supersedes: ['src/components/AppShell.tsx'],
    consumers: [],
  }),
]);

/** Environment variables and their canonical parser modules. */
export const CANONICAL_ENV_VAR_REGISTRY: readonly CanonicalEnvVarEntry[] = Object.freeze([
  Object.freeze({ key: 'VITE_APP_NAME', parserModule: 'appConfig', purpose: 'Application display name.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_APP_VERSION', parserModule: 'appConfig', purpose: 'Semantic version shown in build metadata.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_APP_ENVIRONMENT', parserModule: 'appConfig', purpose: 'Deployment environment (local/development/staging/production).', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_APP_BUILD_DATE', parserModule: 'appConfig', purpose: 'Build timestamp for version surfaces.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_DEPLOYMENT_ID', parserModule: 'appConfig', purpose: 'Deployment identifier for telemetry.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_DEPLOYMENT_REGION', parserModule: 'appConfig', purpose: 'Deployment region metadata.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_GIT_COMMIT', parserModule: 'appConfig', purpose: 'Git commit SHA for build provenance.', aliases: ['VITE_GIT_COMMIT_SHA'], documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_GIT_BRANCH', parserModule: 'appConfig', purpose: 'Git branch for build provenance.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_DEPLOYED_AT', parserModule: 'appConfig', purpose: 'Deployment timestamp.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_API_URL', parserModule: 'appConfig', purpose: 'API origin (empty = same-origin Vite proxy).', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_WS_URL', parserModule: 'appConfig', purpose: 'WebSocket origin when split from SPA.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_API_TIMEOUT_MS', parserModule: 'apiEnv', purpose: 'Fetch timeout for apiClient (milliseconds).', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_ED_REALTIME_SSE_PATH', parserModule: 'emergencyRealtimeService', purpose: 'Emergency OS SSE stream path.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_ED_REALTIME_WS_PATH', parserModule: 'emergencyRealtimeService', purpose: 'Optional WebSocket path override.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_ED_REALTIME_POLL_MS', parserModule: 'emergencyRealtimeService', purpose: 'Realtime polling interval override.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_ED_SINGLE_APPLICATION', parserModule: 'edApplication.config', purpose: 'Fold extension URLs into single ED application.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_ENABLE_ANALYTICS', parserModule: 'appConfig', purpose: 'Enable analytics instrumentation.', aliases: ['VITE_ANALYTICS_ENABLED'], documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_ENABLE_CRASH_REPORTING', parserModule: 'appConfig', purpose: 'Enable Sentry crash reporting.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_SENTRY_DSN', parserModule: 'appConfig', purpose: 'Sentry DSN.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_SENTRY_ENVIRONMENT', parserModule: 'appConfig', purpose: 'Sentry environment tag.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_SENTRY_TRACES_SAMPLE_RATE', parserModule: 'appConfig', purpose: 'Sentry traces sample rate.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_SENTRY_PROFILES_SAMPLE_RATE', parserModule: 'appConfig', purpose: 'Sentry profiles sample rate.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_DEBUG', parserModule: 'appConfig', purpose: 'Verbose client debug logging.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_LOG_LEVEL', parserModule: 'appConfig', purpose: 'Client log level.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_ENABLE_PUSH_NOTIFICATIONS', parserModule: 'appConfig', purpose: 'Push notification feature flag.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_ENABLE_OFFLINE_MODE', parserModule: 'appConfig', purpose: 'Offline mode feature flag.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_ENABLE_BIOMETRIC_AUTH', parserModule: 'appConfig', purpose: 'Biometric auth feature flag.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_ENABLE_DEV_AUTH_BYPASS', parserModule: 'appConfig', purpose: 'Local/demo direct sign-in on /auth.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_DEMO_MODE', parserModule: 'appConfig', purpose: 'Hosted demo mode — shows Continue in Demo Mode.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_SIMULATION_MODE', parserModule: 'appConfig', purpose: 'Platform simulation/training mode toggle.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_ALLOW_LOCAL_DEMO_AUTH', parserModule: 'appConfig', purpose: 'Browser-only fallback demo tokens (dev-only default).', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_DEV_BEARER_TOKEN', parserModule: 'appConfig', purpose: 'Dev bearer token for local API calls.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_SHOW_DEMO_AUTH', parserModule: 'appConfig', purpose: 'Expose demo sign-in in production builds.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_HIDE_DIVISION_MODE', parserModule: 'appConfig', purpose: 'Hide legacy Division mode bypass on /auth.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_PLATFORM_ENTITLEMENTS', parserModule: 'appConfig', purpose: 'Filter nav by org entitlements.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_SINGLE_WORKSPACE_MODEL', parserModule: 'appConfig', purpose: 'Single workspace packaging model.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_COMMERCIAL_SURFACES', parserModule: 'appConfig', purpose: 'Show commercial/billing surfaces.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_STRICT_SAAS_ENTITLEMENTS', parserModule: 'appConfig', purpose: 'Strict SaaS entitlement enforcement.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_ASSET_AWARE_NAVIGATION', parserModule: 'appConfig', purpose: 'Asset-pack-aware navigation filtering.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_ORG_SCOPED_PLATFORM_READS', parserModule: 'appConfig', purpose: 'Scope platform reads to organization context.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_PRIVACY_POLICY_URL', parserModule: 'appConfig', purpose: 'Privacy policy URL.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_TERMS_OF_SERVICE_URL', parserModule: 'appConfig', purpose: 'Terms of service URL.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_SUPPORT_URL', parserModule: 'appConfig', purpose: 'Support portal URL.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_HIPAA_BAA_URL', parserModule: 'appConfig', purpose: 'HIPAA BAA URL.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_FIREBASE_API_KEY', parserModule: 'appConfig', purpose: 'Firebase API key.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_FIREBASE_AUTH_DOMAIN', parserModule: 'appConfig', purpose: 'Firebase auth domain.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_FIREBASE_PROJECT_ID', parserModule: 'appConfig', purpose: 'Firebase project ID.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_FIREBASE_STORAGE_BUCKET', parserModule: 'appConfig', purpose: 'Firebase storage bucket.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_FIREBASE_MESSAGING_SENDER_ID', parserModule: 'appConfig', purpose: 'Firebase messaging sender ID.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_FIREBASE_APP_ID', parserModule: 'appConfig', purpose: 'Firebase app ID.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_FIREBASE_MEASUREMENT_ID', parserModule: 'appConfig', purpose: 'Firebase measurement ID.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_FIREBASE_VAPID_KEY', parserModule: 'appConfig', purpose: 'Firebase VAPID key for push.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_FDA_API_KEY', parserModule: 'appConfig', purpose: 'FDA open API key.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_NIH_API_KEY', parserModule: 'appConfig', purpose: 'NIH open API key.', documentedIn: 'env.example' }),
  Object.freeze({ key: 'VITE_PUBMED_API_KEY', parserModule: 'appConfig', purpose: 'PubMed open API key.', documentedIn: 'env.example' }),
]);

export const CANONICAL_CONFIGURATION_CONTRACT = Object.freeze({
  engineId: 'canonical-configuration',
  registryEntryCount: CANONICAL_CONFIGURATION_REGISTRY.length,
  envVarCount: CANONICAL_ENV_VAR_REGISTRY.length,
  domainCount: CANONICAL_CONFIGURATION_DOMAINS.length,
  importFrom: 'src/config/canonicalConfiguration.ts',
  auditService: 'src/services/canonicalConfigurationAudit.ts',
  generatedOutputFile: 'docs/generated/configuration.md',
});

export function listCanonicalConfigurationByDomain(
  domain: CanonicalConfigurationDomain,
): readonly CanonicalConfigurationEntry[] {
  return CANONICAL_CONFIGURATION_REGISTRY.filter((entry) => entry.domain === domain);
}

export function getCanonicalConfigurationEntry(id: string): CanonicalConfigurationEntry | undefined {
  return CANONICAL_CONFIGURATION_REGISTRY.find((entry) => entry.id === id);
}