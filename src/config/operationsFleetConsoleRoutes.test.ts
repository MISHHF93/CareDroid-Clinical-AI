import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TOOL_LAUNCH_PATHS } from '../data/clinicalToolIdContract';
import { CANONICAL_ROUTES } from './routes.config';
import {
  OPERATIONS_FLEET_CONSOLE_ROUTE_PATHS,
  OPERATIONS_FLEET_CONSOLE_ROUTES,
} from './operationsFleetConsoleRoutes';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const routeTreeSource = readFileSync(join(__dirname, '../app/operationsFleetConsoleRouteTree.tsx'), 'utf8');
const toolsConfigSource = readFileSync(join(__dirname, './toolsConsoleRoutes.ts'), 'utf8');

describe('operationsFleetConsoleRoutes', () => {
  it('covers operations hub, hospital IoT, and fleet command surfaces', () => {
    expect(OPERATIONS_FLEET_CONSOLE_ROUTE_PATHS).toEqual(
      expect.arrayContaining([
        CANONICAL_ROUTES.operations,
        CANONICAL_ROUTES.hospitalMap,
        CANONICAL_ROUTES.medicalIot,
        CANONICAL_ROUTES.devices,
        CANONICAL_ROUTES.fleetCommand,
        CANONICAL_ROUTES.fleetMap,
        '/fleet/route-optimizer',
        TOOL_LAUNCH_PATHS.liveTrackingMap,
        '/maps',
      ]),
    );
  });

  it('lists every route with a component key', () => {
    for (const route of OPERATIONS_FLEET_CONSOLE_ROUTES) {
      expect(route.componentKey).toBeTruthy();
    }
  });

  it('mounts the operations fleet route tree inside RootLayout', () => {
    expect(appSource).toContain('{renderOperationsFleetConsoleRoutes(LazyRoute)}');
    expect(routeTreeSource).toContain('OperationsHubPage');
    expect(routeTreeSource).toContain('HospitalMapDashboardPage');
    expect(routeTreeSource).toContain('FleetDashboardPage');
  });

  it('keeps operations fleet routes out of explicit router and tools shortcuts', () => {
    expect(appSource).not.toContain('element={<LazyRoute label="Loading Hospital Map..."><HospitalMapDashboard />');
    expect(appSource).not.toContain('element={<LazyRoute label="Loading Fleet Command..."><FleetDashboard />');
    expect(appSource).not.toContain('HospitalMapDashboard');
    expect(toolsConfigSource).not.toContain("path: TOOL_LAUNCH_PATHS.operationsCenter");
    expect(toolsConfigSource).not.toContain("path: '/fleet/route-optimizer'");
    expect(toolsConfigSource).not.toContain("path: '/maps'");
  });
});