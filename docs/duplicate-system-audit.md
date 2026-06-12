# Duplicate System Audit

Generated: 2026-06-12 (regenerate with `npm run duplicate-system-audit:write-docs`)

## Purpose

Identify competing sources of truth that cause drift, double registration, or ambiguous ownership. Each section lists duplicates, risk, recommended action (**wire** | **merge** | **quarantine** | **legacy**), and the **canonical source** to keep.

## Executive summary

| Metric | Value |
|--------|------:|
| Audit sections | 11 |
| Duplicate findings documented | 35 |
| CANONICAL_ROUTES ∩ TOOL_LAUNCH_PATHS (same path string) | 27 |
| POST executor ids (frontend) | drug-interactions, lab-interpreter, sofa-calculator |
| REGISTRY_ID_TO_ORCHESTRATOR_TOOL entries | 3 |

### Top consolidation priorities

1. **Routes** — Single path map in `routes.config.js`; stop duplicating in `TOOL_LAUNCH_PATHS`.
2. **Inventories** — `toolInventory.js` is the SPA launch authority; `assetInventory.js` mounts it into product/pack/workspace/role metadata.
3. **Workspace** — Merge three workspace models under API `enabledToolIds`; dedupe `LEGACY_TOOL_ID_ALIASES`.
4. **Dashboards** — Keep `CommandDashboard` as home; ED Copilot owns assistant chat in the shell.
5. **Executors** — Backend `tool-orchestrator.registry.ts` owns ids; frontend mirrors via contract tests only.
6. **Pack routes** — One pack marketplace URL under organization settings.

## Canonical source matrix

| Domain | Canonical source | Do not duplicate in |
|--------|------------------|---------------------|
| Routes | `src/config/routes.config.js` | App.jsx (paths only), TOOL_LAUNCH_PATHS |
| Router mount | `src/App.jsx` | — |
| Layouts | `src/layout/AppShell.jsx` | Page-level shells |
| AppShell rail | `src/layout/AppShell.jsx` + `APP_SHELL_NAV_ITEMS` | Inline nav arrays |
| Navigation | `src/config/navigation.config.js` | `primaryNavigation.js` (shim only) |
| Tool inventory | `src/data/toolInventory.js` | Ad-hoc tool lists in pages |
| Tool ids / NLU | `src/data/clinicalToolIdContract.js` | Random string ids in components |
| NLU catalog | `src/data/clinicalIntentToolCatalog.js` | Duplicate registry rows |
| Calculator hub | `src/data/calculatorHubManifest.js` | Calculators.jsx card arrays |
| Calculator routes | `src/routes/clinicalToolRoutes.js` | App.jsx one-off paths |
| Command home | `src/pages/CommandDashboard.jsx` + `commandDashboardModel.js` | platformOperatingSystem tiles |
| Assistant UI | `src/components/ChatInterface.jsx` (ED Copilot panel) | Removed `Dashboard.jsx` assistant page |
| Auth | `src/config/auth.config.js` + `routes.config.js` | Inline token keys |
| API paths | `src/config/api.config.js` | Hard-coded `/api/...` strings |
| Workspace (server) | `GET/POST /api/workspaces` | localStorage-only gating |
| Workspace (UX) | `src/data/workspaceArchitecture.js` via `workspace.config.js` | Duplicate CARE_WORKSPACES |
| Asset entitlements | `backend/.../platform-asset-seed.data.ts` + DB | `buildAssetRegistry()` demo |
| Asset access (client) | `platformAssetsApi` + `UserIdentityContext` + `assetInventory.js` | Empty pack/product projections |
| Tool launch (client) | `toolInventory.js` + `registryToolLaunch.js` | — |
| Executors | `backend/.../tool-orchestrator.registry.ts` | Extra REGISTERED lists in frontend |

## Routes

**Canonical:** `src/config/routes.config.js` (`CANONICAL_ROUTES`, alias groups)

**Secondary (allowed):** `src/App.jsx` (React Router mount table only — must not invent new paths)


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Canonical route map vs tool launch paths | routes.config.js → CANONICAL_ROUTES; clinicalToolIdContract.js → TOOL_LAUNCH_PATHS | Drift when adding fleet/simulation paths to one file only | merge | Import CANONICAL_ROUTES into clinicalToolIdContract (or shared routes module); deprecate overlapping TOOL_LAUNCH_PATHS keys. |
| App.jsx inline route table | src/App.jsx routes[] (~212 paths); routes.config.js | New routes added only in App.jsx bypass alias + nav contracts | wire | Keep App.jsx as renderer; validate every `path:` exists in CANONICAL_ROUTES or ROUTE_ALIAS_GROUPS via routeHealth tests. |
| Calculator deep links | clinicalToolRoutes.js → CALCULATOR_ROUTE_DEFS; App.jsx LegacyCalculatorRouteRedirect for /tools/calculators; toolInventory per-tool `route` | Slug/path mismatch between hub and inventory | merge | Canonical: `clinicalToolRoutes.js` indexes calculator slugs; App.jsx keeps one Copilot redirect surface for calculator paths. |
| Pack marketplace URLs | /asset-packs; /settings/organization/packs | Same component is mounted in product discovery and organization-admin contexts | legacy | Keep `/asset-packs` as product/pack discovery and `/settings/organization/packs` as organization entitlement management; both must share `PackMarketplace` and route-health coverage. |
| Workflow surfaces | /automation → WorkflowAutomationBuilder; /workflows → WorkflowBuilderPage (PlatformOS) | Two workflow UIs under different nav ids | merge | Pick one workflow builder (Platform OS `WorkflowBuilderPage` or legacy `WorkflowAutomationBuilder`); alias the other route. |
| Operations entry points | /operations; /operations-center; WORKSPACE_ROUTE_SHORTCUTS.commandCenter → /dashboard | Ops vs command center naming confusion | legacy | Canonical ops hub: `CANONICAL_ROUTES.operations`; document /operations-center as digital ops center alias. |

## Layouts

**Canonical:** `src/layout/AppShell.jsx` (shared app chrome)


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Shell variants | AppShell.jsx | Resolved — AppShell owns route chrome. | done | Canonical shell: AppShell; use shared CareDroid primitives inside pages for content width only. |
| Ops demo layout class | .ops-demo-page on simulation/lab/3D pages | Parallel layout CSS systems | merge | Migrate ops-demo pages to shared design tokens and CareDroid primitives. |

## Sidebars

**Canonical:** `src/layout/AppShell.jsx` + `APP_SHELL_NAV_ITEMS` from navigation.config.js


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Sidebar nav item sources | APP_SHELL_NAV_ITEMS; PRIMARY_SIDEBAR_NAV_ITEMS; QUICK_COMMAND_DESTINATION_ITEMS | Route surfaces can drift if they bypass navigation.config.js | done | Canonical AppShell rail: APP_SHELL_NAV_ITEMS; other navigation projections must derive from navigation.config.js. |
| Tool list in sidebar | sidebarToolPresentation.js; historical getSidebarToolRegistryProjection in tests | Tests may reference removed sidebar tool partition API | legacy | Canonical tool sidebar data: getUserFacingToolRegistryProjection + sidebarToolPresentation. |

## Navigation

**Canonical:** `src/config/navigation.config.js`

**Secondary (allowed):** `src/navigation/primaryNavigation.js` (re-export shim only)


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Primary nav vs quick command | PRIMARY_NAV_ITEMS; QUICK_COMMAND_DESTINATION_ITEMS | Duplicate destinations with different labels | merge | Derive QUICK_COMMAND_DESTINATION_ITEMS from PRIMARY_NAV_ITEMS + tool inventory search index. |
| Legacy path matching | navigation.config legacyPaths/matchPaths; routes.config ROUTE_ALIAS_GROUPS | Alias defined in two modules | merge | Canonical aliases: routes.config.js; navigation imports getRouteAliasTarget(). |
| Compatibility re-export | navigation/primaryNavigation.js; navigation.config.js | Low if re-export only | legacy | Keep primaryNavigation.js as thin re-export; ban new constants there. |

## Inventories

**Canonical:** Pipeline: `clinicalToolIdContract.js` → `toolRegistry.js` → `toolInventory.js` (canonical launch records)


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Tool metadata layers | toolRegistry.js; clinicalIntentToolCatalog.js; toolInventory.js; segmentInventory.js; toolVisibilityMatrix.js | Five layers can disagree on id, path, executor | merge | Canonical runtime: toolInventory only; catalog/segment/matrix are generated projections or test artifacts. |
| Sidebar/catalog projections | getUserFacingToolRegistryProjection; getSidebarToolRegistryProjection; getCatalogToolInventory | Different filters for same ids | wire | Canonical: getUserFacingToolRegistryProjection; others call it internally. |
| Backend tools API | GET /api/tools; toolInventory static registry | API list can drift from SPA registry | wire | Generate /api/tools from same build step as toolInventory or treat API as read-only mirror. |

## Calculators

**Canonical:** `toolInventory.js` (calculator records) + `calculatorHubManifest.js` (hub cards/forms projection)

**Secondary (allowed):** `Calculators.jsx` + `CalculatorInterface` for UI


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Builtin calculator definitions | clinicalToolIdContract BUILTIN_CALC_*; clinicalIntentToolCatalog builtinUiCalculators; calculatorHubManifest BUILTIN_CALCULATOR_SWITCH_SLUGS | Slug/id drift (e.g. registry id vs hub slug) | merge | Canonical slugs: BUILTIN_CALC in clinicalToolIdContract; hub manifest reads toolInventory only. |
| Specialty calculator modules | cardiologyCalculators.jsx; pulmonologyCalculators.jsx; nephrologyCalculators.jsx; …12 pack JSX group files | Parallel registration vs hub — ids must match inventory | legacy | Keep as composition modules imported by Calculators.jsx; do not register routes separately. |
| Route registration | CALCULATOR_ROUTE_DEFS; Calculators hub route /tools/calculators; App wildcard tools routes | Hub-only tools lack dedicated App route (by design) | legacy | Dedicated routes only when hasDedicatedForm; hub resolves ?calc= slug. |

## Dashboards

**Canonical:** `/dashboard` → CommandDashboard.jsx + `commandDashboardModel.js`


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Home vs assistant | CommandDashboard (/dashboard); ChatInterface ED Copilot panel | Resolved — former Dashboard.jsx assistant page was removed. | legacy | Keep /dashboard owned by CommandDashboard and /assistant as an ED Copilot alias into the shell. |
| Platform dashboard registry | platformOperatingSystem.js PLATFORM_DASHBOARDS; commandDashboardModel widgets | Demo OS dashboards vs command dashboard tiles | wire | Canonical command UX: commandDashboardModel; platformOperatingSystem for Platform OS pages only. |
| Domain dashboards (15+ pages) | AnalyticsDashboard; CostAnalyticsDashboard; AiCommandCenterDashboard; MemoryDashboard; TrainingDashboard; LaboratoryDashboard; MedicalIotDashboard; HospitalMapDashboard; FleetDashboard; DigitalOperationsCenter; OutcomesDashboardPage | Overlapping KPIs across ops/analytics pages | wire | Map each dashboard to one asset id in platform_assets; link from command dashboard via assetRecommendation. |

## Auth configs

**Canonical:** `src/config/auth.config.js` + `src/config/routes.config.js` (auth paths)

**Secondary (allowed):** `src/config/api.config.js` (endpoints), `env.config.js` + `featureFlags.config.js` (gates)


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Auth path aliases | AUTH_PATH_ALIASES; AUTH_SIGNUP_PATH_ALIASES | Shared /signup paths registered twice in App | legacy | Canonical: AUTH_PATH_ALIASES; signup subset should reference same array or dedupe in routes.config. |
| Token storage keys | caredroid_access_token; authToken (legacy) | Stale sessions after key migration | legacy | Canonical: AUTH_CONFIG.tokenStorageKey; read legacy once on boot then migrate. |
| Demo/dev auth | auth.config demo getters; featureFlags enableDevAuthBypass; devAuthBypass.js | Bypass enabled via multiple flags | merge | Single gate: featureFlags.config → env.config → auth.config demo.exposed. |

## Workspace configs

**Canonical:** Backend `GET/POST /api/workspaces` + `enabledToolIds` / `enabledModules` (tenant authority)


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Three workspace models | WorkspaceContext.jsx (localStorage careDroid.workspaces.v1); workspaceArchitecture.js CARE_WORKSPACES; Backend workspace entities + UserIdentityContext | UI filter workspace ≠ server workspace ≠ care workspace cards | merge | Canonical: API workspace for enforcement; CARE_WORKSPACES for UX labels; migrate WorkspaceContext to read API. |
| Legacy tool id aliases (duplicated) | platform-asset-seed.data.ts LEGACY_TOOL_ID_ALIASES; assetEntitlements.js LEGACY_TOOL_ID_ALIASES | Alias map drift breaks launch gating | merge | Generate frontend map from backend seed at build time, or share JSON artifact in /shared. |
| Workspace route shortcuts | WORKSPACE_ROUTE_SHORTCUTS; CANONICAL_ROUTES; PRIMARY_NAV_ITEMS.matchPaths | Same path in three configs | wire | WORKSPACE_ROUTE_SHORTCUTS should import paths from CANONICAL_ROUTES. |

## Asset registries

**Canonical:** Backend `platform_assets` + `asset_packs` (seed: platform-asset-seed.data.ts) for entitlements

**Secondary (allowed):** Frontend launch: `toolInventory.js`


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Dual registry (tools vs assets) | toolInventory.js user-facing launch rows; SEED_PLATFORM_ASSETS; assetInventory.js mounted projection | Manual projection drift if backend seed and frontend launch metadata diverge | wire | Canonical launch: toolInventory; canonical entitlement: platform_assets; canonical frontend mount: assetInventory projection. |
| Frontend projections | assetInventory.js; assetAccess.js; assetEntitlements.js; buildAssetRegistry() demo | Projection must continue to include pack/product/workspace/role metadata for every user-facing asset | wire | Canonical client context: UserIdentityContext + platformAssetsApi GET /api/platform/context; assetInventory derives offline/demo metadata when backend context is unavailable. |
| Duplicate asset packs | emergency-medicine pack; emergency-department-pack (same assetIds) | Duplicate SKUs and entitlements | merge | Merge to one ED pack id; keep other slug as alias in product catalog. |
| Product catalog vs platform assets | product-catalog Product entities; platform_assets; solution packs docs | Commercial product id ≠ asset id | wire | Canonical commercial: Product maps to packIds; assets remain operational unit. |

## Executor mappings

**Canonical:** Backend `tool-orchestrator.registry.ts` (`REGISTERED_EXECUTOR_TOOL_IDS`, `REGISTRY_ID_TO_EXECUTOR_TOOL_ID`)


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Frontend orchestrator mirror | clinicalToolIdContract ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS; REGISTRY_ID_TO_ORCHESTRATOR_TOOL; backendApiCapabilities BACKEND_EXECUTOR_NLU_TOOL_IDS | Copy-paste drift (tests catch) | legacy | Canonical: backend registry; frontend parses it in drift tests (already in executorMappingAudit.test.js). |
| Registry id vs executor id | sofa-score (registry); sofa-calculator (executor); drug-check / drug-interactions | Inventory TOOL_EXECUTOR_STATUS.REGISTERED uses registry id | wire | Canonical POST id: executor id; map at boundary via REGISTRY_ID_TO_ORCHESTRATOR_TOOL only. |
| NLU catalog postExecutable flags | clinicalIntentToolCatalog postExecutable; ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS | Catalog claims executable without backend registerTool() | wire | Generate postExecutable from backend registry in CI. |

## Route path overlap detail (CANONICAL_ROUTES ∩ TOOL_LAUNCH_PATHS)

| Key | Path |
|-----|------|
| toolsOverview | /tools |
| toolsCatalog | /tools/catalog |
| calculatorsHub | /tools/calculators |
| operationsCenter | /operations |
| protocols | /protocols |
| research | /research |
| documentation | /documentation |
| knowledgeGraph | /knowledge-graph |
| predictiveAnalytics | /predictive-analytics |
| assistant | /assistant |
| clinicalDecisionSupport | /clinical-decision-support |
| competencies | /competencies |
| credentials | /credentials |
| simulation | /simulation |
| simulationOutcomes | /simulation/outcomes |
| laboratory | /laboratory |
| medical3dViewer | /3d-viewer |
| artifacts | /artifacts |
| aiEvaluation | /ai-evaluation |
| aiGovernance | /ai-governance |
| aiSecurity | /security |
| liveTrackingMap | /live-map |
| hospitalMap | /hospital-map |
| medicalIot | /medical-iot |
| deviceFleet | /devices |
| fleetCommand | /fleet/command |
| fleetMap | /fleet/map |

## App.jsx paths not listed in CANONICAL_ROUTES (sample)

- `/`
- `/auth/callback`
- `/emergency`
- `/emergency/pulse`
- `/emergency/shift`
- `/ai-command-center`
- `/analytics`
- `/costs`
- `/memory`
- `/training`
- `/fleet/predictive-maintenance`
- `/fleet/route-optimizer`
- `/profile/activity`
- `/profile/preferences`
- `/profile/workspaces`
- `/profile/security`
- `/profile-settings`
- `/organization/settings`
- `/notification-preferences`
- `/two-factor-setup`
- `/biometric-setup`
- `/consent`
- `/consent-history`
- `/team`
- `*`

_Many are dynamic tool routes, org/commercial pages, or profile subpaths — extend CANONICAL_ROUTES or document as extensions._

## Action legend

| Action | Meaning |
|--------|---------|
| **wire** | Connect existing duplicate to canonical source (import, generate, or validate) |
| **merge** | Collapse two modules/URLs into one; keep redirects during migration |
| **quarantine** | Mark deprecated; no new references; remove in cleanup pass |
| **legacy** | Intentional alias/compat layer; document and test only |

## Appendix

- Related: [orphan-detection-report.md](./orphan-detection-report.md), [saas-compliance-audit.md](./saas-compliance-audit.md)
- Contract tests: `src/config/canonicalConfig.contract.test.js`, `src/data/executorMappingAudit.test.js`
- Generator: `src/data/duplicateSystemAudit.js`

