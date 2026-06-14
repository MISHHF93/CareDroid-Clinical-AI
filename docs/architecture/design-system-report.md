# Design System Report

Date: 2026-06-13

## Product Identity

This prior design note is superseded by the one-system audit. The active brand config currently exposes the `Emergency OS` wordmark and keeps CareDroid/AIIOS context in supporting platform copy.

The intended feel is Emergency Department Mission Control: calm, compact, operational, and focused on patient flow.

## Token Baseline

The active token files already define the requested palette:

- Light: background `#F6F8FB`, card/surface `#FFFFFF`, primary `#2563EB`.
- Dark: background `#0B1220`, card/surface `#172033`, primary `#3B82F6`.
- Font: Inter/system UI stack.
- Motion: `--motion-*` tokens with `prefers-reduced-motion` support.

Primary sources: `src/styles/theme-tokens.css`, `src/styles/design-tokens.css`, `src/styles/theme-surfaces.css`, and Emergency OS component CSS.

## Normalized UI Language

Active Emergency OS pages use compact mission-control cards, status chips, operational metric strips, persistent alert affordances, clear empty/loading/error states, and route-aware command actions. The pass avoided a layout rewrite and kept the active AppShell structure intact.

## Remaining Gaps

Some components still contain inline fallback colors for resilience. They should be gradually moved to tokens during focused UI passes, not through broad mechanical churn in a dirty tree.
