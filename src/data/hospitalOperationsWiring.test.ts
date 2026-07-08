import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { toolRegistryById } from './toolRegistry';
import {
  CANONICAL_TOOL_GROUPS,
  HOSPITAL_OPERATIONS_REGISTRY_IDS,
  NLU_TO_REGISTRY_ID,
  REGISTRY,
  TOOL_LAUNCH_PATHS,
  resolveCatalogLaunch,
  resolveRegistryId,
} from './clinicalCatalogWiring';
import { CANONICAL_ROUTES, LEGACY_EMERGENCY_ROUTE_REDIRECTS } from '../config/routes.config';
import { getCommandDashboardModel } from './commandDashboardModel';
import { getUserFacingToolRegistryProjection } from './toolInventory';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
// Hospital operations/fleet routes are mounted through a config-driven route
// tree (operationsFleetConsoleRoutes.ts + operationsFleetConsoleRouteTree.tsx),
// not as literal <Route> JSX in router.tsx.
const operationsFleetConsoleRoutesSource = readFileSync(
  join(__dirname, '../config/operationsFleetConsoleRoutes.ts'),
  'utf8',
);
const operationsFleetConsoleRouteTreeSource = readFileSync(
  join(__dirname, '../app/operationsFleetConsoleRouteTree.tsx'),
  'utf8',
);

describe('Hospital operations wiring', () => {
  it('registers canonical hospital operations ids', () => {
    expect(HOSPITAL_OPERATIONS_REGISTRY_IDS).toEqual([
      REGISTRY.digitalOperationsCenter,
      REGISTRY.hospitalMap,
      REGISTRY.deviceFleetManagement,
      REGISTRY.telemetryMonitoring,
      REGISTRY.deviceMaintenance,
      REGISTRY.hospitalOperationsCommand,
      REGISTRY.assetTrackingDashboard,
      REGISTRY.incidentCommandCenter,
      REGISTRY.hospitalOperationsCockpit,
      REGISTRY.deviceBatteryIntelligence,
      REGISTRY.capacityPredictionEngine,
    ]);
    expect(CANONICAL_TOOL_GROUPS.hospitalOperations).toEqual(HOSPITAL_OPERATIONS_REGISTRY_IDS);
  });

  it('mounts hospital operations routes in App and removes legacy whiteboard redirects', () => {
    expect(TOOL_LAUNCH_PATHS.hospitalMap).toBe('/hospital-map');
    expect(TOOL_LAUNCH_PATHS.deviceFleet).toBe('/devices');
    expect(operationsFleetConsoleRoutesSource).toContain('CANONICAL_ROUTES.hospitalMap');
    expect(operationsFleetConsoleRoutesSource).toContain('CANONICAL_ROUTES.devices');
    expect(operationsFleetConsoleRouteTreeSource).toContain('HospitalMapDashboard');
    expect(operationsFleetConsoleRouteTreeSource).toContain('DeviceFleetManagement');
    // /surveillance/nexus now redirects into the whiteboard (CANONICAL_APP_ROUTE_TREE
    // status: 'redirect') rather than mounting a dedicated dashboard component.
    expect(appSource).toContain('renderOperationsFleetConsoleRoutes');

    const redirectsByPath = Object.fromEntries(
      LEGACY_EMERGENCY_ROUTE_REDIRECTS.map((redirect) => [redirect.path, redirect.to])
    );
    expect(redirectsByPath['/hospital-map']).toBeUndefined();
    expect(redirectsByPath['/devices']).toBeUndefined();
    expect(redirectsByPath['/medical-iot']).toBeUndefined();
    expect(redirectsByPath['/operations/*']).toBeUndefined();
  });

  it('keeps registry rows and catalog launches aligned', () => {
    for (const id of HOSPITAL_OPERATIONS_REGISTRY_IDS) {
      const reg = toolRegistryById[id];
      expect(['/operations', '/hospital-map', '/medical-iot', '/devices']).toContain(reg?.path);
      expect(['Hospital Operations', 'IoT']).toContain(reg?.category);

      const launch = resolveCatalogLaunch(id);
      expect(['/operations', '/hospital-map', '/medical-iot', '/devices']).toContain(launch.path);
      expect(launch.registryId, id).toBe(id);
    }
  });

  it('resolves hospital operations aliases', () => {
    expect(NLU_TO_REGISTRY_ID['hospital map']).toBe(REGISTRY.hospitalMap);
    expect(resolveRegistryId('show-hospital-map')).toBe(REGISTRY.hospitalMap);
    expect(resolveRegistryId('show hospital map')).toBe(REGISTRY.hospitalMap);
    expect(resolveRegistryId('open medical iot dashboard')).toBe(REGISTRY.medicalIotDashboard);
    expect(resolveRegistryId('hospital-map')).toBe(REGISTRY.hospitalMap);
    expect(resolveRegistryId('device-fleet-management')).toBe(REGISTRY.deviceFleetManagement);
    expect(resolveCatalogLaunch('open device fleet').path).toBe('/devices');
    expect(resolveRegistryId('telemetry-gaps')).toBe(REGISTRY.telemetryMonitoring);
    expect(resolveRegistryId('maintenance-overdue')).toBe(REGISTRY.deviceMaintenance);
    expect(resolveRegistryId('asset-tracking-dashboard')).toBe(REGISTRY.assetTrackingDashboard);
    expect(resolveRegistryId('capacity-prediction-engine')).toBe(REGISTRY.capacityPredictionEngine);
  });

  it('surfaces Hospital Map in user-facing tools and the command dashboard', () => {
    const tools = getUserFacingToolRegistryProjection();
    const hospitalMap = tools.find((tool) => tool.id === REGISTRY.hospitalMap);
    expect(hospitalMap).toMatchObject({
      path: '/hospital-map',
      category: 'Hospital Operations',
      launchType: 'hospital-local',
      surface: 'hospital-operations',
    });

    const dashboard = getCommandDashboardModel();
    expect(dashboard.panels.fleetOperations.map((tool) => tool.id)).toContain(REGISTRY.hospitalMap);
    expect(dashboard.panels.medicalIot.map((tool) => tool.id)).toContain(REGISTRY.telemetryMonitoring);
  });
});
