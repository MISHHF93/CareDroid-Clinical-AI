# Duplicate System Audit

Generated: 2026-08-05 (regenerate with `npm run duplicate-system-audit:write-docs`)

## Purpose

Identify competing sources of truth that cause drift, double registration, or ambiguous ownership. Each section lists duplicates, risk, recommended action (**wire** | **merge** | **quarantine** | **legacy**), and the **canonical source** to keep.

## Executive summary

| Metric | Value |
|--------|------:|
| Audit sections | 12 |
| Duplicate findings documented | 38 |
| CANONICAL_ROUTES ∩ TOOL_LAUNCH_PATHS (same path string) | 33 |
| POST executor ids (frontend) | aa-gradient, abcd2, abg-interpreter, anion-gap, apache2-calculator, canadian-c-spine, cha2ds2vasc-calculator, chads2, corrected-calcium, corrected-sodium, drug-interactions, duke-treadmill-score, fena, feurea, four-score, framingham-risk, gcs-calculator, grace-acs, has-bled, heart-score, hunt-hess-scale, ich-score, lab-interpreter, mews, modified-rankin-scale, news2, nexus-cspine, osmolal-gap, pao2-fio2-ratio, pecarn-head, revised-trauma-score, reynolds-risk-score, rox-index, serum-osmolality, shock-index, sofa-calculator, timi-ua-nstemi, wells-dvt-calculator, wells-pe |
| REGISTRY_ID_TO_ORCHESTRATOR_TOOL entries | 40 |

### Top consolidation priorities

1. **Routes** — Single path map in `routes.config.js`; stop duplicating in `TOOL_LAUNCH_PATHS`.
2. **Inventories** — `toolInventory.js` is the SPA launch authority; `assetInventory.ts` mounts it into product/pack/workspace/role metadata.
3. **Workspace** — Merge three workspace models under API `enabledToolIds`; dedupe `LEGACY_TOOL_ID_ALIASES`.
4. **Dashboards** — Keep `CommandDashboard` as home; ED Copilot owns assistant chat in the shell.
5. **Executors** — Backend `tool-orchestrator.registry.ts` owns ids; frontend mirrors via contract tests only.
6. **Pack routes** — One pack marketplace URL under organization settings.

## Canonical source matrix

| Domain | Canonical source | Do not duplicate in |
|--------|------------------|---------------------|
| Routes | `src/config/routes.config.ts` | router.tsx (invent new paths), TOOL_LAUNCH_PATHS |
| Router mount | `src/app/router.tsx` | — |
| Layouts | `src/components/AppShell.tsx` | `src/layouts/AppShell.tsx` (shim), page-level shells |
| AppShell rail | `src/components/AppShell.tsx` + `NAVIGATION_ITEMS` | Inline nav arrays |
| Navigation | `src/config/unified-navigation.config.ts` | `navigation.config.js`, `primaryNavigation.js` (shims/projections only) |
| Tool inventory | `src/data/toolInventory.js` | Ad-hoc tool lists in pages |
| Tool ids / NLU | `src/data/clinicalToolIdContract.ts` | Random string ids in components |
| NLU catalog | `src/data/clinicalIntentToolCatalog.ts` | Duplicate registry rows |
| Calculator hub | `src/data/calculatorHubManifest.ts` | Calculators.jsx card arrays |
| Calculator routes | `src/routes/clinicalToolRoutes.ts` | router.tsx one-off paths |
| Command home | `src/pages/CommandDashboard.jsx` + `commandDashboardModel.ts` | platformOperatingSystem tiles |
| Assistant UI | `src/components/ChatInterface.tsx` (ED Copilot panel) | Removed `Dashboard.jsx` assistant page |
| Auth | `src/config/auth.config.ts` + `routes.config.js` | Inline token keys |
| API paths | `src/config/api.config.ts` | Hard-coded `/api/...` strings |
| Workspace (server) | `GET/POST /api/workspaces` | localStorage-only gating |
| Workspace (UX) | `src/data/workspaceArchitecture.ts` via `workspace.config.js` | Duplicate CARE_WORKSPACES |
| Asset entitlements | `backend/.../platform-asset-seed.data.ts` + DB | `buildAssetRegistry()` demo |
| Asset access (client) | `platformAssetsApi` + `UserIdentityContext` + `assetInventory.ts` | Empty pack/product projections |
| Tool launch (client) | `toolInventory.js` + `registryToolLaunch.js` | — |
| Executors | `backend/.../tool-orchestrator.registry.ts` | Extra REGISTERED lists in frontend |

## Routes

**Canonical:** `src/config/routes.config.ts` (`CANONICAL_ROUTES`, alias groups)

**Secondary (allowed):** `src/app/router.tsx` (React Router mount table only — must not invent new paths)


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Canonical route map vs tool launch paths | routes.config.js → CANONICAL_ROUTES; clinicalToolIdContract.js → TOOL_LAUNCH_PATHS | Drift when adding fleet/simulation paths to one file only | merge | Import CANONICAL_ROUTES into clinicalToolIdContract (or shared routes module); deprecate overlapping TOOL_LAUNCH_PATHS keys. |
| Router mount table vs canonical routes | src/app/router.tsx (React Router mount table); routes.config.ts | New routes added only in router.tsx bypass alias + nav contracts | done | Done: src/routing/routeHealth.ts scans router.tsx and cross-checks every path against CANONICAL_APP_ROUTE_TREE/LEGACY_EMERGENCY_ROUTE_REDIRECTS; src/routing/routeHealth.test.ts asserts zero blank routes, zero unreachable active/hidden routes, zero duplicate route ownership, and zero orphan pages. Verified passing (5/5) as of this audit refresh. |
| Calculator deep links | clinicalToolRoutes.js → CALCULATOR_ROUTE_DEFS; App.jsx LegacyCalculatorRouteRedirect for /tools/calculators; toolInventory per-tool `route` | Slug/path mismatch between hub and inventory | merge | Canonical: `clinicalToolRoutes.js` indexes calculator slugs; App.jsx keeps one Copilot redirect surface for calculator paths. |
| Pack marketplace URLs | /asset-packs; /settings/organization/packs | Same component is mounted in product discovery and organization-admin contexts | legacy | Keep `/asset-packs` as product/pack discovery and `/settings/organization/packs` as organization entitlement management; both must share `PackMarketplace` and route-health coverage. |
| Workflow surfaces | /automation → WorkflowAutomationBuilder; /workflows → WorkflowBuilderPage (PlatformOS) | Two workflow UIs under different nav ids | merge | Pick one workflow builder (Platform OS `WorkflowBuilderPage` or legacy `WorkflowAutomationBuilder`); alias the other route. |
| Operations entry points | /operations; /operations-center; WORKSPACE_ROUTE_SHORTCUTS.commandCenter → /dashboard | Ops vs command center naming confusion | legacy | Canonical ops hub: `CANONICAL_ROUTES.operations`; document /operations-center as digital ops center alias. |

## Layouts

**Canonical:** `src/components/AppShell.tsx` (active CareDroid app chrome)

**Secondary (allowed):** `src/layouts/AppShell.tsx` (thin re-export shim — implementation in `src/components/AppShell.tsx`)


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Shell variants | src/components/AppShell.tsx; src/layouts/AppShell.tsx | Legacy shell is not mounted but retained for tests/manual migration review. | legacy | Canonical shell: src/components/AppShell.tsx; do not wire src/layout/AppShell.jsx back into runtime. |
| Ops demo layout class | .ops-demo-page on simulation/lab/3D pages | Parallel layout CSS systems | merge | Migrate ops-demo pages to shared design tokens and CareDroid primitives. |

## Sidebars

**Canonical:** `src/components/AppShell.tsx` + `NAVIGATION_ITEMS` from unified-navigation.config.ts

**Secondary (allowed):** `src/config/navigation.config.ts` compatibility projections


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Sidebar nav item sources | APP_SHELL_NAV_ITEMS; PRIMARY_SIDEBAR_NAV_ITEMS; QUICK_COMMAND_DESTINATION_ITEMS | Route surfaces can drift if they bypass unified-navigation.config.ts | done | Canonical AppShell rail: NAVIGATION_ITEMS; compatibility projections must derive from unified-navigation.config.ts. |
| Tool list in sidebar | sidebarToolPresentation.ts; historical getSidebarToolRegistryProjection in tests | Tests may reference removed sidebar tool partition API | legacy | Canonical tool sidebar data: getUserFacingToolRegistryProjection + sidebarToolPresentation. |

## Navigation

**Canonical:** `src/config/unified-navigation.config.ts` (`NAVIGATION_ITEMS`)

**Secondary (allowed):** `src/config/navigation.config.ts` (compat projections: APP_SHELL_NAV_ITEMS, sidebar buckets)


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Primary nav vs quick command | PRIMARY_NAV_ITEMS; QUICK_COMMAND_DESTINATION_ITEMS | Duplicate destinations with different labels | done | QUICK_COMMAND_DESTINATION_ITEMS derives from PRIMARY_NAV_ITEMS in navigation.config.ts. |
| Legacy path matching | navigation.config legacyPaths/matchPaths; routes.config ROUTE_ALIAS_GROUPS | Alias defined in two modules | merge | Canonical aliases: routes.config.js; navigation imports getRouteAliasTarget(). |
| Compatibility re-export | navigation/primaryNavigation.ts; navigation.config.js | Low if re-export only | legacy | Keep primaryNavigation.js as thin re-export; ban new constants there. |

## Inventories

**Canonical:** Pipeline: `clinicalToolIdContract.ts` → `toolRegistry.ts` → `toolInventory.js` (canonical launch records)


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Tool metadata layers | toolRegistry.ts; clinicalIntentToolCatalog.ts; toolInventory.js; segmentInventory.ts; toolVisibilityMatrix.js | Five layers can disagree on id, path, executor | merge | Canonical runtime: toolInventory only; catalog/segment/matrix are generated projections or test artifacts. |
| Sidebar/catalog projections | getUserFacingToolRegistryProjection; getSidebarToolRegistryProjection; getCatalogToolInventory | Different filters for same ids | wire | Canonical: getUserFacingToolRegistryProjection; others call it internally. |
| Backend tools API | GET /api/tools; toolInventory static registry | API list can drift from SPA registry | wire | Generate /api/tools from same build step as toolInventory or treat API as read-only mirror. |

## Calculators

**Canonical:** `toolInventory.js` (calculator records) + `calculatorHubManifest.ts` (hub cards/forms projection)

**Secondary (allowed):** `Calculators.jsx` + `CalculatorInterface` for UI


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Builtin calculator definitions | clinicalToolIdContract BUILTIN_CALC_*; clinicalIntentToolCatalog builtinUiCalculators; calculatorHubManifest BUILTIN_CALCULATOR_SWITCH_SLUGS | Slug/id drift (e.g. registry id vs hub slug) | merge | Canonical slugs: BUILTIN_CALC in clinicalToolIdContract; hub manifest reads toolInventory only. |
| Specialty calculator modules | cardiologyCalculators.jsx; pulmonologyCalculators.jsx; nephrologyCalculators.jsx; …12 pack JSX group files | Parallel registration vs hub — ids must match inventory | legacy | Keep as composition modules imported by Calculators.jsx; do not register routes separately. |
| Route registration | CALCULATOR_ROUTE_DEFS; Calculators hub route /tools/calculators; App wildcard tools routes | Hub-only tools lack dedicated App route (by design) | legacy | Dedicated routes only when hasDedicatedForm; hub resolves ?calc= slug. |

## Dashboards

**Canonical:** `/dashboard` → CommandDashboard.jsx + `commandDashboardModel.ts`


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Home vs assistant | CommandDashboard (/dashboard); ChatInterface ED Copilot panel | Resolved — former Dashboard.jsx assistant page was removed. | legacy | Keep /dashboard owned by CommandDashboard and /assistant as an ED Copilot alias into the shell. |
| Platform dashboard registry | platformOperatingSystem.js PLATFORM_DASHBOARDS; commandDashboardModel widgets | Demo OS dashboards vs command dashboard tiles | wire | Canonical command UX: commandDashboardModel; platformOperatingSystem for Platform OS pages only. |
| Domain dashboards (15+ pages) | AnalyticsDashboard; CostAnalyticsDashboard; AiCommandCenterDashboard; MemoryDashboard; TrainingDashboard; LaboratoryDashboard; MedicalIotDashboard; HospitalMapDashboard; FleetDashboard; DigitalOperationsCenter; OutcomesDashboardPage | Overlapping KPIs across ops/analytics pages | wire | Map each dashboard to one asset id in platform_assets; link from command dashboard via assetRecommendation. |

## Auth configs

**Canonical:** `src/config/auth.config.ts` + `src/config/routes.config.ts` (auth paths)

**Secondary (allowed):** `src/config/api.config.ts` (endpoints), `env.config.js` + `featureFlags.config.js` (gates)


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
| Frontend projections | assetInventory.ts; assetAccess.ts; assetEntitlements.ts; buildAssetRegistry() demo | Projection must continue to include pack/product/workspace/role metadata for every user-facing asset | wire | Canonical client context: UserIdentityContext + platformAssetsApi GET /api/platform/context; assetInventory derives offline/demo metadata when backend context is unavailable. |
| Duplicate asset packs | emergency-medicine pack; emergency-department-pack (same assetIds) | Duplicate SKUs and entitlements | merge | Merge to one ED pack id; keep other slug as alias in product catalog. |
| Product catalog vs platform assets | product-catalog Product entities; platform_assets; solution packs docs | Commercial product id ≠ asset id | wire | Canonical commercial: Product maps to packIds; assets remain operational unit. |

## Executor mappings

**Canonical:** Backend `tool-orchestrator.registry.ts` (`REGISTERED_EXECUTOR_TOOL_IDS`, `REGISTRY_ID_TO_EXECUTOR_TOOL_ID`)


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Frontend orchestrator mirror | clinicalToolIdContract ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS; REGISTRY_ID_TO_ORCHESTRATOR_TOOL; backendApiCapabilities BACKEND_EXECUTOR_NLU_TOOL_IDS | Copy-paste drift (tests catch) | legacy | Canonical: backend registry; frontend parses it in drift tests (already in executorMappingAudit.test.js). |
| Registry id vs executor id | sofa-score (registry); sofa-calculator (executor); drug-check / drug-interactions | Inventory TOOL_EXECUTOR_STATUS.REGISTERED uses registry id | done | Done: src/data/executorMappingAudit.test.ts reads backend/.../tool-orchestrator.registry.ts source directly and asserts REGISTRY_ID_TO_ORCHESTRATOR_TOOL equals the backend REGISTRY_ID_TO_EXECUTOR_TOOL_ID map exactly, plus that registered executors are never also marked unsupported. Verified passing (6/6) as of this audit refresh. |
| NLU catalog postExecutable flags | clinicalIntentToolCatalog postExecutable; ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS | Catalog claims executable without backend registerTool() | done | Done: the same executorMappingAudit.test.ts asserts every NLU profile tool id is either POST-executable (isOrchestratorPostExecutable, cross-checked against the real backend registry) or documented unsupported, and never both. Verified passing (6/6) as of this audit refresh. |

## Configuration

**Canonical:** `src/config/canonicalConfigurationModel.ts` (`CANONICAL_CONFIGURATION_REGISTRY`)

**Secondary (allowed):** `src/config/canonicalConfiguration.ts` (public barrel)


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Navigation dual config | unified-navigation.config.ts; navigation.config.ts (compat) | New nav items added only to compat projections | wire | Add to unified-navigation.config.ts first; navigation.config.ts projects for legacy consumers. |
| Design token split | theme.tokens.ts; layout/designTokens.ts; caredroidDesignLanguage.ts; designSystem.ts | Token drift across CSS and programmatic consumers | merge | Import design tokens through designSystem.ts barrel; CSS via design-system.css only. |
| Env parsing chain | appConfig.ts; featureFlags.config.ts; env.config.ts | Direct appConfig.features reads bypass FEATURE_FLAGS projection | done | Done: this was a real, still-open gap (not stale tracking) -- NotificationService.ts and deferStartupTasks.ts read appConfig.features.enablePushNotifications/enableOfflineMode directly. Redirected both to FEATURE_FLAGS. Added a permanent regression guard (src/config/featureFlags.config.test.ts) that scans every src/ file for appConfig.features reads outside featureFlags.config.ts itself. |

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
| memory | /memory |
| training | /training |
| costs | /costs |
| aiEvaluation | /ai-evaluation |
| aiCommandCenter | /ai-command-center |
| aiGovernance | /ai-governance |
| aiSecurity | /security |
| liveTrackingMap | /live-map |
| hospitalMap | /hospital-map |
| medicalIot | /medical-iot |
| deviceFleet | /devices |
| fleetCommand | /fleet/command |
| fleetMap | /fleet/map |
| predictiveMaintenance | /fleet/predictive-maintenance |
| routeOptimizer | /fleet/route-optimizer |

## Action legend

| Action | Meaning |
|--------|---------|
| **wire** | Connect existing duplicate to canonical source (import, generate, or validate) |
| **merge** | Collapse two modules/URLs into one; keep redirects during migration |
| **quarantine** | Mark deprecated; no new references; remove in cleanup pass |
| **legacy** | Intentional alias/compat layer; document and test only |

## Appendix

- Related: [orphan-detection-report.md](./orphan-detection-report.md), [saas-compliance-audit.md](./saas-compliance-audit.md)
- Contract tests: `src/config/canonicalConfig.contract.test.ts`, `src/data/executorMappingAudit.test.ts`
- Generator: `src/data/duplicateSystemAudit.ts`

