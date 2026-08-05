# Configuration sources

> Auto-generated from implementation. Do not edit manually.
> Regenerate: `npm run docs:generate`

**Entries:** 82

### app-config

Parses VITE_* environment variables from import.meta.env. [parser]

- **Source:** `src/config/appConfig.ts`
- **Status:** active

### env-config

Stable ENV_CONFIG projection for auth, API, and feature-gating consumers. [projection]

- **Source:** `src/config/env.config.ts`
- **Status:** active
- **Roles:** `src/config/appConfig.ts (direct feature reads)`

### env-example

Documents deployable VITE_* keys and local dev defaults. [audit]

- **Source:** `.env.example`
- **Status:** active

### feature-flag-constants

Shared FEATURE_FLAG_STATES and FEATURE_FLAG_CATEGORIES literals for frontend and backend. [registry]

- **Source:** `lib/featureFlags/constants.ts`
- **Status:** active

### feature-flags

FEATURE_FLAGS projection and FEATURE_FLAG_REGISTRY catalog. [registry]

- **Source:** `src/config/featureFlags.config.ts`
- **Status:** active
- **Roles:** `src/config/appConfig.ts (direct features.* reads)`, `backend/src/config/featureFlags.config.ts (duplicate state/category enums)`

### suite-entitlements

SaaS suite entitlement keys aligned to platform packaging flags. [registry]

- **Source:** `src/config/suiteFeatureEntitlements.config.ts`
- **Status:** active

### routes

CANONICAL_ROUTES, ROUTE_RECORDS, alias groups, and help topic bindings. [registry]

- **Source:** `src/config/routes.config.ts`
- **Status:** active

### profile-console-routes

Profile, billing, and SaaS settings console route table. [registry]

- **Source:** `src/config/profileConsoleRoutes.ts`
- **Status:** active

### public-console-routes

Public legal notices, help center, and build metadata routes. [registry]

- **Source:** `src/config/publicConsoleRoutes.ts`
- **Status:** active

### admin-console-routes

Nested admin operations console child routes and redirects. [registry]

- **Source:** `src/config/adminConsoleRoutes.ts`
- **Status:** active

### training-console-routes

Training, simulation, competency, and credentialing console routes. [registry]

- **Source:** `src/config/trainingConsoleRoutes.ts`
- **Status:** active

### app-startup

Canonical startup landing resolver and ED journey page order. [registry]

- **Source:** `src/config/appStartupModel.ts`
- **Status:** active

### ed-application

Single-application ED mode, core routes, and extension redirects. [registry]

- **Source:** `src/config/edApplication.config.ts`
- **Status:** active

### page-architecture

Page purpose, owner roles, and workflow bindings for living documentation. [registry]

- **Source:** `src/config/caredroidPageArchitecture.config.ts`
- **Status:** active

### unified-navigation

NAVIGATION_ITEMS, pilot mode filtering, and role-aware nav visibility. [registry]

- **Source:** `src/config/unified-navigation.config.ts`
- **Status:** active

### navigation-compat

Compatibility projections (APP_SHELL_NAV_ITEMS, QUICK_COMMAND_DESTINATION_ITEMS). [compat]

- **Source:** `src/config/navigation.config.ts`
- **Status:** redirect
- **Roles:** `src/config/unified-navigation.config.ts`

### primary-navigation-compat

Legacy re-export shim for navigation.config projections. [compat]

- **Source:** `src/navigation/primaryNavigation.ts`
- **Status:** redirect
- **Roles:** `src/config/navigation.config.ts`

### role-cluster-nav

Role-cluster navigation groupings for operational dashboards. [registry]

- **Source:** `src/config/roleClusterNav.config.ts`
- **Status:** active

### emergency-role-navigation

Emergency role default routes and navigation emphasis. [registry]

- **Source:** `src/config/emergencyRoleNavigationModel.ts`
- **Status:** active

### auth

AUTH_CONFIG — routes, token keys, and demo auth exposure. [registry]

- **Source:** `src/config/auth.config.ts`
- **Status:** active

### api-routes

API_ROUTES constants and normalizeApiPath for Nest /api prefix. [registry]

- **Source:** `src/config/api.config.ts`
- **Status:** active

### api-env

API origin resolution, timeout, and WebSocket origin helpers. [parser]

- **Source:** `src/config/apiEnv.ts`
- **Status:** active

### backend-capabilities

BACKEND_API_CAPABILITY_STATUS — REAL/DEMO/DISABLED route inventory. [registry]

- **Source:** `src/config/backendApiCapabilities.ts`
- **Status:** active

### page-api-bindings

Page ↔ endpoint wiring with wired/partial/local-only modes. [registry]

- **Source:** `src/config/pageApiBinding.registry.ts`
- **Status:** active

### emergency-permissions

EMERGENCY_PERMISSION_KEYS and permission registry catalog. [registry]

- **Source:** `src/config/emergencyPermissionRegistry.ts`
- **Status:** active

### security-model

Unified security contract — PHI actions, session policy, and vocabulary registry. [registry]

- **Source:** `src/config/securityModel.ts`
- **Status:** active

### security-barrel

Security barrel — re-exports securityModel, bridge, and backend catalog. [barrel]

- **Source:** `src/config/security.ts`
- **Status:** active
- **Roles:** `src/config/securityModel.ts (direct imports)`, `src/config/backendPermissionCatalog.ts (direct imports)`

### security-permission-bridge

Maps emergency dot, CareDroid colon, and backend RBAC permission keys. [projection]

- **Source:** `src/config/securityPermissionBridge.ts`
- **Status:** active
- **Roles:** `src/contexts/UserContext.tsx (inline RolePermissions fallback)`

### backend-permission-catalog

Frontend mirror of backend Permission enum strings. [registry]

- **Source:** `src/config/backendPermissionCatalog.ts`
- **Status:** active
- **Roles:** `src/contexts/UserContext.tsx (inline Permission enum)`

### backend-role-permissions

Backend role → permission fallback map for securityAccessService. [projection]

- **Source:** `src/lib/users/backendRolePermissions.ts`
- **Status:** active

### emergency-role-permissions

EMERGENCY_ROLE_IDS, labels, and role-to-permission resolution. [registry]

- **Source:** `src/config/emergencyRolePermissions.ts`
- **Status:** active

### legacy-role-permissions-utils

Legacy MD/RN boolean flags — delegates to canonical permission registry. [compat]

- **Source:** `src/utils/emergencyRolePermissions.ts`
- **Status:** redirect
- **Roles:** `src/config/emergencyPermissionRegistry.ts`

### emergency-role-action-matrix

Role × action matrix for emergency operational surfaces. [registry]

- **Source:** `src/config/emergencyRoleActionMatrix.ts`
- **Status:** active

### emergency-role-screen-matrix

Role × screen visibility matrix for ED surfaces. [registry]

- **Source:** `src/config/emergencyRoleScreenMatrix.ts`
- **Status:** active

### practitioner-surface-policy

Practitioner role surface visibility and cleanup policy. [registry]

- **Source:** `src/config/practitionerRoleSurfacePolicy.ts`
- **Status:** active

### ai-chief-orchestration

AI Chief monitoring domains, safety statement, and endpoint bindings. [registry]

- **Source:** `src/config/aiChiefOrchestrationModel.ts`
- **Status:** active

### unified-ai-node

PLATFORM_AI_SERVICE_NODE_MAP — 17 governed platform AI services. [registry]

- **Source:** `src/config/careDroidUnifiedAiNode.config.ts`
- **Status:** active

### theme-tokens

THEME_CONFIG — CSS entry points and programmatic token projection. [registry]

- **Source:** `src/config/theme.tokens.ts`
- **Status:** active

### design-system

Barrel for tokens, semantic colors, medical theme, and CDL exports. [barrel]

- **Source:** `src/config/designSystem.ts`
- **Status:** active

### design-language

CDL principles, semantic roles, shell zones, and component standards. [registry]

- **Source:** `src/config/caredroidDesignLanguage.ts`
- **Status:** active

### semantic-colors

Operational tone to semantic color role mapping. [registry]

- **Source:** `src/config/semanticColorSystem.ts`
- **Status:** active

### layout-design-tokens

Spacing, radii, typography, elevation, and breakpoint tokens. [registry]

- **Source:** `src/layout/designTokens.ts`
- **Status:** active

### emergency-platform

Emergency platform barrel and EMERGENCY_PLATFORM_CONTRACT engine map. [barrel]

- **Source:** `src/config/emergencyPlatform.config.ts`
- **Status:** active

### unified-service-registry

Health probes, service domains, and obsolete service redirects. [registry]

- **Source:** `src/config/unifiedServiceRegistry.config.ts`
- **Status:** active

### unified-patient-workflow

Arrival-to-discharge patient workflow steps and route bindings. [registry]

- **Source:** `src/config/unifiedPatientWorkflowModel.ts`
- **Status:** active

### unified-workflow-automation

Workflow automation domains, triggers, and safety contract. [registry]

- **Source:** `src/config/unifiedWorkflowAutomationModel.ts`
- **Status:** active

### operational-intelligence-constants

Shared OI safety constants — disclaimers, blocked autonomous actions, and rule baseline version. [registry]

- **Source:** `lib/operational-intelligence/constants.ts`
- **Status:** active

### operational-intelligence-engine

Shared rule-based operational intelligence snapshot builder for backend and frontend fallback. [registry]

- **Source:** `lib/operational-intelligence/buildSnapshot.ts`
- **Status:** active

### unified-operational-intelligence

Event-driven operational intelligence domains and contract. [registry]

- **Source:** `src/config/unifiedOperationalIntelligenceModel.ts`
- **Status:** active

### unified-oi-metric-registry

Bridges header/whiteboard metrics with command-center drill-down routes. [projection]

- **Source:** `src/config/unifiedOperationalIntelligence.registry.ts`
- **Status:** active
- **Roles:** `src/config/operationalMetricsModel.ts (direct route wiring)`, `src/config/hospitalCommandCenterRolePolicy.ts (direct metric routes)`

### operational-metrics-model

Header and whiteboard operational metric keys and route bindings. [registry]

- **Source:** `src/config/operationalMetricsModel.ts`
- **Status:** active

### hospital-command-center-role-policy

Command-center actionable metrics and role-scoped metric visibility. [registry]

- **Source:** `src/config/hospitalCommandCenterRolePolicy.ts`
- **Status:** active

### emergency-pipeline-model

Reception pipeline stages, surface zones, and role landing resolution. [registry]

- **Source:** `src/config/emergencyPipelineModel.ts`
- **Status:** active

### care-droid-screen-mode-registry

Canonical screen mode registry — widgets, actions, density, and PHI per role surface. [registry]

- **Source:** `src/config/careDroidScreenModeRegistry.ts`
- **Status:** active

### unified-knowledge-graph

Entity types, relationships, and knowledge graph contract. [registry]

- **Source:** `src/config/unifiedApplicationKnowledgeGraphModel.ts`
- **Status:** active

### three-minute-mission

Three-minute mission timer phases and operational copy. [registry]

- **Source:** `src/config/threeMinuteMissionModel.ts`
- **Status:** active

### hospital-operating-system

Hospital department model and patient journey position resolver. [registry]

- **Source:** `src/config/hospitalOperatingSystemModel.ts`
- **Status:** active

### care-droid-interaction

Feedback timing, confirmation copy, shortcuts, and guidance dismiss key. [registry]

- **Source:** `src/config/careDroidInteractionModel.ts`
- **Status:** active

### layout

LAYOUT_SCROLL_CONTRACT — viewport owner and scroll container rules. [registry]

- **Source:** `src/config/layout.config.ts`
- **Status:** active

### workspace

CARE_WORKSPACES catalog for multi-workspace navigation. [registry]

- **Source:** `src/config/workspace.config.ts`
- **Status:** active

### living-documentation

Living doc sections, superseded static docs, and reusable component catalog. [registry]

- **Source:** `src/config/livingDocumentationModel.ts`
- **Status:** active

### living-documentation-contextual-help

Route-prefix contextual help entries linked to HelpHub and workflow steps. [registry]

- **Source:** `src/config/livingDocumentationContextualHelp.ts`
- **Status:** active

### canonical-configuration

This registry — authoritative inventory of all configuration sources. [registry]

- **Source:** `src/config/canonicalConfigurationModel.ts`
- **Status:** active

### emergency-architecture-registry

Harmonization audit — classifies duplicates, legacy, and future modules. [audit]

- **Source:** `src/config/emergencyArchitectureRegistry.ts`
- **Status:** active

### observability-model

Unified observability contract — events, workflow spans, API performance thresholds. [registry]

- **Source:** `src/config/observabilityModel.ts`
- **Status:** active

### platform-cohesion

Canonical stack map — identity, access, navigation, and integration boundaries. [registry]

- **Source:** `src/config/platformCohesionModel.ts`
- **Status:** active

### operational-role-simulation

Role simulation contract — nav, permissions, routes, and workflow spine per persona. [registry]

- **Source:** `src/config/operationalRoleSimulationModel.ts`
- **Status:** active

### role-operational-dashboard

Role-based ED dashboard matrix — information hierarchy and primary surfaces. [registry]

- **Source:** `src/config/roleOperationalDashboardModel.ts`
- **Status:** active

### layouts-app-shell-shim

Thin re-export shim — implementation lives in src/components/AppShell.tsx. [compat]

- **Source:** `src/layouts/AppShell.tsx`
- **Status:** redirect
- **Roles:** `src/components/AppShell.tsx`

### VITE_APP_NAME

Application display name. (parser: appConfig)

- **Source:** `.env.example`
- **Status:** active

### VITE_APP_VERSION

Semantic version shown in build metadata. (parser: appConfig)

- **Source:** `.env.example`
- **Status:** active

### VITE_APP_ENVIRONMENT

Deployment environment (local/development/staging/production). (parser: appConfig)

- **Source:** `.env.example`
- **Status:** active

### VITE_APP_BUILD_DATE

Build timestamp for version surfaces. (parser: appConfig)

- **Source:** `.env.example`
- **Status:** active

### VITE_DEPLOYMENT_ID

Deployment identifier for telemetry. (parser: appConfig)

- **Source:** `.env.example`
- **Status:** active

### VITE_DEPLOYMENT_REGION

Deployment region metadata. (parser: appConfig)

- **Source:** `.env.example`
- **Status:** active

### VITE_GIT_COMMIT

Git commit SHA for build provenance. (parser: appConfig)

- **Source:** `.env.example`
- **Status:** active

### VITE_GIT_BRANCH

Git branch for build provenance. (parser: appConfig)

- **Source:** `.env.example`
- **Status:** active

### VITE_DEPLOYED_AT

Deployment timestamp. (parser: appConfig)

- **Source:** `.env.example`
- **Status:** active

### VITE_API_URL

API origin (empty = same-origin Vite proxy). (parser: appConfig)

- **Source:** `.env.example`
- **Status:** active

### VITE_WS_URL

WebSocket origin when split from SPA. (parser: appConfig)

- **Source:** `.env.example`
- **Status:** active

### VITE_API_TIMEOUT_MS

Fetch timeout for apiClient (milliseconds). (parser: apiEnv)

- **Source:** `.env.example`
- **Status:** active

### Configuration audit

69 registry entries, 55 env vars, 1 conflicts (4 compat shims).

- **Source:** `canonicalConfigurationAudit.ts`
- **Status:** active
