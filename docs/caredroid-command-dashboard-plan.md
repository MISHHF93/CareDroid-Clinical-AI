# CareDroid Command Dashboard Plan

## 1. Executive Summary

CareDroid already has the core pieces for an AI-first clinical operating system: authenticated routing, a shared app shell, a chat-centered `Dashboard.jsx`, a canonical tool inventory, calculator route definitions, tool launch resolution, clinical intelligence pages, fleet pages, emerging Medical IoT/device-monitoring needs, backend executor contracts, and responsive QA. The current user experience still feels fragmented because the post-login entrance is `/tools`, `/dashboard` redirects to `/home`, `/home` and `/assistant` share a chat component with different modes, and user-facing tools, developer audit views, calculators, fleet operations, connected-device monitoring, and backend-backed workflows are distributed across many routes.

The proposed revamp creates a unified **CareDroid Command Dashboard** as the authenticated app entrance at `/dashboard`. This dashboard becomes the clinical cockpit: the assistant prompt is visible immediately, recommended actions sit around the prompt, and every tool card launches through the existing canonical launch resolver instead of creating another route system.

`/tools` remains important, but it becomes a supporting **Tool Library** for search, filters, and full inventory browsing. `/tools/catalog` remains the permission-gated Developer Catalog / Source Audit and should not be mixed into the clinician-facing dashboard.

## 2. Current Fragmentation Problem

Current observations from the codebase:

- `src/App.jsx` sends successful auth and direct sign-in to `/tools`, so the app currently opens on the library rather than a command dashboard.
- `/dashboard` is a legacy redirect to `/home`, while `/home` and `/assistant` both render `Dashboard.jsx`.
- `Dashboard.jsx` is primarily a chat/assistant workspace with a home mode, not a full command center for calculators, diagnostics, fleet, backend status, and recent results.
- `/tools` already acts like a strong user-facing tool library through `getUserFacingToolRegistryProjection()`, but because it is the post-login landing page it competes with dashboard/home.
- `/tools/catalog` is a developer/source audit surface with source scan artifacts, phantom/API rows, and backend discovery views. It is correctly permission-gated, but it must remain separate from user-facing workflows.
- Calculator routes are mature and route-backed through `CALCULATOR_ROUTE_DEFS`, `calculatorHubManifest.js`, and `Calculators.jsx`.
- Tool launch behavior is already centralized in `registryToolLaunch.js` and `clinicalCatalogWiring.js`; the dashboard should reuse this instead of duplicating launch logic.
- Fleet tools have dedicated pages and an operations landing page, but they feel like a separate island from clinical AI and tools.
- Backend contract truth exists in `docs/backend-frontend-tool-contract.md`, `toolInventory.js`, `backendApiCapabilities.js`, and related tests, but dashboard status is not surfaced as a first-class panel.

## 3. Proposed Main Dashboard Route

Use `/dashboard` as the canonical authenticated entrance.

Recommended routing model:

- `/` remains the unauthenticated public welcome page.
- `/auth` remains the canonical sign-in/create-account page.
- Successful auth/direct sign-in redirects to `/dashboard`.
- `/dashboard` renders the new `CareDroidCommandDashboard`.
- `/home` becomes a legacy redirect to `/dashboard`.
- `/assistant` remains the focused AI assistant workspace.
- `/medical-iot` becomes the canonical Medical IoT / Device Monitoring route.
- `/chat`, `/ai`, and `/copilot` remain legacy redirects to `/assistant`.
- `/tools` remains the Tool Library.
- `/tools/catalog` remains Developer Catalog / Source Audit.

Rationale: `/dashboard` is clearer than `/home` for a clinical command center, preserves `/` for public entry, and avoids making `/tools` the app’s conceptual home.

## 4. Dashboard Information Architecture

The dashboard should be one AI-first page with seven top-level panels:

- **AI Assistant Panel:** primary prompt, suggested prompts, recent conversations, quick recommendations.
- **Clinical Tools Panel:** calculators, diagnostics, chat-assisted tools, emergency/inpatient tools.
- **Reference & Guidelines Panel:** guideline RAG, drug checker, lab interpreter, protocol lookup, antibiotic guide.
- **Fleet & Operations Panel:** fleet command, route optimizer, predictive maintenance, dispatch AI, operations status.
- **Medical IoT / Device Monitoring Panel:** connected devices, vitals streams, wearable data, abnormal readings, battery/connectivity, stale/offline warnings.
- **Recent Activity Panel:** recent calculators/tools, recent backend results, recent assistant outputs.
- **System Status Panel:** backend connectivity, demo/direct sign-in state, API health, unsupported tool count, developer audit link.

The page should feel like a clinical cockpit, not a static catalog. The assistant prompt should be above the fold on desktop and near the top on mobile.

## 5. AI Assistant Panel Design

Purpose: make the chatbot the obvious center of the application.

Recommended content:

- A large prompt input with placeholder text such as “Ask CareDroid what you need to do next…”.
- Suggested prompts derived from `CHAT_EMPTY_ACTIONS`, `getChatCapabilitySuggestions()`, and high-value tool inventory groups.
- Recent conversations from `ConversationContext`.
- Quick recommendations based on selected/recent tools from `ToolPreferencesContext`.
- Buttons for:
  - “Open Assistant Workspace” → `/assistant`
  - “Start clinical question”
  - “Interpret labs”
  - “Check medication safety”
  - “Calculate severity score”

Launch behavior:

- Free-text submit should seed the active conversation and navigate to `/assistant`.
- Tool-aware suggestions should use `applyRegistryToolLaunch()` when a tool ID exists.
- Chat-assisted tools should seed chat through the existing `launch.chatSeed` behavior.
- Backend-backed executors should route into validated UI or assistant execution cards, not raw POST calls from dashboard.

## 6. Clinical Tools Panel Design

Purpose: surface the most useful clinical tools without duplicating the Tool Library.

Recommended groups:

- **Calculators:** qSOFA, SOFA, NEWS2, HAS-BLED, ASCVD, PHQ-9, GAD-7, calculator hub.
- **Diagnostics:** differential AI, diagnosis assistant, ABG interpreter, lab interpreter.
- **Chat-assisted tools:** Wells PE, PERC, NIHSS, Canadian C-Spine, Ottawa Ankle, COPD GOLD, Rome IV IBS.
- **Emergency/inpatient:** clinical alerts, ACLS/ATLS protocols, severity scoring, inpatient risk scores.

Data source:

- Use `getUserFacingToolInventory()` or `getUserFacingToolRegistryProjection()` from `toolInventory.js`.
- Filter by `category`, `surface`, `launchType`, `tier`, `executorStatus`, and aliases.
- Do not hand-maintain a dashboard-only duplicate tool list except for small curated section IDs.

Launch behavior:

- Calculator with dedicated route → `/tools/calculators/:slug`.
- Calculator hub → `/tools/calculators`.
- Chat-assisted calculator → seed `/assistant`.
- Diagnostics page → its canonical `/tools/...` page.
- Unsupported planned tool → disabled/unsupported state with explanation and “Ask Assistant” fallback.

## 7. Reference & Guidelines Panel Design

Purpose: give clinicians fast access to decision-support references without mixing developer audit artifacts.

Recommended cards:

- Guideline Retrieval + Evidence Engine → `/tools/guideline-rag`
- Drug Checker → `/tools/drug-checker`
- Lab Interpreter / ABG Interpreter → `/tools/lab-interpreter`
- Clinical Protocols / ACLS / ATLS → `/tools/protocols`
- Antibiotic Guide → `/tools/diagnosis` or assistant seed through registry launch
- Procedure Guide → `/tools/procedures`

Behavior:

- Every card should show whether it opens a page, starts assistant-guided flow, or uses a backend executor.
- Reference cards should include “Decision support only” microcopy where clinically relevant.
- The dashboard should show no source-scan rows, phantom rows, API-only rows, or developer-only statuses.

## 8. Fleet & Operations Panel Design

Purpose: integrate operations/fleet into the same command center without pretending fleet tools are clinical calculators.

Recommended cards:

- Fleet Command → `/fleet/command`
- Route Optimizer → `/fleet/route-optimizer`
- Predictive Maintenance → `/fleet/predictive-maintenance`
- Dispatch AI → chat-assisted launch through `applyRegistryToolLaunch('dispatch-ai')`
- Operations → `/operations`
- Clinical Alerts → `/clinical/alerts`

Status fields:

- Fleet telemetry state from `fetchFleetCommandSnapshot()` if loaded cheaply or cached.
- Local/mock notice for fleet tools that are not backend-controlled.
- Warning counts if available from fleet pages/services, otherwise “Open for details”.

Safety language:

- Fleet tools must remain decision support only.
- Dashboard must not imply it dispatches vehicles, schedules service, or controls telemetry.

## 8A. Medical IoT / Device Monitoring Panel Design

Purpose: make connected medical devices, telemetry, vitals, and sensor monitoring a first-class clinical dashboard module rather than hiding them under fleet, tools, or developer catalog.

Canonical route and inventory:

- Canonical route: `/medical-iot`.
- Canonical inventory ID: `medical-iot-dashboard`.
- Dashboard placement: first-class Command Dashboard section.
- Tool Library placement: user-facing operations/IoT card in `/tools` with search/filter support.
- Optional sidebar shortcut: high-priority primary nav item such as “Medical IoT” or “Devices”.

Recommended content:

- Connected devices and device status.
- Patient vitals streams and wearable data.
- Pulse oximeter, glucose monitor, blood pressure device, and ECG/heart-rate telemetry readings.
- Device battery and connectivity status badges.
- Abnormal reading alerts and offline-device warnings.
- Recent telemetry trend cards or mini charts when the existing chart stack is available.
- Last updated timestamps and source labels for every reading.
- Empty, loading, error, and backend-unavailable states.
- Demo/mock telemetry indicator whenever live telemetry is not connected.

Backend inspection result:

- No dedicated Medical IoT backend module or `/api/medical-iot` endpoint was found in the current codebase.
- Related but non-equivalent backend surfaces exist: `POST /api/chat/analyze-vitals`, notification device tokens, auth device fingerprints/biometrics, clinical-intelligence DTO fields that include vitals, and fleet mock telemetry.
- Because there is no dedicated IoT backend contract today, the frontend must not present demo telemetry as live device data.

Backend requirements:

- Add dedicated backend modules before live data is claimed: `device-service`, `telemetry-service`, `vitals-stream-service`, `alert-service`, and `device-registry-service`.
- Provide guarded endpoints such as `GET /api/medical-iot/snapshot`, `GET /api/medical-iot/devices`, `GET /api/medical-iot/telemetry`, and `GET /api/medical-iot/alerts`.
- Define DTOs that include `deviceId`, `patientContext` or scoped patient identifier, `readingType`, `value`, `unit`, `timestamp`, `source`, `staleness`, `battery`, `connectivity`, `status`, and `alertSeverity`.
- Use the canonical API client layer and auth/RBAC guards. Do not call raw endpoints from dashboard cards.

Safety requirements:

- Device data is monitoring support only and alerts do not replace clinician assessment.
- Stale/offline data must be visibly labeled.
- Every reading must show timestamp and source.
- The UI must distinguish mock/demo telemetry from live telemetry.
- Abnormal reading alerts should encourage review/escalation without making autonomous treatment claims.

## 9. Recent Activity Panel Design

Purpose: make the dashboard feel continuous across sessions.

Data sources:

- `recentTools` from `ToolPreferencesContext`.
- `conversations` and active conversation metadata from `ConversationContext`.
- Local tool result history if available; otherwise phase in a lightweight local result summary later.
- Backend result sync should only be shown if `backendApiCapabilities.toolsResultsSync` is enabled and a supporting client exists.

Recommended UI:

- Recent tool cards with category and “Open again”.
- Recent assistant outputs with “Continue in Assistant”.
- Recent backend executor results with status: validated, executed, unsupported, failed.
- Empty state: “No recent activity yet. Start with Assistant or open a tool.”

No blank panel: if no data exists, show a useful empty state and suggested action.

## 10. System Status Panel Design

Purpose: make backend/demo/API state visible without letting API failure break the dashboard.

Recommended status items:

- Auth/session state: signed in, direct sign-in/demo marker from `useUser().isDevAuthBypass`.
- Backend config state from `SystemConfigContext`: `loading`, `error`, `configDegraded`, `isRagEnabled`, `availableTools`.
- API capability summary from `backendApiCapabilities.js`.
- Registered executor count from `BACKEND_EXECUTOR_NLU_TOOL_IDS`.
- Unsupported/planned tool count from `toolInventory.js` or `fetchToolExecutorCatalog()`.
- Developer audit link to `/tools/catalog`, visible only when `Permission.CONFIGURE_SYSTEM` is present.

Failure behavior:

- If backend config fails, show degraded mode with retry.
- If tools executor catalog fails, show “Executor catalog unavailable” rather than a blank panel.
- If backend is unavailable, preserve local calculators and local fleet pages.

## 11. Unified Tool Library Strategy

`/tools` should become the focused **Tool Library**, not the main app homepage.

Keep:

- One card per canonical user-facing tool.
- Data from `getUserFacingToolRegistryProjection()` / `toolInventory.js`.
- Search by title, ID, alias, category, features, use cases.
- Filters for calculators, diagnostics, AI tools, fleet, reference, backend-backed.
- Recent/pinned/favorite ordering.

Change later:

- Rename page copy from “Tools” to “Tool Library” where appropriate.
- Keep `Developer Catalog / Source Audit` as a secondary admin link only.
- Make dashboard the primary place for curated, recommended, and recent actions.
- Keep library cards less cockpit-like and more browse/search oriented.

Do not:

- Add developer/source scan rows to `/tools`.
- Duplicate a separate dashboard-only catalog.
- Show phantom/internal/API-only rows in the user library.

## 12. Route Normalization Strategy

Target canonical routes:

- `/dashboard` → CareDroid Command Dashboard.
- `/assistant` → focused chat workspace.
- `/tools` → Tool Library.
- `/tools/calculators` → calculator hub/filter.
- `/tools/calculators/:slug` → dedicated calculator form.
- `/tools/catalog` → Developer Catalog / Source Audit.
- `/operations` → operations landing page.
- `/medical-iot` → Medical IoT / Device Monitoring dashboard.
- `/fleet/command`, `/fleet/route-optimizer`, `/fleet/predictive-maintenance` → fleet pages.

Redirects:

- Auth success and direct sign-in → `/dashboard`.
- Authenticated public route fallback → `/dashboard`, not `/tools`.
- `/home` → `/dashboard`.
- `/chat`, `/ai`, `/copilot` → `/assistant`.
- `/all-tools`, `/clinical-tools` → `/tools`.
- `/calculators` → `/tools/calculators`.
- Legacy singular calculator paths → plural calculator paths via existing aliases.
- `/fleet` → `/operations`.
- `/catalog` → `/tools/catalog`.

Implementation note: update route tests in `canonicalRouteRedirects.test.js`, `sectionLinkInventory.test.js`, route smoke tests, and auth/direct-sign-in tests together with route changes.

## 13. Backend Integration Strategy

Use existing guarded clients and capabilities:

- `apiClient.js` for authenticated fetch, JSON parsing, timeout handling, and user-facing API errors.
- `SystemConfigContext.jsx` for system config, RAG, AI usage, tools, subscription, degraded config states.
- `clinicalToolsApi.js` for backend tool list, metadata, executor catalog, statistics, validation.
- `backendApiCapabilities.js` to avoid calling routes that do not exist.
- `docs/backend-frontend-tool-contract.md` and `toolInventory.js` as contract truth.

Dashboard backend rules:

- Never call a backend endpoint directly from a dashboard card unless a guarded service exists.
- Show loading, degraded, unavailable, and unsupported states.
- Local calculators stay usable without backend.
- Fleet local pages stay usable without backend.
- Registered executors must be limited to actual orchestrator executors (`sofa-calculator`, `drug-interactions`, `lab-interpreter`) unless backend registry expands.
- Clinical intelligence workflows use their own platform endpoints and permission policies, not the generic tool executor lane.
- Medical IoT workflows must use dedicated guarded device/telemetry services once implemented. Until then, show demo/planned-backend state and do not call nonexistent IoT endpoints.

## 14. Mobile Layout Strategy

Required viewports:

- 320px
- 360px
- 390px
- 412px
- 430px
- tablet portrait/landscape
- desktop

Layout:

- Mobile: single-column stacked panels.
- Desktop: cockpit grid with AI Assistant Panel spanning the top/left and secondary panels around it.
- Tablet: two-column where safe, otherwise stacked.
- Sticky or near-top assistant quick prompt on mobile.
- Bottom app nav remains usable; dashboard content must not hide behind it.
- Use `minmax(0, 1fr)`, `min-width: 0`, wrapping chips, and no absolute action buttons over content.
- Cards use large touch targets and safe line wrapping.

QA:

- Add `/dashboard` to `responsiveQaMatrix.js`.
- Add `/medical-iot` to `responsiveQaMatrix.js`.
- Keep overlap scanner checks from `e2e/responsive-qa.helpers.mjs`.
- Add dashboard-specific responsive smoke tests for panel rendering and no horizontal overflow.
- Add Medical IoT route smoke and responsive checks for 320, 390, 412, and desktop layouts.

## 15. Accessibility Strategy

Requirements:

- One `h1`: “CareDroid Command Dashboard”.
- Panels are `section` elements with accessible headings.
- AI prompt has explicit label and helper text.
- Tool cards are buttons or links with descriptive accessible names.
- Status panel uses `role="status"` for non-urgent changes and `role="alert"` only for urgent backend failures.
- Recent activity entries expose type, time, and action.
- Unsupported states explain why a tool cannot be launched.
- Keyboard navigation order starts with prompt, then recommended actions, then panels.
- Focus should move predictably when dashboard launches assistant or tool routes.

## 16. Implementation Phases

Phase 1: route and shell realignment

- Create `CareDroidCommandDashboard` page.
- Route `/dashboard` to the new dashboard.
- Redirect `/home` to `/dashboard`.
- Update auth/direct sign-in success paths to `/dashboard`.
- Keep `/assistant` for focused chat.
- Update navigation primary item from Home to Dashboard if product language agrees.

Phase 2: dashboard data model

- Create a small dashboard model module that derives cards from `toolInventory.js`.
- Define curated group IDs for AI Assistant, Clinical Tools, Reference, Fleet, Recent, and System Status.
- Use `applyRegistryToolLaunch()` for all tool cards.
- Use `SystemConfigContext` and guarded API helpers for status.

Phase 3: dashboard UI

- Build responsive dashboard panels.
- Add AI prompt, suggested prompts, and recent conversation cards.
- Add dashboard cards for calculators, diagnostics, references, fleet, and operations.
- Add Medical IoT / Device Monitoring as a first-class dashboard panel and Tool Library card.
- Add empty/loading/error states for each panel.

Phase 4: Tool Library refinement

- Rename `/tools` copy to “Tool Library”.
- Ensure filters match calculators, diagnostics, AI tools, fleet, reference, backend-backed.
- Ensure filters include Medical IoT / device monitoring.
- Verify one card per canonical user-facing tool.
- Keep developer/source audit link permission-gated.

Phase 5: backend-aware status and unsupported states

- Add executor catalog summary if available.
- Add degraded API/config status.
- Add unsupported/planned tool counts from inventory or executor catalog.
- Ensure no panel crashes when backend is unavailable.

Phase 6: tests and responsive QA

- Add dashboard route/render tests.
- Add auth redirect tests.
- Add launch behavior tests.
- Add mobile smoke tests and Playwright QA route coverage.
- Update docs and route inventory tests.

## 17. Exact Files To Modify Later

Routing/auth:

- `src/App.jsx`
- `src/auth/devAuthBypass.js` only if direct sign-in copy or return route needs adjustment
- `src/pages/Auth.jsx` only if auth success UX copy changes
- `src/routing/canonicalRouteRedirects.test.js`
- `src/routing/sectionLinkInventory.test.js`

New dashboard:

- `src/pages/CommandDashboard.jsx`
- `src/pages/CommandDashboard.css`
- `src/pages/CommandDashboard.test.jsx`
- optional `src/data/commandDashboardModel.js`
- optional `src/data/commandDashboardModel.test.js`

Assistant/chat:

- `src/pages/Dashboard.jsx` or future split into `src/pages/AssistantWorkspace.jsx`
- `src/utils/chatCapabilitySuggestions.js`
- `src/contexts/ConversationContext.jsx`

Tool library and launches:

- `src/pages/tools/ToolsOverview.jsx`
- `src/pages/tools/ToolsOverview.css`
- `src/pages/tools/ToolsOverview.inventory.test.jsx`
- `src/data/toolInventory.js`
- `src/data/calculatorHubManifest.js`
- `src/data/clinicalCatalogWiring.js`
- `src/navigation/registryToolLaunch.js`
- `src/navigation/registryToolLaunch.test.js`

Operations/fleet:

- `src/pages/Operations.jsx`
- `src/pages/fleet/FleetDashboard.jsx`
- `src/pages/fleet/RouteOptimizer.jsx`
- `src/pages/fleet/PredictiveMaintenance.jsx`
- `src/services/fleetTelemetryService.js`

Medical IoT / devices:

- `src/pages/MedicalIotDashboard.jsx`
- `src/pages/MedicalIotDashboard.css`
- `src/pages/MedicalIotDashboard.test.jsx`
- `src/services/medicalIotService.js`
- future backend modules: `backend/src/modules/device-service`, `backend/src/modules/telemetry-service`, `backend/src/modules/vitals-stream-service`, `backend/src/modules/alert-service`, `backend/src/modules/device-registry-service`

Backend/status:

- `src/contexts/SystemConfigContext.jsx`
- `src/services/configService.js`
- `src/services/clinicalToolsApi.js`
- `src/config/backendApiCapabilities.js`
- `docs/backend-frontend-tool-contract.md` only if contracts change

Responsive/test/docs:

- `src/data/responsiveQaMatrix.js`
- `src/test/routePagesSmoke.test.jsx`
- `src/test/responsiveRegression.routes.js`
- `src/test/responsiveRegression.coverage.test.js`
- `e2e/responsive-qa.spec.mjs`
- `docs/responsive-regression-coverage.md`

## 18. Test Plan

Route tests:

- `/dashboard` renders the command dashboard for authenticated users.
- `/home` redirects to `/dashboard`.
- `/assistant` renders focused assistant workspace.
- `/tools` remains accessible as Tool Library.
- `/tools/catalog` remains permission-gated Developer Catalog / Source Audit.
- `/medical-iot` renders Medical IoT / Device Monitoring as a first-class route.
- Auth success and direct sign-in route to `/dashboard`.

Dashboard tests:

- Dashboard renders AI Assistant, Clinical Tools, Reference & Guidelines, Fleet & Operations, Medical IoT / Device Monitoring, Recent Activity, and System Status panels.
- Dashboard never renders duplicate cards for the same canonical tool.
- Dashboard cards derive from canonical inventory, not an untracked local list.
- Dashboard empty states are visible when recent activity or backend status is unavailable.
- Demo/direct-sign-in banner remains visible in app shell.

Launch tests:

- Calculator card launches `/tools/calculators/:slug`.
- Calculator hub launches `/tools/calculators`.
- Chat-assisted tool seeds `/assistant`.
- Clinical AI page launches its canonical `/tools/...` route.
- Backend-backed executor launches valid UI/assistant execution path.
- Fleet tool launches `/fleet/...`.
- Medical IoT card launches `/medical-iot`.
- Unsupported/planned tool shows unsupported state and safe fallback.

Tool Library tests:

- `/tools` has one card per user-facing canonical tool.
- Filters work for calculators, diagnostics, AI tools, fleet, Medical IoT, reference, backend-backed.
- Search matches title, alias, category, features, and use cases.
- Developer/source scan artifacts are absent from user-facing library.

Backend failure tests:

- System Status Panel handles config load timeout.
- Executor catalog failure shows degraded state.
- Backend unavailable does not blank dashboard.
- Local calculators remain launchable when backend is unavailable.
- Medical IoT backend failure shows a non-blank degraded state and does not pretend demo telemetry is live.
- Medical IoT empty-device state renders when no devices are connected.

Mobile/responsive tests:

- Dashboard smoke renders at 320, 360, 390, 412, 430.
- No horizontal overflow.
- No action/control overlap.
- Touch targets meet the app minimum.
- Sticky/near-top prompt remains reachable.
- Cards wrap safely.
- Medical IoT vitals cards, device list, alerts, and trend mini charts wrap safely.

## 19. Risks and Do-Not-Touch Areas

Risks:

- Adding too much logic to the existing `Dashboard.jsx` could make the already large assistant component harder to maintain.
- Creating dashboard-only card data could reintroduce duplicate inventory drift.
- Promoting frontend-only or chat-assisted tools as backend executors would violate the backend/frontend contract.
- Presenting Medical IoT demo/mock telemetry as live device data would create clinical safety risk.
- Putting developer catalog rows into `/tools` or dashboard would confuse clinicians.
- Changing auth redirects without updating route tests could recreate the current fragmentation.
- Mobile cockpit layouts can easily create horizontal overflow if cards, chips, or action toolbars do not wrap.

Do not touch without a separate backend contract task:

- Backend executor registry and DTOs.
- Clinical intelligence endpoint contracts.
- `ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS`.
- Tool IDs and alias maps, unless the change includes full inventory, NLU, route, and test updates.
- `/tools/catalog` source audit semantics.
- Safety guardrails and clinical decision-support disclaimers.
- Live Medical IoT control, alarms, or device-write behavior without a separate backend/device safety contract.

## 20. Acceptance Criteria

- `/dashboard` is the main authenticated app entrance.
- `/` remains public welcome and `/auth` remains auth.
- Successful login/direct sign-in routes to `/dashboard`.
- `/tools` functions as a supporting Tool Library, not a competing homepage.
- `/tools/catalog` remains a separate developer/source audit surface.
- The dashboard is AI-chatbot centered with a prominent assistant prompt.
- Clinical tools, calculators, diagnostics, reference/guidelines, fleet/operations, Medical IoT/device monitoring, recent activity, and system status are all represented coherently.
- `/medical-iot` is the canonical route for connected medical devices, vitals, telemetry, alerts, and sensor monitoring.
- `medical-iot-dashboard` is present in canonical inventory and Tool Library.
- Medical IoT demo/mock telemetry is clearly distinguished from live data.
- Every dashboard card uses canonical launch behavior through existing launch resolution.
- No duplicate catalogs are introduced.
- No hidden launchable tools are omitted from dashboard/library strategy.
- Backend-aware panels show loading, degraded, unsupported, and error states without crashing.
- Mobile layout is designed and tested from 320px upward.
- Accessibility, route, launch, backend failure, and responsive overlap tests are planned before implementation.

