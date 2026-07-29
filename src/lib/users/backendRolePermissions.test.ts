import { describe, expect, it } from 'vitest';
import { Permission } from '../../config/backendPermissionCatalog';
import { hasBackendRolePermission } from './backendRolePermissions';

describe('backendRolePermissions', () => {
  it('grants PHI read to clinical roles', () => {
    expect(hasBackendRolePermission('physician', Permission.READ_PHI)).toBe(true);
    expect(hasBackendRolePermission('triage_nurse', Permission.READ_PHI)).toBe(true);
  });

  it('denies PHI write to student role', () => {
    expect(hasBackendRolePermission('student', Permission.WRITE_PHI)).toBe(false);
    expect(hasBackendRolePermission('student', Permission.USE_CALCULATORS)).toBe(true);
  });

  it('does not grant reserved BREAK_GLASS_ACCESS to any mapped backend role (QW-2)', () => {
    for (const role of [
      'student',
      'nurse',
      'charge_nurse',
      'triage_nurse',
      'physician',
      'ed_manager',
      'registration_clerk',
      'ems_user',
      'read_only_viewer',
      'admin',
    ]) {
      expect(hasBackendRolePermission(role, Permission.BREAK_GLASS_ACCESS)).toBe(false);
    }
  });
});