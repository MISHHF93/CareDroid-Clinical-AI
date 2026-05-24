# Full-System Reality Investigation

CareDroid Clinical AI was inspected in architecture recovery mode with no refactor, deletion, or behavior change. This report is based on current source code inspection across the React SPA, route table, shell/layout CSS, navigation, inventory and calculator layers, frontend API clients, Nest backend modules, orchestrator/executor contracts, build configuration, environment validation, and tests.

## 1. Executive Summary

The system is more unified than the symptoms suggest, but it is not yet a fully unified AI-first Clinical Operating System.

Current reality:

- The visible IA is intentionally flattened into six primary areas: Home, Assistant, Tools, Patients, Operations, Settings.
- Canonical public/auth routes exist, and common aliases redirect to the canonical auth page.
- Tool routing now has a stronger central contract through `src/data/toolInventory.js`, `src/data/clinicalToolIdContract.js`, `src/data/clinicalCatalogWiring.js`, `src/navigation/registryToolLaunch.js`, and `src/routes/clinicalToolRoutes.js`.
- The backend has a clear split between three registered deterministic/operational executors and a much larger set of chat-assisted or frontend-only capabilities.
- The product still feels fragmented because major experiences remain as standalone surfaces: `/home`, `/assistant`, `/tools`, `/tools/calculators`, many `/tools/*-ai` pages, `/fleet/*`, `/operations`, and settings/admin pages.
- Layout hardening exists and is substantial, but the app relies on nested fixed-height scrollports, route-specific CSS, and several large page components. That means clipping/overflow risk is reduced, not eliminated.

The architecture should be classified as a hybrid AI-plus-tools workspace, not a pure AI-first operating system. The strongest recovery path is not deleting routes immediately. It is to make Assistant the primary workbench, make Tools the action picker, and treat standalone pages as deep execution surfaces behind those two entry points.

## 2. Current Architecture Reality

The frontend is a single Vite React SPA using `src/App.jsx` as the route table and provider composition root. `App.jsx` wraps the app in theme, user, notification, workspace, cost tracking, tool preferences, conversation, system config, offline, error boundary, and suspense providers.

The authenticated product shell is `src/layout/AppShell.jsx` plus `src/components/Sidebar.jsx`. The shell supplies desktop sidebar navigation, compact mobile drawer navigation, bottom navigation, theme control, dev-mode banner, and the page scrollport. Most protected routes render inside `AppShellPage`.

The current product model is:

- Home and Assistant both render `src/pages/Dashboard.jsx`.
- Home uses the dashboard/pulse mode.
- Assistant uses the chat/composer mode.
- Tools uses `src/pages/tools/ToolsOverview.jsx` as the user-facing tool picker.
- Developer Catalog / Source Audit uses `src/pages/tools/ClinicalToolCatalog.jsx` and is gated by `CONFIGURE_SYSTEM`.
- Calculators use `src/pages/tools/Calculators.jsx`, with dedicated calculator subroutes derived from inventory.
- Clinical AI pages exist as standalone `/tools/*` pages.
- Operations is a separate workspace and fleet has its own `/fleet/*` pages.
- Backend APIs are cataloged in frontend data files and implemented in Nest modules under `backend/src/modules`.

The system is contract-heavy and documentation-aware, but still multi-surface. The frontend has several inventories and compatibility projections. `toolInventory.js` calls itself canonical, but it is still derived from older sources rather than being the only source.

## 3. Current UX Classification

Current UX classification: fragmented hybrid, leaning toward AI-first.

It is not tool-first anymore because `/tools` is positioned as a launcher, and many tool cards can launch Assistant. It is not dashboard-first only because `/assistant` is canonical and central. It is not fully AI-first because many important workflows still live as standalone pages and are not consistently embedded in or returned to the assistant thread.

Observed user flow:

- Open app: `/` renders a public welcome page.
- Auth: `/auth` is canonical. `/login`, `/signin`, `/signup`, `/register`, and account variants redirect to `/auth`.
- Successful auth: standard auth navigates to `/home`; welcome dev bypass currently navigates to `/tools`; auth-page dev bypass uses the auth success callback and lands on `/home`.
- Home: `/home` renders `Dashboard` in pulse mode with action cards.
- Assistant: `/assistant` renders the same `Dashboard` in chat mode with suggested actions, execution cards, outreach drawer, citations, confidence, visualizations, and composer.
- Tools: `/tools` shows a searchable, filterable tool launcher from user-facing inventory projection.
- Calculators: `/tools/calculators` and `/tools/calculators/:slug` render built-in calculator forms. Some calculator-like tools are chat-assisted only and launch Assistant instead.
- Backend execution: registered executors flow through `executeClinicalTool()` to `/api/tools/:id/execute`; chat flows through `/api/chat/message`; clinical intelligence pages call `/api/clinical-intelligence/*`.
- Return flow: results can appear inside Assistant for chat/executor actions, but standalone pages mostly remain page-local and do not consistently write back into the Assistant workspace.

## 4. Route Findings

Canonical route reality:

- Public shell: `/`, `/privacy`, `/terms`, `/gdpr`, `/hipaa`, `/help`, `/shared/tools/:shareId`.
- Auth: `/auth`, `/auth-callback`, with `/auth/callback` as legacy OAuth redirect.
- Auth aliases: `/login`, `/log-in`, `/signin`, `/sign-in`, `/signup`, `/sign-up`, `/register`, `/join`, `/create-account`, and account variants redirect to `/auth`.
- Home: `/home` is canonical; `/dashboard` redirects to `/home`.
- Assistant: `/assistant` is canonical; `/chat`, `/ai`, and `/copilot` redirect to `/assistant`.
- Tools: `/tools` is canonical; `/all-tools` and `/clinical-tools` redirect to `/tools`.
- Developer catalog: `/tools/catalog` is protected and permission-gated; `/catalog` redirects to `/tools/catalog`.
- Calculators: `/tools/calculators` is the hub; `/tools/calculators/:slug` routes are generated from `CALCULATOR_ROUTE_DEFS`; singular `/tools/calculator/*` aliases redirect.
- Operations: `/operations` is canonical; `/fleet` redirects to `/operations`, but `/fleet/command`, `/fleet/predictive-maintenance`, and `/fleet/route-optimizer` remain real protected pages.

Duplicate route concepts remain as compatibility and deep-link support, but most visible navigation now points to canonical routes. The remaining fragmentation is not mainly caused by aliases. It is caused by parallel surfaces that are all still first-class: Home, Assistant, Tools, Calculators, clinical AI pages, Operations, Fleet pages, and admin/settings surfaces.

Route risks:

- `/home` and `/assistant` share `Dashboard`, with behavior determined by pathname. This is efficient, but keeps two conceptual top-level experiences inside one large component.
- `/fleet` redirects to `/operations`, but `/fleet/*` remains a distinct operational subtree.
- `/tools/catalog` is correctly developer/admin-oriented, but it is still reachable as a protected app route and can be confused with user-facing Tools if labeling regresses.
- `/tools/*` and `/fleet/*` fall back to `ToolsAreaFallback`, which is useful but means invalid paths are routed inside the app rather than failing hard.

## 5. Layout Findings

The shell has been actively hardened:

- `html`, `body`, `#root`, `.app-shell`, and `.app-shell-main-wrap` use fixed viewport height and hidden overflow.
- Normal pages scroll through `.app-shell-page-body`.
- Conversation pages switch `.app-shell-page-body--conversation` to hidden overflow and let `Dashboard` own the chat scroll.
- Compact/mobile mode reserves top space for menu/theme controls and bottom space for bottom navigation.
- `layout-visibility.css`, `AppShell.css`, `Dashboard.css`, `ToolsOverview.css`, and `Calculators.css` all include `min-width: 0`, `max-width: 100%`, `overflow-x: clip`, responsive grids, wrapping text, and touch-target constraints.

Remaining layout risks:

- The global layout uses nested height locks: `html`, `body`, `#root`, `.app-shell`, `.app-shell-main-wrap`, page body, and `Dashboard` all participate in scroll containment. This reduces page bleed but makes any route-specific wrong height or `overflow: hidden` easy to turn into clipping.
- `Dashboard` is a very large chat/workbench component with its own header, scroll region, composer, action rail, drawers, execution cards, and message rendering. This is the highest-risk layout surface.
- The Assistant action rail intentionally uses horizontal scrolling. It is controlled, but it can still feel cramped on very small screens.
- Tools and calculator pages are much better defended against overflow than before, but the calculator file is very large and many calculator subforms share CSS contracts.
- Standalone clinical AI pages likely vary in layout fidelity because they are separate pages rather than one shared workbench primitive.

## 6. Inventory Findings

`src/data/toolInventory.js` is the intended canonical normalized inventory. It derives records from:

- `src/data/toolRegistry.js`
- `src/data/clinicalIntentToolCatalog.js`
- `src/data/clinicalToolIdContract.js`
- backend route inventory
- frontend API call inventory
- source discovery/audit data

Important reality:

- The inventory is canonical for consumers, but it is not yet the only source of truth. It remains a migration layer over older registry, NLU, calculator, and backend contract data.
- `toolRegistry.js` is still the legacy sidebar/workspace/deep-link registry.
- `clinicalIntentToolCatalog.js` is still the NLU/chat-profile catalog.
- `clinicalToolIdContract.js` is the central ID contract between registry IDs, NLU IDs, calculator slugs, aliases, tiers, and orchestrator IDs.
- `clinicalCatalogWiring.js` is the launch resolver for catalog/NLU/built-in calculator IDs.
- `registryToolLaunch.js` is the actual navigation resolver used by sidebar, Tools, and legacy query handling.

This is a good architecture for migration safety, but it creates cognitive weight. A developer still needs to know several files to add or debug one tool.

## 7. Calculator Findings

Calculators are partially flattened and partially detached.

Flattened parts:

- Built-in calculator routes are generated from canonical inventory via `CALCULATOR_ROUTE_DEFS`.
- Dedicated calculator pages all land in the shared `Calculators` UI.
- Legacy singular calculator paths redirect to plural `/tools/calculators/:slug`.
- Calculator cards can launch from sidebar, Tools, or direct route.
- `Calculators.jsx` has a shared switch for built-in forms and a common safety/copy/result pattern.

Detached parts:

- `Calculators.jsx` is both a hub, a calculator form renderer, and a chat-assisted calculator launcher.
- Many calculator-like capabilities are chat-assisted rather than built-in deterministic forms.
- The backend executes only SOFA as a true calculator executor; most calculator forms are frontend-only.
- Some calculator NLU tools are unsupported by `/api/tools/:id/execute` by design and must stay chat-assisted or local.
- Calculator results are page-local unless execution happens through Assistant.

The calculator experience can be flattened, but not by collapsing every calculator into a backend executor. The safer model is one calculator workbench launched from Assistant/Tools, with deterministic forms, chat-assisted cards, and explicit unsupported-executor handling.

## 8. AI Tool Findings

There are three different AI surfaces:

- Assistant chat in `Dashboard.jsx` through `/assistant` and `/api/chat/message`.
- Standalone clinical intelligence pages under `/tools/*-ai`, calling `/api/clinical-intelligence/*`.
- Backend AI/RAG services under `backend/src/modules/ai`, `backend/src/modules/rag`, `backend/src/modules/chat`, and `backend/src/modules/clinical-intelligence`.

Clinical intelligence pages are real and backend-backed:

- Ambient Scribe
- Guideline RAG
- Differential AI
- Timeline AI
- Patient Summary AI
- Order Set AI
- AI Explainability
- Clinical Audit

These are not phantom features, but they are not fully unified into Assistant. They behave like specialized mini-applications with their own pages and forms. That is one of the main reasons the product still feels like multiple apps.

The old `src/components/ChatInterface.jsx` still exists and has tests, but the routed chat surface is `Dashboard.jsx`. Treat `ChatInterface` as a legacy/prototype component unless a current route imports it.

## 9. Backend Findings

The backend is a NestJS app with a broad module set:

- Auth, users, subscriptions, two-factor, biometrics
- AI, chat, RAG, clinical intelligence
- Medical control plane with intent classifier, emergency escalation, and tool orchestrator
- Clinical drugs/protocols
- Audit, compliance, analytics, notifications
- Metrics, logging, cache, email, encryption

`backend/src/main.ts` uses a global `/api` prefix except health/root, enables validation with whitelist and forbidden non-whitelisted fields, configures CORS, helmet, Sentry, Swagger, and can serve the production frontend in production.

Executor reality:

- `tool-orchestrator.service.ts` registers exactly three executor services: SOFA calculator, drug checker, and lab interpreter.
- `tool-orchestrator.registry.ts` declares registered executors, accepted aliases, registry-to-executor mapping, parameter aliases, request contracts, unsupported NLU tool docs, and structured error codes.
- `/api/tools/:id/execute` should be treated as an execution endpoint for those registered tools only.
- Many NLU tools are intentionally documented as unsupported for executor POST and should not be presented as server-executable.

Chat reality:

- `ChatController` exposes `/api/chat/message`, `/api/chat/intent-classify`, `/api/chat/message-3d`, `/api/chat/suggest-action`, and `/api/chat/analyze-vitals`.
- `ChatService` routes through intent classification, emergency escalation, RAG, AI service, calculator recommender, and tool orchestration.
- Some backend chat capabilities are hidden or catalog-only in the frontend.

Clinical intelligence reality:

- `ClinicalIntelligenceController` exposes eight clinical intelligence endpoints.
- `ClinicalIntelligenceService` implements structured, audited, safety-bounded workflows.
- These endpoints are surfaced by standalone frontend pages, not primarily through Assistant.

## 10. Hidden Capability Findings

Backend capabilities larger than frontend exposure:

- `/api/chat/message-3d` is backend-supported but deferred/catalog-only.
- `/api/chat/suggest-action` and `/api/chat/analyze-vitals` exist, but no obvious first-class structured UI exists outside chat/docs.
- Tool metadata, executor catalog, statistics, and validation exist, but are mostly background/developer/catalog support.
- Drug/protocol detail and admin CRUD APIs exist, but user-facing pages expose only selected reference flows.
- Biometric availability/delete management is partly exposed.
- Subscription checkout/portal/config exists, but billing is partly service/settings-driven.
- Notifications REST exists, while stream/send-channel capabilities are gated false.
- Team management, clinical alerts, export/report routes, sync routes, and some share routes are frontend-gated or mock/local-only.

Source-audit phantom reality:

- `sourceCodeToolDiscovery.js` identifies five true phantom tool references: `abc-assessment`, `trauma-score`, `cancer-calculator`, `tumor-staging`, and `chemo-calculator`.
- It also identifies one API-only reference: `vitals-monitor`.
- It identifies three alias-only references: `bleeding-risk`, `antibiotic-scripts`, and `medication-checker`.
- These are intentionally kept out of the user-facing Tools overview and appear only in source/developer audit surfaces.

## 11. Duplicate Findings

Remaining duplicates are mostly compatibility aliases, ID-layer duplicates, and surface-level duplicates.

Route duplicates:

- `/auth` versus auth aliases are resolved by redirect.
- `/home` versus `/dashboard` is resolved by redirect.
- `/assistant` versus `/chat`, `/ai`, `/copilot` is resolved by redirect.
- `/tools` versus `/all-tools`, `/clinical-tools` is resolved by redirect.
- `/tools/catalog` versus `/catalog` is resolved by redirect.
- `/operations` versus `/fleet` is partly resolved, but `/fleet/*` pages remain real.

ID duplicates:

- Registry IDs, NLU IDs, calculator slugs, and backend executor IDs remain separate by design.
- Examples include `drug-check`, `drug-interactions`, and `drug-interaction-checker`; `lab-interp` and `lab-interpreter`; `sofa-score` and `sofa-calculator`.
- `clinicalToolIdContract.js` correctly documents this, but the mental model is still complex.

UX duplicates:

- Assistant can start tool workflows, Tools can launch standalone pages, and standalone pages can perform their own backend calls.
- Calculators can be direct forms, chat-assisted cards, or executor-backed flows.
- Clinical intelligence can be reached as standalone pages rather than Assistant-native tasks.
- Operations and Fleet are still split conceptually.

## 12. Orphan Findings

Likely orphan/prototype areas:

- `src/components/ChatInterface.jsx` appears to be a legacy chat component with tests, while production routes use `Dashboard.jsx`.
- `src/components/ToolPanel.jsx` appears lightly used or legacy; current routed tool pages use dedicated pages and `ToolPageLayout`.
- `src/services/openaiService.ts`, `src/services/medicalDataService.ts`, and `src/services/advancedRecommendationService.js` should be treated as possible legacy/client-side islands unless confirmed by current flows.
- `src/data/sourceCodeToolDiscovery.js` documents phantom and alias-only IDs that are intentionally not user-facing.
- Operations imports shared `OperatingWorkspace.css`, but there is no obvious routed `OperatingWorkspace` page in the current route table.

Backend-only but not necessarily orphaned:

- RAG, encryption, cache, email, emergency escalation, intent classifier, and internal orchestrator calls are backend-only by design.
- Many backend routes are intentionally backend-only or deferred and are cataloged in `backendRouteExposurePolicy.js`.

## 13. Risks

Primary architecture risks:

- The app is not yet one coherent workbench. It is a coherent route shell around several coherent subproducts.
- The tool inventory migration is safer than before but still has too many source files for one product concept.
- Standalone clinical intelligence pages compete with Assistant as the AI center.
- Calculator behavior is split between frontend-only forms, chat-assisted flows, and a small registered executor set.
- `/fleet/*` routes and `/operations` create a partial canonicalization state.
- Dashboard is doing too much and is the highest-risk frontend component for layout, scrolling, and behavioral regressions.
- Dev/demo auth is clear in code but still depends on `VITE_ENABLE_DEV_AUTH_BYPASS=true`, and the welcome-page bypass navigates to `/tools` while regular auth lands on `/home`.
- Vercel static frontend deploys require `VITE_API_URL` unless same-origin API proxying is explicitly allowed.
- Test and validation scripts are strong, but local execution was previously blocked by environment PATH/dependency issues. Architecture confidence is from source inspection, not a fresh full test run in this pass.

## 14. Current Health Score

Overall health score: 7.1 / 10.

Breakdown:

- Routing canonicalization: 8 / 10. Aliases are mostly redirected, but Fleet/Operations and multi-surface tools remain.
- UX unity: 5.5 / 10. The app has an AI-first direction, but standalone tools and AI pages still dominate many workflows.
- Inventory/contracts: 7.5 / 10. Strong contract files exist, but too many layers remain active.
- Backend/frontend alignment: 7 / 10. Registered executors and unsupported tools are documented; hidden/deferred capabilities remain large.
- Layout/mobile resilience: 7 / 10. There is substantial hardening, but nested scrollports and large page components remain risky.
- Dev/build confidence: 7 / 10. Validation scripts and Vercel safeguards exist; npm/path/dependency availability remains a workflow risk.

## 15. Recommended Recovery Plan

Phase 1: freeze the product map.

- Keep canonical routes as they are for now.
- Write a short product contract: Home is pulse, Assistant is workbench, Tools is action picker, standalone pages are deep execution surfaces.
- Stop adding new visible top-level surfaces unless they map into this contract.

Phase 2: make Assistant the workbench.

- Move clinical intelligence launch/result patterns toward Assistant-native workflows.
- For each standalone `/tools/*-ai` page, decide whether it is a deep form page, an Assistant drawer, or a retired prototype.
- Ensure results from standalone execution can return to or be summarized in Assistant.

Phase 3: simplify tool inventory ownership.

- Keep `toolInventory.js` as the runtime projection.
- Document the required edit path for adding a tool.
- Gradually reduce direct consumers of legacy `toolRegistry.js` and NLU catalog data.
- Keep `clinicalToolIdContract.js` as the explicit cross-layer ID map.

Phase 4: calculator workbench cleanup.

- Keep deterministic frontend forms for the calculators that are already implemented.
- Keep chat-assisted calculators as Assistant launches, not fake executors.
- Make the distinction visible in Tools and Calculator hub labels.
- Consider splitting `Calculators.jsx` into hub, routing, shared panels, and individual calculator modules after coverage is stable.

Phase 5: Operations and Fleet decision.

- Decide whether Fleet remains a module under Operations or a legacy URL namespace only.
- If Operations is canonical, make `/operations` the visible hub for fleet command, route optimization, predictive maintenance, alerts, analytics, costs, and audit links.
- Keep `/fleet/*` as deep links only.

Phase 6: layout stabilization.

- Add route-level visual smoke coverage for the highest-risk standalone AI pages and calculators.
- Keep testing compact viewports, Android, long text, wide cards, long suggestions, and drawer interactions.
- Audit any page that creates its own scroll container inside `.app-shell-page-body`.

Phase 7: dev workflow hardening.

- Keep `validate:assets` and `validate:vercel-env` mandatory.
- Document the local startup matrix: frontend only, backend only, both, preview, Vercel static frontend.
- Verify npm availability and dependency installation on the target machine before relying on full CI parity locally.

## 16. Exact Files To Investigate Next

Highest priority:

- `src/pages/Dashboard.jsx`
- `src/pages/Dashboard.css`
- `src/components/ChatInterface.jsx`
- `src/pages/tools/Calculators.jsx`
- `src/pages/tools/ToolPageLayout.jsx`
- `src/pages/tools/AmbientScribe.jsx`
- `src/pages/tools/GuidelineRag.jsx`
- `src/pages/tools/DifferentialAi.jsx`
- `src/pages/tools/TimelineAi.jsx`
- `src/pages/tools/PatientSummaryAi.jsx`
- `src/pages/tools/OrderSetAi.jsx`
- `src/pages/tools/AiExplainability.jsx`
- `src/pages/tools/ClinicalAudit.jsx`
- `src/pages/Operations.jsx`
- `src/pages/fleet/FleetDashboard.jsx`
- `src/pages/fleet/PredictiveMaintenance.jsx`
- `src/pages/fleet/RouteOptimizer.jsx`

Inventory and contracts:

- `src/data/toolInventory.js`
- `src/data/toolRegistry.js`
- `src/data/clinicalToolIdContract.js`
- `src/data/clinicalIntentToolCatalog.js`
- `src/data/clinicalCatalogWiring.js`
- `src/data/sourceCodeToolDiscovery.js`
- `src/data/toolVisibilityMatrix.js`
- `src/data/capabilityExposureMatrix.js`
- `src/data/backendFrontendToolContract.js`
- `src/data/backendRouteExposurePolicy.js`
- `src/data/frontendApiCallsInventory.js`
- `src/data/backendHttpRouteInventory.js`

Backend:

- `backend/src/modules/chat/chat.service.ts`
- `backend/src/modules/chat/chat.controller.ts`
- `backend/src/modules/clinical-intelligence/clinical-intelligence.controller.ts`
- `backend/src/modules/clinical-intelligence/clinical-intelligence.service.ts`
- `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.service.ts`
- `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts`
- `backend/src/modules/medical-control-plane/intent-classifier/intent-classifier.service.ts`
- `backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts`
- `backend/src/modules/ai/ai.service.ts`
- `backend/src/modules/rag/rag.service.ts`

Build, test, and deployment:

- `package.json`
- `package-lock.json`
- `backend/package.json`
- `backend/package-lock.json`
- `vite.config.js`
- `vitest.config.js`
- `vercel.json`
- `.env.example`
- `scripts/validate-assets.mjs`
- `scripts/validate-vercel-env.mjs`
- `src/routing/canonicalRouteRedirects.test.js`
- `src/routing/sectionLinkInventory.test.js`
- `src/test/routePagesSmoke.test.jsx`
- `src/test/responsiveRegression.routes.js`
- `src/layout/AppShell.layout.test.js`

Do not start implementation until these follow-up inspections are converted into explicit product decisions: which routes remain visible, which standalone pages become Assistant workflows, which pages are developer-only, which backend capabilities are intentionally hidden, and which legacy/prototype components should be retired.
