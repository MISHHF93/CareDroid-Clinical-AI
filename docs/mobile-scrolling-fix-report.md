# Mobile Scrolling Fix Report

Date: 2026-05-26

## Root Cause

Scrolling was overly dependent on nested app scrollports. The document root, `body`, `#root`, and `.app-shell` used fixed viewport heights with default vertical `overflow: hidden`, so mobile touch scrolling only worked when the gesture started inside the exact inner scroll container. This made pages feel blocked when viewport height changed, when content exceeded the shell, or after a drawer/modal had temporarily locked scroll.

## Affected Containers

- `html`, `body`, and `#root` were locking vertical document scroll by default.
- `.app-shell`, `.app-shell-main-wrap`, and `.app-shell-page-body` were constrained by fixed viewport-height assumptions.
- Auth pages used a fixed viewport-height shell, which could clip long forms on short phones.
- Mobile drawer and modal scroll locks used direct inline overflow changes without a shared release mechanism.
- Chat, sidebar, map/table, and command-palette regions need local scroll, but normal pages such as `/tools`, calculators, dashboard, IoT, fleet, and governance should be allowed to grow in document flow.

## Files Changed

- `src/index.css`
- `src/styles/theme-surfaces.css`
- `src/layout/AppShell.css`
- `src/layout/AuthShell.css`
- `src/hooks/useDrawerFocus.js`
- `src/components/ui/Modal.jsx`
- `src/utils/scrollLock.js`
- `src/hooks/useDrawerFocus.test.js`
- `src/test/mobileScrolling.contract.test.js`
- `docs/mobile-scrolling-fix-report.md`

## CSS Patterns Applied

- Restored default vertical scroll on `html` and `body`.
- Changed `#root` and `.app-shell` from fixed-height, hidden-overflow containers to `min-height` document-flow containers.
- Kept horizontal overflow clipped at the document level to prevent body-level sideways scroll.
- Kept `.app-shell-page-body--conversation` as a bounded local viewport so AI chat can keep its internal message scrolling behavior.
- Let normal app pages use document-flow scrolling while preserving local scroll only for chat, sidebars, overlays, tables, maps, and panels.
- Changed auth shell height to `auto` with `min-height` so long auth content remains reachable.
- Added `.app-scroll-locked` and a shared `lockGlobalScroll()` helper so drawers and modals release body/html scroll reliably after close.

## Mobile Viewport Validation

The responsive contract targets the requested phone widths through the existing responsive QA matrix and smoke tests:

- `320px`
- `360px`
- `390px`
- `412px`
- `430px`

The scroll contract specifically covers document scroll defaults, app-shell page flow, chat-local scroll, auth shell growth, `/tools` growth, calculator growth, and drawer lock cleanup.

## Tests Added Or Updated

- Added `src/test/mobileScrolling.contract.test.js`.
- Updated `src/hooks/useDrawerFocus.test.js` with a render-level drawer open/close scroll-lock release test.
- Existing responsive and sidebar tests continue to cover mobile drawer behavior, route smoke rendering, `/tools`, calculators, and responsive QA inventory.

Targeted validation:

```text
npm test -- src/test/mobileScrolling.contract.test.js src/hooks/useDrawerFocus.test.js src/styles/layout-visibility.test.js src/components/Sidebar.responsive.test.js src/components/Sidebar.mobileRender.test.jsx --run
npm run test:responsive-regression
npm run test:run:frontend
npm run lint
npm run build
```

Results:

- Targeted mobile scroll contracts: 5 test files passed, 37 tests passed.
- Responsive regression suite: 11 test files passed, 463 tests passed.
- Full frontend suite: 294 test files passed, 8,748 tests passed.
- Lint: passed with 0 errors; existing warnings remain.
- Production build: passed, including asset validation.

## Remaining Risks

- Real mobile browsers can differ in visual viewport behavior around address-bar collapse and soft keyboards. The app still syncs `--app-viewport-height` for chat and drawer contexts, but final confidence should include manual checks on iOS Safari and Android Chrome.
- Some legacy standalone pages still use local `min-height: 100vh`; those are acceptable when they do not combine with vertical overflow locks, but they should be monitored if new clipping appears.
