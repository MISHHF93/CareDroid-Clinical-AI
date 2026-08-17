import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { ProtocolController } from './protocol.controller';

/**
 * findAll/getCategories/findOne previously had NO @UseGuards and NO permission
 * decorator at all -- unlike POST/PUT/DELETE on this same controller. Since the
 * app's only global guard (TenantIsolationGuard) explicitly no-ops when
 * request.user is unset, a route with no method-level AuthGuard never
 * populates request.user, so these 3 GET routes were reachable with no bearer
 * token at all. Mirrors the established pattern in
 * ../protocol/protocol.controller.spec.ts's "requires a permission" block --
 * NOTE this is a different class of the same name at a different path
 * (`/protocols` here vs `/protocol` there); see the name-collision comment
 * at the top of protocol.controller.ts.
 */
describe('ProtocolController (clinical, /protocols) — requires authentication and a permission', () => {
  it('requires AuthorizationGuard on the controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ProtocolController) || [];
    expect(guards).toContain(AuthorizationGuard);
  });

  it('every read handler requires READ_PHI', () => {
    for (const handlerName of ['findAll', 'getCategories', 'findOne'] as const) {
      const handler = ProtocolController.prototype[handlerName];
      const metadata = Reflect.getMetadata(PERMISSIONS_KEY, handler);
      expect(metadata).toEqual([Permission.READ_PHI]);
    }
  });

  it('write handlers still require WRITE_PHI/DELETE_PHI', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, ProtocolController.prototype.create)).toEqual([
      Permission.WRITE_PHI,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, ProtocolController.prototype.update)).toEqual([
      Permission.WRITE_PHI,
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, ProtocolController.prototype.remove)).toEqual([
      Permission.DELETE_PHI,
    ]);
  });
});
