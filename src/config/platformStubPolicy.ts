import { PLATFORM_SYSTEM_PACKS } from '../data/platformSystems';
import { isGovernanceWorkspacePath } from './governanceConsoleRoutes';
import { OPERATIONS_FLEET_CONSOLE_ROUTE_PATHS } from './operationsFleetConsoleRoutes';
import { PLATFORM_CONSOLE_ROUTE_PATHS } from './platformConsoleRoutes';
import { TOOLS_AI_PAGE_ROUTES, TOOLS_CONSOLE_ROUTE_PATHS } from './toolsConsoleRoutes';
import { TRAINING_CONSOLE_ROUTE_PATHS } from './trainingConsoleRoutes';

type PlatformCapabilityRoute = {
  route: string;
  pack: string;
  routeAliases?: readonly string[];
};

function matchesConsolePrefix(pathname: string, prefix: string) {
  if (prefix.includes(':')) {
    const base = prefix.split('/:')[0];
    return pathname === base || pathname.startsWith(`${base}/`);
  }

  const normalizedPrefix = prefix.replace(/\/\*$/, '');
  return pathname === normalizedPrefix || pathname.startsWith(`${normalizedPrefix}/`);
}

function hasDedicatedInShellRoute(pathname: string) {
  const normalized =
    String(pathname || '/')
      .split('?')[0]
      .split('#')[0]
      .replace(/\/+$/, '') || '/';

  if (isGovernanceWorkspacePath(normalized)) {
    return true;
  }

  const consolePaths = [
    ...TOOLS_CONSOLE_ROUTE_PATHS,
    ...TOOLS_AI_PAGE_ROUTES.map((route) => route.path),
    ...OPERATIONS_FLEET_CONSOLE_ROUTE_PATHS,
    ...PLATFORM_CONSOLE_ROUTE_PATHS,
    ...TRAINING_CONSOLE_ROUTE_PATHS,
  ];

  return consolePaths.some((prefix) => matchesConsolePrefix(normalized, prefix));
}

/** Suppress PlatformSystemPage stubs when a dedicated in-shell route already exists. */
export function shouldSuppressPlatformSystemStub(capability: PlatformCapabilityRoute) {
  if (capability.route.includes(':')) {
    return false;
  }

  if (capability.pack === PLATFORM_SYSTEM_PACKS.GOVERNANCE) {
    return true;
  }

  const paths = [capability.route, ...(capability.routeAliases || [])];
  return paths.some((path) => hasDedicatedInShellRoute(path));
}
