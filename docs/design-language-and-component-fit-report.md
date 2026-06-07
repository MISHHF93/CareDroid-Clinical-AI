# CareDroid Design Language And Component Fit Report

## Design Tokens Normalized

The app already had `src/styles/design-tokens.css` and `src/styles/theme-tokens.css`. This pass extended the existing token system instead of creating a second design system.

Added/normalized token areas:

- Control heights: `--app-control-height-sm`, `--app-control-height-md`, `--app-control-height-lg`
- Icon sizing: `--app-icon-size-sm`, `--app-icon-size-md`, `--app-icon-size-lg`, `--app-icon-button-size`
- Input/button sizing: `--app-input-height`, `--app-button-height`
- Shell sizing: `--app-shell-header-height`, `--app-shell-compact-header-height`, `--app-sidebar-header-height`
- Sidebar sizing: `--sidebar-width-expanded`, `--sidebar-width-collapsed`, `--sidebar-drawer-max-width`
- Layers: `--z-dropdown`, `--z-overlay`, `--z-header`, `--z-popover`, `--z-drawer`, `--z-modal`, `--z-toast`
- Focus/elevation: `--app-focus-ring`, `--app-focus-ring-width`, `--app-focus-ring-offset`, `--app-elevation-card`

Theme rules remain centralized in `src/styles/theme-tokens.css`: light mode uses white/neutral surfaces, dark mode uses near-black surfaces, and blue is limited to accent/interactive states.

## Sidebar Toggle Fix

`src/components/Sidebar.css` now uses a grid-based sidebar header:

- Logo/title and toggle align on the same horizontal rail.
- The logo title is constrained with ellipsis so it cannot overlap the toggle.
- The toggle uses `--app-icon-button-size` and the shared focus ring.
- Collapsed sidebar hides the logo and centers the toggle.
- Mobile drawer keeps internal scrolling and a reachable footer.

The app-shell mobile menu and command buttons in `src/layout/AppShell.css` were also aligned to the compact header rail so the hamburger, workspace dropdown, and quick command button fit together.

## Component Fit Issues Fixed

Shared fit fixes were added in `src/styles/responsive-ux.css` and shared primitives:

- Cards and panels get `min-width: 0` and `max-width: 100%`.
- Long text wraps inside components.
- Buttons, icons, labels, inputs, selects, and textareas fit containers.
- Tables scroll in local wrappers.
- Media, maps, charts, canvases, and visualizations are capped to container width.
- Focus states are consistent and visible.

Updated primitives:

- `src/components/ui/button.css`
- `src/components/ui/card.css`
- `src/components/ui/input.css`
- `src/components/forms/Select.css`
- `src/components/QuickCommandLauncher.css`
- `src/components/WorkspaceSwitcher.css`

## Pages Updated

The shared CSS changes apply through the existing app shell to dashboard, assistant, tools, calculators, operations, map, IoT, fleet, profile, settings, onboarding, tenant admin, and advanced/admin pages without requiring each page to adopt a separate component library.

## Responsive Validation

The design-fit contract explicitly covers:

- 320-430px compact phone widths through viewport-safe workspace and shell controls
- 640px touch target enforcement
- 768px tablet card/input behavior
- 900px sidebar drawer breakpoint
- Desktop sidebar collapsed/expanded states

Existing route/layout responsive tests continue to enforce scroll, no bottom nav conflict, and main content overflow behavior.

## Accessibility Fixes

- Icon buttons retain aria-labels in JSX.
- Sidebar toggle and shell controls use visible focus rings.
- Native selects and buttons remain keyboard accessible.
- Disabled button states remain visually distinct.
- Active sidebar state continues using `aria-current`.

## Tests Added

Added `src/styles/designLanguageFit.test.js` covering:

- Design token foundation
- Global overflow and focus fit rules
- Sidebar toggle/header fit
- Workspace dropdown fit
- No conflicting bottom navigation

Existing sidebar and shell layout tests were run with the new contract.

## Remaining Risks

- This pass standardizes shared primitives and global fit rules. Some deeply custom page CSS may still benefit from visual QA in real browsers.
- Large chart/calculator chunks remain a build warning and are unrelated to component fit.
- Hard-coded legacy palette aliases still exist for backwards compatibility, but active theme surfaces are driven by semantic `--app-*` tokens.
