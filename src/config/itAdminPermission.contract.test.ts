/**
 * Architect Mode Stage D — it_admin must not receive clinical PHI grants.
 */
import { describe, expect, it } from 'vitest';
import {
  EMERGENCY_PERMISSION_KEYS,
  hasEmergencyPermission,
  ROLE_PERMISSION_GRANTS,
} from './emergencyPermissionRegistry';
import { EMERGENCY_ROLE_ID } from './emergencyRoleScreenMatrix';
import { EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import {
  emergencyRoleSatisfiesNestAction,
  resolveNestMappingForEmergencyRole,
  NEST_PERMISSION,
} from './emergencyNestPermissionMap';

describe('it_admin permission contract', () => {
  it('is present in EMERGENCY_ROLE_ID and ROLE_PERMISSION_GRANTS', () => {
    expect(EMERGENCY_ROLE_ID.itAdmin).toBe('it_admin');
    expect(EMERGENCY_ROLE_IDS.itAdmin).toBe('it_admin');
    expect(ROLE_PERMISSION_GRANTS[EMERGENCY_ROLE_ID.itAdmin]).toBeDefined();
  });

  it('can manage settings but cannot create patients or write PHI actions', () => {
    expect(hasEmergencyPermission(EMERGENCY_ROLE_ID.itAdmin, EMERGENCY_PERMISSION_KEYS.settingsManage)).toBe(
      true,
    );
    expect(hasEmergencyPermission(EMERGENCY_ROLE_ID.itAdmin, EMERGENCY_PERMISSION_KEYS.patientCreate)).toBe(
      false,
    );
    expect(hasEmergencyPermission(EMERGENCY_ROLE_ID.itAdmin, EMERGENCY_PERMISSION_KEYS.intakeVerify)).toBe(
      false,
    );
    expect(hasEmergencyPermission(EMERGENCY_ROLE_ID.itAdmin, EMERGENCY_PERMISSION_KEYS.vitalsWrite)).toBe(
      false,
    );
  });

  it('Nest mapping has CONFIGURE_SYSTEM without READ/WRITE PHI', () => {
    const m = resolveNestMappingForEmergencyRole(EMERGENCY_ROLE_ID.itAdmin);
    expect(m.nestPermissions).toContain(NEST_PERMISSION.CONFIGURE_SYSTEM);
    expect(m.nestPermissions).not.toContain(NEST_PERMISSION.READ_PHI);
    expect(m.nestPermissions).not.toContain(NEST_PERMISSION.WRITE_PHI);
    expect(
      emergencyRoleSatisfiesNestAction(EMERGENCY_ROLE_ID.itAdmin, EMERGENCY_PERMISSION_KEYS.patientCreate),
    ).toBe(false);
    expect(
      emergencyRoleSatisfiesNestAction(EMERGENCY_ROLE_ID.itAdmin, EMERGENCY_PERMISSION_KEYS.settingsManage),
    ).toBe(true);
  });
});
