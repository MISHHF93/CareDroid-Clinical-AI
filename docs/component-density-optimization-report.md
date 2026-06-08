# Component Density Optimization Report

## Goal

Fit more useful information without clutter.

## Audit Areas

- Oversized cards
- Oversized buttons
- Oversized headers
- Oversized spacing

## Density Modes

- Compact Density Mode
- Standard Density Mode
- User preference control

## Findings

- Oversized cards: shared cards and high-volume tool catalog cards already used compact token names, but those tokens were effectively always-on and not tied to a user-selectable density. Tool catalog cards also showed repeated feature/use-case payloads in every card.
- Oversized buttons: shared button sizes used fixed padding and mixed control-height tokens, so compact mode could not consistently tighten action rows across pages.
- Oversized headers: page headers and shell identity were recently clarified for hierarchy, but density mode needed to preserve that hierarchy while reducing surrounding gap/padding rather than shrinking titles indiscriminately.
- Oversized spacing: `design-tokens.css` already defined `--compact-page-gap`, `--compact-panel-gap`, `--compact-panel-padding`, and `--compact-control-height`, but `AppShell` did not own a `standard` vs `compact` density state.
- Preference gap: identity data already persisted `compactMode`, but the UI exposed it as a boolean checkbox and the shell did not apply it globally.

## Repairs

- Added explicit density normalization in `UserIdentityContext`: `density: 'standard' | 'compact'` is now derived from saved `density` or legacy `compactMode`, and `compactMode` remains a compatibility bridge.
- Applied density at the AppShell boundary with `app-shell--density-standard`, `app-shell--density-compact`, and `data-density`, making density a global UI concern rather than a per-page patch.
- Added density token overrides in `AppShell.css` for page gaps, panel gaps, card padding, control height, and grid card minimum width.
- Replaced compact-mode checkboxes in profile preference surfaces with an explicit Density selector: Standard Density or Compact Density.
- Updated shared `card.css` and `button.css` to consume density-aware spacing/control tokens.
- Updated `ToolsOverview.css` so tool grids, card padding, card secondary payload, and action spacing respond to density. Compact mode hides later feature/use-case chips to fit more cards without making the page noisy.
- Aligned the older Tool Preferences compact toggle to persist both `density` and legacy `compactMode`.

## Verification

- Passed: `npm test -- AppShell.navigation.test.jsx ProfileSettings.test.jsx ProfilePreferences.test.jsx`
- Passed: linter check on edited source files.
