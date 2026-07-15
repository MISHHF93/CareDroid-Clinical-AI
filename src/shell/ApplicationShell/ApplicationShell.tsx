/**
 * Canonical application-shell export.
 *
 * The real implementation lives in `src/components/AppShell.tsx` — the app's
 * actual root layout, wired into every authenticated route via
 * `src/app/router.tsx`. It composes the real Header (search, notifications,
 * Operations Center menu, profile/role switcher, theme toggle) and the real
 * Sidebar (which already includes its own mobile bottom-navigation, see
 * `sidebar-mobile-nav` in Sidebar.tsx), plus live system-health polling and
 * command-palette wiring.
 *
 * This file exists so future code has one canonical, named import path
 * (`src/shell`) rather than reaching into `src/components` directly — see
 * `src/layouts/AppShell.tsx` for the same pattern already established
 * elsewhere in this codebase. It intentionally does not reimplement or wrap
 * any behavior: an earlier version of this file was a disconnected,
 * placeholder-only mock (hardcoded "connected" health dot, no-op click
 * handlers, decorative-only search/notifications) that duplicated — with far
 * less functionality — what AppShell.tsx already does for real.
 */
export { AppShell as ApplicationShell, type AppShellProps as ApplicationShellProps } from '../../components/AppShell';
