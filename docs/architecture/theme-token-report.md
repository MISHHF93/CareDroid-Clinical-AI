# Theme Token Report

Date: 2026-06-13

## Token Sources

- `src/styles/theme-tokens.css` now reflects the requested Emergency OS light and dark palettes.
- `src/styles/design-tokens.css` adds component variants for cards, buttons, typography, elevation, spacing, and modal radius.
- `src/globals.css` remains the late-loaded Emergency OS bridge so existing emergency CSS variables (`--color-*`, `--status-*`, `--priority-*`, `--app-*`, and legacy aliases) resolve consistently.

## Centralized Additions

- Theme colors: primary, secondary, accent, background, surface, card, floating surface, border, text primary, and text secondary.
- Status colors: success, warning, danger, info, emergency.
- Capacity colors: green, yellow, orange, red.
- Component variants: card surface/border/radius/padding/gap/elevation and button primary/secondary/danger/ghost tokens.
- Typography: Inter and fixed Emergency OS page/section/card/body/caption sizes.
- Elevation: card, floating, and modal shadows tuned to avoid heavy outlines and excessive glow.

## Compatibility

Legacy aliases such as `--surface-1`, `--panel-border`, `--accent-1`, `--danger`, `--warning`, and `--success` continue to point at semantic tokens. This keeps existing component CSS working while allowing touched files to migrate toward the centralized `--color-*`, `--status-*`, `--component-*`, and `--app-*` tokens.

## Tests Updated

`src/styles/themeColorSystem.test.js` was updated to validate the new Emergency OS palette values instead of the prior neutral/OLED palette.
