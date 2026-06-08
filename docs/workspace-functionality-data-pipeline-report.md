# Workspace Functionality Data Pipeline Report

## Goal

Implement workspace functionality modes, data pipeline, subpage architecture, dashboard normalization, backend bridging, and AI context while preserving existing SaaS workspace segregation, backend contracts, and frontend normalization.

## Workspace Mode Model

Implemented in `src/data/workspaceArchitecture.js` using the existing canonical workspace registry.

Every requested workspace now has a mode entry with:

- `workspaceId`
- `modeName`
- `purpose`
- primary users
- primary data sources
- dashboard widgets
- subpages
- assets
- workflows
- AI agents
- backend services
- data pipeline stages
- alerts
- reports
- permissions

Covered workspaces:

- Emergency: rapid triage, sepsis/stroke/chest pain, calculators, simulations, protocols, AI workflow.
- ICU: critical care, SOFA/oxygenation/ventilation, telemetry review.
- Cardiology: chest pain, ACS risk, ECG support, arrhythmia workflows.
- Laboratory: lab interpretation, abnormal values, specimen queue, trends.
- Pharmacy: medication safety, interactions, dosing, renal adjustment, antibiotic guidance.
- Operations: hospital map, digital twin, capacity, alerts, device readiness.
- Fleet: vehicles, tracking, dispatch, maintenance, route analytics.
- Medical IoT: devices, telemetry, offline/stale signals, maintenance.
- Education: scenarios, competency gaps, debriefs, guided practice.
- Research: evidence retrieval, auditability, explainability, research workflows.
- Governance: audit, security, regulatory risk, human review.
- Administration: tenant setup, workspace configuration, access controls, SaaS readiness.

## Workspace Subpage Architecture

Implemented through the existing `WorkspaceHome` route owner:

- `/workspace/:workspaceId`
- `/workspace/:workspaceId/dashboard`
- `/workspace/:workspaceId/tools`
- `/workspace/:workspaceId/workflows`
- `/workspace/:workspaceId/analytics`
- `/workspace/:workspaceId/alerts`
- `/workspace/:workspaceId/reports`
- `/workspace/:workspaceId/settings`

Specialized subpages are registry-driven, not sidebar-driven:

- Emergency adds `simulations`.
- Medical IoT adds `devices`, `telemetry`, `maintenance`.
- Fleet adds `map`, `dispatch`, `maintenance`.
- Laboratory adds `results`, `specimens`, `trends`.
- Governance adds `audit`, `security`, `risk`, `reviews`.

Invalid subpages redirect to `/workspace/:workspaceId/dashboard`, so no workspace route renders blank/null.

## Data Pipeline Design

Implemented in `src/services/workspaceDataPipelineService.js`.

Pipeline:

`Source -> Ingestion -> Normalization -> Workspace Context -> Asset Recommendations -> Dashboard Widgets -> Alerts -> AI Context -> Reports`

Service functions:

- `getWorkspaceData(workspaceId)`
- `normalizeWorkspaceData(workspaceId)`
- `getWorkspaceAlerts(workspaceId)`
- `getWorkspaceRecommendations(workspaceId)`
- `getWorkspaceAnalytics(workspaceId)`
- `getWorkspaceAIContext(workspaceId)`

The service joins:

- canonical workspace registry
- workspace functionality modes
- asset/tool registry projections
- workspace route/subpage registry
- existing workspace notification summary
- backend service status mappings

## Backend Mappings

Backend services are mapped per workspace with explicit status labels:

- `backend-wired`: known existing backend contract is wired.
- `demo-local-fallback`: endpoint is documented but not claimed live.

Examples:

- Emergency: calculators and AI workflow are backend-wired; simulations/protocols are demo/local fallback.
- Laboratory: lab interpretation uses the tool executor path; lab results/specimens/trends are demo/local fallback.
- Medical IoT: devices/telemetry/alerts/maintenance are demo/local fallback.
- Fleet: vehicles/tracking/dispatch/maintenance are demo/local fallback.
- Operations: hospital map/digital twin/capacity/alerts are demo/local fallback.
- Governance: audit/security/regulatory/human-review are demo/local fallback.
- Administration: workspace admin is backend-wired through workspace APIs; tenant/users/billing are demo/local fallback.

`WorkspaceContext` backend merge now preserves backend-provided display labels before local fallback labels.

## Frontend Pages Added Or Normalized

Normalized under existing pages and shell:

- `src/App.jsx`: added protected `/workspace/:workspaceId/:subpage` route.
- `src/pages/WorkspaceHome.jsx`: now renders subpage tabs, mode-aware pipeline status, backend fallback labels, shared dashboard/tools/workflows/analytics/alerts/reports/settings panels, and specialized subpages.
- `src/pages/WorkspaceHome.css`: added normalized tab, pipeline, service chip, and capability-card styles.
- `src/config/workspace.config.js`: exports mode/subpage helpers through the existing workspace façade.

No new AppShell, Sidebar, Header, or sidebar inventory expansion was introduced.

## AI Context Per Workspace

Implemented through workspace experience profiles and the new pipeline service:

- Assistant launches use `assistantContext`, pipeline AI context, experience context, or workspace AI context in that order.
- `getWorkspaceAIContext(workspaceId)` returns non-null context for every workspace.
- Emergency includes emergency tools and sepsis/stroke/chest pain pathways.
- Laboratory includes lab interpretation, abnormal values, and trends.
- Medical IoT includes offline devices, telemetry gaps, and maintenance.
- Fleet includes active units, dispatch, route issues, and maintenance.
- Governance includes audit risks, security events, and review queue.
- Pharmacy and Administration were added as first-class Assistant modes.

## Demo And Live Data Status

Live/wired:

- Workspace context APIs already used by `WorkspaceContext`.
- Workspace active selection API already used by `WorkspaceContext`.
- Tool executor-backed calculators/interpretation where existing executor contracts are registered.
- AI chat/workflow context through the existing Assistant path.

Demo/local fallback:

- Lab result queues/specimen queues/trends where no dedicated frontend API client exists.
- Medical IoT telemetry/device/maintenance endpoints in this workspace pipeline display.
- Fleet vehicles/tracking/dispatch/maintenance endpoints in this workspace pipeline display.
- Operations map/digital twin/capacity/alerts endpoints in this workspace pipeline display.
- Governance audit/security/regulatory/human-review endpoints in this workspace pipeline display.
- Administration tenant/users/billing endpoints in this workspace pipeline display.

The UI labels fallback services as `Demo/local fallback` and does not claim them as live.

## Tests Added

Added/updated:

- `src/data/workspaceArchitecture.test.js`: workspace modes, subpages, Pharmacy/Administration, specialized workspace subpages.
- `src/services/workspaceDataPipelineService.test.js`: pipeline stages, recommendations, alerts, analytics, AI context, backend fallback labels.
- `src/pages/WorkspaceHome.test.jsx`: workspace subpage rendering, invalid subpage redirect, mode-specific assets/alerts, Assistant launch context.
- `src/routing/workspaceSubpageRoutes.test.js`: protected `/workspace/:workspaceId/:subpage` route contract.
- `src/data/workspaceExperience.test.js`: Pharmacy and Administration experience modes.
- `src/test/WorkspaceContext.backend.test.jsx`: backend display-label preservation.

Verification run:

- `npm test -- workspaceArchitecture.test.js workspaceExperience.test.js workspaceDataPipelineService.test.js WorkspaceHome.test.jsx WorkspaceContext.backend.test.jsx AppShell.layout.test.js`
- `npm test -- workspaceSubpageRoutes.test.js ToolsOverview.visibility.test.jsx Dashboard.chatLayout.test.jsx PlatformOSPages.test.jsx AppShell.navigation.test.jsx`
- `npm run test:backend-exposure`
- `npm run lint`
- `npm run build`

Results:

- Focused workspace suite: 50 tests passed.
- Route/tools/dashboard/shell suite: 47 tests passed.
- Backend exposure contract suite: 65 tests passed.
- Frontend lint: 0 errors, existing warnings remain in unrelated audit files.
- Production build: passed. Existing Vite large-chunk warning remains.

## Remaining Risks

- Several workspace backend mappings are intentionally fallback-labeled until dedicated API clients/endpoints exist.
- Workspace subpages currently render normalized summaries from registry/pipeline data; deeper domain-specific table/detail views can be wired later without changing the route model.
- Existing Vite large-chunk warning remains unrelated to this pass.
