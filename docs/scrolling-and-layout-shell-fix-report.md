# Scrolling And Layout Shell Fix Report

## Summary

The `/profile/settings` double-scroll symptom came from an inconsistent shell contract: the fixed sidebar lived outside normal flow, while the main column was still sized as `width: 100%` and offset with a sidebar margin. Normal pages also relied on document-flow scrolling, even though the app shell already has fixed navigation chrome. This could create an oversized content column and a phantom rail/gutter beside the page content.

The fix establishes one scroll model:

- `html`, `body`, and `#root` fill the viewport without permanently locking body overflow.
- `AppShell` owns the authenticated viewport.
- `Sidebar` remains fixed and can keep its own internal list scrolling.
- `MainContent` is the fixed-height content column beside the sidebar.
- `.app-shell-page-body` is the primary vertical scroll container for normal authenticated pages.
- Conversation routes keep their explicit internal scroll behavior.
- Page content uses `PageContainer`; local `ScrollArea` is reserved for tables, chats, maps, drawers, and other explicitly bounded regions.

## Files Updated

- `src/layout/AppShell.jsx` now renders the main column as `MainContent` via the app shell main element.
- `src/layout/AppShell.css` now sizes the shell to the viewport, prevents sidebar-margin width overflow, and makes `.app-shell-page-body` the primary scrollport.
- `src/layout/PageContainer.jsx` and `src/layout/PageContainer.css` add reusable `PageContainer`, `page-stack`, and `ScrollArea` layout primitives.
- `src/pages/ProfileSettings.jsx` now uses `PageContainer` instead of an inline full-page flex wrapper.
- `src/pages/ProfileSettings.css` adds responsive settings form grids.
- `src/styles/layout-visibility.css` includes the new profile settings/page container contract.
- Layout contract tests were updated and expanded for the new scroll model.

## Route Audit

Checked the requested routes for duplicate shells and page-level full-screen wrappers:

- `/profile/settings` routes through one `AppShellPage`, renders one `AppShell`, and does not render a nested `Sidebar`.
- `/profile` uses the same shell route and no duplicate sidebar.
- `/dashboard` uses the standard shell page route.
- `/assistant` is intentionally marked as a conversation viewport and keeps local chat scrolling.
- `/tools` and `/tools/calculators` use normal page growth inside the shell scrollport.
- `/hospital-map`, `/medical-iot`, `/devices`, `/fleet/map`, and `/live-map` keep horizontal map/table overflow local to their canvases or table wrappers while vertical page scroll stays in the shell page body.

Sticky detail panels and horizontal map canvases remain allowed local layout behavior because they are bounded subregions, not full-page duplicate scroll shells.

## Tests Added Or Updated

- `/profile/settings` renders with exactly one app shell.
- `/profile/settings` renders with exactly one sidebar.
- `/profile/settings` does not add local scroll wrappers around the settings content.
- Compact/mobile shell rendering keeps profile settings inside `MainContent`.
- Source-level route contract prevents duplicate shell/sidebar wrapping and null route regression.
- Shell CSS tests now assert the new main scrollport contract.

## Verification Completed

Targeted layout/profile test command:

```sh
npm run test:run -- src/layout/ProfileSettingsShell.test.jsx src/layout/AppShell.layout.test.js src/test/mobileScrolling.contract.test.js src/styles/responsiveUx.test.js src/data/fullPlatformConsolidation.test.js src/pages/ProfileSettings.test.jsx
```

Result: `55 passed`.

Responsive regression:

```sh
npm run test:responsive-regression
```

Result: `479 passed`.

Lint:

```sh
npm run lint
```

Result: passed with existing warnings and `0 errors`.

Production build:

```sh
npm run build
```

Result: passed.
