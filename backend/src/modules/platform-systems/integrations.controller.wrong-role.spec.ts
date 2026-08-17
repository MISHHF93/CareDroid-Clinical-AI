import { IntegrationsController } from './integrations.controller';
import { Permission } from '../auth/enums/permission.enum';
import {
  assertOnlySoleGrantedPermissionPasses,
  getControllerRouteHandlers,
  routeMetadata,
} from '../auth/guards/authorization.wrong-role.test-utils';

/**
 * Extends HEAL-284's systematic wrong-role check to IntegrationsController --
 * a sibling of GovernanceController/PatientClinicalDataController produced by
 * the same module-boundary split of the former PlatformSystemsController (11
 * @Permissions-decorated routes: FHIR/HL7 connection management and source
 * provenance). See authorization.wrong-role.systematic.spec.ts for the full
 * rationale.
 */
describe('AuthorizationGuard wrong-role systematic check -- IntegrationsController', () => {
  const allHandlers = getControllerRouteHandlers(IntegrationsController);

  it('sanity: found real decorated route handlers to check', () => {
    const decorated = allHandlers.filter((h) => {
      const meta = routeMetadata(h.handler, IntegrationsController);
      return !meta.isPublic && (meta.required.length || meta.anyOf.length);
    });
    expect(decorated.length).toBeGreaterThanOrEqual(6);
  });

  it('a minimal-privilege user (READ_PHI only) is rejected by every route requiring more than READ_PHI', async () => {
    const results = await assertOnlySoleGrantedPermissionPasses(
      IntegrationsController,
      Permission.READ_PHI,
    );
    const failures = results.filter((r) => !r.ok);
    expect(failures).toEqual([]);
  });
});
