import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { DrugController } from './drug.controller';

/**
 * findAll/getCategories/findOne previously had NO @UseGuards and NO permission
 * decorator at all -- unlike POST/PUT/DELETE on this same controller. Since the
 * app's only global guard (TenantIsolationGuard) explicitly no-ops when
 * request.user is unset ("Global guards run before route AuthGuard. Method-level
 * usage enforces after auth."), a route with no method-level AuthGuard never
 * populates request.user, so these 3 GET routes were reachable with no bearer
 * token at all. Mirrors the established pattern in
 * ../protocol/protocol.controller.spec.ts's "requires a permission" block.
 */
describe('DrugController — requires authentication and a permission', () => {
  it('requires AuthorizationGuard on the controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, DrugController) || [];
    expect(guards).toContain(AuthorizationGuard);
  });

  it('every read handler requires READ_PHI', () => {
    for (const handlerName of ['findAll', 'getCategories', 'findOne'] as const) {
      const handler = DrugController.prototype[handlerName];
      const metadata = Reflect.getMetadata(PERMISSIONS_KEY, handler);
      expect(metadata).toEqual([Permission.READ_PHI]);
    }
  });

  it('write handlers still require WRITE_PHI/DELETE_PHI', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, DrugController.prototype.create)).toEqual([
      Permission.WRITE_PHI,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, DrugController.prototype.update)).toEqual([
      Permission.WRITE_PHI,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, DrugController.prototype.remove)).toEqual([
      Permission.DELETE_PHI,
    ]);
  });
});
