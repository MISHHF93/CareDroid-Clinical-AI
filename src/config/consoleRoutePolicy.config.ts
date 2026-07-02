/**
 * Extension console routing policy — which URL families mount dedicated pages vs fold into tools.
 */
import { CANONICAL_ROUTES } from './routes.config';
import { OPERATIONS_FLEET_CONSOLE_ROUTE_PATHS } from './operationsFleetConsoleRoutes';
import { PLATFORM_CONSOLE_ROUTE_PATHS } from './platformConsoleRoutes';
import { GOVERNANCE_WORKSPACE_ROUTES } from './governanceConsoleRoutes';

export type ConsoleRoutePolicy = Readonly<{
  id: string;
  label: string;
  /** Paths that render a dedicated mounted page (not ToolsRedirect). */
  mountedPrefixes: readonly string[];
  /** Paths that intentionally fold into /emergency/tools with query hints. */
  toolsRedirectPrefixes: readonly string[];
}>;

export const CONSOLE_ROUTE_POLICIES: readonly ConsoleRoutePolicy[] = Object.freeze([
  Object.freeze({
    id: 'operations-fleet',
    label: 'Operations & fleet',
    mountedPrefixes: OPERATIONS_FLEET_CONSOLE_ROUTE_PATHS,
    toolsRedirectPrefixes: [],
  }),
  Object.freeze({
    id: 'platform-intelligence',
    label: 'Platform intelligence',
    mountedPrefixes: PLATFORM_CONSOLE_ROUTE_PATHS,
    toolsRedirectPrefixes: [],
  }),
  Object.freeze({
    id: 'governance',
    label: 'Governance & compliance',
    mountedPrefixes: GOVERNANCE_WORKSPACE_ROUTES.map((route) => route.path),
    toolsRedirectPrefixes: [],
  }),
  Object.freeze({
    id: 'clinical-tools',
    label: 'Clinical tools shortcuts',
    mountedPrefixes: [CANONICAL_ROUTES.emergencyTools],
    toolsRedirectPrefixes: [
      '/tools',
      '/calculators',
      '/scores',
      '/pharmacy',
      '/radiology',
      '/knowledge-base',
      '/search',
      '/automation',
      '/digital-twin',
    ],
  }),
]);

export function shouldFoldIntoToolsConsole(pathname: string): boolean {
  const normalized = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  if (OPERATIONS_FLEET_CONSOLE_ROUTE_PATHS.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) {
    return false;
  }
  const toolsPolicy = CONSOLE_ROUTE_POLICIES.find((policy) => policy.id === 'clinical-tools');
  return (toolsPolicy?.toolsRedirectPrefixes || []).some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}