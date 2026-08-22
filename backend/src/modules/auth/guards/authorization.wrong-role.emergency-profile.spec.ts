import { EmergencyOsController } from '../../emergency-os/emergency-os.controller';
import { EMERGENCY_ROLE_PERMISSION_OVERRIDES } from '../config/jwt-claims.util';
import {
  getControllerRouteHandlers,
  routeMetadata,
  testAuthorizationGuard,
} from './authorization.wrong-role.test-utils';

// Matches the established (pre-existing, same-violation) pattern in
// authorization.wrong-role.test-utils.ts's own getControllerRouteHandlers/
// buildContext; a narrower signature rejects real handler references like
// EmergencyOsController.prototype.patchPatient due to parameter contravariance.
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function buildContext(handler: Function, user: unknown) {
  return {
    getHandler: () => handler,
    getClass: () => EmergencyOsController,
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        method: 'PATCH',
        url: '/test',
        ip: '127.0.0.1',
        connection: {},
        headers: {},
      }),
    }),
  } as any;
}

/**
 * Asserts, for every real decorated route handler on EmergencyOsController,
 * that a user with roleProfileId `profileId` (and the given base `role`) is
 * granted access only for routes satisfiable by exactly the permission set
 * in EMERGENCY_ROLE_PERMISSION_OVERRIDES[profileId] -- not the base role's
 * full permission set. Generalizes authorization.wrong-role.test-utils.ts's
 * assertOnlySoleGrantedPermissionPasses (which only handles a role with ONE
 * meaningful permission) to a role with a real multi-permission override.
 */
async function assertOverridePermissionsExactlyGate(role: string, profileId: string) {
  const granted = new Set(EMERGENCY_ROLE_PERMISSION_OVERRIDES[profileId as never] ?? []);
  const user = { id: `test-${profileId}`, role, profile: { roleProfileId: profileId } };
  const handlers = getControllerRouteHandlers(EmergencyOsController);
  const failures: Array<{ name: string; detail: string }> = [];

  for (const { name, handler } of handlers) {
    const meta = routeMetadata(handler, EmergencyOsController);
    if (meta.isPublic) continue;
    if (meta.required.length === 0 && meta.anyOf.length === 0) continue;

    const shouldPass =
      (meta.required.length > 0 && meta.required.every((p) => granted.has(p))) ||
      (meta.anyOf.length > 0 && meta.anyOf.some((p) => granted.has(p)));

    const context = buildContext(handler, user);
    let actuallyGranted = false;
    try {
      actuallyGranted = await testAuthorizationGuard.canActivate(context);
    } catch {
      actuallyGranted = false;
    }

    if (actuallyGranted !== shouldPass) {
      failures.push({
        name,
        detail: `required=${JSON.stringify(meta.required.length ? meta.required : meta.anyOf)} expected ${shouldPass ? 'grant' : 'reject'} but guard ${actuallyGranted ? 'granted' : 'rejected'}`,
      });
    }
  }

  return failures;
}

/**
 * P0 regression guard. The existing systematic harness
 * (authorization.wrong-role.systematic.spec.ts, the one that found/closed
 * HEAL-284) only ever drove the guard with a READ_ONLY_VIEWER shape (no
 * roleProfileId) -- it never exercised the roleProfileId-based restriction
 * path at all, which is exactly the gap that let it_admin/ed_manager (both
 * persisted as UserRole.ADMIN on the user record -- see
 * EMERGENCY_ROLE_TO_USER_ROLE in jwt-claims.util.ts) silently inherit
 * ADMIN's full READ/WRITE/EXPORT/DELETE PHI via
 * hasPermissionWithHierarchy(UserRole.ADMIN, ...), regardless of what
 * hasSaasProfilePermission(roleProfileId, ...) said, because the two were
 * OR-combined (OR can only add permissions, never restrict them).
 *
 * Root-cause fix: AuthorizationGuard now checks EMERGENCY_ROLE_PERMISSION_OVERRIDES
 * for these two roleProfileId values and, when present, REPLACES (not ORs)
 * the base-role grant. These tests drive the REAL guard against all real
 * @RequirePermission-decorated EmergencyOsController routes.
 */
describe('AuthorizationGuard wrong-role systematic check -- it_admin/ed_manager PHI restriction', () => {
  it('it_admin (role: admin, roleProfileId: it_admin) is granted exactly its override permission set -- never PHI', async () => {
    const failures = await assertOverridePermissionsExactlyGate('admin', 'it_admin');
    expect(failures).toEqual([]);
  });

  it('ed_manager (role: admin, roleProfileId: ed_manager) is granted exactly its override permission set -- READ_PHI, never WRITE/EXPORT/DELETE', async () => {
    const failures = await assertOverridePermissionsExactlyGate('admin', 'ed_manager');
    expect(failures).toEqual([]);
  });

  it('a real WRITE_PHI route (patchPatient) rejects it_admin and ed_manager directly', async () => {
    for (const profileId of ['it_admin', 'ed_manager']) {
      const context = buildContext(EmergencyOsController.prototype.patchPatient, {
        id: `test-${profileId}`,
        role: 'admin',
        profile: { roleProfileId: profileId },
      });
      await expect(testAuthorizationGuard.canActivate(context)).rejects.toThrow();
    }
  });

  it('a genuine admin persona (roleProfileId: admin, not in the override table) still reaches a real WRITE_PHI route -- proves the fix is scoped to it_admin/ed_manager only', async () => {
    const context = buildContext(EmergencyOsController.prototype.patchPatient, {
      id: 'test-real-admin',
      role: 'admin',
      profile: { roleProfileId: 'admin' },
    });
    await expect(testAuthorizationGuard.canActivate(context)).resolves.toBe(true);
  });

  it('READ_PHI-only route (getWhiteboard): it_admin rejected, ed_manager granted', async () => {
    const itAdminContext = buildContext(EmergencyOsController.prototype.getWhiteboard, {
      id: 'test-it-admin-read',
      role: 'admin',
      profile: { roleProfileId: 'it_admin' },
    });
    await expect(testAuthorizationGuard.canActivate(itAdminContext)).rejects.toThrow();

    const edManagerContext = buildContext(EmergencyOsController.prototype.getWhiteboard, {
      id: 'test-ed-manager-read',
      role: 'admin',
      profile: { roleProfileId: 'ed_manager' },
    });
    await expect(testAuthorizationGuard.canActivate(edManagerContext)).resolves.toBe(true);
  });
});
