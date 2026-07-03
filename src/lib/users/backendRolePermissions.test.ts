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
});