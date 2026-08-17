import { GovernanceController } from './governance.controller';
import { Permission } from '../auth/enums/permission.enum';
import {
  assertOnlySoleGrantedPermissionPasses,
  getControllerRouteHandlers,
  routeMetadata,
} from '../auth/guards/authorization.wrong-role.test-utils';

/**
 * Extends HEAL-284's systematic wrong-role check to GovernanceController -- 77
 * @Permissions-decorated routes, the single highest-decorator-count controller in
 * the backend (more than EmergencyOsController's 72, where this exact check
 * first found 6 real privilege-escalation bugs). See
 * authorization.wrong-role.systematic.spec.ts for the full rationale.
 */
describe('AuthorizationGuard wrong-role systematic check -- GovernanceController', () => {
  const allHandlers = getControllerRouteHandlers(GovernanceController);

  it('sanity: found real decorated route handlers to check', () => {
    const decorated = allHandlers.filter((h) => {
      const meta = routeMetadata(h.handler, GovernanceController);
      return !meta.isPublic && (meta.required.length || meta.anyOf.length);
    });
    expect(decorated.length).toBeGreaterThanOrEqual(60);
  });

  it('a minimal-privilege user (READ_PHI only) is rejected by every route requiring more than READ_PHI', async () => {
    const results = await assertOnlySoleGrantedPermissionPasses(GovernanceController, Permission.READ_PHI);
    const failures = results.filter((r) => !r.ok);
    expect(failures).toEqual([]);
  });
});
