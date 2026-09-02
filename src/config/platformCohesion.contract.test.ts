import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TOOL_LAUNCH_PATHS } from '../data/clinicalToolIdContract';
import { EMERGENCY_PLATFORM_CONTRACT } from './emergencyPlatform.config';
import { PLATFORM_COHESION_CONTRACT } from './platformCohesionModel';
import { CANONICAL_CONFIGURATION_REGISTRY } from './canonicalConfigurationModel';
import { CANONICAL_ROUTES } from './routes.config';

const repoRoot = join(import.meta.dirname, '../..');

function readSource(relPath: string): string {
  return readFileSync(join(repoRoot, relPath), 'utf8');
}

describe('platform cohesion contract', () => {
  it('registers cohesion engines in the platform contract', () => {
    expect(EMERGENCY_PLATFORM_CONTRACT.securityEngine).toBe('caredroid-security');
    expect(EMERGENCY_PLATFORM_CONTRACT.observabilityEngine).toBe('caredroid-observability');
    expect(PLATFORM_COHESION_CONTRACT.engineId).toBe('caredroid-platform-cohesion');
  });

  it('uses a single CareDroid route guard in router and auth module', () => {
    const router = readSource('src/app/router.tsx');
    expect(router).toContain('CareDroidRouteGuard');
    expect(router).not.toContain('EmergencyRouteGuard');
    expect(router).not.toContain('EmergencyAccessDenied');
  });

  it('mounts in-shell redirects from routes.config instead of inline Navigate tables', () => {
    const router = readSource('src/app/router.tsx');
    expect(router).toContain('IN_SHELL_ROUTE_REDIRECTS.map');
    expect(router).not.toMatch(/path="\/organization"\s+element=\{<Navigate/);
    expect(router).not.toMatch(/path="\/team"\s+element=\{<Navigate/);
  });

  it('routes legacy workflow aliases to the canonical WorkflowBuilder page', () => {
    const router = readSource('src/app/router.tsx');
    expect(router).not.toContain('path="/automation"');
    expect(router).toContain('OUTSIDE_SHELL_ROUTE_REDIRECTS.map');
    const routes = readSource('src/config/routes.config.ts');
    expect(routes).toContain('[CANONICAL_ROUTES.automation, CANONICAL_ROUTES.workflows]');
    expect(routes).toContain('[CANONICAL_ROUTES.documentation, CANONICAL_ROUTES.emergencyDocumentation]');
  });

  it('routes PermissionGate through useSecurityAccess', () => {
    const gate = readSource('src/components/PermissionGate.tsx');
    expect(gate).toContain('useSecurityAccess');
    expect(gate).toContain('can(');
    expect(gate).not.toMatch(/hasPermission\(/);
  });

  it('has fully removed the useRolePermissions compat shim now that every consumer uses useSecurityAccess directly', () => {
    expect(existsSync(join(repoRoot, 'src/hooks/useRolePermissions.ts'))).toBe(false);
  });

  it('keeps UserContext free of inline role-permission maps', () => {
    const userContext = readSource('src/contexts/UserContext.tsx');
    expect(userContext).not.toContain('const RolePermissions');
    expect(userContext).toContain("export { Permission } from '../config/backendPermissionCatalog'");
    expect(userContext).toContain('checkSecurityPermission');
  });

  it('bridges emergency store audit entries through securityAuditService', () => {
    const store = readSource('src/store/emergencyStore.ts');
    expect(store).toContain('ingestEmergencyAuditEntries');
    expect(store).toContain("import('../services/securityAuditService')");
  });

  it('loads route workflow mocks before AppRoutes in the route harness', () => {
    const harness = readSource('src/routing/canonicalRouteTree.testShared.tsx');
    expect(harness.indexOf("import './_routeWorkflowTestMocks'")).toBeGreaterThan(-1);
    expect(harness.indexOf("import './_routeTestMocks'")).toBeLessThan(
      harness.indexOf("import './_routeWorkflowTestMocks'"),
    );
  });

  it('documents security and navigation in the canonical configuration registry', () => {
    const ids = CANONICAL_CONFIGURATION_REGISTRY.map((entry) => entry.id);
    expect(ids).toContain('security-model');
    expect(ids).toContain('security-permission-bridge');
    expect(ids).toContain('unified-navigation');
  });

  it('projects tool launch paths from CANONICAL_ROUTES', () => {
    const contract = readSource('src/data/clinicalToolIdContract.ts');
    expect(contract).toContain("import { CANONICAL_ROUTES } from '../config/routes.config'");
    expect(contract).not.toContain("memory: '/ai-memory'");

    expect(TOOL_LAUNCH_PATHS.memory).toBe(CANONICAL_ROUTES.memory);
    expect(TOOL_LAUNCH_PATHS.fleetCommand).toBe(CANONICAL_ROUTES.fleetCommand);
  });

  it('routes navigation fleet and live-map aliases through routes.config constants', () => {
    const navigation = readSource('src/config/navigation.config.ts');
    expect(navigation).toContain('FLEET_MAP_ROUTE_ALIASES');
    expect(navigation).toContain('LIVE_MAP_ROUTE_ALIASES');
    expect(navigation).not.toContain("legacyPaths: ['/fleet', '/fleet/live-map'");
  });

  it('routes production permission consumers through useSecurityAccess', () => {
    // RoleBasedNav.tsx was removed: it had no importer anywhere, and Sidebar is
    // the navigation the app actually renders. A file that no longer exists
    // cannot be a production permission consumer, and readSource() throws on it.
    for (const relPath of [
      'src/pages/ClinicalAlertsPage.tsx',
      'src/hooks/useAiChiefRouting.ts',
    ]) {
      const source = readSource(relPath);
      expect(source, relPath).toContain('useSecurityAccess');
      expect(source, relPath).not.toContain('useRolePermissions');
    }
  });

  it('imports session security through the security barrel', () => {
    const userContext = readSource('src/contexts/UserContext.tsx');
    expect(userContext).toContain("from '../config/security'");
    expect(userContext).not.toContain("from '../services/securityAccessService'");
  });
});