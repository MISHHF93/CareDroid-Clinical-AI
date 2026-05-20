/**
 * No orphaned backend functionality — controllers, inventory, policy, executors.
 */

import { describe, it, expect } from 'vitest';
import { assertNoOrphanedBackendFunctionality, formatOrphanedBackendFunctionsMarkdown } from './backendOrphanAudit';
import {
  getBackendOnlyRoutes,
  getBackendRouteExposureGaps,
  BACKEND_ROUTE_EXPOSURE_POLICY,
} from './backendRouteExposurePolicy';
import { compareControllerScanToInventory, scanNestControllerRoutes } from './backendControllerRouteScan';
import { BACKEND_HTTP_ROUTES } from './backendHttpRouteInventory';
import { FRONTEND_API_CALLS } from './frontendApiCallsInventory';
import { assertExposureScanPasses } from './backendFrontendExposure';

describe('backend orphan audit', () => {
  it('passes full orphan assertion (inventory ↔ controllers ↔ policy ↔ frontend)', () => {
    const { ok, errors } = assertNoOrphanedBackendFunctionality();
    expect(errors, errors.join('; ')).toEqual([]);
    expect(ok).toBe(true);
  });

  it('controller scan matches BACKEND_HTTP_ROUTES inventory', () => {
    const { missingInInventory, missingInControllers } = compareControllerScanToInventory();
    expect(missingInInventory, JSON.stringify(missingInInventory, null, 2)).toEqual([]);
    expect(missingInControllers, JSON.stringify(missingInControllers, null, 2)).toEqual([]);
  });

  it('documents every backend-only route in BACKEND_ROUTE_EXPOSURE_POLICY', () => {
    const backendOnly = getBackendOnlyRoutes();
    const gaps = getBackendRouteExposureGaps().filter((g) => g.issue === 'missing-policy');
    expect(gaps, gaps.map((g) => g.key).join(', ')).toEqual([]);
    expect(Object.keys(BACKEND_ROUTE_EXPOSURE_POLICY).length).toBe(backendOnly.length);
  });

  it('scans at least as many controller routes as inventory entries', () => {
    const scanned = scanNestControllerRoutes();
    expect(scanned.length).toBeGreaterThanOrEqual(BACKEND_HTTP_ROUTES.length);
  });

  it('exposure scan and orphan audit agree on zero unguarded calls', () => {
    const exposure = assertExposureScanPasses();
    const orphan = assertNoOrphanedBackendFunctionality();
    expect(exposure.ok).toBe(true);
    expect(orphan.ok).toBe(true);
  });

  it('orphaned-backend-functions markdown generator is non-empty', () => {
    const md = formatOrphanedBackendFunctionsMarkdown();
    expect(md).toContain('## A. Backend-only');
    expect(md).toContain('## D. Frontend calls without backend');
    expect(md.length).toBeGreaterThan(500);
  });

  it('frontend gated calls each declare a capability gate', () => {
    const gated = FRONTEND_API_CALLS.filter((c) => c.capability);
    expect(gated.length).toBeGreaterThan(10);
  });
});
