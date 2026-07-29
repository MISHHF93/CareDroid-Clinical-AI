import { UserRole } from '../../users/entities/user.entity';
import { Permission } from '../enums/permission.enum';
import { RolePermissions, hasPermission } from './role-permissions.config';

/**
 * QW-2 / Cycle 232: clinical break-glass is not implemented.
 * Permission.BREAK_GLASS_ACCESS is reserved and must not be granted to any role.
 */
describe('RolePermissions — BREAK_GLASS_ACCESS reserved (not granted)', () => {
  it('is not granted on any UserRole', () => {
    for (const role of Object.values(UserRole)) {
      expect(RolePermissions[role]).toBeDefined();
      expect(RolePermissions[role]).not.toContain(Permission.BREAK_GLASS_ACCESS);
      expect(hasPermission(role, Permission.BREAK_GLASS_ACCESS)).toBe(false);
    }
  });

  it('still exists as a reserved Permission enum value for a future workflow', () => {
    expect(Permission.BREAK_GLASS_ACCESS).toBe('BREAK_GLASS_ACCESS');
  });
});
