import { describe, expect, it } from 'vitest';
import { PLATFORM_DASHBOARDS } from './platformOperatingSystem';
import { PLATFORM_SYSTEM_CAPABILITIES } from './platformSystems';
import { findBackendRoute } from './backendHttpRouteInventory';
import { getCanonicalToolInventory } from './toolInventory';
import { buildRouteHealthGraph } from '../routing/routeHealth';
import {
  PLATFORM_CAPABILITY_MATRIX_STATUSES,
  formatPlatformCapabilityMatrixDocument,
  getPlatformCapabilityById,
  listMissingPlatformCapabilityTraceability,
  platformCapabilityMatrix,
  platformCapabilityTestFilesExist,
} from './platformCapabilityMatrix';

function endpointParts(apiEndpoint) {
  const [method, ...pathParts] = apiEndpoint.split(' ');
  return { method, path: pathParts.join(' ') };
}

function routePathMatches(routePath, concretePath) {
  if (routePath === concretePath) return true;
  if (routePath.includes('*')) {
    const prefix = routePath.replace(/\/?\*$/, '');
    return concretePath === prefix || concretePath.startsWith(`${prefix}/`);
  }
  if (!routePath.includes(':')) return false;
  const routeParts = routePath.split('/').filter(Boolean);
  const concreteParts = concretePath.split('/').filter(Boolean);
  if (routeParts.length !== concreteParts.length) return false;
  return routeParts.every((part, index) => part.startsWith(':') || part === concreteParts[index]);
}

describe('platform capability matrix', () => {
  const routePaths = buildRouteHealthGraph().routes.map((route) => route.path);
  const inventoryIds = new Set(getCanonicalToolInventory().map((record) => record.id));
  const platformCapabilityIds = new Set(PLATFORM_SYSTEM_CAPABILITIES.map((capability) => capability.id));
  const dashboardIds = new Set(PLATFORM_DASHBOARDS.map((dashboard) => dashboard.id));

  it('keeps every matrix row complete and traceable end-to-end', () => {
    expect(platformCapabilityMatrix.length).toBeGreaterThan(50);
    expect(listMissingPlatformCapabilityTraceability()).toEqual([]);
    expect(platformCapabilityTestFilesExist()).toEqual([]);

    for (const row of platformCapabilityMatrix) {
      expect(Object.values(PLATFORM_CAPABILITY_MATRIX_STATUSES)).toContain(row.status);
      expect(routePaths.some((routePath) => routePathMatches(routePath, row.frontendRoute)), row.id).toBe(
        true
      );
      const { method, path } = endpointParts(row.apiEndpoint);
      expect(findBackendRoute(method, path), `${row.id} ${row.apiEndpoint}`).toBeTruthy();
      expect(
        inventoryIds.has(row.inventoryEntry) ||
          platformCapabilityIds.has(row.inventoryEntry) ||
          dashboardIds.has(row.inventoryEntry) ||
          ['dashboard', 'assistant', 'timeline', 'search', 'notifications', 'workspaces', 'system-health', 'workflow-builder', 'digital-twin'].includes(row.inventoryEntry),
        `${row.id} inventory entry ${row.inventoryEntry}`
      ).toBe(true);
    }
  });

  it('represents every platform dashboard and every platform system capability', () => {
    for (const dashboard of PLATFORM_DASHBOARDS) {
      expect(platformCapabilityMatrix.some((row) => row.id === dashboard.id), dashboard.id).toBe(true);
    }

    for (const capability of PLATFORM_SYSTEM_CAPABILITIES) {
      expect(
        platformCapabilityMatrix.some(
          (row) => row.id === capability.id || row.inventoryEntry === capability.id
        ),
        capability.id
      ).toBe(true);
    }
  });

  it('captures the requested map and telemetry examples', () => {
    expect(getPlatformCapabilityById('hospital-map')).toMatchObject({
      capability: 'Hospital Map',
      frontendRoute: '/hospital-map',
      inventoryEntry: 'hospital-map',
      aiLaunchAlias: 'show map',
      apiEndpoint: 'GET /api/hospital-map/floors',
      status: 'Active',
    });

    expect(getPlatformCapabilityById('medical-iot')).toMatchObject({
      capability: 'Medical IoT',
      frontendRoute: '/medical-iot',
      inventoryEntry: 'medical-iot-dashboard',
      aiLaunchAlias: 'show telemetry',
      backendService: 'TelemetryService',
      apiEndpoint: 'GET /api/telemetry/live',
      status: 'Active',
    });
  });

  it('generates the markdown matrix report from the same source of truth', () => {
    const markdown = formatPlatformCapabilityMatrixDocument();

    expect(markdown).toContain('# Platform Capability Matrix');
    expect(markdown).toContain('| Capability | Frontend Route | Inventory Entry | AI Launch Alias | Backend Service | API Endpoint | Test Coverage | Status |');
    expect(markdown).toContain('| Hospital Map | `/hospital-map` | `hospital-map` | "show map" |');
    expect(markdown).toContain('- Every row has capability, route, inventory entry, AI alias, backend service, endpoint, tests, and status: pass');
  });
});
