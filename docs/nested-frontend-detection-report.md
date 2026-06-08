# Nested Frontend Detection Report

## Scope

This report tracks a frontend-wide scan for UI nesting problems and the fixes applied to reduce nesting depth. The scan covered `src/pages`, `src/components`, `src/layout`, `src/navigation`, and shared frontend styles.

## Detection Targets

- Page inside page
- Dashboard inside dashboard
- Card inside card inside card
- Duplicate wrappers
- Duplicate layout containers
- Nested tabs
- Nested accordions
- Nested side panels
- Duplicated section headers
- Repeated metrics

## Classification Key

- `flatten`
- `merge`
- `remove wrapper`
- `move to child page`
- `move to modal`
- `move to drawer`

## Findings

### 1. Product Intelligence Card Stacks

- Location: `src/pages/commercial/CommercialPages.jsx`
- Pattern: `ProductIntelligenceLayerPage` rendered product scorecards as `Card`, then nested `MetricCard` and `InsightCard` children inside each scorecard.
- Problem type: card inside card inside card, repeated metrics.
- Classification: `flatten`
- Fix status: implemented.

### 2. Expansion Opportunity Nested Cards

- Location: `src/pages/commercial/CommercialPages.jsx`
- Pattern: `CustomerExpansionOpportunitiesPage` rendered each segment as a wide card, then nested each opportunity as another card grid inside it.
- Problem type: card inside card, duplicate layout container.
- Classification: `remove wrapper`
- Fix status: implemented.

### 3. Chat Tool Result Duplication

- Location: `src/components/ChatInterface.jsx`, `src/components/ToolVisualization.jsx`, `src/components/chat/OperationalResultCard.jsx`
- Pattern: assistant messages could render `message.toolResult` as a standalone tool card and also render a `tool-result` visualization as an operational result card.
- Problem type: duplicate wrappers, repeated metrics/result summaries.
- Classification: `merge`
- Fix status: implemented.

### 4. Operational Result Nested Tool Card

- Location: `src/components/chat/OperationalResultCard.jsx`, `src/components/ToolCard.jsx`
- Pattern: `OperationalResultCard` rendered a full `ToolCard` inside its detail area, duplicating result card chrome and headers.
- Problem type: card inside card, duplicated section headers.
- Classification: `merge`
- Fix status: implemented.

### 5. AI Tool Result Panels

- Location: `src/pages/tools/*Ai.jsx`, `src/pages/tools/ToolPageLayout.css`
- Pattern: shared tool pages use `simple-tool-page-inner -> diagnosis-tool-grid -> diagnosis-panel -> simple-tool-result-panel`.
- Problem type: duplicate wrappers, card inside card.
- Classification: `flatten`
- Fix status: implemented at the shared CSS layer.

### 6. Command Dashboard Launch Compression

- Location: `src/pages/CommandDashboard.jsx`
- Pattern: `command-dashboard` contains `DashboardPanel`, `LaunchGroup`, `LaunchActionCard`, and `ToolCard` groupings for dense launch areas.
- Problem type: dashboard inside dashboard, duplicate layout containers.
- Classification: `merge`
- Fix status: documented for follow-up; not changed in this pass because current responsive work also touches this surface.

### 7. Organization Analytics Metric Repetition

- Location: `src/pages/organization/OrganizationPages.jsx`
- Pattern: adjacent organization dashboards repeat metrics and headers such as adoption, asset usage, AI usage, top assets, and data sources.
- Problem type: repeated metrics, duplicated section headers.
- Classification: `merge`
- Fix status: documented for follow-up.

### 8. Persistent Map Detail Side Panels

- Location: `src/pages/HospitalMapDashboard.jsx`, `src/pages/LiveTrackingMap.jsx`, `src/pages/MedicalIotDashboard.jsx`
- Pattern: map workspaces keep persistent inline detail side panels next to dense map/canvas content.
- Problem type: nested side panels, duplicate layout containers.
- Classification: `move to drawer`
- Fix status: documented for follow-up.

### 9. Profile Tool Graph Overload

- Location: `src/components/ProfileToolGraphCard.jsx`
- Pattern: a profile summary card contains metric chips, tool columns, and nested insight cards.
- Problem type: card inside card, repeated metrics.
- Classification: `move to child page`
- Fix status: documented for follow-up.

### 10. Custom Modal/Panel Chrome

- Location: `src/components/WorkspaceCreationModal.jsx`, `src/components/tools/ToolResultShare.jsx`, `src/components/NotificationPreferences.jsx`
- Pattern: local modal/panel/card systems duplicate shared modal, drawer, and section card chrome.
- Problem type: duplicate wrappers, duplicate layout containers, nested tabs in share flow.
- Classification: `move to drawer`
- Fix status: documented for follow-up.

### Negative Findings

- No active page-inside-page imports were found in the scanned page routes.
- No active nested accordion stacks were found.
- No active nested primary navigation tabs were found.

## Highest-Impact Fixes

- Flattened `ProductIntelligenceLayerPage` scorecards by replacing nested metric cards with inline metric rows and nested value-chain cards with inline sections.
- Flattened `CustomerExpansionOpportunitiesPage` by replacing nested opportunity cards with row articles and metadata lists inside the segment card.
- Merged chat result rendering so `message.toolResult` uses `OperationalResultCard` and duplicate `tool-result` visualizations are suppressed for the same message.
- Split `ToolCard` into reusable body content plus standalone card chrome, then reused the body inside `OperationalResultCard` to remove nested result cards.
- Flattened shared AI tool result panels inside `diagnosis-panel` so nested result panels render as divider sections rather than cards inside cards.

## Verification

- Lint diagnostics: no errors reported for edited files.
- Focused tests: `npm run test:run -- src/pages/commercial/ProductIntelligenceLayerPage.test.jsx src/components/chat/OperationalResultCard.test.jsx src/components/ToolCard.test.jsx src/pages/Dashboard.chatLayout.test.jsx`
- Result: 4 test files passed, 51 tests passed.
