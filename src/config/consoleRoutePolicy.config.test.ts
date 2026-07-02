import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { CONSOLE_ROUTE_POLICIES, shouldFoldIntoToolsConsole } from './consoleRoutePolicy.config';

describe('consoleRoutePolicy.config', () => {
  it('keeps fleet and operations paths off the tools redirect fold', () => {
    expect(shouldFoldIntoToolsConsole(CANONICAL_ROUTES.fleetCommand)).toBe(false);
    expect(shouldFoldIntoToolsConsole('/fleet/live-map')).toBe(false);
    expect(shouldFoldIntoToolsConsole(CANONICAL_ROUTES.hospitalMap)).toBe(false);
  });

  it('folds legacy clinical tool shortcuts into tools console', () => {
    expect(shouldFoldIntoToolsConsole('/calculators/sofa')).toBe(true);
    expect(shouldFoldIntoToolsConsole('/pharmacy/check')).toBe(true);
  });

  it('declares mounted console families', () => {
    const ids = CONSOLE_ROUTE_POLICIES.map((policy) => policy.id);
    expect(ids).toEqual(
      expect.arrayContaining(['operations-fleet', 'platform-intelligence', 'governance', 'clinical-tools']),
    );
  });
});