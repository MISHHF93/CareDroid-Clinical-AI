# Light Mode Validation

Date: 2026-06-13

## Expected Light Palette

- Background `#F6F8FB`
- Surface, card, and floating surface `#FFFFFF`
- Border `#E5E7EB`
- Text primary `#111827`
- Text secondary `#6B7280`
- Primary `#2563EB`, secondary `#0EA5E9`, accent `#06B6D4`

## Validated By Code Review

- `src/globals.css` defines `html[data-theme='light']` overrides for the requested light palette while preserving shared semantic aliases.
- `src/styles/theme-tokens.css` mirrors the same light values for the base theme token source.
- Inputs, buttons, cards, table headers, row hovers, scrollbars, chips, and status surfaces remain token-driven in touched files.
- The late-loaded Emergency OS bridge prevents active emergency pages from inheriting stale hard-coded dark-only colors in normalized surfaces.

## Remaining Manual QA

- Toggle light mode in Chromium and inspect active Emergency OS routes.
- Verify card separation is visible on the `#F6F8FB` background without heavy borders.
- Confirm focus rings, buttons, form fields, sticky table headers, empty states, and warning/danger/success chips meet visual contrast expectations.
- Check patient card chips and inline status accents on light backgrounds, especially wait-time, EMS, LWBS, and reassessment indicators.
