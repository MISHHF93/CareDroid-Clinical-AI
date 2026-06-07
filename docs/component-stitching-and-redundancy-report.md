# Component Stitching And Redundancy Report

## Summary

CareDroid now has an explicit mounted capability graph that stitches visible tools, pages, operations modules, dashboards, command/search entries, AI aliases, SaaS metadata, and backend support status into one normalized frontend projection.

Related reports:

- [Backend exposure report](./backend-exposure-report.md)
- [UX normalization and wiring report](./ux-normalization-and-wiring-report.md)
- [Orphan detection report](./orphan-detection-report.md)
- [Duplicate system audit](./duplicate-system-audit.md)

## 1. Hidden Elements Found

- `/tools/calculators` was configured as the calculator hub but rendered `ToolsOverview`, making the hub route effectively hidden behind the tools browser.
- First-party UI still navigated to deprecated `/home` from tool breadcrumbs, shared tool sessions, and dashboard fallback handling.
- Legacy pages such as `DigitalOperationsCenter.jsx` and `AuditLogs.jsx` remain as retired source files, while canonical routing now uses `/operations` and `/audit`.
- Memory fabric endpoints were live in backend and frontend service wrappers but missing from backend/frontend route inventories.

## 2. Redundant Components Found

- Route ownership was duplicated across route config, app route declarations, calculator routes, tool inventory, and launch paths.
- Workspace and profile defaults used stale pack aliases such as `clinical-core`, `critical-care`, `education-simulation`, `research-intelligence`, `governance-risk`, and `ai-evaluation-lab`.
- Overlay z-index values were duplicated as high hardcoded numbers across drawers, modals, emergency banners, toasts, select dropdowns, and shell skip links.
- Reusable page/card/state patterns existed in fragments, but `SectionHeader`, `DashboardCard`, `ToolCard`, `StatusBadge`, `LoadingState`, and `UnsupportedState` were not formalized as shared primitives.

## 3. Duplicates Reconciled

- Added `src/data/mountedCapabilityGraph.js` as the canonical mounted capability graph.
- Reused the graph from `assetInventory.js`, `commandDashboardModel.js`, and `QuickCommandLauncher.jsx`.
- Fixed `/tools/calculators` to render `Calculators`.
- Kept `/home` as redirect-only while changing visible app navigation to `/dashboard`.
- Removed a duplicate `asset-dependency-graph` frontend API inventory row.

## 4. Nested Layouts Fixed

- Preserved one `AppShell`, one `Sidebar`, one shell header, and one `main#main-content`.
- Converted required authenticated page roots from nested `<main>` landmarks to `<section>` roots for dashboard, operations, profile, hospital map, Medical IoT, device fleet, live map, digital twin, simulation, laboratory, 3D viewer, and profile subpages.
- Added static layout coverage to prevent nested mains from returning on the required route set.
- Tokenized overlay layers using `--z-popover`, `--z-drawer`, `--z-modal`, and `--z-toast`.

## 5. Design System Alignment

- Added shared compact clinical primitives in `src/components/ui/CareDroidPrimitives.jsx`.
- Added tokenized CSS in `src/components/ui/CareDroidPrimitives.css`.
- Normalized common overlay stack behavior in `Drawer.css`, `Modal.css`, `WorkspaceCreationModal.css`, `EmergencyBanner.css`, `NotificationToast.css`, `Select.css`, `QuickCommandLauncher.css`, `AppShell.css`, and `Sidebar.css`.
- Added design-fit tests for the new primitives and overlay token use.

## 6. SaaS Metadata Stitched

- Mounted capabilities now include `capabilityId`, `assetId`, `productIds`, `packIds`, `workspaceIds`, `roleIds`, `route`, lifecycle, demo/live status, backend support, UI surface, command/search visibility, and AI aliases.
- Frontend workspace defaults now use canonical pack IDs.
- Backend workspace taxonomy defaults now use canonical pack IDs.
- Frontend and backend SaaS profile fallbacks now use `core-platform` instead of stale `clinical-core`.

## 7. AI/Search/Command Wiring Fixed

- Quick Command tool entries now include mounted capability metadata and graph-backed AI aliases.
- Command dashboard model rows now include mounted SaaS metadata.
- Added reachability audit coverage for dashboard, tools/operations, command, search, and AI alias access.
- Registry launch tests now verify every command-visible mounted capability resolves to a non-null launch plan.

## 8. Backend/Frontend Bridges Fixed

- Added backend inventory rows for:
  - `GET /api/memory/fabric/context`
  - `POST /api/memory/fabric/signals`
- Added frontend inventory rows for memory fabric, platform assets, product catalog, subscriptions, automation audit, and white-label service wrappers.
- Preserved honest backend status boundaries: only `sofa-calculator`, `drug-interactions`, and `lab-interpreter` are true POST tool executors.
- Kept demo-backed operational feeds labeled through capability status instead of implying live production telemetry.

## 9. Tests Added Or Updated

- `src/data/mountedCapabilityGraph.test.js`
- `src/data/assetInventory.test.js`
- `src/data/commandDashboardModel.test.js`
- `src/components/QuickCommandLauncher.test.jsx`
- `src/navigation/registryToolLaunch.test.js`
- `src/routing/canonicalRouteRedirects.test.js`
- `src/routing/routeHealth.test.js`
- `src/layout/AppShell.layout.test.js`
- `src/styles/designLanguageFit.test.js`
- `src/data/backendFrontendExposure.test.js`

## 10. Remaining Risks

- Some retired page files remain in the source tree for historical/compatibility context. They are not canonical route owners and should be deleted only after a dedicated removal review.
- Full visual consolidation of every legacy page CSS file remains broader than this pass; the new primitives provide the target pattern for incremental adoption.
- Backend route inventory is still partly manual. The next hardening step is generating inventory rows from Nest controller metadata and frontend service wrappers.
- Operational feeds for fleet, hospital map, Medical IoT, and clinical alerts are still demo-backed unless live feeds are connected.
