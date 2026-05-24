# CareDroid Clinical AI Full-System Normalization Investigation

Generated: 2026-05-23

Scope: read-only architecture audit across frontend routes, authentication, tool inventory, calculators, AI workflows, backend controllers/services, frontend-backend contracts, and UX/layout navigation. No source code was modified for this investigation.

## 1. Executive Summary

CareDroid has a mostly centralized frontend route table in `src/App.jsx`, but several product concepts now have multiple public names and launch paths. The largest drift areas are not hard duplicate components; they are layered compatibility systems: `/home` and `/dashboard`, `/assistant` and `/chat`, singular and plural calculator URLs, user-facing `/tools` plus developer-facing `/tools/catalog`, and tool IDs that differ across registry, NLU, calculator slug, backend executor, and route.

The inventory layer is already moving toward normalization through `src/data/toolInventory.js`, `src/data/clinicalToolIdContract.js`, `src/navigation/registryToolLaunch.js`, and `src/routes/clinicalToolRoutes.js`. However, the canonical inventory is still derived from older systems: `toolRegistry.js`, `clinicalIntentToolCatalog.js`, `calculatorHubManifest.js`, `medicalToolsCatalogIndex.js`, and `sourceCodeToolDiscovery.js`. That means drift is currently managed by tests and mapping tables instead of by one authoring source.

Backend capability is intentionally narrower than frontend capability. The backend tool orchestrator registers only three POST executors: `sofa-calculator`, `drug-interactions`, and `lab-interpreter`. Clinical intelligence pages have dedicated backend endpoints under `/api/clinical-intelligence/*`. Many calculators and guided workflows are local-only or chat-assisted and correctly documented as unsupported for `/api/tools/:id/execute`.

No confirmed critical breakage was found from static inspection. The highest-risk problems are architectural: route duality, multi-layer tool identity, calculator URL inconsistency, and frontend API surfaces that are intentionally gated because Nest routes do not exist.

## 2. Route Drift Findings

### Complete Route Inventory

| Section | Current route(s) | Component or behavior | Auth | Notes |
|---|---|---|---|---|
| Welcome | `/` | `PublicShell` + welcome page | public-only | Authenticated users redirect to `/home`. |
| Auth | `/auth` | `AuthShell` + `Auth` | public-only | Canonical auth entry. |
| Auth callback | `/auth-callback` | `AuthCallback` | public-only | OAuth token handoff. |
| Legacy auth callback | `/auth/callback` | redirect to `/auth-callback` | public-only | Preserves query string. |
| Auth aliases | `/login`, `/log-in`, `/signin`, `/sign-in`, `/signup`, `/sign-up`, `/register`, `/join`, `/create-account`, account variants | redirect to `/auth` | public-only | Alias list lives in `src/routing/authPathAliases.js`. |
| Home/Pulse | `/home`, `/dashboard` | `Dashboard` | protected | Duplicate route names for same page. |
| Assistant/chat | `/assistant`, `/chat` | `Dashboard` | protected | Duplicate route names for same chat surface. |
| Core app | `/patients`, `/operations` | respective pages | protected | Visible in primary nav. |
| Tools overview | `/tools` | `ToolsOverview` | protected | User-facing canonical tools browser. |
| Developer catalog | `/tools/catalog` | `ClinicalToolCatalog` | protected | Developer/source audit catalog. |
| Tool pages | `/tools/drug-checker`, `/tools/lab-interpreter`, `/tools/protocols`, `/tools/diagnosis`, `/tools/procedures` | dedicated tool pages | protected | Some pages host multiple NLU concepts. |
| Calculator routes | generated from `CALCULATOR_ROUTE_DEFS` | `Calculators initialCalculatorId` | protected | Derived from canonical tool inventory. |
| Calculator hub | `/tools/calculators` | `Calculators` hub | protected | Also receives `?calc=` legacy-style selection. |
| AI pages | `/tools/ambient-scribe`, `/tools/calculator-recommender`, `/tools/guideline-rag`, `/tools/differential-ai`, `/tools/timeline-ai`, `/tools/patient-summary-ai`, `/tools/order-set-ai`, `/tools/ai-explainability`, `/tools/clinical-audit` | dedicated AI pages | protected | Some require PHI/AI/audit permissions. |
| Fleet | `/fleet/command`, `/fleet/predictive-maintenance`, `/fleet/route-optimizer` | fleet pages | protected | No canonical `/fleet` index route. |
| Tool/fleet fallback | `/tools/*`, `/fleet/*` | `ToolsAreaFallback` | protected | Redirects known calculator mistypes, otherwise not-found. |
| Clinical alerts | `/clinical/alerts` | `ClinicalAlertsPage` | protected | Matched under Operations nav. |
| Account/settings | `/profile`, `/profile-settings`, `/settings`, `/notifications`, `/two-factor-setup`, `/biometric-setup`, `/onboarding` | settings/account pages | protected | Multiple settings subroutes. |
| Consent/legal app | `/consent`, `/consent-history` | consent pages | protected | Protected compliance workflow. |
| Public legal/help | `/privacy`, `/terms`, `/gdpr`, `/hipaa`, `/help` | public pages | public | Not public-only; authenticated users can view. |
| Shared tool session | `/shared/tools/:shareId` | `SharedToolSession` | public | Only frontend dynamic SPA route. |
| Admin/analytics | `/team`, `/audit-logs`, `/analytics`, `/costs` | protected pages with permissions | protected | Hidden from primary IA except Settings/Operations matching. |
| Global fallback | `*` | redirect to `/home` or `/` | mixed | Depends on auth state. |

### Route Normalization Table

| Drift area | Verified current state | Canonical recommendation | Compatibility action |
|---|---|---|---|
| `/auth` vs `/login`/signup aliases | `AUTH_PATH_ALIASES` redirects all common login/signup routes to `/auth`. | Keep `/auth` as canonical. | Keep aliases as redirects, but preserve intended mode via `?mode=signup` for signup aliases. |
| `/auth-callback` vs `/auth/callback` | `/auth/callback` redirects to `/auth-callback`. | Keep `/auth-callback`. | Keep legacy redirect until OAuth provider configs are migrated. |
| `/home` vs `/dashboard` | Both render `Dashboard`. Primary nav uses `/home`; OAuth callback and legacy comments still use `/dashboard`. | Use `/home` for Pulse/home. | Redirect `/dashboard` to `/home`, preserving `?tool=` migration logic until removed. |
| `/assistant` vs `/chat` | Both render `Dashboard`. Primary nav uses `/assistant`; catalog/calculator chat-assisted launches often navigate to `/chat`. | Use `/assistant` for user-visible chat. | Redirect `/chat` to `/assistant`, or keep `/chat` only as a technical alias while all launch code emits `/assistant`. |
| `/tools` vs `/tools/catalog` | `/tools` is user-facing; `/tools/catalog` is Developer Catalog / Source Audit. No `/catalog` route exists. | Keep `/tools` as canonical user catalog. Rename `/tools/catalog` UI label to "Developer Audit" if it remains. | Do not add `/catalog`; it would create a third concept. |
| `/tools/calculator/*` vs `/tools/calculators/*` | Legacy singular routes exist for SOFA/GFR/BMI/CHA2DS2-VASc; newer calculators use plural routes. Contract docs already call this route duality. | Use `/tools/calculators/:slug` for every calculator form. | Add singular-to-plural redirects for legacy paths. |
| `/tools/calculators?calc=` vs dedicated route | `Calculators` reads `?calc=`, but route defs also generate dedicated calculator paths. | Use dedicated `/tools/calculators/:slug` route for form pages. | Continue accepting `?calc=` as a short-term alias. |
| `/fleet/*` | Specific fleet routes exist, but `/fleet` itself falls into not-found. | Add `/fleet` redirect to `/fleet/command` or make `/operations` the canonical fleet index. | Keep `/fleet/*` fallback for invalid links. |
| Patient AI under `/tools/*` | Patient AI pages live under `/tools/...` but `primaryNavigation.js` marks several as Patients. | Either keep route under `/tools` and label as Tools, or move patient workflows to `/patients/...`. | Short-term: keep matching rules but document that nav section and URL section intentionally differ. |

### Duplicate, Hidden, and Unreachable Route Findings

- Duplicate route surfaces: `/home` and `/dashboard`, `/assistant` and `/chat`, legacy singular and newer plural calculator routes.
- Alias routes: auth aliases in `src/routing/authPathAliases.js`, OAuth callback alias, calculator fallback redirects in `src/routes/clinicalToolRoutes.js`.
- Hidden routes: `/team`, `/audit-logs`, `/analytics`, `/costs`, `/clinical/alerts`, `/consent-history`, and several AI pages are routeable but not visible as first-class primary nav destinations.
- No fully unreachable SPA routes were confirmed. The app's wildcard routes prevent dead route definitions from being exposed as crashes.
- The `ToolsAreaFallback` "Tool route mismatch" branch is a useful canary: it should be unreachable during normal routing if `KNOWN_TOOL_AREA_PATHS` and `App.jsx` stay synchronized.

## 3. Authentication Findings

### Auth Architecture Report

The frontend has one canonical auth page: `src/pages/Auth.jsx`, mounted at `/auth`. It provides login, signup mode toggling, OAuth entry buttons, magic link, OIDC/SAML probes, two-factor login challenge, and an explicitly gated local/dev bypass. There are not multiple frontend login pages.

The backend auth surface is broader: `AuthController` exposes register, login, dev-session, 2FA verification, email verification, Google/LinkedIn OAuth, magic link, OIDC/SAML placeholders, and `/auth/me`. Biometric auth and two-factor setup are handled by separate controllers and pages.

Confirmed drift:

- Signup aliases redirect to `/auth`, but the auth page initializes to `mode = 'login'`; signup intent is not preserved by the alias route.
- `AuthCallback` stores the token and navigates to `/dashboard`, while current primary IA treats `/home` as canonical.
- `AuthCallback` sets only `authToken`; it relies on `UserContext` to fetch `/api/users/profile` before the app becomes authenticated. This is valid, but it makes OAuth completion sensitive to profile fetch behavior.
- `UserContext` mirrors permission constants and role permissions client-side. This supports UI gating, but it must remain a display optimization, not the authority.
- Dev bypass exists both as frontend local mock fallback and backend `/api/auth/dev-session`. It is explicit and feature-gated, not a hidden production bypass.

Canonical auth flow:

1. `/auth?mode=login|signup` is the only visible unauthenticated entry.
2. `/auth-callback` completes OAuth and redirects to `/home`.
3. `/login`, `/signup`, and account aliases redirect to `/auth` with an explicit `mode`.
4. Frontend permission checks stay advisory; backend guards remain authoritative.
5. Local/demo auth remains behind `VITE_ENABLE_DEV_AUTH_BYPASS` / `ENABLE_DEV_AUTH_BYPASS` and never appears in production builds.

## 4. Inventory Findings

### Inventory Normalization Report

Verified inventory systems:

| File | Role today | Normalization concern |
|---|---|---|
| `src/data/toolRegistry.js` | Sidebar, workspaces, shortcuts, direct tool paths. | Legacy user-facing registry still contains route and display data. |
| `src/data/clinicalIntentToolCatalog.js` | NLU/chat profiles, built-in calculator metadata, hub-only tools. | Mixes NLU IDs, routes, calculator slugs, and chat seeds. |
| `src/data/clinicalToolIdContract.js` | Central ID contract for registry, NLU, calculator slugs, aliases, executor maps. | Strongest canonical identity layer, but still separate from display records. |
| `src/data/toolInventory.js` | "Canonical normalized tool inventory" derived from registry/catalog/backend contract files. | Best canonical destination, but not yet the only authoring source. |
| `src/data/calculatorHubManifest.js` | Calculator hub cards, form slugs, chat-assisted hub tools. | Derived projection with some duplicated calculator display metadata. |
| `src/data/medicalToolsCatalogIndex.js` | Developer catalog rows across NLU, registry, calculators. | Catalog projection creates duplicate rows for registry shortcuts and NLU rows by design. |
| `src/data/sourceCodeToolDiscovery.js` | Source-audit inventory, aliases, phantom references. | Useful audit artifact, not a runtime source of truth. |

Verified alias chains:

- Registry ID -> NLU/orchestrator ID: `REGISTRY_ID_TO_ORCHESTRATOR_TOOL`.
- NLU/orchestrator ID -> registry ID: `ORCHESTRATOR_TO_REGISTRY_ID`.
- Calculator slug -> registry ID: `BUILTIN_CALC_ID_TO_REGISTRY_ID`.
- Legacy/phrase aliases -> registry ID: `NLU_TO_REGISTRY_ID` and `toolIdAliases`.
- Registry/alias ID -> launch plan: `resolveCatalogLaunch()` and `getRegistryToolNavigation()`.

Confirmed duplicate concepts:

- Drug checker: `drug-check`, `drug-interactions`, `drug-checker`, `drug-interaction-checker`.
- Lab interpreter: `lab-interp`, `lab-interpreter`, `abg-interpreter`.
- SOFA: `sofa-score`, `sofa-calculator`, `sofa`, `/tools/calculator/sofa`.
- CHA2DS2-VASc: `calc-chads2vasc`, `cha2ds2vasc-calculator`, `chads2vasc`.
- Diagnosis: `diagnosis`, `differential-diagnosis`, `differential-ai`, plus `/tools/diagnosis` and `/tools/differential-ai`.
- Protocols: `protocols`, `protocol-lookup`, `acls-protocol`, `atls-protocol`.
- Calculator hub: `calculators`, `/tools/calculators`, `?calc=`, hub-only NLU profiles, and chat-assisted cards.

Confirmed orphan or non-launchable records:

- True phantom references in `sourceCodeToolDiscovery.js`: `abc-assessment`, `trauma-score`, `cancer-calculator`, `tumor-staging`, `chemo-calculator`.
- API-only reference: `vitals-monitor`, tied to `POST /api/chat/analyze-vitals` but with no dedicated page.
- Alias-only references: `bleeding-risk`, `antibiotic-scripts`, `medication-checker`.
- Platform record `tools-share-results` points to `/api/tools/share-results`, but `backendApiCapabilities.js` marks `toolsShareResults: false` and no Nest route exists.

Canonical inventory recommendation:

Use `src/data/toolInventory.js` as the runtime canonical inventory, but change the direction of ownership in the fix pass: author records in one canonical inventory schema and generate or project `toolRegistry`, calculator hub cards, catalog rows, NLU launch maps, and source audit rows from it. Keep `clinicalToolIdContract.js` as the strict ID namespace and alias contract.

## 5. Calculator Findings

### Calculator Normalization Report

The calculator system has two real categories:

- Dedicated form calculators rendered by `src/pages/tools/Calculators.jsx`.
- Chat-assisted or hub-only calculators visible through the calculator hub and chat launch flow.

Dedicated calculator forms verified in `builtinUiCalculators` and `CalculatorInterface`:

`sofa`, `qsofa`, `news2`, `child-pugh`, `has-bled`, `meld`, `meld-na`, `timi-ua-nstemi`, `ascvd-risk`, `ckd-staging`, `stop-bang`, `audit-c`, `phq9`, `gad7`, `heart-score`, `centor-mcisaac`, `bishop-score`, `apgar-score`, `braden-scale`, `morse-fall-scale`, `ranson-criteria`, `bisap-score`, `fib4`, `framingham-risk`, `abcd2`, `shock-index`, `anion-gap`, `rass`, `gfr`, `bmi`, `chads2vasc`.

Chat-assisted or hub-only calculators/workflows verified:

`apache2-calculator`, `curb65-calculator`, `gcs-calculator`, `wells-dvt-calculator`, `wells-pe`, `perc`, `grace-acs`, `nihss`, `canadian-c-spine`, `ottawa-ankle`, `pecarn-head`, `nexus-cspine`, `copd-gold`, `rome-iv-ibs`, and `dispatch-ai`.

Findings:

- The system intentionally avoids hidden form calculators by deriving hub cards from `builtinUiCalculators` and route defs from canonical inventory.
- The main calculator drift is route shape, not component duplication: legacy `/tools/calculator/*` coexists with `/tools/calculators/*`.
- Several calculators have three identities: registry ID, NLU/backend ID, and UI slug.
- Hub-only calculators are not broken, but they are easy to mistake for missing forms because many use `/tools/calculators` as their `path`.
- `Calculators.jsx` still supports `?calc=` while dedicated routes are now generated. This is useful compatibility, but it should not be the canonical URL.

Canonical calculator recommendation:

Use `/tools/calculators/:slug` for every dedicated form. Use `/tools/calculators` only as the hub. Use `/assistant?tool=<registryId>` or equivalent state for chat-assisted calculators. Keep singular `/tools/calculator/*` and `?calc=` as redirects/aliases during migration.

## 6. AI Tool Findings

### AI Architecture Report

Dedicated clinical intelligence routes are present and backend-backed:

| Frontend route | Frontend page | Backend endpoint |
|---|---|---|
| `/tools/ambient-scribe` | `AmbientScribe.jsx` | `POST /api/clinical-intelligence/ambient-scribe/generate` |
| `/tools/guideline-rag` | `GuidelineRag.jsx` | `POST /api/clinical-intelligence/guideline-rag/query` |
| `/tools/differential-ai` | `DifferentialAi.jsx` | `POST /api/clinical-intelligence/differential-ai/generate` |
| `/tools/timeline-ai` | `TimelineAi.jsx` | `POST /api/clinical-intelligence/timeline-ai/generate` |
| `/tools/patient-summary-ai` | `PatientSummaryAi.jsx` | `POST /api/clinical-intelligence/patient-summary-ai/generate` |
| `/tools/order-set-ai` | `OrderSetAi.jsx` | `POST /api/clinical-intelligence/order-set-ai/generate` |
| `/tools/ai-explainability` | `AiExplainability.jsx` | `GET /api/clinical-intelligence/ai-explainability/trace` |
| `/tools/clinical-audit` | `ClinicalAudit.jsx` | `GET /api/clinical-intelligence/clinical-audit/execution-logs` |

Other AI/chat systems:

- `/assistant` and `/chat` use `Dashboard` and `clinicalChatService.js` to call `POST /api/chat/message`.
- `calculator-recommender-ai` is exposed as registry ID and NLU tool ID, but its page route is `/tools/calculator-recommender`. Backend support exists inside `ChatService.handleCalculatorRecommendation()` rather than a `clinical-intelligence` endpoint.
- Legacy `/tools/diagnosis` and newer `/tools/differential-ai` are distinct pages but overlap product language around differential diagnosis.
- `advancedRecommendationService.js`, `toolRecommendations.js`, chat NLU, calculator recommender, and catalog launch resolution all recommend or launch tools through related but separate paths.

Findings:

- No duplicate dedicated page was found for the eight `clinical-intelligence` tools.
- AI concept duplication exists between "Diagnosis Assistant" and "Differential AI", and between "Assistant", "Chat", and "Calculator Recommendation AI".
- Some AI tools have launch behavior but no direct backend executor because they are chat-assisted workflows, not `/api/tools/:id/execute` tools.
- Hidden AI routes exist because patient-oriented AI pages are URL-mounted under `/tools/*` while the primary nav highlights Patients for some of them.

Canonical AI recommendation:

Separate the AI taxonomy into three product classes:

1. Assistant chat: canonical `/assistant`.
2. Clinical intelligence pages: canonical `/tools/<ai-tool-slug>` or a future `/patients/ai/<slug>` if patient workflows are moved.
3. Tool recommendation and guided workflows: launch through canonical inventory records, not hand-authored route strings.

## 7. Backend Findings

### Backend Normalization Report

Backend module architecture is centralized through `backend/src/app.module.ts`, which imports Auth, Users, Subscriptions, TwoFactor, AI, Clinical, Audit, Compliance, Chat, ClinicalIntelligence, Analytics, Notifications, MedicalControlPlane, Encryption, RAG, Cache, Email, Metrics, and Logger modules.

Primary backend surfaces:

- `AuthController`: identity, OAuth, dev session, magic link, SSO placeholders, current user.
- `ChatController`: chat message, intent classification, 3D message experiment, suggest action, analyze vitals.
- `ClinicalIntelligenceController`: eight dedicated AI workflow endpoints.
- `ToolOrchestratorController`: tool list, available tools, statistics, executor catalog, metadata, validation, execution, result sync.
- Clinical content controllers: drugs and protocols.
- Audit, compliance, analytics, notifications, subscriptions, users, metrics.

Backend-only capabilities:

- OAuth redirects and callbacks.
- Health and metrics endpoints.
- Stripe webhook.
- RAG, emergency escalation, intent classification internals, encryption, cache, and email services.
- AI controller endpoints used as lower-level AI service surfaces.

Executor findings:

- Only three tool orchestrator executors are registered in `REGISTERED_EXECUTOR_TOOL_IDS`: `sofa-calculator`, `drug-interactions`, `lab-interpreter`.
- `ToolOrchestratorService.initializeRegistry()` registers only SOFA, drug checker, and lab interpreter services.
- `NLU_TOOL_IDS_WITHOUT_EXECUTOR` explicitly documents many frontend-only or chat-assisted tools so unsupported execution returns a structured error instead of inventing fake executors.
- `POST /api/tools/execute` is an alternate generic endpoint, while the frontend canonical client uses `POST /api/tools/:id/execute`.

Duplicate/parallel backend concepts:

- `AiController`, `ChatController`, and `ClinicalIntelligenceController` all expose AI-related capabilities at different abstraction levels.
- `ChatService` can invoke the tool orchestrator, use RAG, process calculator recommendations, and fall back to simulated responses. This makes chat a broad integration layer rather than a narrow assistant endpoint.
- `ClinicalIntelligenceService` owns structured AI pages, while some older AI/reference concepts still route through chat.

Unused or underused DTO/surface findings:

- `ChatMessage3DDto` and `POST /api/chat/message-3d` appear to be a deferred/experimental 3D avatar surface.
- OIDC and SAML endpoints are placeholders.
- Several backend routes are marked "expose-recommended" in `backendRouteExposurePolicy.js`, meaning the route exists but is not yet a first-class SPA flow.

## 8. Contract Drift Findings

### Frontend-Backend Contract Drift Report

Verified aligned contracts:

- Auth login/register/2FA/magic/dev-session frontend calls map to `AuthController`.
- User profile fetch maps to `GET /api/users/profile`.
- Chat calls map to `POST /api/chat/message`, `POST /api/chat/intent-classify`, `POST /api/chat/suggest-action`, and `POST /api/chat/analyze-vitals`.
- Clinical intelligence frontend client methods map to all eight `ClinicalIntelligenceController` endpoints.
- Tool execution client maps to `POST /api/tools/:id/execute` and preclassifies unsupported tools before network calls.
- `backendHttpRouteInventory.js` and `frontendApiCallsInventory.js` provide an explicit route/call contract inventory.

Confirmed mismatches or intentionally gated calls:

| Frontend capability | Current frontend path | Backend state | Recommendation |
|---|---|---|---|
| Tool result sharing | `/api/tools/share-results` | No Nest route; capability false. | Implement route or remove platform record/UI action. |
| Chat persistence sync | `/api/chat/messages`, `/api/chat/conversations` | No Nest routes; capability false. | Keep gated or add persistence module. |
| Team management | `/api/team/*` | No Nest routes; capability false. | Either wire to Users/Admin controller or hide route fully. |
| Bulk sync | `/api/sync` | No Nest route; capability false. | Keep offline-only until backend sync exists. |
| Notifications stream/send-channel | `/api/notifications/stream`, `/api/notifications/send/:channel` | No listed Nest routes; capabilities false. | Keep disabled or implement streaming/send endpoints. |
| Clinical alerts realtime/actions | `/api/clinical/alerts/*` | No listed Nest routes; capability false. | Align `ClinicalAlertsPage` with backend or mark local/demo only. |
| Export/report APIs | `/api/exports/*`, `/api/reports/*` | No listed Nest routes; capabilities false. | Prefer local export or implement backend reports. |
| Generic tool execute | `POST /api/tools/execute` | Backend exists; frontend primarily uses per-id execute. | Keep backend as internal/deferred or expose intentionally. |

Tool capability drift:

- Frontend exposes many calculator and guided-chat tools; backend POST execution supports only SOFA, drug interactions, and lab interpreter.
- This is documented in `tool-orchestrator.registry.ts` and frontend `unsupportedOrchestratorTools.js`; it should stay explicit.
- `dispatch-ai` is marked backend-routed for chat/NLU involvement but not POST executable.

Canonical contract recommendation:

Keep one generated contract matrix from `BACKEND_HTTP_ROUTES`, `FRONTEND_API_CALLS`, `BACKEND_API_CAPABILITIES`, and canonical tool inventory. Any route without a backend must be capability-gated and every capability-gated feature must show local/demo/offline UX rather than silently attempting network calls.

## 9. UX/Layout Findings

### UX Normalization Report

Verified navigation systems:

- `src/navigation/primaryNavigation.js` defines the simplified top-level IA: Home, Assistant, Tools, Patients, Operations, Settings.
- `src/components/Sidebar.jsx` renders primary nav plus an "Actions" tool registry, workspace selector, favorites, recent tools, pinned tools, category groups, Developer Catalog / Source Audit, and Browse All Tools.
- `src/layout/AppShell.jsx` renders sidebar, compact drawer behavior, theme FAB, dev auth banner, and bottom nav on compact viewports.
- `src/pages/tools/ToolsOverview.jsx` is the canonical user-facing tools browser.
- `src/pages/tools/ClinicalToolCatalog.jsx` is a developer/source-audit catalog with backend executor loading and multiple inventory views.
- `src/pages/tools/Calculators.jsx` is both calculator hub and form renderer.

Duplicated navigation concepts:

- Tools can launch from Sidebar Actions, ToolsOverview, ClinicalToolCatalog, Calculator hub cards, Dashboard pulse actions, recent/favorite/pinned lists, workspace templates, and legacy `?tool=` handling.
- "Catalog" means user-facing tools in some copy and developer/source audit in `/tools/catalog`.
- Assistant and Chat are the same route surface but have two URL names.
- Patient-oriented AI workflows live under `/tools` paths but can highlight the Patients nav section.

Hidden or nested UX flows:

- Developer Catalog / Source Audit is protected but exposed in both Sidebar and ToolsOverview.
- `SharedToolSession` is public under `/shared/tools/:shareId` and bypasses the app shell by design.
- Fleet has three direct routes but no fleet index.
- Admin/analytics/compliance routes exist but are only indirectly discoverable through nav grouping or permissions.
- On mobile, bottom nav exposes only the six primary destinations; detailed tool actions require opening the drawer or using ToolsOverview.

Mobile/layout risks:

- AppShell has compact drawer and bottom nav safeguards, but the number of tool actions in the Sidebar can create a long nested drawer flow.
- Calculator hub includes both chat-assisted cards and built-in form cards before the selected form, which can push active form content down on small screens.
- Primary navigation matching intentionally excludes some `/tools/*` AI pages from Tools and assigns them to Patients; this can surprise users who rely on URL hierarchy.

Canonical UX recommendation:

Flatten to four visible user layers:

1. Primary: Home, Assistant, Tools, Patients, Operations, Settings.
2. Tools: one user-facing `/tools` browser with filters.
3. Developer audit: protected `/tools/developer-audit` or keep `/tools/catalog` but label consistently as audit-only.
4. Tool detail/form/chat: one launch contract per inventory record.

## 10. Canonical Architecture Recommendations

1. Canonical routes:
   - Auth: `/auth`
   - OAuth callback: `/auth-callback`
   - Home/Pulse: `/home`
   - Assistant: `/assistant`
   - Tools browser: `/tools`
   - Calculator hub: `/tools/calculators`
   - Calculator form: `/tools/calculators/:slug`
   - Fleet index: `/fleet/command` or `/operations`

2. Canonical identities:
   - Registry ID is the product/user-facing ID.
   - NLU ID is the classifier/backend pattern ID.
   - Calculator slug is only the form slug.
   - Backend executor ID is only for registered `/api/tools/:id/execute` tools.
   - All mappings live in `clinicalToolIdContract.js` and are consumed by canonical inventory.

3. Canonical inventory:
   - Promote `toolInventory.js` from derived migration layer to authoring source.
   - Generate registry projections, catalog rows, calculator hub cards, launch plans, and tests from the canonical inventory.

4. Canonical launch:
   - All UI launch buttons call `applyRegistryToolLaunch()` or a successor that consumes canonical inventory.
   - Chat-assisted launches target `/assistant`, not mixed `/chat` and `/assistant`.
   - Calculator launches target dedicated plural routes.

5. Canonical backend contract:
   - Keep POST executors limited and explicit.
   - Do not mark chat-assisted/frontend-only tools as backend executors.
   - Keep unavailable backend calls capability-gated until implemented.

## 11. Exact Files To Modify

Route and navigation:

- `src/App.jsx`
- `src/routing/authPathAliases.js`
- `src/routes/clinicalToolRoutes.js`
- `src/navigation/primaryNavigation.js`
- `src/navigation/registryToolLaunch.js`
- `src/layout/AppShell.jsx`
- `src/components/Sidebar.jsx`

Authentication:

- `src/pages/Auth.jsx`
- `src/pages/AuthCallback.jsx`
- `src/contexts/UserContext.jsx`
- `backend/src/modules/auth/auth.controller.ts`
- `backend/src/modules/auth/auth.service.ts`

Inventory and catalog:

- `src/data/toolInventory.js`
- `src/data/clinicalToolIdContract.js`
- `src/data/toolRegistry.js`
- `src/data/clinicalIntentToolCatalog.js`
- `src/data/calculatorHubManifest.js`
- `src/data/medicalToolsCatalogIndex.js`
- `src/data/sourceCodeToolDiscovery.js`
- `src/pages/tools/ToolsOverview.jsx`
- `src/pages/tools/ClinicalToolCatalog.jsx`

Calculators:

- `src/pages/tools/Calculators.jsx`
- `src/data/calculatorHubManifest.js`
- Calculator utility files under `src/utils/*Calculator*.js`
- Calculator component batches under `src/pages/tools/*Calculators*.jsx`

AI and chat:

- `src/pages/Dashboard.jsx`
- `src/services/clinicalChatService.js`
- `src/services/clinicalIntelligenceApi.js`
- `src/services/clinicalOrchestratorApi.js`
- AI pages under `src/pages/tools/*Ai*.jsx`, `AmbientScribe.jsx`, `GuidelineRag.jsx`, `ClinicalAudit.jsx`, `CalculatorRecommender.jsx`
- `backend/src/modules/chat/chat.controller.ts`
- `backend/src/modules/chat/chat.service.ts`
- `backend/src/modules/clinical-intelligence/clinical-intelligence.controller.ts`
- `backend/src/modules/clinical-intelligence/clinical-intelligence.service.ts`

Backend contract:

- `src/data/backendHttpRouteInventory.js`
- `src/data/frontendApiCallsInventory.js`
- `src/config/backendApiCapabilities.js`
- `src/data/backendRouteExposurePolicy.js`
- `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.controller.ts`
- `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.service.ts`
- `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts`
- `backend/src/modules/medical-control-plane/tool-orchestrator/dto/tool-execution.dto.ts`

Tests and docs to update during fix pass:

- `src/routes/clinicalToolRoutes.test.js`
- `src/routes/clinicalToolRoutes.production.test.js`
- `src/test/routePagesSmoke.test.jsx`
- `src/test/responsiveRegression.routes.js`
- `src/navigation/registryToolLaunch.test.js`
- `src/data/*Wiring.test.js`
- `src/data/toolInventory.test.js`
- `src/data/clinicalCatalogLaunch.test.js`
- `src/data/backendFrontendExposure.test.js`
- `src/data/backendFrontendToolContract.test.js`
- `src/pages/tools/Calculators.formSmoke.test.jsx`
- `src/pages/tools/ToolsOverview.*.test.*`
- `src/components/Sidebar.*.test.*`

## 12. Migration Plan

Phase 1: Lock current behavior.

- Add/refresh route inventory tests for every route in `App.jsx`, every auth alias, every calculator route, and every fallback.
- Snapshot canonical launch plans for all registry IDs.
- Confirm all capability-gated frontend calls stay gated.

Phase 2: Route canonicalization.

- Change all first-party navigation to emit `/home`, `/assistant`, and `/tools/calculators/:slug`.
- Add redirects from `/dashboard`, `/chat`, and `/tools/calculator/*` to canonical routes.
- Preserve query/state compatibility for `?tool=` and `?calc=` during migration.

Phase 3: Inventory ownership inversion.

- Convert `toolInventory.js` into the single authoring source.
- Generate or project `toolRegistry`, calculator hub cards, catalog rows, and launch metadata from canonical records.
- Keep `clinicalToolIdContract.js` as the ID/mapping contract, not a display inventory.

Phase 4: Calculator flattening.

- Make every dedicated calculator route plural.
- Keep hub-only calculators as chat-assisted records with explicit `hasDedicatedForm: false`.
- Remove ad hoc calculator route strings from NLU/catalog rows where canonical inventory can supply them.

Phase 5: AI and backend contract cleanup.

- Normalize chat launches to `/assistant`.
- Decide whether patient AI tools remain under `/tools` or move to a `/patients` sub-IA.
- Keep only three registered tool executors unless implementing real backend execution for more tools.
- Either implement or remove/gate `tools-share-results` and other false capabilities.

Phase 6: UX flattening.

- Rename `/tools/catalog` visible label to "Developer Audit" or move it to a settings/admin area.
- Keep `/tools` as the only user-facing catalog.
- Add a Fleet index or redirect.
- Simplify Sidebar Actions so mobile users can reach the same canonical Tools browser without navigating a long drawer.

## 13. Risk Assessment

| Severity | Finding | Risk | Recommended priority |
|---|---|---|---|
| Critical | None confirmed by static inspection. | No verified route or auth breakage that blocks the app entirely. | Continue validation with route smoke tests before code changes. |
| High | Route duality: `/home`/`/dashboard`, `/assistant`/`/chat`, singular/plural calculator routes. | Deep links, analytics, tests, and user documentation can drift. | P0 in flattening pass. |
| High | Inventory is normalized by derived mappings rather than one authoring source. | New tools can be partially registered, creating hidden or inconsistent launch behavior. | P0/P1. |
| High | Frontend presents many tools that are not backend POST executors. | Users/developers may expect `/api/tools/:id/execute` support where only chat/local UI exists. | P1, keep unsupported UX explicit. |
| High | Gated frontend API calls without Nest routes. | Features can silently fail if gates are bypassed or misunderstood. | P1. |
| Medium | Signup aliases lose signup intent when redirecting to `/auth`. | Users landing on signup links see login mode. | P1. |
| Medium | OAuth callback redirects to `/dashboard` legacy route. | Keeps legacy naming alive and can complicate analytics/migration. | P1. |
| Medium | Diagnosis/Differential concepts overlap across `/tools/diagnosis` and `/tools/differential-ai`. | Product ambiguity and duplicated recommendations. | P2. |
| Medium | Patient AI pages live under `/tools` while nav highlights Patients. | URL hierarchy and active nav can disagree. | P2. |
| Medium | Calculator hub mixes chat-assisted launch cards and form cards. | Hidden complexity on mobile and possible user confusion. | P2. |
| Low | Auth aliases, NLU phrase aliases, and source-audit aliases are numerous. | Maintenance burden, but most are explicitly mapped. | Ongoing drift tests. |
| Low | Developer Catalog is reachable from normal tools UI. | Helpful for development, but noisy for production users. | Move behind admin/dev flag if needed. |

## 14. Full Fix Strategy

The safest fix is a flattening pass with compatibility redirects, not a deletion pass.

Start by choosing canonical names: `/auth`, `/home`, `/assistant`, `/tools`, `/tools/calculators`, and `/tools/calculators/:slug`. Update every first-party navigation helper, launch button, catalog action, dashboard shortcut, sidebar action, and calculator card to emit only those paths.

Then invert inventory ownership. Keep `clinicalToolIdContract.js` for identity constants and aliases, but make one canonical inventory record define display name, category, route, launch type, form slug, chat seed, backend endpoint, permissions, and support level. Generate the user-facing registry projection, calculator hub records, catalog rows, and source-audit rows from that inventory.

For calculators, declare every record as either `dedicated-form` or `chat-assisted`. A dedicated form must have exactly one canonical plural route and one UI switch slug. A chat-assisted calculator must not pretend to have a form route; it should launch Assistant with a guarded seed.

For AI tools, separate Assistant chat, clinical intelligence pages, and recommendation/guided workflows. Keep backend execution honest: only registered executors should be executable through `/api/tools/:id/execute`; everything else should route to a page, local calculator, or Assistant.

Finally, enforce the new architecture with tests:

- Every canonical route renders.
- Every legacy route redirects.
- Every registry ID has one launch plan.
- Every calculator slug has either one form route or an explicit chat-assisted status.
- Every frontend API call maps to a Nest route or a false capability gate.
- Every backend executor is mirrored in frontend contract maps.

