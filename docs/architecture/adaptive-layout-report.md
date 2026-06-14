# Adaptive Layout Report

## Breakpoint Strategy

The implementation uses the existing token stack plus Emergency OS overrides for:

- 375px and below: single-column clinical cards, full-width controls, touch-safe buttons.
- 640px: mobile layout threshold for card/list conversion and input zoom prevention.
- 768px: mobile shell bottom nav and drawer bottom sheets.
- 1024px: tablet panel behavior and reduced whiteboard/queue density.
- 1280px and 1536px: desktop operational board.
- 1920px and 2560px: expanded whiteboard grids and broader command-center padding.
- 3840px: command-center typography scaling.

## Adaptive Patterns Added

- Fluid containers: `--ed-page-pad`, `--ed-section-gap`, `--ed-card-pad`.
- Responsive card grids: active whiteboard grid uses `auto-fill` with tokenized card minimums.
- Responsive touch targets: Emergency OS controls use `--app-min-touch-target`.
- Viewport-safe overlays: drawers/modals use `--app-viewport-height` and visual viewport offset where available.
- Scrollbar handling: filter rows and dense table wrappers retain intentional horizontal scrolling only where operationally useful.
- Print-safe classes: shell chrome, drawers, command palette, and copilot hide for print.

## Architecture Guardrails

- `src/components/AppShell.tsx` remains the active shell.
- `src/App.jsx` routing remains unchanged.
- `src/components/EmergencyWhiteboard.jsx` continues to re-export the active `src/pages/emergency/index.tsx`.
- No Tailwind or second design system was introduced.
