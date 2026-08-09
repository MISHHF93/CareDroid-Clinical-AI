import { ANY_PERMISSIONS_KEY, PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { RolePermissions } from '../auth/config/role-permissions.config';
import { UserRole } from '../users/entities/user.entity';
import { TrainingController } from './training.controller';

/**
 * 2026-08-08: TrainingController used to only require AuthGuard('jwt') --
 * any authenticated user, not gated by AuthorizationGuard/@Permissions(...)
 * like most other controllers in this codebase (a documented, deliberate
 * "KNOWN GAP" left by an earlier round). Fixed by adding
 * VIEW_AI_TRAINING/MANAGE_AI_TRAINING and gating every route.
 */
describe('TrainingController — every route requires a permission (2026-08-08)', () => {
  const READ_ROUTES: Array<keyof TrainingController> = [
    'getPipeline',
    'getDashboard',
    'getRuns',
    'getMoeTrainingPlan',
  ];
  const WRITE_ROUTES: Array<keyof TrainingController> = ['createRun', 'evaluateRun'];

  it.each(READ_ROUTES)('%s requires VIEW_AI_TRAINING or MANAGE_AI_TRAINING', (methodName) => {
    const handler = TrainingController.prototype[methodName];
    expect(typeof handler).toBe('function');
    const metadata = Reflect.getMetadata(ANY_PERMISSIONS_KEY, handler);
    expect(metadata).toEqual([Permission.VIEW_AI_TRAINING, Permission.MANAGE_AI_TRAINING]);
  });

  it.each(WRITE_ROUTES)('%s requires MANAGE_AI_TRAINING', (methodName) => {
    const handler = TrainingController.prototype[methodName];
    expect(typeof handler).toBe('function');
    const metadata = Reflect.getMetadata(PERMISSIONS_KEY, handler);
    expect(metadata).toEqual([Permission.MANAGE_AI_TRAINING]);
  });

  it('only ADMIN is granted VIEW_AI_TRAINING/MANAGE_AI_TRAINING -- clinical staff cannot touch training config', () => {
    const nonAdminRoles = [
      UserRole.STUDENT,
      UserRole.READ_ONLY_VIEWER,
      UserRole.NURSE,
      UserRole.PHYSICIAN,
    ];
    for (const role of nonAdminRoles) {
      expect(RolePermissions[role]).not.toContain(Permission.VIEW_AI_TRAINING);
      expect(RolePermissions[role]).not.toContain(Permission.MANAGE_AI_TRAINING);
    }
    expect(RolePermissions[UserRole.ADMIN]).toContain(Permission.VIEW_AI_TRAINING);
    expect(RolePermissions[UserRole.ADMIN]).toContain(Permission.MANAGE_AI_TRAINING);
  });
});
