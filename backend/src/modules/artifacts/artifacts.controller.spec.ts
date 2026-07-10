import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { ArtifactsController } from './artifacts.controller';

describe('ArtifactsController', () => {
  // create/update were reachable by any authenticated user with no permission
  // check at all (nothing in the frontend even calls these routes today, but
  // the API surface was open regardless). Locks in that both now require
  // AuthorizationGuard + WRITE_PHI, matching the sibling clinical-content
  // controllers (DrugController, ProtocolController).
  const adminOnlyRoutes: Array<keyof ArtifactsController> = ['create', 'update'];

  it.each(adminOnlyRoutes)('%s requires AuthorizationGuard + WRITE_PHI permission', (method) => {
    const handler = ArtifactsController.prototype[method];
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) || [];
    expect(guards).toContain(AuthorizationGuard);

    const permissions = Reflect.getMetadata(PERMISSIONS_KEY, handler);
    expect(permissions).toEqual([Permission.WRITE_PHI]);
  });

  it('read routes do not require the write permission', () => {
    const readMethods: Array<keyof ArtifactsController> = ['list', 'graph', 'findOne', 'versions'];
    for (const method of readMethods) {
      const permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        ArtifactsController.prototype[method],
      );
      expect(permissions).toBeUndefined();
    }
  });
});
