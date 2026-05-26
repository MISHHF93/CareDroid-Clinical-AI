# CareDroid UX Normalization and Backend Wiring

## 1. Executive Summary

The app now presents a flatter authenticated experience around five clinician-facing entry points: Dashboard, Assistant, Tools, Calculators, Operations, and Settings. Existing deep links and feature routes remain intact, while duplicated operational navigation is consolidated under Operations and Quick Command.

Backend/frontend wiring remains contract-driven. Registered POST executors are still limited to `sofa-calculator`, `drug-interactions`, and `lab-interpreter`; local calculators, chat-assisted workflows, fleet maps, IoT panels, and profile/workspace APIs are audited separately so no feature silently claims unsupported executor behavior.

## 2. UX Simplification Changes

- Operations is the single visible command area for fleet, live map, hospital map, Medical IoT, device management, alerts, analytics, and audit routes.
- Maps and Medical IoT remain routable and searchable, but are hidden from the primary shell navigation to remove duplicate top-level entries.
- Sidebar Actions remains available, but starts collapsed so the app shell is compact by default; all tools remain reachable from Tools, Calculators, Quick Command, and the expandable Actions drawer.
- The tool workspace selector is scoped to the expanded Actions drawer, reducing duplicated workspace controls in the default sidebar.
- Sidebar tool cards now expose keyboard launch handling and accessible labels.

## 3. Flattened Layout Overview

Canonical route groups:

- `/dashboard`: command dashboard.
- `/assistant`: AI chat workspace; `/chat`, `/ai`, and `/copilot` redirect here.
- `/tools`: canonical user-facing tool library.
- `/tools/calculators` and `/tools/calculators/:slug`: calculator hub and dedicated calculator forms.
- `/tools/catalog`: permissioned Developer Catalog / Source Audit; `/catalog` redirects here.
- `/operations`: canonical operational command area for maps, fleet, IoT, devices, alerts, analytics, and audit surfaces.
- `/settings` and `/profile/*`: profile, workspace, preferences, security, notifications, and onboarding surfaces.

## 4. Backend-Frontend Wiring Audit

Executor wiring is synchronized through `clinicalToolIdContract.js`, `clinicalCatalogWiring.js`, `toolInventory.js`, and backend `tool-orchestrator.registry.ts`.

Backend registered executors:

- `sofa-calculator` -> `/api/tools/sofa-calculator/execute`
- `drug-interactions` -> `/api/tools/drug-interactions/execute`
- `lab-interpreter` -> `/api/tools/lab-interpreter/execute`

Operational feeds have real read-only backend routes but are marked `demo` in `backendApiCapabilities.js` because the current controllers return clearly labeled sample contracts until live feeds are connected.

Clinical alerts now have authenticated demo-backed workflow routes:

- `GET /api/clinical/alerts`
- `POST /api/clinical/alerts/:alertId/acknowledge`
- `POST /api/clinical/alerts/:alertId/dismiss`

The alerts stream remains disabled as `clinicalAlertsStream` until a real stream or WebSocket contract is implemented.

Profile and workspace clients are now represented in `frontendApiCallsInventory.js` and `backendHttpRouteInventory.js`, including `/api/profile/me`, `/api/workspaces`, `/api/activity`, and `/api/personalization/me`.

## 5. Route Consolidation

Legacy aliases remain redirects so existing bookmarks continue working:

- `/home` -> `/dashboard`
- `/chat`, `/ai`, `/copilot` -> `/assistant`
- `/all-tools`, `/clinical-tools` -> `/tools`
- `/calculators` -> `/tools/calculators`
- `/catalog` -> `/tools/catalog`
- `/fleet` -> `/operations`
- `/maps`, `/tracking`, `/live-tracking` -> `/live-map`

The visible IA avoids redundant Maps and Medical IoT primary entries; those features are accessed from Operations, Tools, or Quick Command.

## 6. Inventory Synchronization

Tool ID contracts are synchronized across:

- `src/data/toolRegistry.js`
- `src/data/clinicalIntentToolCatalog.js`
- `src/data/clinicalCatalogWiring.js`
- `src/data/medicalToolsCatalogIndex.js`
- `src/data/sourceCodeToolDiscovery.js`
- `backend/src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns.ts`

Tests now assert that every backend NLU pattern is covered by clinical intent rows, hub-only calculator rows, or chat-assisted hub groups.

## 7. AI Assistant Integration

AI-assisted launch behavior is preserved through `applyRegistryToolLaunch()` and `resolveCatalogLaunch()`. Calculator forms with deterministic UI launch directly; chat-assisted and AI workflow tools seed Assistant with guardrailed prompts and navigate to `/assistant`.

Quick Command continues to combine shell destinations with user-facing inventory. After nav flattening, live map, hospital map, and Medical IoT appear as searchable tool entries instead of duplicate primary nav destinations.

## 8. Responsive Layout Validation

The responsive matrix covers:

- Mobile: `320`, `360`, `390`, `412`, `430`
- Tablet: `768`, `1024`
- Desktop: `1280`, `1440`

The layout contract keeps document-level horizontal overflow clipped, `.app-shell-page-body` as the authenticated vertical scrollport, and table/map overflow local to wrappers such as map canvases and fleet/device table containers.

## 9. Tests Added

- Primary navigation de-duplication and Operations matching tests.
- Quick Command inventory tests for operational sub-surfaces after nav flattening.
- Backend capability status tests for `real`, `demo`, and disabled capabilities.
- User profile/workspace/activity/personalization API exposure coverage.
- Backend NLU pattern coverage across catalog and chat-assisted hub groups.
- Route smoke viewport matrix across mobile, tablet, and desktop widths.
- Static CSS responsive assertions for local operational table/map scrolling.

## 10. Remaining Risks

- Fleet telemetry, hospital maps, Medical IoT, live tracking, and device alerts are backend-routable but still demo-backed until real feeds are connected.
- Clinical alerts are demo-backed for list/ack/dismiss, but no live alert stream or real bedside alarm source is connected.
- Workspace state has two layers: operational workspace from backend identity APIs and tool workspace personalization stored locally. The UX is simplified, but full persistence unification remains future work.
- A full browser pass is still recommended for visual confirmation across the viewport matrix after production build.
