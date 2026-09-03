import { describe, expect, it } from 'vitest';
import {
  CANONICAL_ROUTES,
  ED_CANONICAL_ROUTE_ALIASES,
  LEGACY_EMERGENCY_ROUTE_REDIRECTS,
  OUTSIDE_SHELL_ROUTE_REDIRECTS,
} from './routes.config';

describe('edRouteAliasRegistry', () => {
  it('maps short ED bookmarks to canonical emergency paths only once each', () => {
    const paths = ED_CANONICAL_ROUTE_ALIASES.map((entry) => entry.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(ED_CANONICAL_ROUTE_ALIASES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '/intake', to: CANONICAL_ROUTES.emergencyIntake }),
        expect.objectContaining({ path: '/analytics', to: CANONICAL_ROUTES.emergencyAnalytics }),
      ]),
    );
  });

  it('folds legacy journey bookmarks into command center', () => {
    expect(LEGACY_EMERGENCY_ROUTE_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: CANONICAL_ROUTES.emergencyJourney,
          to: CANONICAL_ROUTES.emergencyCommandCenter,
        }),
      ]),
    );
  });

  it('folds retired standalone dashboards into ED OS surfaces', () => {
    expect(OUTSIDE_SHELL_ROUTE_REDIRECTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: CANONICAL_ROUTES.dashboard,
          to: CANONICAL_ROUTES.emergencyCommandCenter,
        }),
      ]),
    );
    expect(OUTSIDE_SHELL_ROUTE_REDIRECTS.map((entry) => entry.path)).not.toContain(
      CANONICAL_ROUTES.aiCommandCenter,
    );
    expect(OUTSIDE_SHELL_ROUTE_REDIRECTS.map((entry) => entry.path)).not.toContain(
      CANONICAL_ROUTES.executive,
    );
  });
});
