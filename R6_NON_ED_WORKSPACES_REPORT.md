# R6 Non-ED Workspaces Report

## Scope

Executed R6 only: kill non-Emergency OS workspaces from active routing/navigation while preserving reusable non-routed components and previous R1-R5 work. `caredroid.sqlite` was not touched.

## Non-ED Routes And Pages Found

Active rendered future/non-ED routes found in `src/App.jsx` and `src/config/routes.config.js`:

- `/emergency/federated-learning` - future research/model learning workspace.
- `/emergency/digital-twin` - future operational twin workspace.
- `/emergency/ai-governance` and `/ai-governance` - future governance workspace.

Standalone or legacy non-ED route aliases found in route config/metadata:

- `/analytics` - standalone analytics alias; `/emergency/analytics` was kept as Emergency OS analytics.
- `/laboratory`, `/lab` - laboratory workspace aliases.
- `/fleet`, `/fleet/*` - fleet workspace aliases.
- `/vehicle`, `/vehicle/*` - vehicle operations aliases.
- `/governance`, `/governance/*` - governance workspace aliases.
- `/research`, `/research/*` - research workspace aliases.
- `/education`, `/education/*` - education workspace aliases.
- `/platform-admin`, `/tenant-admin` - full admin workspaces; Emergency OS settings routes were kept.
- `/pharmacy`, `/pharmacy/*`, `/radiology`, `/radiology/*` - future clinical department workspace aliases.

Non-routed reusable/future components left alone:

- Fleet, laboratory, research, customer portal, and future-module review components that are not mounted by the active `App.jsx` route tree.
- ED-specific `/emergency/analytics`, shift analytics, audit/settings, and settings feature surfaces.

## Stubbed Or Redirected

- Added a `ComingSoonPage` stub in `src/App.jsx`.
- Replaced active route targets for federated learning, digital twin, and AI governance with the stub.
- Added `NON_ED_WORKSPACE_STUB_ROUTES` in `src/config/routes.config.js` for standalone non-ED aliases.
- Removed `/analytics`, `/federated-learning`, `/digital-twin`, `/fleet`, `/fleet/*`, and `/platform-admin` from Emergency OS legacy redirect fallbacks where they should now hit a stub instead.
- Kept Emergency OS redirects for ED aliases such as `/settings/*`, `/tools`, `/calculators`, `/workspace/emergency/*`, and `/emergency/analytics`.

## Navigation Changes

- Confirmed canonical `NAVIGATION_ITEMS` contains only:
  `Whiteboard | EMS | Referrals | Capacity | Tools | Shift | Settings`.
- Updated sidebar tests to assert only those seven items and absence of non-ED entries.

## Barrel, Export, And Registry Changes

- Commented future module entries with `// Future module` in:
  - `src/config/commandPalette.config.js`
  - `src/data/emergencyPageRenderInventory.js`
  - `src/data/searchFirstDiscovery.js`
  - selected future route records in `src/config/routes.config.js`
- Marked matching route records as `status: 'future'`.
- Filtered future route records out of route alias exports and alias groups.
- Removed future module routes/actions from active Emergency OS role access.

## Terminology Search And Fixes

Reviewed `src/` for quoted `"Case"`, `"Record"`, `"Workspace"`, and `"Dashboard"` terms.

Changed appropriate UI copy to:

- `Workspace` -> `Emergency OS`
- `Dashboard` -> `Whiteboard`

Representative files updated:

- `src/data/frontendOperatingSystem.js`
- `src/data/workspaceExperience.js`
- `src/pages/PlatformOSPages.jsx`
- `src/pages/tools/ToolPageLayout.jsx`
- `src/data/saasComplianceAudit.js`
- `src/data/featureCoverageMatrix.js`
- `src/data/dependencyMap.js`
- `src/services/automationEngine.js`

Residual exact quoted terminology is deliberate:

- `src/features/future-modules/_review/components/QuickCommandLauncher.jsx` - future-module review component left alone.
- `src/pages/customer-portal/CustomerPortalPage.jsx` - non-routed commercial/future surface left alone.
- `src/data/pluginMarketplace.js` - generic plugin type label, not Emergency OS UI copy.
- `src/pages/HealthcareKnowledgeHubPage.test.jsx` - existing test for a non-R6 knowledge hub label.

## Verification

Passed:

- `npx vitest run src/routing/canonicalRouteRedirects.test.js src/config/unified-navigation.config.test.ts src/components/Sidebar.test.tsx src/data/emergencyPageRenderInventory.test.js src/config/emergencyRolePermissions.test.js src/data/frontendOperatingSystem.test.js`
  - 6 files passed, 23 tests passed.
- `npm run typecheck:frontend`
  - `tsc --noEmit -p tsconfig.frontend.json` passed.
- `ReadLints` on edited files
  - No linter errors found.

Residual route/nav searches:

- `src/App.jsx` has no residual searched non-ED standalone route matches.
- `src/config/unified-navigation.config.ts` contains only the seven requested nav labels.
- `src/config/routes.config.js` still contains non-ED paths only as canonical constants, future route records, or `NON_ED_WORKSPACE_STUB_ROUTES`.

## Residual Risks

- Legacy non-ED component files and tests still exist for future work, but they are no longer active app routes.
- Broad platform inventory/audit data still references historical non-ED routes for documentation or audit purposes; R6 did not delete those reusable/non-routed datasets.
