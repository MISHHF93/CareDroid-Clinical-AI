import { UserRole } from '../../users/entities/user.entity';
import { Permission } from '../enums/permission.enum';
import {
  RolePermissions,
  hasPermission,
  hasPermissionWithHierarchy,
  getEffectivePermissions,
} from './role-permissions.config';

/**
 * 2026-08-08: before this role existed, the frontend's operational
 * 'read_only_viewer'/'public_display' labels (jwt-claims.util.ts's
 * EMERGENCY_ROLE_CLAIM_IDS) had no corresponding backend UserRole at all --
 * RolePermissions was keyed only by PHYSICIAN/NURSE/STUDENT/ADMIN, so a
 * "read-only" account had to be provisioned as NURSE (gaining full WRITE_PHI
 * it should never have had) or fell back to STUDENT (zero PHI access, unable
 * to view the Whiteboard at all). "Read-only" was enforced only by hiding UI
 * controls, never at the server permission layer this AuthorizationGuard
 * actually checks.
 */
describe('RolePermissions — READ_ONLY_VIEWER', () => {
  it('can read PHI', () => {
    expect(RolePermissions[UserRole.READ_ONLY_VIEWER]).toContain(Permission.READ_PHI);
    expect(hasPermission(UserRole.READ_ONLY_VIEWER, Permission.READ_PHI)).toBe(true);
  });

  it('cannot write, export, or delete PHI -- the entire point of the role', () => {
    expect(hasPermission(UserRole.READ_ONLY_VIEWER, Permission.WRITE_PHI)).toBe(false);
    expect(hasPermission(UserRole.READ_ONLY_VIEWER, Permission.EXPORT_PHI)).toBe(false);
    expect(hasPermission(UserRole.READ_ONLY_VIEWER, Permission.DELETE_PHI)).toBe(false);
    expect(hasPermissionWithHierarchy(UserRole.READ_ONLY_VIEWER, Permission.WRITE_PHI)).toBe(false);
  });

  it('cannot manage users, roles, or system configuration', () => {
    expect(hasPermission(UserRole.READ_ONLY_VIEWER, Permission.MANAGE_USERS)).toBe(false);
    expect(hasPermission(UserRole.READ_ONLY_VIEWER, Permission.MANAGE_ROLES)).toBe(false);
    expect(hasPermission(UserRole.READ_ONLY_VIEWER, Permission.CONFIGURE_SYSTEM)).toBe(false);
  });

  it('cannot trigger emergency protocols or override safety checks', () => {
    expect(hasPermission(UserRole.READ_ONLY_VIEWER, Permission.TRIGGER_EMERGENCY_PROTOCOL)).toBe(false);
    expect(hasPermission(UserRole.READ_ONLY_VIEWER, Permission.OVERRIDE_SAFETY_CHECKS)).toBe(false);
  });

  it('has strictly fewer effective permissions than NURSE (the role it would otherwise have been misprovisioned as)', () => {
    const viewerPermissions = new Set(getEffectivePermissions(UserRole.READ_ONLY_VIEWER));
    const nursePermissions = new Set(getEffectivePermissions(UserRole.NURSE));
    for (const permission of viewerPermissions) {
      expect(nursePermissions.has(permission)).toBe(true);
    }
    expect(viewerPermissions.size).toBeLessThan(nursePermissions.size);
  });
});
