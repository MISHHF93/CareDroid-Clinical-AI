import {
  getTrackMindApiPermissionsForRole,
  normalizeTrackMindBackendRoleId,
  trackMindRoleHasApiPermission,
  TRACKMIND_BACKEND_ROLE_ID,
} from './trackmind-rbac.config';
import { Permission } from '../auth/enums/permission.enum';

describe('trackmind-rbac.config', () => {
  it('maps veterinarian role to veterinary record permissions', () => {
    const permissions = getTrackMindApiPermissionsForRole(TRACKMIND_BACKEND_ROLE_ID.veterinarian);
    expect(permissions).toContain(Permission.VIEW_VETERINARY_RECORDS);
    expect(permissions).toContain(Permission.WRITE_VETERINARY_RECORDS);
  });

  it('maps platform super admin to tenant management', () => {
    expect(
      trackMindRoleHasApiPermission(
        TRACKMIND_BACKEND_ROLE_ID.platformSuperAdmin,
        Permission.MANAGE_PLATFORM_TENANTS,
      ),
    ).toBe(true);
  });

  it('defaults unknown roles to generic staff', () => {
    expect(normalizeTrackMindBackendRoleId('unknown-role')).toBe(
      TRACKMIND_BACKEND_ROLE_ID.genericStaff,
    );
    expect(getTrackMindApiPermissionsForRole('unknown-role')).toEqual([Permission.VIEW_TRACKMIND]);
  });

  it('does not grant veterinary write to generic staff', () => {
    expect(
      trackMindRoleHasApiPermission(
        TRACKMIND_BACKEND_ROLE_ID.genericStaff,
        Permission.WRITE_VETERINARY_RECORDS,
      ),
    ).toBe(false);
  });
});
