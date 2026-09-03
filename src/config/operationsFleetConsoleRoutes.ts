import { CANONICAL_ROUTES } from './routes.config';
import { TOOL_LAUNCH_PATHS } from '../data/clinicalToolIdContract';

export type OperationsFleetConsoleRoute = {
  path: string;
  label: string;
  componentKey: string;
};

function operationsRoutes(
  path: string,
  label: string,
  componentKey: string,
  options?: { wildcard?: boolean },
): OperationsFleetConsoleRoute[] {
  const routes: OperationsFleetConsoleRoute[] = [{ path, label, componentKey }];
  if (options?.wildcard) {
    routes.push({ path: `${path}/*`, label, componentKey });
  }
  return routes;
}

/** Operations hub, hospital IoT surfaces, and fleet command pages. */
export const OPERATIONS_FLEET_CONSOLE_ROUTES = Object.freeze<OperationsFleetConsoleRoute[]>([
  { path: CANONICAL_ROUTES.operations, label: 'Operations Hub', componentKey: 'operationsHub' },
  ...operationsRoutes(CANONICAL_ROUTES.hospitalMap, 'Hospital Map', 'hospitalMap', {
    wildcard: true,
  }),
  ...operationsRoutes(CANONICAL_ROUTES.medicalIot, 'Medical IoT', 'medicalIot', { wildcard: true }),
  ...operationsRoutes(CANONICAL_ROUTES.devices, 'Device Fleet', 'deviceFleet', { wildcard: true }),
  { path: '/fleet/route-optimizer', label: 'Route Optimization', componentKey: 'routeOptimizer' },
  {
    path: '/fleet/predictive-maintenance',
    label: 'Predictive Maintenance',
    componentKey: 'predictiveMaintenance',
  },
  { path: CANONICAL_ROUTES.fleetCommand, label: 'Fleet Command', componentKey: 'fleetDashboard' },
  { path: CANONICAL_ROUTES.fleetMap, label: 'Fleet Live Map', componentKey: 'fleetLiveMap' },
  { path: '/fleet/live-map', label: 'Fleet Live Map', componentKey: 'fleetLiveMap' },
  {
    path: TOOL_LAUNCH_PATHS.liveTrackingMap,
    label: 'Live Tracking Map',
    componentKey: 'liveTrackingMap',
  },
  { path: '/maps', label: 'Live Tracking Map', componentKey: 'liveTrackingMap' },
  { path: '/tracking', label: 'Live Tracking Map', componentKey: 'liveTrackingMap' },
  { path: '/live-tracking', label: 'Live Tracking Map', componentKey: 'liveTrackingMap' },
  { path: '/fleet/*', label: 'Fleet Command', componentKey: 'fleetDashboard' },
]);

export const OPERATIONS_FLEET_CONSOLE_ROUTE_PATHS = Object.freeze(
  OPERATIONS_FLEET_CONSOLE_ROUTES.map((route) => route.path),
);
