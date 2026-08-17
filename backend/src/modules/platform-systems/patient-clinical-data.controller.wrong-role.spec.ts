import { PatientClinicalDataController } from './patient-clinical-data.controller';
import { Permission } from '../auth/enums/permission.enum';
import {
  assertOnlySoleGrantedPermissionPasses,
  getControllerRouteHandlers,
  routeMetadata,
} from '../auth/guards/authorization.wrong-role.test-utils';

/**
 * Extends HEAL-284's systematic wrong-role check to PatientClinicalDataController --
 * a directly PHI-named controller (12 @Permissions-decorated routes). See
 * authorization.wrong-role.systematic.spec.ts for the full rationale.
 */
describe('AuthorizationGuard wrong-role systematic check -- PatientClinicalDataController', () => {
  const allHandlers = getControllerRouteHandlers(PatientClinicalDataController);

  it('sanity: found real decorated route handlers to check', () => {
    const decorated = allHandlers.filter((h) => {
      const meta = routeMetadata(h.handler, PatientClinicalDataController);
      return !meta.isPublic && (meta.required.length || meta.anyOf.length);
    });
    expect(decorated.length).toBeGreaterThanOrEqual(8);
  });

  it('a minimal-privilege user (READ_PHI only) is rejected by every route requiring more than READ_PHI', async () => {
    const results = await assertOnlySoleGrantedPermissionPasses(
      PatientClinicalDataController,
      Permission.READ_PHI,
    );
    const failures = results.filter((r) => !r.ok);
    expect(failures).toEqual([]);
  });
});
