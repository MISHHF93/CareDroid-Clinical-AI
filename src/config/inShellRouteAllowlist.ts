import { CANONICAL_ROUTES, IN_SHELL_ROUTE_REDIRECTS } from './routes.config';
import { isGovernanceWorkspacePath } from './governanceConsoleRoutes';
import { ADMIN_CONSOLE_ROUTE_PATHS } from './adminConsoleRoutes';
import { OPERATIONS_FLEET_CONSOLE_ROUTE_PATHS } from './operationsFleetConsoleRoutes';
import { PLATFORM_CONSOLE_ROUTE_PATHS } from './platformConsoleRoutes';
import { PROFILE_CONSOLE_ROUTE_PATHS } from './profileConsoleRoutes';
import { TOOLS_CONSOLE_ROUTE_PATHS } from './toolsConsoleRoutes';
import { TRAINING_CONSOLE_ROUTE_PATHS } from './trainingConsoleRoutes';

const PLATFORM_ENTRY_ROUTE_PREFIXES = Object.freeze([
  CANONICAL_ROUTES.platformStart,
  CANONICAL_ROUTES.workspace,
  // HEAL-347.80: plural /workspaces was already treated as an active-path
  // alias of the Platform nav item (unified-navigation.config.ts) and has
  // its own dedicated AppShell title/subtitle, but had no <Route> at all --
  // it silently bounced to EmergencyDefaultRedirect instead. Now mounted
  // alongside singular /workspace in router.tsx; listed here so it isn't
  // shadowed by ED_EXTENSION_ROUTE_REDIRECTS' generic fallback the same way
  // /customer-portal was.
  CANONICAL_ROUTES.workspaces,
  CANONICAL_ROUTES.integrationHub,
]);

function matchesPrefix(pathname: string, prefix: string) {
  if (prefix.includes(':')) {
    const base = prefix.split('/:')[0];
    return pathname === base || pathname.startsWith(`${base}/`);
  }

  const normalizedPrefix = prefix.replace(/\/\*$/, '');
  return pathname === normalizedPrefix || pathname.startsWith(`${normalizedPrefix}/`);
}

/** True when the path should mount a real in-shell page instead of folding into ED redirects. */
export function isInShellRoute(pathname = '') {
  const normalized = String(pathname || '/').split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';

  // HEAL-347.79: an exact-path entry in IN_SHELL_ROUTE_REDIRECTS (e.g.
  // /customer-portal -> /admin/tenant) is a real, intentional alias, but
  // this function previously only recognized DIRECTLY-mounted console page
  // prefixes below -- an alias whose own path also happened to match an
  // ED_EXTENSION_ROUTE_REDIRECTS prefix (edApplication.config.ts) was
  // silently and permanently shadowed, since resolveEdExtensionRedirect()
  // only skips paths this function says are "in shell". Proven live: every
  // role hitting /customer-portal landed on /emergency/settings, the
  // IN_SHELL_ROUTE_REDIRECTS alias never getting a chance to fire. Checking
  // the redirect table's own registered paths here closes the gap
  // structurally, so a future alias addition doesn't need a matching manual
  // scrub of ED_EXTENSION_ROUTE_REDIRECTS to avoid the same shadowing.
  if (IN_SHELL_ROUTE_REDIRECTS.some((entry) => matchesPrefix(normalized, entry.path))) {
    return true;
  }

  if (isGovernanceWorkspacePath(normalized)) {
    return true;
  }

  if (TOOLS_CONSOLE_ROUTE_PATHS.some((prefix) => matchesPrefix(normalized, prefix))) {
    return true;
  }

  if (OPERATIONS_FLEET_CONSOLE_ROUTE_PATHS.some((prefix) => matchesPrefix(normalized, prefix))) {
    return true;
  }

  if (PLATFORM_CONSOLE_ROUTE_PATHS.some((prefix) => matchesPrefix(normalized, prefix))) {
    return true;
  }

  if (TRAINING_CONSOLE_ROUTE_PATHS.some((prefix) => matchesPrefix(normalized, prefix))) {
    return true;
  }

  if (PROFILE_CONSOLE_ROUTE_PATHS.some((prefix) => matchesPrefix(normalized, prefix))) {
    return true;
  }

  if (ADMIN_CONSOLE_ROUTE_PATHS.some((prefix) => matchesPrefix(normalized, prefix))) {
    return true;
  }

  return PLATFORM_ENTRY_ROUTE_PREFIXES.some((prefix) => matchesPrefix(normalized, prefix));
}