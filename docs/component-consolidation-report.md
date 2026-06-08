# Component Consolidation Report

Status: implemented first consolidation pass

## Goal

- One design language.
- One component language.
- Preserve functionality while reducing duplicate UI patterns.

## Audit Scope

- Duplicate cards
- Duplicate tables
- Duplicate forms
- Duplicate status widgets
- Duplicate badges
- Duplicate headers
- Duplicate insight components

## Canonical Components

Extended in `src/components/ui/CareDroidPrimitives.jsx`:

- `PageShell`: canonical page wrapper around `PageHeader` for duplicate page hero/header patterns.
- `MetricCard`: canonical metric/KPI card for dashboard, commercial, and operational summaries.
- `DashboardCard`: existing canonical dashboard card retained.
- `InsightCard`: canonical recommendation/result/insight card for searchable results and recommendation cards.
- `ToolCard`: existing canonical tool card retained.
- `StatusWidget`: canonical status summary widget.
- `StatusBadge`: canonical badge for status/tone display, extended for `good`, `online`, and `critical` operational states.
- `BadgeList`: canonical chip/badge list for product packs, tags, and compact label groups.
- `InfoNotice`: canonical source/data/status notice.
- `FilterPanel`: canonical filter row/panel wrapper.
- `FormField`: canonical label/control wrapper.
- `DataTable`: canonical table wrapper for simple tabular data.

Shared styling lives in `src/components/ui/CareDroidPrimitives.css`.

## Duplicate Findings

### Duplicate Cards

- Local metric and summary cards existed in `CommercialPages`, `HospitalMapDashboard`, `SuccessCenterPage`, fleet widgets, analytics dashboards, platform pages, and organization pages.
- Local result/insight cards existed in `PlatformOSPages`, `RecommendationsPage`, `DigitalTwinIntelligence`, `CareDroidBrainDashboard`, workspace pages, and multiple dashboard files.
- First pass consolidated commercial metric/list cards, platform result cards, recommendation cards, and hospital map summary cards.

### Duplicate Tables

- Several pages manually define table wrappers and table classes, including hospital device fleet, clinical tool catalog, team management, and organization asset lifecycle.
- First pass consolidated the hospital map device fleet table onto `DataTable`.
- More complex sortable/responsive tables remain page-owned for now because they contain specialized sorting and responsive stacked-cell behavior.

### Duplicate Forms

- Filter/search rows are repeated across platform pages, recommendations, tools catalog, hospital map, settings, profiles, and commercial configuration forms.
- First pass consolidated `PlatformOSPages` filter rows onto `FilterPanel` and `FormField`.

### Duplicate Status Widgets

- Status/summary widgets repeat across hospital map, fleet, IoT, system health, SaaS health, diagnostics, and dashboards.
- First pass moved hospital map status badges and summary widgets onto `StatusBadge` and `MetricCard`.

### Duplicate Badges

- Badge implementations exist in `components/ui/Badge.jsx`, `components/data-display/DataDisplay.jsx`, page-local `StatusBadge` functions, catalog inline badges, commercial chips, and fleet badges.
- First pass uses `StatusBadge` and `BadgeList` for new refactors while preserving legacy badge modules until callers are migrated.

### Duplicate Headers

- Page-local shells existed in `PlatformOSPages`, `CommercialPages`, customer portal pages, and several dashboards.
- First pass moves commercial and platform page wrappers onto canonical `PageShell`.

### Duplicate Insight Components

- Recommendation cards, platform result cards, digital twin insights, brain action cards, platform learning suggestions, and search cards share the same structure.
- First pass moves recommendation and platform result cards onto `InsightCard`.

## Refactor Log

- Extended `src/components/ui/CareDroidPrimitives.jsx` and `.css` with canonical primitives for page shells, metrics, insights, notices, filters, form fields, tables, badges, and status widgets.
- Refactored `src/pages/commercial/CommercialPages.jsx` to reuse `PageShell`, `MetricCard`, `BadgeList`, and `InsightCard` through its existing local wrappers.
- Refactored `src/pages/PlatformOSPages.jsx` to reuse `PageShell`, `InfoNotice`, `FilterPanel`, `FormField`, and `InsightCard`.
- Refactored `src/pages/RecommendationsPage.jsx` to reuse `InsightCard` and `StatusBadge`.
- Refactored `src/pages/HospitalMapDashboard.jsx` to reuse `MetricCard`, `StatusBadge`, and `DataTable`.
- Added CSS bridges in page styles so existing page-specific classes keep visual compatibility while sharing canonical internal markup.

## Verification

- `npm run test:run -- src/pages/commercial/CommercialPages.test.jsx src/pages/PlatformOSPages.test.jsx src/pages/RecommendationsPage.test.jsx src/pages/HospitalMapDashboard.test.jsx src/styles/compactUxFlattening.test.js` passed: 33 tests.
- IDE diagnostics reported no linter errors for edited component/page files.

## Remaining Follow-Up Candidates

- Migrate sortable table-heavy pages such as `ClinicalToolCatalog`, `TeamManagement`, and organization asset lifecycle tables after adding sortable/responsive options to `DataTable`.
- Migrate fleet widgets, IoT cards, system health, SaaS health, and diagnostics to `MetricCard`, `StatusWidget`, and `StatusBadge`.
- Retire or adapt duplicate `Badge`/`StatusBadge` exports from `components/data-display/DataDisplay.jsx` once all callers use `components/ui/Badge.jsx` and `CareDroidPrimitives`.
- Migrate page-local `DecisionSupportNotice` implementations in specialty calculator packs to `InfoNotice`.
