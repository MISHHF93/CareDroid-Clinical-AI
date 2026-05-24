# Responsive Regression Coverage

This document tracks the automated and manual checks used to keep CareDroid routes usable across phone, tablet, and desktop layouts.

## Automated Playwright Coverage

The primary route sweep is `e2e/responsive-qa.spec.mjs`. It loads every page from `src/data/responsiveQaMatrix.js` across the responsive viewport matrix and verifies:

- no unexpected document or element horizontal overflow
- usable vertical scrollports for content routes
- no suspicious visible element overlap where interactive controls cover sibling text or controls
- authenticated routing does not fall back to `/auth`
- `/dashboard` command center panels stack safely as the primary post-login entrance

The matrix starts at `320` px wide and includes common phone, tablet, and desktop sizes through `1920x1080`.

## Automated Unit Coverage

Vitest route and layout coverage includes:

- `src/test/routePagesSmoke.test.jsx`
- `src/test/responsiveRegression.coverage.test.js`
- `src/components/Sidebar.mobileRender.test.jsx`
- `src/pages/tools/ToolsOverview.inventory.test.jsx`
- page-specific responsive tests for calculators, catalog, fleet, and tool pages

## Manual Visual Checks

Manual visual checks should still be performed before release for areas that automated bounding-box checks cannot fully judge:

- Sidebar tool cards: favorite and pin controls should not overlap title, shortcut, or description text.
- Tool Library cards: action controls should sit in their own row and not cover headings.
- Command Dashboard panels: assistant prompt, tool cards, status chips, and recent activity should stack without horizontal overflow.
- Dashboard composer: suggested action chips may scroll horizontally inside their rail, but must not create page-level overflow.
- Mobile drawer: the open drawer should keep the close button, nav labels, and tool cards readable at `320`, `360`, and `412` px widths.
- Protected admin surfaces such as `/tools/catalog` should be checked with an admin-capable QA user.

