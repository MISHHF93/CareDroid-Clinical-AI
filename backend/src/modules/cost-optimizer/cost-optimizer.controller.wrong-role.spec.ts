import { CostOptimizerController } from './cost-optimizer.controller';
import { Permission } from '../auth/enums/permission.enum';
import {
  assertOnlySoleGrantedPermissionPasses,
  getControllerRouteHandlers,
  routeMetadata,
} from '../auth/guards/authorization.wrong-role.test-utils';

/**
 * HEAL-331: GET /cost-optimizer/dashboard previously had no permission check
 * at all beyond "is authenticated" -- exposing platform-wide AI cost/routing
 * business data to any authenticated user of any organization or role.
 */
describe('AuthorizationGuard wrong-role systematic check -- CostOptimizerController', () => {
  const allHandlers = getControllerRouteHandlers(CostOptimizerController);

  it('sanity: found the dashboard route decorated with a real permission', () => {
    const decorated = allHandlers.filter((h) => {
      const meta = routeMetadata(h.handler, CostOptimizerController);
      return !meta.isPublic && (meta.required.length || meta.anyOf.length);
    });
    expect(decorated.length).toBeGreaterThanOrEqual(1);
  });

  it('a minimal-privilege user (USE_AI_CHAT only) is rejected by the dashboard route', async () => {
    const results = await assertOnlySoleGrantedPermissionPasses(
      CostOptimizerController,
      Permission.USE_AI_CHAT,
    );
    const failures = results.filter((r) => !r.ok);
    expect(failures).toEqual([]);
  });
});
