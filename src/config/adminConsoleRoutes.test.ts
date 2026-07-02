import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import {
  ADMIN_CONSOLE_CHILD_ROUTES,
  ADMIN_CONSOLE_REDIRECT_ROUTES,
  ADMIN_CONSOLE_ROUTE_PATHS,
} from './adminConsoleRoutes';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const routeTreeSource = readFileSync(join(__dirname, '../app/adminConsoleRouteTree.tsx'), 'utf8');

describe('adminConsoleRoutes', () => {
  it('covers nested admin child routes', () => {
    expect(ADMIN_CONSOLE_ROUTE_PATHS).toEqual(
      expect.arrayContaining([
        CANONICAL_ROUTES.adminOperations,
        `${CANONICAL_ROUTES.adminOperations}/team`,
        `${CANONICAL_ROUTES.adminOperations}/tenant`,
        `${CANONICAL_ROUTES.adminOperations}/system-health`,
      ]),
    );
  });

  it('lists every child route with a component key', () => {
    for (const route of ADMIN_CONSOLE_CHILD_ROUTES) {
      expect(route.componentKey).toBeTruthy();
    }
  });

  it('preserves tenant admin redirect', () => {
    expect(ADMIN_CONSOLE_REDIRECT_ROUTES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: CANONICAL_ROUTES.tenantAdmin,
          to: `${CANONICAL_ROUTES.adminOperations}/tenant`,
        }),
      ]),
    );
  });

  it('mounts the admin console route tree inside RootLayout', () => {
    expect(appSource).toContain('{renderAdminConsoleRoutes(LazyRoute)}');
    expect(routeTreeSource).toContain('AdminOperationsShell');
    expect(routeTreeSource).toContain('CareDroidRouteGuard');
    expect(appSource).not.toContain('AdminOperationsHome');
    expect(appSource).not.toContain('EdStaffWorkflowAdmin');
  });
});