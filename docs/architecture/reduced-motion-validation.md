# Reduced Motion Validation

## Implementation

The motion pass includes `prefers-reduced-motion: reduce` handling in the shared token layer and edited component CSS. Reduced-motion mode collapses motion durations to `1ms`, disables non-essential animations, removes hover lift transforms, and disables skeleton shimmer where the relevant hooks exist.

## Covered Surfaces

- Shared tokens and utilities: `src/index.css`, `src/styles/design-tokens.css`, `src/styles/theme-tokens.css`, `src/styles/theme-surfaces.css`.
- Emergency OS shell: nav rail, route panels, capacity drawer, shortcuts modal, alert menu/toasts, staff menu, Copilot panel.
- Emergency components: patient cards, whiteboard, queue intelligence, EMS pipeline, EMS pressure score, reassessment drawer, referrals, critical EMS broadcast, capacity crisis mode.
- Supporting UI: command palette, sidebar, chat/Copilot message renderer, skeleton loader, patient detail panel, analytics, settings.

## Validation Results

- `ReadLints`: no diagnostics for edited files.
- `npm run lint`: pass.
- Focused tests: pass, 5 files / 23 tests.
- `npm run build`: pass with existing Vite chunk warnings.
- `npm run typecheck:frontend`: fails on unrelated `src/central-node/careDroidCentralNode.ts` and `src/hooks/useCareDroidCentralNode.ts` WebSocket status type errors.

## Manual QA Required

Browser-level reduced-motion behavior was not visually captured in this environment. Manual QA should enable reduced motion and verify:

- Patient cards, queue rows, and whiteboard content do not animate on entry.
- Command palette, drawers, modals, alerts, and Copilot panel appear without translate/scale motion.
- Critical clinical alerts remain visible through static color/border affordances.
- Focus-visible rings remain accessible and visible.
