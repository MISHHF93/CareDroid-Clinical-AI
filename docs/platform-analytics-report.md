# Platform Analytics Report

## Route

Platform analytics are available at `/platform-analytics`. The page remains organization-scoped and reads from the existing backend endpoint:

- `GET /api/platform/organizations/:organizationId/analytics`

## Backend Analytics Contract

`OrganizationAnalyticsService` now returns the original organization summary fields plus a richer analytics contract:

- `dashboards.adoption`: enabled pack count, enabled asset count, total asset count, adoption score, and pack adoption rows.
- `dashboards.engagement`: total usage volume plus AI, search, simulation completion, and dashboard engagement counts.
- `dashboards.underusedAssets`: entitled assets with the lowest usage.
- `dashboards.topAssets`: highest-usage assets.
- `dimensions.assetUsage`
- `dimensions.packUsage`
- `dimensions.roleUsage`
- `dimensions.workspaceUsage`
- `dimensions.aiUsage`
- `dimensions.searchQueries`
- `dimensions.simulationCompletion`
- `dimensions.dashboardEngagement`

Existing fields such as `enabledPackCount`, `enabledPackIds`, `auditEventCount`, `aiSessionCount`, `topTools`, and `packAdoption` are preserved for compatibility.

## Data Sources

The aggregation uses existing durable platform sources:

- `organization_entitlements` for enabled pack adoption.
- `usage_events` for asset, pack, role, workspace, AI, search, simulation, and dashboard engagement metrics.
- `platform_assets` for asset labels, types, categories, and routes.
- `asset_packs` for pack labels and pack-to-asset relationships.
- `audit_logs` as a fallback signal for historical tool and assistant usage where usage events are not yet available.

## Dashboard Sections

The `/platform-analytics` UI now renders four primary dashboard sections:

- Adoption: pack usage, role usage, workspace usage, enabled assets, and adoption score.
- Engagement: asset usage, AI usage, search queries, simulation completion, and dashboard engagement.
- Underused assets: entitled assets ranked by lowest usage.
- Top assets: highest-usage assets ranked by event quantity.

## Telemetry Notes

Search and dashboard engagement are derived from existing `usage_events` metadata when present. Search rows use event metadata such as `eventType` and `surface` rather than exposing raw query text. Dashboard engagement is detected from dashboard asset types, dashboard-like surfaces, command-center surfaces, and map usage events. When durable telemetry has not been emitted yet, the relevant dashboard rows render as empty states instead of fabricating activity.

## Verification

Targeted verification completed successfully:

- `cd backend && npm test -- src/modules/platform-assets/organization-analytics.service.spec.ts src/modules/platform-assets/platform-assets.service.spec.ts`
- `cd backend && npm run build`
- `npm run test:run -- src/pages/organization/PlatformAnalyticsPage.test.jsx src/services/platformAssetsApi.test.js src/routing/canonicalRouteRedirects.test.js`
