import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { PLATFORM_CONSOLE_ROUTE_PATHS, PLATFORM_CONSOLE_ROUTES } from './platformConsoleRoutes';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const routeTreeSource = readFileSync(
  join(__dirname, '../app/platformConsoleRouteTree.tsx'),
  'utf8',
);

describe('platformConsoleRoutes', () => {
  it('covers high-traffic platform operations and SaaS surfaces', () => {
    expect(PLATFORM_CONSOLE_ROUTE_PATHS).toEqual(
      expect.arrayContaining([
        CANONICAL_ROUTES.discover,
        CANONICAL_ROUTES.knowledgeGraph,
        CANONICAL_ROUTES.featureFlags,
        CANONICAL_ROUTES.clinicalDecisionSupport,
        CANONICAL_ROUTES.businessBrain,
      ]),
    );
    expect(PLATFORM_CONSOLE_ROUTE_PATHS).not.toEqual(
      expect.arrayContaining([CANONICAL_ROUTES.hospitalMap, CANONICAL_ROUTES.fleetCommand]),
    );
  });

  it('lists every route with a component key', () => {
    for (const route of PLATFORM_CONSOLE_ROUTES) {
      expect(route.componentKey).toBeTruthy();
      expect(route.path.startsWith('/')).toBe(true);
    }
  });

  it('mounts the platform console route tree inside RootLayout', () => {
    expect(appSource).toContain('{renderPlatformConsoleRoutes(LazyRoute)}');
    expect(routeTreeSource).toContain('CapabilityDiscoveryPage');
    expect(routeTreeSource).toContain('FeatureFlagCenterPage');
    expect(routeTreeSource).not.toContain('HospitalMapDashboardPage');
  });

  it('keeps platform console routes out of explicit router mounts', () => {
    expect(appSource).not.toContain(
      'element={<LazyRoute label="Loading Hospital Map..."><HospitalMapDashboard />',
    );
    expect(appSource).not.toContain(
      'element={<LazyRoute label="Loading capability discovery..."><CapabilityDiscovery />',
    );
    expect(appSource).not.toContain(
      'element={<LazyRoute label="Loading Fleet Command..."><FleetDashboard />',
    );
    expect(appSource).not.toContain('HospitalMapDashboard');
    expect(appSource).not.toContain('CapabilityDiscovery');
  });
});
