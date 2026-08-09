import { ANY_PERMISSIONS_KEY, PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { RolePermissions } from '../auth/config/role-permissions.config';
import { UserRole } from '../users/entities/user.entity';
import { EvaluationController } from './evaluation.controller';

/**
 * 2026-08-08: same gap and same fix as TrainingController, its sibling
 * module -- see that spec file's own comment for the full rationale.
 */
describe('EvaluationController — every route requires a permission (2026-08-08)', () => {
  const READ_ROUTES: Array<keyof EvaluationController> = [
    'getDashboard',
    'getMetricDefinitions',
    'getRuns',
  ];

  it.each(READ_ROUTES)('%s requires VIEW_AI_TRAINING or MANAGE_AI_TRAINING', (methodName) => {
    const handler = EvaluationController.prototype[methodName];
    expect(typeof handler).toBe('function');
    const metadata = Reflect.getMetadata(ANY_PERMISSIONS_KEY, handler);
    expect(metadata).toEqual([Permission.VIEW_AI_TRAINING, Permission.MANAGE_AI_TRAINING]);
  });

  it('createRun requires MANAGE_AI_TRAINING', () => {
    const handler = EvaluationController.prototype.createRun;
    expect(typeof handler).toBe('function');
    const metadata = Reflect.getMetadata(PERMISSIONS_KEY, handler);
    expect(metadata).toEqual([Permission.MANAGE_AI_TRAINING]);
  });

  it('only ADMIN is granted VIEW_AI_TRAINING/MANAGE_AI_TRAINING -- clinical staff cannot touch evaluation config', () => {
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
