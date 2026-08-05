import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import {
  ACCOUNT_UTILITY_NAV_ITEMS,
  ADVANCED_SIDEBAR_NAV_ITEMS,
  APP_SHELL_NAV_ITEMS,
  OPERATIONS_SIDEBAR_NAV_ITEMS,
  SOLUTIONS_SIDEBAR_NAV_ITEMS,
} from './navigation.config';

describe('navigation.config duplicate-system-audit: Navigation dual config', () => {
  // "New nav items added only to compat projections" -- docs/duplicate-system-audit.md's
  // stated risk for this finding. APP_SHELL_NAV_ITEMS is a pure .map() over the canonical
  // unified-navigation.config.ts NAVIGATION_ITEMS array and cannot introduce a new id by
  // construction. The remaining hand-authored secondary nav lists in this file (account
  // utility menu, solutions/operations/advanced sidebars) are legitimately separate UI
  // surfaces, not projections of NAVIGATION_ITEMS -- but every one of them must still
  // point its primary `path` at a real CANONICAL_ROUTES entry, never a hand-typed literal
  // that could drift from routes.config.ts. This guards that invariant for good.
  const canonicalPaths = new Set(Object.values(CANONICAL_ROUTES));

  it('APP_SHELL_NAV_ITEMS ids are all sourced from CANONICAL_ROUTES paths', () => {
    for (const item of APP_SHELL_NAV_ITEMS) {
      expect(canonicalPaths, `${item.id} path "${item.path}"`).toContain(item.path);
    }
  });

  it.each([
    ['ACCOUNT_UTILITY_NAV_ITEMS', ACCOUNT_UTILITY_NAV_ITEMS],
    ['SOLUTIONS_SIDEBAR_NAV_ITEMS', SOLUTIONS_SIDEBAR_NAV_ITEMS],
    ['OPERATIONS_SIDEBAR_NAV_ITEMS', OPERATIONS_SIDEBAR_NAV_ITEMS],
    ['ADVANCED_SIDEBAR_NAV_ITEMS', ADVANCED_SIDEBAR_NAV_ITEMS],
  ] as const)('every %s entry primary path resolves to CANONICAL_ROUTES', (name, items) => {
    for (const item of items) {
      expect(canonicalPaths, `${name}.${item.id} path "${item.path}"`).toContain(item.path);
    }
  });
});
