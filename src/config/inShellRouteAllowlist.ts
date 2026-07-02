import { CANONICAL_ROUTES } from './routes.config';
import { isGovernanceWorkspacePath } from './governanceConsoleRoutes';
import { ADMIN_CONSOLE_ROUTE_PATHS } from './adminConsoleRoutes';
import { OPERATIONS_FLEET_CONSOLE_ROUTE_PATHS } from './operationsFleetConsoleRoutes';
import { PLATFORM_CONSOLE_ROUTE_PATHS } from './platformConsoleRoutes';
import { PROFILE_CONSOLE_ROUTE_PATHS } from './profileConsoleRoutes';
import { TOOLS_CONSOLE_ROUTE_PATHS } from './toolsConsoleRoutes';
import { TRAINING_CONSOLE_ROUTE_PATHS } from './trainingConsoleRoutes';

const PLATFORM_ENTRY_ROUTE_PREFIXES = Object.freeze([
  CANONICAL_ROUTES.workspace,
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