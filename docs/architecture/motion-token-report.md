# Motion Token Report

## Tokens Added Or Updated

Shared motion tokens now exist in the active CSS/token layer:

- `--motion-fast`: `120ms`
- `--motion-normal`: `180ms`
- `--motion-slow`: `240ms`
- `--animation-fast`: alias of `--motion-fast`
- `--animation-base`: alias of `--motion-normal`
- `--animation-slow`: alias of `--motion-slow`
- `--motion-duration-fast`, `--motion-duration-normal`, `--motion-duration-slow`
- `--motion-ease-standard`: `cubic-bezier(0.22, 1, 0.36, 1)`
- `--motion-transition-fast`, `--motion-transition-normal`, `--motion-transition-slow`
- `--motion-hover-lift-y`, `--motion-enter-distance`, `--motion-skeleton-duration`

## Utility Classes

Added reusable CSS utilities in `src/styles/design-tokens.css`:

- `.motion-enter-soft`
- `.motion-hover-lift`
- `.motion-pressable`
- `.motion-chip`
- `.cd-skeleton-shimmer`

## Application Areas

Tokens were applied to existing Emergency OS selectors for:

- Buttons, icon buttons, sidebar/nav items, tabs, command palette items.
- Patient cards, queue rows, EMS rows, referral rows, analytics/settings KPI surfaces.
- Drawers, modals, dropdowns, alert trays, toasts, Copilot message rows.
- Skeleton shimmers and status/critical dots.

## Constraints Preserved

No new animation dependency was added. No router wrapper, AppShell restructuring, routing change, page hierarchy change, or backend/workflow logic change was introduced.

## Validation

Edited-file diagnostics, lint, focused tests, and production build passed. Frontend typecheck still fails in unrelated central-node typing files.
