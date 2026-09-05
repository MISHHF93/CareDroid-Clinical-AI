# Duplicate System Audit

Generated: 2026-09-05 (regenerate with `npm run duplicate-system-audit:write-docs`)

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
| Layouts | `src/components/AppShell.tsx` | page-level shells |
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
| Canonical route map vs tool launch paths | routes.config.js → CANONICAL_ROUTES; clinicalToolIdContract.js → TOOL_LAUNCH_PATHS | Drift when adding fleet/simulation paths to one file only | done | Done: already exactly the recommended shape -- all 33 TOOL_LAUNCH_PATHS entries already read CANONICAL_ROUTES.X, zero hand-typed literals (verified directly). TOOL_LAUNCH_PATHS is a differently-keyed index (by tool-launch semantic name) over the same canonical path values, not a competing path definition. Added a permanent regression guard (src/data/clinicalToolIdContract.test.ts) asserting every value resolves to CANONICAL_ROUTES. |
| Router mount table vs canonical routes | src/app/router.tsx (React Router mount table); routes.config.ts | New routes added only in router.tsx bypass alias + nav contracts | done | Done: src/routing/routeHealth.ts scans router.tsx and cross-checks every path against CANONICAL_APP_ROUTE_TREE/LEGACY_EMERGENCY_ROUTE_REDIRECTS; src/routing/routeHealth.test.ts asserts zero blank routes, zero unreachable active/hidden routes, zero duplicate route ownership, and zero orphan pages. Verified passing (5/5) as of this audit refresh. |
| Calculator deep links | clinicalToolRoutes.js → CALCULATOR_ROUTE_DEFS; App.jsx LegacyCalculatorRouteRedirect for /tools/calculators; toolInventory per-tool `route` | Slug/path mismatch between hub and inventory | done | Done: CALCULATOR_ROUTE_DEFS is not a second hand-maintained list -- it is computed directly from getCanonicalToolInventory() (src/routes/clinicalToolRoutes.ts), mapping each tool own route/calculatorSlug fields. A slug/path mismatch cannot exist structurally since there is one generation point. Also found (App.jsx has since been reorganized into src/app/router.tsx): the LegacyCalculatorRouteRedirect component and the /tools/calculators/:slug dynamic route this finding named no longer exist anywhere in the codebase -- toolVisibilityMatrix.tsx still checks router.tsx source for both strings but always falls through to its working per-tool dedicated-route check when they are absent (verified: 951/951 tests across its 3 real consumers pass). Left the dead string check in place rather than editing a source-derived generator file for a cosmetic cleanup outside this finding scope -- worth a follow-up if that file is touched for another reason. |
| Pack marketplace URLs | /asset-packs; /settings/organization/packs | Same component is mounted in product discovery and organization-admin contexts | legacy | Keep `/asset-packs` as product/pack discovery and `/settings/organization/packs` as organization entitlement management; both must share `PackMarketplace` and route-health coverage. |
| Workflow surfaces | /automation → WorkflowAutomationBuilder; /workflows → WorkflowBuilderPage (PlatformOS) | Two workflow UIs under different nav ids | done | Done: already resolved, with the decision documented in the source itself. WorkflowAutomationBuilder does not exist anywhere in the codebase (a stale instance). routes.config.ts registers /automation and /automation-analytics as aliases on the canonical workflows ROUTE_RECORDS entry, with an explicit note: "Legacy /automation and /automation-analytics redirect here to avoid duplicate workflow UI ownership" -- the exact decision this finding asked for, already made and live via ROUTE_ALIAS_REDIRECTS. Only one workflow builder UI exists today. |
| Operations entry points | /operations; /operations-center; WORKSPACE_ROUTE_SHORTCUTS.commandCenter → /dashboard | Ops vs command center naming confusion | legacy | Canonical ops hub: `CANONICAL_ROUTES.operations`; document /operations-center as digital ops center alias. |

## Layouts

**Canonical:** `src/components/AppShell.tsx` (active CareDroid app chrome)


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Shell variants | src/components/AppShell.tsx | — | done | Done (HEAL-257): deleted the dead `src/layouts/AppShell.tsx` re-export shim -- zero real imports anywhere in the repo (confirmed by grep), only referenced by this and 2 other registry entries and one now-updated comment. Canonical shell remains src/components/AppShell.tsx. |
| Ops demo layout class | .ops-demo-page on simulation/lab/3D pages | Parallel layout CSS systems | done | Done: .ops-demo-page is not applied to any real page component any more (zero matches across every .tsx/.jsx in src/, verified) -- e.g. LaboratoryDashboard.tsx uses its own dedicated laboratory-page class. Simulation/lab/3D pages already migrated to their own per-page BEM class namespaces, closing the actual "parallel layout system" risk. What remains is 2 dead selectors (.ops-demo-page, .ops-demo-table) still listed among 20+ other real selectors in shared overflow/scroll rules in layout-visibility.css/responsive-ux.css, and one test asserting their presence (layout-visibility.test.ts) -- purely cosmetic dead-code remnants with zero functional effect, left in place rather than editing a shared CSS rule file for a cleanup outside this finding real scope. |

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
| Legacy path matching | navigation.config legacyPaths/matchPaths; routes.config ROUTE_ALIAS_GROUPS | Alias defined in two modules | done | Done: the alias VALUES are already unified, not independently defined -- navigation.config.ts legacyPaths spreads LIVE_MAP_ROUTE_ALIASES/FLEET_MAP_ROUTE_ALIASES directly from routes.config.ts (its only 2 legacyPaths entries, verified by grep), and ROUTE_ALIAS_GROUPS.liveMap/.fleetMap read the exact same constants via each route record aliases field (aliasesForRoute() reads ROUTE_RECORDS_BY_ID[id].aliases). Both consumers derive from one canonical array; there is no second hand-typed alias list to merge. The original recommendation (import getRouteAliasTarget()) would have been the wrong tool anyway -- that function resolves a pathname to a redirect target for URL routing, a different concern than legacyPaths nav-highlight matching, not an interchangeable alternative. |
| Compatibility re-export | navigation/primaryNavigation.ts; navigation.config.js | Low if re-export only | legacy | Keep primaryNavigation.js as thin re-export; ban new constants there. |

## Inventories

**Canonical:** Pipeline: `clinicalToolIdContract.ts` → `toolRegistry.ts` → `toolInventory.js` (canonical launch records)


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Tool metadata layers | toolRegistry.ts; clinicalIntentToolCatalog.ts; toolInventory.js; segmentInventory.ts; toolVisibilityMatrix.js | Five layers can disagree on id, path, executor | done | Done: already exactly the recommended shape once each layer relationship is traced (not assumed from the name). toolRegistry.ts and clinicalIntentToolCatalog.ts (builtinUiCalculators, clinicalIntentTools) are both directly imported BY toolInventory.tsx and folded in as enrichment/legacy-fallback data -- confirmed by source read, not a second competing runtime source. toolVisibilityMatrix.tsx is already source-derived ("regenerate: npm run visibility-matrix:write-docs" per its own header), a generated test/audit artifact. segmentInventory.ts imports nothing and is read by nothing at runtime -- its own header is explicit: "does not drive routing yet," a hand-maintained documentation/audit structure with zero runtime influence, not a 5th competing data source. The one real imperfection found (some hardcoded file-path strings in segmentInventory.ts are stale, e.g. a devAuthBypass.js reference to a file that no longer exists) is a documentation-freshness issue in a non-runtime file, not the "layers disagree at runtime" risk this finding described -- left as a known minor follow-up rather than a full doc refresh outside this finding scope. |
| Sidebar/catalog projections | getUserFacingToolRegistryProjection; getSidebarToolRegistryProjection; getCatalogToolInventory | Different filters for same ids | done | Done: getSidebarToolRegistryProjection is already @deprecated and already delegates to getUserFacingToolRegistryProjection internally (src/data/toolInventory.tsx). getCatalogToolInventory is not actually a competing catalog implementation -- it is one of four parallel raw-canonical-record stat counters (alongside getFrontendVisibleToolInventory, getSidebarToolInventory, getBackendBackedToolInventory) that all feed getCanonicalToolInventoryDocument() summary counts consistently off canonical record flags, deliberately not the enriched user-facing projection. The real catalog UI (src/pages/tools/ToolsOverview.tsx) already imports and calls getUserFacingToolRegistryProjection directly, confirmed by grep -- forcing getCatalogToolInventory through the projection would break the stat family's internal consistency, not fix a live drift risk. |
| Backend tools API | GET /api/tools; toolInventory static registry | API list can drift from SPA registry | done | Done: correcting a prior triage pass on this same audit that checked only for a direct toolInventory import from backend/ and concluded this was open -- that check missed the real, indirect proof chain. GET /api/tools returns backend tool-orchestrator.service.ts this.toolRegistry, asserted to equal REGISTERED_EXECUTOR_TOOL_IDS exactly by backend/test/tool-orchestrator.spec.ts ("should include all tools in statistics", 73/73 passing). toolInventory.tsx marks a record TOOL_EXECUTOR_STATUS.REGISTERED only via hasExecutor, which reads ORCHESTRATOR_REGISTERED_NLU_TOOL_ID_SET from clinicalToolIdContract.ts, itself asserted to equal the same REGISTERED_EXECUTOR_TOOL_IDS by src/data/executorMappingAudit.test.ts (parses the real backend registry source, 6/6 passing). The two ends of the "API list vs SPA registry" risk are independently pinned to the same canonical array by two already-passing test suites; equal-scope drift cannot occur without breaking one of them. GET /api/tools intentionally covers only POST-executable calculators, a documented subset of the full SPA toolInventory (which also lists dashboards/workflows/fleet tools with no backend executor) -- generating one from the other as originally recommended would be wrong for that reason. |

## Calculators

**Canonical:** `toolInventory.js` (calculator records) + `calculatorHubManifest.ts` (hub cards/forms projection)

**Secondary (allowed):** `Calculators.jsx` + `CalculatorInterface` for UI


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Builtin calculator definitions | clinicalToolIdContract BUILTIN_CALC_*; clinicalIntentToolCatalog builtinUiCalculators; calculatorHubManifest BUILTIN_CALCULATOR_SWITCH_SLUGS | Slug/id drift (e.g. registry id vs hub slug) | done | Done: BUILTIN_CALCULATOR_SWITCH_SLUGS already derives directly from builtinUiCalculators.map(c => c.id) in calculatorHubManifest.ts own source -- that pair cannot drift, no fix needed. BUILTIN_CALC (101 entries) vs builtinUiCalculators (92) looked like drift at first (9 slugs only in BUILTIN_CALC) but tracing each one showed a real, intentional reason: those 9 are registry ids with calculatorSlug: null and no dedicated route in toolInventory -- calculators that render through the generic hub, not a switch-case UI form, the same hasDedicatedForm distinction already established elsewhere in this audit. BUILTIN_CALC having more entries than builtinUiCalculators is expected. Added the real, protective invariant as a permanent regression guard instead (src/data/calculatorHubManifest.test.ts): every builtinUiCalculators id must be registered in BUILTIN_CALC, so a new UI form can never be added without its registry-id contract. |
| Specialty calculator modules | cardiologyCalculators.jsx; pulmonologyCalculators.jsx; nephrologyCalculators.jsx; …12 pack JSX group files | Parallel registration vs hub — ids must match inventory | legacy | Keep as composition modules imported by Calculators.jsx; do not register routes separately. |
| Route registration | CALCULATOR_ROUTE_DEFS; Calculators hub route /tools/calculators; App wildcard tools routes | Hub-only tools lack dedicated App route (by design) | legacy | Dedicated routes only when hasDedicatedForm; hub resolves ?calc= slug. |

## Dashboards

**Canonical:** `/dashboard` → CommandDashboard.jsx + `commandDashboardModel.ts`


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Home vs assistant | CommandDashboard (/dashboard); ChatInterface ED Copilot panel | Resolved — former Dashboard.jsx assistant page was removed. | legacy | Keep /dashboard owned by CommandDashboard and /assistant as an ED Copilot alias into the shell. |
| Platform dashboard registry | platformOperatingSystem.js PLATFORM_DASHBOARDS; commandDashboardModel widgets | Demo OS dashboards vs command dashboard tiles | done | Done: verified by grep that commandDashboardModel.ts never references platformOperatingSystem, and the real /dashboard page (src/pages/executive/CommandDashboard.tsx) imports exclusively from commandDashboardModel.ts. platformOperatingSystem.ts PLATFORM_DASHBOARDS is consumed only by platformCapabilityMatrix.ts, searchFirstDiscovery.ts, and saasOperatingSystem.ts -- never a rendered page -- so no live "which dashboard renders /dashboard" ambiguity exists. Added a permanent regression guard (src/data/commandDashboardModel.test.ts) asserting commandDashboardModel.ts source never imports platformOperatingSystem. |
| Domain dashboards (15+ pages) | AnalyticsDashboard; CostAnalyticsDashboard; AiCommandCenterDashboard; MemoryDashboard; TrainingDashboard; LaboratoryDashboard; MedicalIotDashboard; HospitalMapDashboard; FleetDashboard | Overlapping KPIs across ops/analytics pages | wire | Partially done, real gap remains -- also correcting 2 stale instances: DigitalOperationsCenter has zero references anywhere in src/ outside this audit file itself and was removed from the instances list (no such page exists any more). OutcomesDashboardPage was ALSO removed from the instances list, 2026-08-09 (HEAL-046) -- direct verification found no such component exists anywhere in the codebase; the only reference to it was a live, currently-clickable dead `/outcomes` link in OrganizationPages.tsx/OrganizationDashboard, since removed. This was a stronger gap than this entry previously described ("real, mounted page... missing a toolInventory record") -- there was no page at all, not a cataloguing gap on a real page. Of the rest, LaboratoryDashboard/MedicalIotDashboard/HospitalMapDashboard/FleetDashboard were already reachable from a commandDashboardModel panel. CostAnalyticsDashboard, AiCommandCenterDashboard, MemoryDashboard, and TrainingDashboard each had a real toolInventory record (ai-cost-optimization, ai-command-center, ai-memory, ai-training) but none were included in any COMMAND_DASHBOARD_GROUPS panel -- added all 4 to the expandedCare group and added a permanent regression guard (src/data/commandDashboardModel.test.ts) asserting each stays reachable. AnalyticsDashboard (/platform-analytics) remains a real, mounted page confirmed to have zero toolInventory record at all -- a genuine tool-catalog-completeness gap (likely also missing from Tools Overview/sidebar/search, not just the command dashboard) that needs a properly-scoped toolInventory registration with correct packId/segmentation/permissions, left open rather than guessed at. |

## Auth configs

**Canonical:** `src/config/auth.config.ts` + `src/config/routes.config.ts` (auth paths)

**Secondary (allowed):** `src/config/api.config.ts` (endpoints), `env.config.js` + `featureFlags.config.js` (gates)


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Auth path aliases | AUTH_PATH_ALIASES; AUTH_SIGNUP_PATH_ALIASES | Shared /signup paths registered twice in App | legacy | Canonical: AUTH_PATH_ALIASES; signup subset should reference same array or dedupe in routes.config. |
| Token storage keys | caredroid_access_token; authToken (legacy) | Stale sessions after key migration | legacy | Canonical: AUTH_CONFIG.tokenStorageKey; read legacy once on boot then migrate. |
| Demo/dev auth | auth.config demo getters; featureFlags enableDevAuthBypass; devAuthBypass.js | Bypass enabled via multiple flags | done | Done: already exactly the recommended chain -- env.config.ts demoMode/allowLocalDemoAuth/enableDevAuthBypass/showDemoAuth all read FEATURE_FLAGS.X directly (verified by source read), and auth.config.ts demo getters read only ENV_CONFIG/shouldExposeDemoAuth, no independent bypass source. devAuthBypass.js does not exist anywhere in the codebase (a stale instance -- also found hardcoded in segmentInventory.ts own file-list, not fixed here since that is a different audit layer, tracked under "Tool metadata layers"). Added a permanent regression guard (src/config/authDemoGate.test.ts) source-scanning both files so a future raw env-var read cannot reintroduce a second bypass path. |

## Workspace configs

**Canonical:** Backend `GET/POST /api/workspaces` + `enabledToolIds` / `enabledModules` (tenant authority)


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Three workspace models | WorkspaceContext.jsx (localStorage careDroid.workspaces.v1); workspaceArchitecture.js CARE_WORKSPACES; Backend workspace entities + UserIdentityContext | UI filter workspace ≠ server workspace ≠ care workspace cards | merge | Sharpened, not closed -- this is further along than the stale description suggests, but a full architectural merge is too central/high-blast-radius to force through without dedicated, deliberate verification. WorkspaceContext.tsx already has a real applyBackendContext(context) path (src/contexts/WorkspaceContext.tsx:159-191) that merges real backend workspace data (context.workspaceState.workspaces, including enabledToolIds/workspaceProfile/restrictedAssets) into the single workspaces state via mergeWorkspacesWithRegistry, with backend fields taking priority over CARE_WORKSPACES UX defaults (...fallback, ...workspace spread order) -- not 3 independently-authoritative models fighting, but localStorage is still a genuine write-through persistence/offline-cache layer sitting in front of it, not purely an artifact. What is NOT yet verified: whether every real enforcement/entitlement decision in the app actually reads the backend-merged state rather than falling back to CARE_WORKSPACES defaults when backend context has not loaded yet -- that needs its own dedicated, carefully-tested cycle given how central this context is to the whole app, not a rushed pass. |
| Legacy tool id aliases (duplicated) | platform-asset-seed.data.ts LEGACY_TOOL_ID_ALIASES; assetEntitlements.js LEGACY_TOOL_ID_ALIASES | Alias map drift breaks launch gating | done | Done: verified the two maps are currently byte-identical (22/22 keys, deep-equal), so this was a duplication risk, not a live bug -- a build-time generation step or shared JSON artifact (the original recommendation) would add real build-pipeline complexity to fix a gap that is not yet open. Closed the actual risk instead with a permanent regression guard: src/data/assetEntitlements.test.ts now parses the real backend platform-asset-seed.data.ts source directly and asserts LEGACY_TOOL_ID_ALIASES equals it exactly, so a future edit to either side alone fails a test instead of silently drifting. |
| Workspace route shortcuts | WORKSPACE_ROUTE_SHORTCUTS; CANONICAL_ROUTES; PRIMARY_NAV_ITEMS.matchPaths | Same path in three configs | done | Done: this was a real, still-open gap -- 6 of 18 WORKSPACE_ROUTE_SHORTCUTS entries (governance, aiEvaluation, profile, systemHealth, developerCatalog, plus the already-correct settings) had hand-typed literal paths (e.g. "/ai-governance") instead of importing from CANONICAL_ROUTES, even though every other entry in the same object already did. Redirected all 5 to CANONICAL_ROUTES.aiGovernance/aiEvaluation/profile/systemHealth/developerCatalog. PRIMARY_NAV_ITEMS.matchPaths in navigation.config.ts already derived from CANONICAL_ROUTES throughout (verified by grep, no changes needed there). Added a permanent regression guard (src/data/workspaceArchitecture.test.ts) asserting every WORKSPACE_ROUTE_SHORTCUTS path resolves to a CANONICAL_ROUTES value, with or without a query string appended. |

## Asset registries

**Canonical:** Backend `platform_assets` + `asset_packs` (seed: platform-asset-seed.data.ts) for entitlements

**Secondary (allowed):** Frontend launch: `toolInventory.js`


| Duplicate | Instances | Risk | Action | Recommendation |
|-----------|-----------|------|--------|----------------|
| Dual registry (tools vs assets) | toolInventory.js user-facing launch rows; SEED_PLATFORM_ASSETS; assetInventory.js mounted projection | Manual projection drift if backend seed and frontend launch metadata diverge | wire | Partially done, real backlog remains, now precisely measured instead of vaguely stated: src/data/productPackagingAudit.ts already parses the real backend platform-asset-seed.data.ts source live and cross-references it against toolInventory and assetInventory (docs/specs/product-packaging-audit.md, regenerate via npm run product-packaging-audit:write-docs). Current measured state: canonical frontend mount (toolInventory -> assetInventory projection) is fully closed, 0 of 291 user-facing tools lack mounted asset projection coverage. The real remaining gap is backend seed completeness: 245 of 291 frontend-mounted tools are not yet direct backend platform_assets seed rows -- correctly measured but not safely closeable here, since assigning each of the 245 tools to a solution/specialty/role pack is a product-taxonomy decision, not a structural wiring fix. |
| Frontend projections | assetInventory.ts; assetAccess.ts; assetEntitlements.ts; buildAssetRegistry() demo | Projection must continue to include pack/product/workspace/role metadata for every user-facing asset | done | Done: verified UserIdentityContext.tsx imports PlatformAssetsApi and calls setPlatformEntitlementContext(ctx), matching the recommended layering exactly. assetEntitlements.ts getPlatformEntitlementContext() is a plain cache getter that returns null when no backend context has been set, and assetInventory.ts/productPackagingAudit.ts confirm the projection still reaches 100% coverage in that case (0 of 291 user-facing tools lack mounted asset projection, per docs/specs/product-packaging-audit.md) -- the offline/demo fallback already works structurally, not just in theory. commandDashboardModel.test.ts already hard-asserts every rendered panel tool has non-empty packIds/productIds/workspaceIds/aiAliases. |
| Duplicate asset packs | emergency-medicine pack; emergency-department-pack (same assetIds) | Duplicate SKUs and entitlements | merge | Merge to one ED pack id; keep other slug as alias in product catalog. |
| Product catalog vs platform assets | product-catalog Product entities; platform_assets; solution packs docs | Commercial product id ≠ asset id | done | Done: already enforced by a passing test, not just documented. src/data/productPackagingAudit.report.test.ts hard-asserts, for every one of the 9 solution packs, both packExists (the pack referenced by PRODUCT_SOLUTION_PACKS is real in the backend seed) and productLinksPack (the product entity actual packIds array includes that pack id) -- built by parsing the real backend platform-asset-seed.data.ts and product-catalog-seed.data.ts source, not hand-typed assertions. Verified passing (2/2) as of this audit refresh. |

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
| Navigation dual config | unified-navigation.config.ts; navigation.config.ts (compat) | New nav items added only to compat projections | done | Done: correcting a prior triage pass on this audit that found only a lighter metadata-registry check and left this open. APP_SHELL_NAV_ITEMS/PRIMARY_NAV_ITEMS/EMERGENCY_SIDEBAR_NAV_ITEMS are a pure .map() over the canonical NAVIGATION_ITEMS array and cannot introduce a new nav id by construction. The other hand-authored lists in navigation.config.ts (ACCOUNT_UTILITY_NAV_ITEMS, SOLUTIONS_SIDEBAR_NAV_ITEMS, OPERATIONS_SIDEBAR_NAV_ITEMS, ADVANCED_SIDEBAR_NAV_ITEMS) are legitimately separate UI surfaces, not NAVIGATION_ITEMS projections -- but a full-file scan confirmed every entry primary path already derives from CANONICAL_ROUTES (matchPaths/matchPrefixes legitimately include hand-typed legacy sub-path variants for highlight-matching, a different concept from the canonical destination path). Added a permanent regression guard (src/config/navigation.config.test.ts) asserting every entry across all 5 lists resolves its primary path to CANONICAL_ROUTES. |
| Design token split | theme.tokens.ts; layout/designTokens.ts; caredroidDesignLanguage.ts; designSystem.ts | Token drift across CSS and programmatic consumers | done | Done: designSystem.ts was already the barrel the recommendation asked for (re-exports all 3 underlying files, verified by source read) -- but zero files actually imported through it (0 barrel imports repo-wide vs 10 direct imports of the underlying files, verified by grep). Of those 10, 7 were legitimate (the 3 source files own internal plumbing, and dedicated test files for each). The 3 real production bypasses were redirected to the barrel: src/contexts/ThemeContext.tsx (THEME_CONFIG), src/config/canonicalConfiguration.ts (THEME_CONFIG, consolidated with its existing DESIGN_SYSTEM_CSS_ENTRY barrel import onto one line), and src/components/ui/CareDroidPrimitives.tsx (CDL_PAGE_ZONES, CdlPageZoneId). Fixed one cascading test (canonicalConfig.contract.test.ts asserted the old import path literally). Added a permanent regression guard (src/config/designSystem.test.ts) scanning all of src/ for any future direct import of the 3 underlying files outside the barrel and their own source/test files. |
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

