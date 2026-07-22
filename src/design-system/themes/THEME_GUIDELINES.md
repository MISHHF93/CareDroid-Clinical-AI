# CareDroid Enterprise Theme System (CETS) — guidelines

**Status as of Cycle 148 (2026-07-22).**

## The real runtime mechanism

Theme switching is **already fully implemented and live**:
`src/contexts/ThemeContext.tsx` (`ThemeProvider`/`useTheme()`) resolves a
`'light' | 'dark' | 'system'` preference, persists it to `localStorage`, and
applies it via `document.documentElement.dataset.theme = 'light' | 'dark'`.
Every color token in `src/styles/cdl-v2/theme.css` is declared twice — once
under `html[data-theme='light']`, once under `html[data-theme='dark']` — so
the whole app re-themes from that one attribute. `theme.contract.test.ts`
and `visual-upgrade.contract.test.ts` assert both blocks stay in sync.

`themes/light.ts` and `themes/dark.ts` in this package are **typed
descriptors of that real mechanism** (id, label, status) — not a second
theming system. Use `useTheme()` to actually read or change the theme;
use the descriptors only where you need a typed catalog of "what themes
exist" (e.g. a settings picker).

## Modes requested but not yet implemented

`high-contrast`, `high-density` (clinical), `executive`, `presentation`,
and `accessibility` modes were requested. **None exist in `ThemeContext.tsx`
(`ThemePreference` is only `'light' | 'dark' | 'system'`) or in `theme.css`
(only two `data-theme` blocks).** They are deliberately not stubbed as
`themes/highContrast.ts` etc. in this cycle — a descriptor file with no
backing CSS block or `ThemePreference` value would claim a mode is
"shipped" when clicking it would do nothing. That's worse than not having
the file.

### What's already close, per mode

- **High-density ("clinical") mode**: doesn't need new theme infrastructure
  — `src/config/receptionDeskUiModel.ts`'s `slim` flag already implements a
  density toggle for the Reception desk. The pattern (a boolean/enum that
  swaps CSS classes, not a new `data-theme` value) is the right template;
  generalizing it platform-wide is the real work.
- **High-contrast / accessibility mode**: `theme.css`'s AA-verified light/dark
  pairs (Cycle 146's WCAG fix, `THEME_CONTRACT_SCORECARD.md`) are the
  foundation. A true high-contrast mode would need a third `data-theme`
  block with wider contrast ratios, not just a re-application of light/dark.
- **Executive / presentation modes**: no foundation exists yet — these are
  closer to "an alternate density + widget-selection preset" than a color
  theme; likely belongs with the persona/dashboard-profile work in
  `HUMAN_PROFILES.md` rather than `ThemeContext`.

## Adding a real new mode (when one of the above is scoped)

1. Add the `data-theme` (or a new attribute, e.g. `data-density`) block to
   the relevant CSS file, following `theme.css`'s existing light/dark
   pattern — full token coverage, not a partial override.
2. Extend `ThemePreference` (or add a sibling context) in
   `ThemeContext.tsx`.
3. Add the descriptor to `themes/` here, `status: 'shipped'`.
4. Extend `theme.contract.test.ts` / `visual-upgrade.contract.test.ts` to
   assert the new block has full token coverage, matching the existing
   light/dark contract-test discipline.
5. Update this file's status table.
