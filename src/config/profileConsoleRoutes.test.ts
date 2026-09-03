import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import {
  PROFILE_CONSOLE_REDIRECT_ROUTES,
  PROFILE_CONSOLE_ROUTE_PATHS,
  PROFILE_CONSOLE_ROUTES,
} from './profileConsoleRoutes';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(__dirname, '../app/router.tsx'), 'utf8');
const routeTreeSource = readFileSync(join(__dirname, '../app/profileConsoleRouteTree.tsx'), 'utf8');

describe('profileConsoleRoutes', () => {
  it('covers profile, notification, and billing surfaces', () => {
    expect(PROFILE_CONSOLE_ROUTE_PATHS).toEqual(
      expect.arrayContaining([
        CANONICAL_ROUTES.profile,
        CANONICAL_ROUTES.profileSettings,
        CANONICAL_ROUTES.profileToolPreferences,
        '/profile/security',
        '/notification-preferences',
        CANONICAL_ROUTES.billing,
        CANONICAL_ROUTES.usage,
      ]),
    );
  });

  it('lists every route with a component key', () => {
    for (const route of PROFILE_CONSOLE_ROUTES) {
      expect(route.componentKey).toBeTruthy();
    }
  });

  it('preserves profile notification redirects', () => {
    expect(PROFILE_CONSOLE_REDIRECT_ROUTES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/profile-settings',
          to: CANONICAL_ROUTES.profileSettings,
        }),
        expect.objectContaining({
          path: CANONICAL_ROUTES.notifications,
          to: '/notification-preferences',
        }),
      ]),
    );
  });

  it('mounts the profile console route tree inside RootLayout', () => {
    expect(appSource).toContain('{renderProfileConsoleRoutes(LazyRoute)}');
    expect(routeTreeSource).toContain('ProfilePage');
    expect(routeTreeSource).toContain('BillingPage');
    expect(appSource).not.toContain('element={<LazyRoute label="Loading profile..."><Profile />');
    expect(appSource).not.toContain('ProfileSettings');
  });
});
