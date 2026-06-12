# Layout Normalization Report

Generated: 2026-06-12

Scope: layout flattening and duplicate/redundant page consolidation pass.

## Active Layout Contract

The active Emergency OS remains flattened through one shell path:

- One router entry table: `src/App.jsx`
- One AppShell: `src/layout/AppShell.jsx`
- One shell header: `AppShell` header region
- One sidebar/nav rail: `AppShell` nav rail
- One active nav source: `APP_SHELL_NAV_ITEMS` in `src/config/navigation.config.js`
- One command palette component: `src/components/CommandPalette.jsx`
- One command route registry: `src/config/commandPalette.config.js`
- One search registry: `src/data/searchFirstDiscovery.js`

## Changes Applied

| Area | Change |
| --- | --- |
| Archive move | Moved clearly unmounted or duplicate legacy layout/page surfaces into `src/features/future-modules/_review/`. |
| Compatibility adapters | Replaced old production paths with thin re-export adapters so tests and legacy imports still resolve without keeping duplicate implementations at the original active locations. |
| Navigation source | Added labels to `APP_SHELL_NAV_ITEMS` and derived `QUICK_COMMAND_DESTINATION_ITEMS` from that same array, removing the duplicated Emergency OS destination list. |
| Route aliases | Promoted top-level aliases such as `/dashboard`, `/home`, `/assistant`, `/tools`, and `/catalog` into `PROTECTED_ROUTE_ALIAS_REDIRECTS` via `routes.config.js`; trimmed the local `DUPLICATE_ROUTE_REDIRECTS` list in `App.jsx`. |
| Route metadata | Kept `CANONICAL_APP_ROUTE_TREE` aligned with actual rendered route components for `/emergency/patients`, `/emergency/reassessment`, and `/emergency/boarding`. |

## Archive Decision

Files physically moved to `src/features/future-modules/_review/`:

- `src/features/future-modules/_review/pages/WorkspaceHome.jsx`
- `src/features/future-modules/_review/pages/WorkspaceHome.css`
- `src/features/future-modules/_review/pages/emergency/DepartmentPulse.jsx`
- `src/features/future-modules/_review/pages/emergency/DepartmentPulse.css`
- `src/features/future-modules/_review/components/ShiftSummary.jsx`
- `src/features/future-modules/_review/components/ShiftSummary.css`
- `src/features/future-modules/_review/components/QuickCommandLauncher.jsx`
- `src/features/future-modules/_review/components/QuickCommandLauncher.css`

Compatibility adapters left at old paths:

- `src/pages/WorkspaceHome.jsx`
- `src/pages/WorkspaceHome.css`
- `src/pages/emergency/DepartmentPulse.jsx`
- `src/pages/emergency/DepartmentPulse.css`
- `src/components/ShiftSummary.jsx`
- `src/components/ShiftSummary.css`
- `src/components/QuickCommandLauncher.jsx`

`src/components/QuickCommandLauncher.css` remains at the original path as a compatibility style contract for existing CSS/read-based tests; the archived component also has a copied stylesheet.

Not moved in this pass:

- `src/pages/tools/ToolPageLayout.jsx`
- `src/pages/tools/ToolPageLayout.css`

Reason: `ToolPageLayout` is still imported by embedded calculator and drug-checker pages that remain part of the ED Copilot/tool workflow.

## Validation

Passed:

- `npm run test:run -- src/layout/AppShell.navigation.test.jsx src/config/canonicalConfig.contract.test.js src/routing/canonicalRouteRedirects.test.js src/components/QuickCommandLauncher.test.jsx src/pages/emergency/DepartmentPulse.test.jsx`
- `npm run test:run -- src/data/searchFirstDiscovery.test.js src/data/assetInventory.test.js src/routing/sectionLinkInventory.test.js`
- `npm run lint`
- `npm run typecheck:frontend`
- `npm run build`

Build warnings:

- Existing Vite warning: `src/services/offlineService.js` is both dynamically and statically imported.
- Existing chunk-size warning for large frontend chunks.

Legacy test note:

- `src/pages/WorkspaceHome.test.jsx` still contains broad assertions for the old workspace dashboard surface. That surface is now archived and is not the active Emergency OS route contract. The active route/navigation, adapter, search, lint, typecheck, and build checks above passed.

## Result

Active Emergency OS pages remain routed through the single `AppShell`. Duplicate legacy workspace, quick-command, department-pulse, and shift-summary implementations are no longer kept at active source locations, while compatibility imports still resolve. The active shell navigation, command destinations, and search destinations now share the same canonical Emergency OS route list.
