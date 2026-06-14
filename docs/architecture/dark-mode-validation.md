# Dark Mode Validation

Date: 2026-06-13

## Expected Dark Palette

- Background `#0B1220`
- Surface `#111827`
- Card `#172033`
- Floating surface `#1E293B`
- Border `#2D3748`
- Text primary `#F9FAFB`
- Text secondary `#9CA3AF`
- Primary `#3B82F6`, secondary `#38BDF8`, accent `#22D3EE`

## Validated By Code Review

- `src/globals.css` sets the dark values as the default and under `html[data-theme='dark']`.
- `src/styles/theme-tokens.css` mirrors the same dark palette for earlier imports and tests.
- Emergency components use tokenized `--color-*`, `--status-*`, `--component-*`, and `--app-*` values instead of hard-coded dark colors in touched surfaces.
- Whiteboard, patient card, patient detail, queue intelligence, EMS, referrals, analytics, settings, and smart intake retain visible content, controls, empty states, and status accents.

## Remaining Manual QA

- Toggle dark mode in Chromium and inspect `/emergency/whiteboard`, `/emergency/ems`, `/emergency/referrals`, `/emergency/analytics`, `/emergency/settings`, and `/emergency/intake`.
- Exercise patient detail, reassessment, new-patient intake, referral form, EMS critical banner/checklist, and command palette overlays.
- Confirm status colors remain readable for P1/P2/P3, long wait, LWBS, EMS arrival, sepsis bundle, capacity red/yellow/green, and disabled role-gated actions.
