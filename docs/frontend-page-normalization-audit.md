# Frontend Page Normalization Audit

## Goal

Flatten page layouts so high-value content sits closer together, repeated wrappers are removed, and route groups use the same spacing, section, grid, filter, and detail-rail language. Backend services, API adapters, route paths, and data contracts stay unchanged.

## Shared Layout Baseline

The reusable frontend layer already includes `PageShell`, `DashboardSection`, `DashboardGrid`, `MetricCard`, `DashboardCard`, `InsightCard`, `FilterPanel`, and `LaunchActionCard` in `src/components/ui/CareDroidPrimitives.jsx` and `src/components/ui/LaunchActionCard.jsx`.

The remaining mismatch comes from page-level CSS and JSX that repeatedly rebuild:

- page shells and hero surfaces
- nested panel wrappers
- local metric grids
- local filter rows
- detail sidebars and split workspaces
- map and table overflow containers

## Route Family Findings

| Route family | Primary files | Problem pattern | Rebuild direction |
| --- | --- | --- | --- |
| Command and workspace | `src/pages/CommandDashboard.jsx`, `src/pages/WorkspaceHome.jsx`, `src/pages/Operations.jsx` | Already partially normalized, but still carries custom chip/card/grid classes and dense workspace sections. | Use shared page stack, dashboard grid variants, action rows, and shared surface classes for remaining route cards and panels. |
| Analytics and AI | `src/pages/AnalyticsDashboard.jsx`, `src/pages/CostAnalyticsDashboard.jsx`, `src/pages/AiEvaluationDashboard.jsx`, `src/pages/AiCommandCenterDashboard.jsx`, `src/pages/AutomationAnalytics.jsx` | Multiple local metric cards, section headings, benchmark grids, and panel layouts. | Replace local metric cards and panels with shared `MetricCard`, `DashboardSection`, `DashboardGrid`, and action rows. |
| Operations, maps, and IoT | `src/pages/HospitalMapDashboard.jsx`, `src/pages/MedicalIotDashboard.jsx`, `src/pages/DeviceFleetManagement.jsx`, `src/pages/DigitalTwinIntelligence.jsx`, `src/pages/LiveTrackingMap.jsx` | Deep detail panels, map canvases, sticky rails, local health/status grids, and repeated overflow fixes. | Introduce shared split layouts, detail rails, map canvases, summary grids, and table/map overflow wrappers. |
| Fleet | `src/pages/fleet/FleetPageChrome.jsx`, `src/pages/fleet/FleetDashboard.jsx`, `src/pages/fleet/FleetLiveMap.jsx`, `src/pages/fleet/RouteOptimizer.jsx`, `src/pages/fleet/PredictiveMaintenance.jsx` | Fleet chrome is normalized, but child pages still define local dashboard grids and map/detail structures. | Keep `FleetPageChrome`, then move children onto shared split, grid, and detail primitives. |
| Tools | `src/pages/tools/ToolsOverview.jsx`, `src/pages/tools/ClinicalToolCatalog.jsx`, `src/pages/tools/*AssistantPage.jsx`, `src/pages/tools/*Calculators.jsx` | Tool pages have local input/output panels, result cards, and scroll wrappers. | Preserve form semantics and calculator IDs while moving panels and result surfaces into shared section/card primitives. |
| Commercial and platform | `src/pages/commercial/CommercialPages.jsx`, `src/pages/PlatformOSPages.jsx`, `src/pages/platform/*`, `src/pages/MarketplacePage.jsx` | Large multipage components carry repeated hero, card, and grid patterns. | Create page-family sections from shared primitives before splitting any large components. |
| Profile, admin, legal | `src/pages/Profile.jsx`, `src/pages/ProfileSettings.jsx`, `src/pages/profile/*`, `src/pages/Settings.jsx`, `src/pages/legal/*` | Smaller pages use their own wrappers and header treatments. | Normalize only after operational/dashboard families are stable. |

## CSS Duplication Clusters

High-priority consolidation targets:

- `src/pages/HospitalMapDashboard.css`
- `src/pages/MedicalIotDashboard.css`
- `src/pages/DeviceFleetManagement.css`
- `src/pages/fleet/FleetLiveMap.css`
- `src/pages/LiveTrackingMap.css`
- `src/pages/CommandDashboard.css`
- `src/pages/WorkspaceHome.css`
- `src/pages/OperatingWorkspace.css`
- `src/pages/PlatformOSPages.css`
- `src/pages/Dashboard.css`
- `src/pages/AutomationAnalytics.css`
- `src/pages/DigitalTwinIntelligence.css`
- `src/pages/SystemHealth.css`

These files repeatedly define local page padding, local hero cards, `repeat(auto-fit, minmax(...))` grids, status-tinted cards, and detail rail behavior.

## Layout Contract

Every normalized page should follow this structure:

1. One `PageShell` or established page chrome.
2. One content stack for vertical rhythm.
3. `DashboardSection` for titled regions.
4. `DashboardGrid` or shared split primitives for layout, not local grid wrappers.
5. `MetricCard`, `DashboardCard`, `InsightCard`, or `LaunchActionCard` for content cards.
6. Local CSS only for domain-specific visuals such as maps, SVGs, markers, and specialty charts.

## Verification Boundaries

Preserve:

- route paths in `src/test/responsiveRegression.routes.js`
- accessible heading names used by route smoke tests
- form labels, calculator input IDs, and tool launch selectors
- AppShell scroll and skip-link behavior
- service method signatures in `src/services/*`
- backend modules under `backend/src/modules/*`

## Pilot Pages

The pilot should land on:

- `src/pages/CommandDashboard.jsx`
- `src/pages/WorkspaceHome.jsx`
- `src/pages/Operations.jsx`
- `src/pages/AnalyticsDashboard.jsx`
- `src/pages/AiCommandCenterDashboard.jsx`
- `src/pages/HospitalMapDashboard.jsx`
- `src/pages/AutomationAnalytics.jsx`
- `src/pages/SystemHealth.jsx`
- `src/pages/DigitalTwinIntelligence.jsx`

After the pilot passes, expand to operations/IoT/fleet, then tools, then commercial/platform, then profile/admin/legal.

## Follow-Up Coverage

Late page-layout audit findings were folded into the rebuild with additional route-family coverage:

- `src/pages/MedicalIotDashboard.jsx` now uses the shared operational split/detail/map pattern.
- `src/pages/DeviceFleetManagement.jsx`, `src/pages/LiveTrackingMap.jsx`, and `src/pages/fleet/FleetLiveMap.jsx` share summary, filter, split, and overflow primitives.
- `src/pages/DigitalOperationsCenter.jsx` now uses the shared page shell, metric grid, sections, filter panel, and dashboard cards.
- `src/pages/CostAnalyticsDashboard.jsx` now uses shared actions, metrics, grids, and dashboard sections while keeping cost bars and modal behavior local.
- `src/pages/AuditLogs.jsx` now uses shared page, notice, stats, filter, loading, and table overflow primitives while preserving audit table semantics.
- `src/pages/ProfileSettings.jsx` now uses `PageShell`, `DashboardSection`, and shared action rows for profile and preferences sections.
- `src/pages/organization/OrganizationPages.jsx` normalizes the primary organization dashboard wrapper and grid while preserving the larger multipage module.
- `src/pages/commercial/CommercialPages.jsx` now routes its local commercial shell through the shared page content stack.
- `src/pages/tools/ToolPageLayout.jsx` normalizes the shared tool route shell so individual tool forms inherit the flatter layout without changing calculator/tool contracts.
