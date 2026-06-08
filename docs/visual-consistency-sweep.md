# Visual Consistency Sweep

Status: implemented

## Goal

No page should feel like it came from a different application.

## Normalization Scope

- Spacing
- Padding
- Typography
- Icons
- Buttons
- Cards
- Tables
- Forms
- Page headers

## Audit Notes

Inspected the page/style surface through the frontend page inventory and shared style layers:

- `src/pages/**/*.css`: 82 page-level stylesheets
- `src/pages/**/*.jsx`: page entry points and CSS imports
- `src/components/ui`: canonical `Card`, `Button`, `PageHeader`, and `CareDroidPrimitives`
- `src/styles`: tokens, responsive fit rules, theme surfaces, and existing design language tests

Findings:

- Page headers and hero sections used several local shapes: some were plain flex headers, some were large gradient hero panels, and some used the newer `PageHeader` primitive.
- Cards, panels, widgets, notices, and empty states repeated the same surface rules with different radii, shadows, padding, and background assumptions.
- Tables had inconsistent wrappers, cell padding, header typography, and overflow behavior across operational, analytics, artifact, catalog, and organization pages.
- Forms and filters used varied control heights, label sizes, field gaps, and input radii.
- Buttons mixed canonical `.btn-*` classes with page-local `*-button`, `*-action`, and `*-control` classes, creating uneven type, radius, alignment, and icon sizing.
- Typography was mostly tokenized but page-local headings and subtitles still varied in title scale, line height, and letter spacing.
- Icons were inconsistent inside button/action rows, especially where local classes predated the shared button primitive.

Decision:

- Normalize high-variance legacy page families with a late-loaded shared stylesheet scoped to `.app-shell`.
- Keep backend and routes unchanged.
- Preserve existing page content and behavior; only normalize visual language.

## Fixes Applied

- Added `src/styles/visual-consistency.css`.
- Imported the sweep layer from `src/main.jsx` after the existing responsive and mobile styles.
- Added app-wide visual tokens for page gaps, header padding, card padding, table cell padding, control gaps, and radii.
- Normalized page roots and dashboards to share maximum width, min-width behavior, and consistent page gaps.
- Normalized page headers/heroes to use tokenized panel backgrounds, borders, compact padding, radii, and title/subtitle typography.
- Normalized legacy cards, panels, widgets, notices, and state surfaces to share CareDroid surface, border, radius, and shadow language.
- Normalized page-local button/action/control classes to use shared alignment, gap, type, height, radius, and icon sizing.
- Normalized forms and filters around shared input height, input border, radius, label type, and min-width behavior.
- Normalized table wrappers, table headers, cell padding, row borders, and local overflow handling.
- Normalized badges, chips, pills, and tags to the shared compact type and pill radius.
- Added a mobile rule that stacks full action buttons while preserving intrinsic icon, marker, and toggle controls.
- Added `src/styles/visualConsistencySweep.test.js` to lock the import order and requested visual categories.

## Verification

- `ReadLints`: no diagnostics for `src/main.jsx`, `src/styles/visual-consistency.css`, or `src/styles/visualConsistencySweep.test.js`.
- `npm run test:run -- src/styles/visualConsistencySweep.test.js src/styles/responsiveUx.test.js src/styles/designLanguageFit.test.js`
  - 3 test files passed
  - 30 tests passed

## Entropy Reduction Update

- Replaced inline `100vw` shells in `GDPRNotice`, `HIPAANotice`, and `HelpCenter` with shell-safe `width: 100%`, `maxWidth: 100%`, and clipped overflow.
- Normalized `NotificationPreferences` away from a standalone gradient viewport shell and into a bounded app-shell surface.
- Added shrink-safe platform admin scorecard constraints so the admin page does not force horizontal overflow on mobile.
- Added `visualMobileGuardrails.test.js` to protect the named legacy/public/admin outliers.
