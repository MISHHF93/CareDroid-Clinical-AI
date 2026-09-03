/**
 * Canonical sidebar export — see `src/shell/ApplicationShell/ApplicationShell.tsx`
 * for why this re-export exists. The real implementation lives in
 * `src/components/Sidebar.tsx`, including its own real mobile bottom-navigation
 * (`sidebar-mobile-nav`) — there is no separate MobileNavigation component in
 * this app's real shell.
 */
export {
  Sidebar as ApplicationSidebar,
  type SidebarProps as ApplicationSidebarProps,
} from '../../components/Sidebar';
