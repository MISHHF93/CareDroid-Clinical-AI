# Full Throttle Platform Consolidation Report

Date: 2026-05-29

## Product Model

CareDroid is now organized as a compact AI-first clinical operating system:

- `/auth` is the one canonical auth screen.
- `/dashboard` is the main app entrance.
- `/assistant` is the canonical AI workspace.
- `/tools` is the user-facing tool library.
- `/tools/calculators` and `/tools/calculators/:slug` are the focused calculator routes.
- `/tools/catalog` is Developer Catalog / Source Audit only.
- `/hospital-map`, `/medical-iot`, `/devices`, `/fleet/map`, and `/live-map` remain visible operational surfaces.

## Access Fixes

- The auth page and public welcome page now expose a visible `Continue in Demo Mode` action when local dev or demo flags allow it.
- Demo entry uses the same persisted auth token/profile keys as normal auth: `caredroid_access_token` and `caredroid_user_profile`.
- The demo profile keeps a `physician` role plus `authMode: local-dev-demo`, `isDevAuthBypass: true`, and `devAuthLabel: Demo Mode`, which is compatible with the existing protected route checks.
- The app shell displays the demo-mode banner after entry.
- `.env.example` documents `VITE_DEMO_MODE=true` as the hosted-demo flag for the `/auth` button.

## Route Canonicalization

- `/login`, `/signin`, and `/sign-in` continue to redirect to `/auth`.
- `/chat` and `/ai` redirect to `/assistant`.
- `/all-tools` redirects to `/tools`.
- `/catalog` now redirects to `/tools` so normal users do not land in the developer/source-audit catalog by accident.
- `/calculators` redirects to `/tools/calculators`.
- `/fleet` redirects to `/fleet/map`.
- `/operations` now redirects to `/dashboard`; deeper platform operations routes remain available for advanced/admin workflows.
- Unknown authenticated routes render a non-blank not-found page inside the app shell.

## Navigation And Dashboard

- Sidebar primary items now move toward workspace-first IA: Workspace, AI Assistant, Command Center, Profile, and Settings.
- The collapsed More group keeps secondary destinations reachable without top-level sprawl: Tool Library, Calculators, Hospital Map, Medical IoT, Fleet Map, Developer Catalog / Source Audit, System Health, Governance, Security, and Audit Logs.
- `/workspace/:workspaceId` introduces Clinical, Emergency, Operations, Fleet, Medical IoT, Research, and Admin workspaces. Each workspace exposes relevant routes, dashboards, calculators, tools, maps, and AI context from the unified inventory.
- `/workspaces` is the workspace directory and entry point for the workspace architecture.
- A global workspace switcher is available in the authenticated app shell header.
- Quick Command now searches workspace destinations in addition to routes and inventory-backed tools/calculators, with fuzzy matching, recent tools, favorites, and keyboard launch from the search field.
- The dashboard launchpad provides compact entry cards for AI Assistant, Tools, Calculators, Hospital Map, Medical IoT, Fleet, Device Management, Recent Activity, and System Status.
- `/dashboard` includes an adaptive workspace panel that changes recommendations from role/workspace/recent/favorite context.
- Quick Command remains a launcher/search surface backed by the unified tool inventory while preserving shared calculator-hub tools.

## Platform Upgrades

- `/search` provides global search across workspaces, routes, tools, calculators, dashboards, maps, workflows, notifications, and documents.
- `/timeline` provides a unified clinical timeline for calculator runs, AI actions, device/telemetry events, fleet activity, workflow activity, audit events, and alerts, with filters and JSON export.
- `/notifications` is now the operational notification center; notification preferences remain available at `/notification-preferences`.
- `/digital-twin` assembles hospital map, IoT, fleet, occupancy, staffing, assets, device markers, and alerts into a single demo-labeled digital twin view.
- `/workflows` adds a workflow builder surface with saved workflows, draft creation, AI-generation entry point, and launchable workflow blocks.
- `/assets` provides an asset library view for templates, documents, protocols, maps, telemetry schemas, usage counts, and orphan-risk detection.
- AI assistant messages now expose an `Explain` action that opens the explainability trace surface with the response context.
- Backend service foundations were added for `SearchService`, `TimelineService`, and `AssetRegistryService`.

## Tools And Clinical Operations

- `/tools` uses the canonical user-facing inventory, search, filters, categories, and one card per canonical tool id.
- Developer/source-audit and phantom/source-scan artifacts stay out of `/tools`; `/tools/catalog` remains clearly labeled for audit/developer use.
- `/tools/calculators` remains the calculator-focused hub, including dedicated calculator routes and chat-assisted launches.
- Hospital Map, Medical IoT, Device Fleet, Fleet Map, and Live Map all show explicit demo/live source labels, loading/error/empty states, filters, cards/tables, markers, and local-scroll map/table areas.

## Design And Scrolling

- Theme tokens keep light mode on white/neutral surfaces and dark mode on near-black/charcoal surfaces with blue used as an accent.
- Global `html`, `body`, and `#root` keep horizontal overflow clipped while preserving document flow scrolling.
- App shell content scrolls naturally; chat, overlays, maps, tables, drawers, and command panels own local scroll only where needed.
- Responsive tests cover 320, 360, 390, 412, 430, 768, tablet, and desktop widths.

## Backend And Build Metadata

- Vite already injects build metadata through `__CARE_BUILD_INFO__`: commit hash, branch, build time, environment, deployment URL/id, and repository.
- Backend/frontend exposure and contract tests remain the guardrail for controllers, API clients, orchestrator mappings, executor claims, and backend-only capabilities.
- Demo-only or backend-unavailable states are labeled in the affected operational pages and services.

## Verification

Completed verification on 2026-05-29:

- Platform upgrade focused tests: `7` files, `31` tests passed.
- Backend platform service tests: `3` suites, `6` tests passed.
- Workspace IA focused tests: `5` files, `21` tests passed.
- Focused consolidation/auth/route/mobile tests: `6` files, `49` tests passed.
- Backend/frontend exposure: `10` files, `62` tests passed.
- Responsive regression: `11` files, `461` tests passed across the requested mobile/tablet/desktop viewport matrix.
- Backend tests: `92` suites, `769` tests passed.
- Lint: passed with `0` errors and existing warnings.
- Production build: passed; asset validation passed and Vite emitted the existing large calculator chunk warning.
- Backend build: passed.

## Remaining Risks

- The frontend contains many legacy deep routes by design. Keep future user-facing exposure centralized in `primaryNavigation.js`, dashboard launch cards, and the unified inventory.
- Some backend-backed operational pages currently use demo contracts where live telemetry/GPS/write endpoints are not connected.
- Existing Vite large chunk warnings for calculator/chart bundles are build-performance risks, not functional blockers.
