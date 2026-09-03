import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import {
  GOVERNANCE_CONSOLE_ROUTE_PATHS,
  GOVERNANCE_WORKSPACE_ROUTES,
  isGovernanceWorkspacePath,
} from './governanceConsoleRoutes';
import { shouldSuppressPlatformSystemStub } from './platformStubPolicy';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const routeTreeSource = readFileSync(
  join(__dirname, '../app/governanceConsoleRouteTree.tsx'),
  'utf8',
);

describe('governanceConsoleRoutes', () => {
  it('covers high-traffic governance and P0 platform paths', () => {
    expect(GOVERNANCE_CONSOLE_ROUTE_PATHS).toEqual(
      expect.arrayContaining([
        CANONICAL_ROUTES.audit,
        CANONICAL_ROUTES.security,
        CANONICAL_ROUTES.aiGovernance,
        CANONICAL_ROUTES.humanReview,
        CANONICAL_ROUTES.systemHealth,
        '/governance/*',
        '/operations/observability',
        '/integrations',
        '/governance',
      ]),
    );
  });

  it('guards audit routes behind CareDroidRouteGuard', () => {
    expect(
      GOVERNANCE_WORKSPACE_ROUTES.filter((route) => route.guarded).map((route) => route.path),
    ).toEqual(expect.arrayContaining([CANONICAL_ROUTES.audit, '/audit/*']));
  });

  it('recognizes governance workspace prefixes', () => {
    expect(isGovernanceWorkspacePath('/ai-governance')).toBe(true);
    expect(isGovernanceWorkspacePath('/governance')).toBe(true);
    expect(isGovernanceWorkspacePath('/governance/clinical')).toBe(true);
    expect(isGovernanceWorkspacePath('/integrations/fhir')).toBe(true);
    expect(isGovernanceWorkspacePath('/integrations/hub')).toBe(false);
    expect(isGovernanceWorkspacePath('/system-health')).toBe(true);
    expect(isGovernanceWorkspacePath('/emergency/tools')).toBe(false);
  });

  it('re-exports platform stub suppression policy', () => {
    expect(
      shouldSuppressPlatformSystemStub({
        route: '/governance/clinical',
        pack: 'Governance',
      }),
    ).toBe(true);
  });

  it('mounts the governance console route tree inside RootLayout', () => {
    expect(appSource).toContain('{renderGovernanceConsoleRoutes(LazyRoute)}');
    expect(routeTreeSource).toContain('PlatformGovernanceWorkspacePage');
    expect(routeTreeSource).toContain('CareDroidRouteGuard');
  });

  it('keeps governance workspace routes out of explicit router mounts', () => {
    expect(appSource).not.toContain('path={CANONICAL_ROUTES.audit}');
    expect(appSource).not.toContain('path={CANONICAL_ROUTES.security}');
    expect(appSource).not.toContain('path={CANONICAL_ROUTES.aiGovernance}');
    expect(appSource).not.toContain(
      'element={<LazyRoute label="Loading governance workspace..."><PlatformGovernanceWorkspace />',
    );
    expect(appSource).toContain('shouldSuppressPlatformSystemStub');
  });

  it('keeps the integration hub on its dedicated page', () => {
    expect(appSource).toContain('path={CANONICAL_ROUTES.integrationHub}');
    expect(appSource).toContain('IntegrationHubPage');
  });
});
