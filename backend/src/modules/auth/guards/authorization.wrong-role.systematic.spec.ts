import { EmergencyOsController } from '../../emergency-os/emergency-os.controller';
import { Permission } from '../enums/permission.enum';
import {
  assertOnlySoleGrantedPermissionPasses,
  getControllerRouteHandlers,
  routeMetadata,
} from './authorization.wrong-role.test-utils';

/**
 * Closes a real, previously-undemonstrated gap: independent research (2026-08-16)
 * found that every existing "RBAC test" in this backend either (a) stubs
 * AuthorizationGuard/AuthGuard to always return true (emergency-os.controller.spec.ts
 * and friends -- so authorization is never actually exercised), or (b) only asserts
 * that a @RequirePermission decorator's metadata is PRESENT (the Cycle 238/239
 * authorization spec files), never that a real wrong-role request is actually
 * REJECTED at runtime. `grep -r "expect(403)\|Forbidden" backend/test` -- zero
 * matches for the real NestJS AuthorizationGuard pipeline. This is the one layer
 * of defense on the highest-route-count, most PHI-sensitive controller
 * (EmergencyOsController, 72 @RequirePermission-decorated methods) that had never
 * been exercised end-to-end, despite this exact bug class (a route silently
 * missing its permission decorator, or a fail-open gap) recurring at least 3 times
 * in this codebase's own history (HEAL-059/060; the Cycle 238/239 47-undecorated-
 * routes finding).
 *
 * Uses the REAL AuthorizationGuard.canActivate() and the REAL role-permission
 * config (hasPermissionWithHierarchy/hasSaasProfilePermission) -- not mocked --
 * against every real decorated method on EmergencyOsController, driven by a
 * READ_ONLY_VIEWER-shaped user (READ_PHI only, no roleProfileId). For any route
 * requiring more than bare READ_PHI, this role must be rejected; this test proves
 * it actually is, for all 72 routes at once, rather than assuming the decorator
 * alone is sufficient. First run of this exact check found and closed HEAL-284
 * (a real privilege-escalation bug in hasSaasProfilePermission's null handling).
 */
describe('AuthorizationGuard wrong-role systematic check -- EmergencyOsController', () => {
  const allHandlers = getControllerRouteHandlers(EmergencyOsController);

  it('sanity: found real decorated route handlers to check (not an empty/broken scan)', () => {
    const decorated = allHandlers.filter((h) => {
      const meta = routeMetadata(h.handler, EmergencyOsController);
      return !meta.isPublic && (meta.required.length || meta.anyOf.length);
    });
    expect(decorated.length).toBeGreaterThanOrEqual(60);
  });

  it('READ_ONLY_VIEWER (READ_PHI only) is rejected by every route requiring more than READ_PHI', async () => {
    const results = await assertOnlySoleGrantedPermissionPasses(EmergencyOsController, Permission.READ_PHI);
    const failures = results.filter((r) => !r.ok);
    // Jest's toEqual([]) already prints the full diff on mismatch, including
    // every failing route's name + detail -- no separate message argument needed.
    expect(failures).toEqual([]);
  });
});
