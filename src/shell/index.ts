/**
 * Shell Module Index
 *
 * Canonical, named import path for the application's real shell components.
 * Every one of these re-exports the app's actual, already-wired implementation
 * (see each file's own header comment) — nothing here is a parallel or
 * competing implementation.
 *
 * Not yet real (removed rather than left as fake scaffolding): a distinct
 * WorkspaceHeader (role-context sub-header) and PageCommandBar (per-page
 * title/breadcrumbs/actions bar) do not exist as separate components in this
 * app today — page titles/actions currently live inline within each page, and
 * breadcrumbs are available via `getBreadcrumbsForRoute()`
 * (`src/config/routes.config.ts`) but are not surfaced as an always-visible
 * bar. Building real versions of these is tracked as a separate, dedicated
 * roadmap item, not faked here with mock data and no-op handlers.
 */

// Layout
export { ApplicationShell } from './ApplicationShell/ApplicationShell';
export type { ApplicationShellProps } from './ApplicationShell/ApplicationShell';

// Header
export { ApplicationHeader } from './ApplicationHeader/ApplicationHeader';

// Sidebar (includes its own real mobile bottom-navigation)
export { ApplicationSidebar } from './ApplicationSidebar/ApplicationSidebar';
export type { ApplicationSidebarProps } from './ApplicationSidebar/ApplicationSidebar';
