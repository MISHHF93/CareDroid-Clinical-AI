# Mobile-First Recovery Report

Status: implemented

## Goal

Make mobile feel first-class.

## Inspection Scope

- Scrolling
- Sidebars
- Drawers
- Forms
- Maps
- Dashboards
- Tool pages

## Problems To Fix

- Clipped content
- Overflow
- Unreachable buttons
- Nested scrolling

## Audit Notes

Inspected the existing mobile/responsive surface:

- `src/layout/AppShell.css`
- `src/components/Sidebar.css`
- `src/components/ui/Drawer.css`
- `src/styles/mobile-first-layout.css`
- `src/styles/layout-visibility.css`
- `src/styles/responsive-ux.css`
- `src/styles/mobile-performance.css`
- map, dashboard, tool, calculator, catalog, and operational page styles under `src/pages`

Findings:

- The shell already uses a fixed app viewport with a primary scroll area, but normal mobile routes still had a nested vertical scroll risk because both `.app-shell-main-content` and `.app-shell-page-body` could scroll.
- Chat/conversation pages intentionally need a local viewport and should not be changed to page-growth behavior.
- Sidebars and drawers already used internal scroll regions, but needed stronger mobile safe-area padding and scroll padding so long content and footer actions stay reachable.
- Maps and wide tables correctly need local horizontal scrolling, but those local scroll regions needed a consistent mobile contract to prevent page-level overflow.
- Forms and tool pages used several local action rows where buttons could become hard to reach near the keyboard or safe-area bottom.
- Dashboard/tool grids had mostly responsive behavior, but older grid classes still needed a final mobile stack rule to avoid squeezed cards and clipped content.

## Fixes Applied

- Added `src/styles/mobile-first-recovery.css`.
- Imported the recovery layer from `src/main.jsx` after responsive, mobile, and visual consistency styles.
- Made `.app-shell-main-content` the mobile vertical scroll owner for normal pages.
- Changed normal mobile `.app-shell-page-body` routes to grow with content instead of creating nested vertical scroll.
- Preserved conversation/chat routes as local fixed-height viewports.
- Added mobile bottom scroll padding for safe areas and keyboard insets so final actions remain reachable.
- Reinforced sidebar, drawer, and command overlay local scroll behavior with `overscroll-behavior` and touch scrolling.
- Added safe-area padding/scroll padding for sidebar content and drawer footers.
- Stacked dashboard, tool, metric, panel, calculator, and action grids on mobile.
- Normalized mobile form/action rows so important buttons wrap and preserve minimum touch size.
- Kept maps and wide tables inside local horizontal scroll regions instead of allowing page-level overflow.
- Scoped wide table `min-width: max-content` to known scroll wrappers only.
- Added `src/styles/mobileFirstRecovery.test.js` to lock import order and the mobile recovery contract.

## Verification

- `ReadLints`: no diagnostics for edited mobile recovery files.
- `npm run test:run -- src/styles/mobileFirstRecovery.test.js src/test/mobileScrolling.contract.test.js src/styles/mobileFirstLayout.test.js src/styles/layout-visibility.test.js src/styles/responsiveUx.test.js`
  - 5 test files passed
  - 52 tests passed

## Entropy Reduction Update

- Added targeted mobile recovery coverage for notification preferences, team management, legal pages, and platform admin.
- Team management now keeps its sortable user table in an approved local horizontal scroll wrapper and uses viewport-safe modal sizing.
- Mobile sticky detail panels for hospital map, fleet map, and artifacts are neutralized through the recovery layer so they do not trap content on small screens.
- The recovery tests now assert the local user table scroll wrapper and mobile sticky-panel override.
