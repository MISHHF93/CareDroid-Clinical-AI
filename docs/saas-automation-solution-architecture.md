# SaaS Automation Solution Architecture

## Goal

Transform CareDroid from a collection of assets into a collection of sellable healthcare solutions.

Solution model:

`Workspace -> Automations -> Assets -> AI -> Workflows -> Outcomes`

The implementation must preserve existing functionality and build automation orchestration on top of the current SaaS workspace, asset, assistant, and backend-contract architecture.

## Automation Catalog

Implemented in `src/data/automationRegistry.js`.

The canonical automation registry now defines automations with:

- `automationId`
- `title`
- `description`
- `workspace`
- `roles`
- `department`
- `organizationTypes`
- `trigger`
- `conditions`
- `actions`
- `aiInvolvement`
- `requiredAssets`
- `requiredWorkflows`
- `requiredIntegrations`
- `riskLevel`
- `humanReviewRequired`
- `subscriptionTier`
- `status`

Automation types covered:

- Clinical
- Operational
- Laboratory
- Fleet
- Medical IoT
- Simulation
- Governance
- Research
- Education
- Administrative

## Solution Automations

Implemented as sellable solution packages:

- Emergency Department Solution
- Laboratory Intelligence Solution
- Medical IoT Solution
- Fleet Operations Solution
- Governance Solution
- Research Solution
- Education Solution

Emergency automations:

- Sepsis Detection Workflow
- Stroke Escalation Workflow
- Chest Pain Workflow
- High NEWS2 Alert
- Critical Deterioration Alert

Laboratory automations:

- Abnormal Result Alert
- Specimen Delay Alert
- Pending Review Queue
- Critical Value Notification
- Lab Trend Monitoring

Medical IoT automations:

- Device Offline
- Battery Low
- Telemetry Lost
- Calibration Due
- Maintenance Due

Fleet automations:

- Vehicle Offline
- Maintenance Due
- Route Delay
- Dispatch Queue
- Utilization Monitoring

Governance automations:

- Audit Event Detection
- Security Event Detection
- Human Review Required
- AI Risk Escalation
- Compliance Review Queue

Each automation maps to workspace, assets, AI involvement, workflows, integrations, risk, review rules, tier, and outputs.

## Workspace Automation Hubs

Implemented in `src/pages/WorkspaceHome.jsx`.

Every workspace now has:

- Dashboard
- Tools
- Workflows
- Automations
- Analytics
- Alerts
- Reports
- Settings

Route:

- `/workspace/:id/automations`

Hub features:

- Active automations
- Demo/disabled automation grouping
- Automation history from audit events
- Automation analytics
- Automation settings
- Preview run action that logs an audit event and seeds Assistant context

## Solution Packaging

Implemented through `SOLUTION_PACKAGES` in `src/data/automationRegistry.js`.

Packaging model:

`Workspace -> Automations -> Assets -> AI -> Workflows -> Outcomes`

Examples:

- Emergency Department Solution includes emergency workspace, clinical automations, emergency AI copilot, calculators, protocols, simulations, and outcomes.
- Laboratory Intelligence Solution includes laboratory workspace, lab automations, reports, analytics, AI interpretation, and review workflows.
- Medical IoT Solution includes medical-iot workspace, device fleet, telemetry, automations, alerts, and maintenance outcomes.
- Fleet Operations Solution includes fleet workspace, route/dispatch/maintenance automations, AI support, and utilization outcomes.
- Governance Solution includes governance workspace, audit/security/review automations, governance agent, and compliance outcomes.

## Automation Analytics

Implemented in `src/pages/AutomationAnalytics.jsx` and routed at:

- `/automation-analytics`

Tracks:

- Automation runs
- Automation success
- Automation failures
- Automation adoption
- Human overrides
- AI recommendations accepted

Analytics are seeded from the canonical automation registry and audit trail summaries so the page is useful in local/demo mode without claiming unavailable live automation execution.

## Execution Integration

Implemented in `src/services/automationEngine.js`.

Engine behavior:

- Evaluates automation status, subscription tier, integrations, and human review availability.
- Blocks unsafe/unavailable automations with a reason.
- Logs audit events through the existing automation audit trail model.
- Returns outputs and Assistant seed prompts for workspace previews.

Wiring:

- Workspace dashboards: `/workspace/:id/automations`.
- Dashboard: Command Dashboard now exposes Automation Analytics as a launch surface.
- Assistant: Preview run seeds Assistant with automation context.
- Tools/search: global search and Quick Command index canonical solution automations.
- Operations/workspace pipeline: workspace data pipeline includes automation counts and solution package context.
- Backend functionality: existing backend exposure contracts remain unchanged and passing.

## Verification

Added/updated tests:

- `src/data/automationRegistry.test.js`
- `src/services/automationEngine.test.js`
- `src/pages/AutomationAnalytics.test.jsx`
- `src/pages/WorkspaceHome.test.jsx`
- `src/services/workspaceDataPipelineService.test.js`
- `src/data/searchFirstDiscovery.test.js`
- `src/routing/workspaceSubpageRoutes.test.js`
- `src/components/QuickCommandLauncher.test.jsx`

Verification run:

- `npm test -- automationRegistry.test.js automationEngine.test.js AutomationAnalytics.test.jsx WorkspaceHome.test.jsx workspaceDataPipelineService.test.js searchFirstDiscovery.test.js workspaceSubpageRoutes.test.js workspaceArchitecture.test.js`
- `npm test -- CommandDashboard.test.jsx QuickCommandLauncher.test.jsx PlatformOSPages.test.jsx AppShell.navigation.test.jsx workspaceSubpageRoutes.test.js searchFirstDiscovery.test.js AutomationAnalytics.test.jsx WorkspaceHome.test.jsx`
- `npm run lint`
- `npm run build`
- `npm run test:backend-exposure`

Results:

- Focused automation suite: 37 tests passed.
- Automation integration suite: 60 tests passed.
- Backend exposure contract suite: 65 tests passed.
- Frontend lint: 0 errors, existing unrelated warnings remain.
- Production build: passed. Existing large-chunk warning remains.

## Remaining Risks

- Automation execution is currently an orchestration facade and demo-safe preview layer, not a background scheduler.
- Several integrations listed in automation definitions are intentionally declared as required integrations, not claimed as live unless existing backend contracts support them.
- Research and Education are packaged as sellable solutions, but do not yet have dedicated automation sets like Emergency/Lab/IoT/Fleet/Governance.
- Analytics use deterministic seed data plus audit summaries until live automation run telemetry is wired.
