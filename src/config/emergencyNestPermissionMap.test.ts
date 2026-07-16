/**
 * Architect Mode Stage D — emergency ↔ Nest permission map contracts.
 */
import { describe, expect, it } from 'vitest';
import {
  EMERGENCY_TO_NEST_ROLE_MAP,
  NEST_PERMISSION,
  NEST_USER_ROLE,
  emergencyRoleSatisfiesNestAction,
  resolveNestMappingForEmergencyRole,
} from './emergencyNestPermissionMap';
import { EMERGENCY_ROLE_ID } from './emergencyRoleScreenMatrix';
import { EMERGENCY_PERMISSION_KEYS, ROLE_PERMISSION_GRANTS } from './emergencyPermissionRegistry';

describe('emergencyNestPermissionMap', () => {
  it('maps every ROLE_PERMISSION_GRANTS emergency role', () => {
    for (const role of Object.keys(ROLE_PERMISSION_GRANTS) as (keyof typeof ROLE_PERMISSION_GRANTS)[]) {
      expect(EMERGENCY_TO_NEST_ROLE_MAP[role]).toBeDefined();
      expect(resolveNestMappingForEmergencyRole(role).nestUserRole).toBeTruthy();
    }
  });

  it('uses Nest container roles only from the four UserRole values', () => {
    const allowed = new Set(Object.values(NEST_USER_ROLE));
    for (const mapping of Object.values(EMERGENCY_TO_NEST_ROLE_MAP)) {
      expect(allowed.has(mapping.nestUserRole)).toBe(true);
    }
  });

  it('Reception registration_clerk gets PHI read/write and AI chat, not system config', () => {
    const m = resolveNestMappingForEmergencyRole(EMERGENCY_ROLE_ID.registrationClerk);
    expect(m.nestUserRole).toBe(NEST_USER_ROLE.nurse);
    expect(m.nestPermissions).toEqual(
      expect.arrayContaining([
        NEST_PERMISSION.READ_PHI,
        NEST_PERMISSION.WRITE_PHI,
        NEST_PERMISSION.USE_AI_CHAT,
      ]),
    );
    expect(m.nestPermissions).not.toContain(NEST_PERMISSION.CONFIGURE_SYSTEM);
    expect(m.nestPermissions).not.toContain(NEST_PERMISSION.MANAGE_USERS);
    expect(m.nestPermissions).not.toContain(NEST_PERMISSION.DELETE_PHI);
  });

  it('public_display holds zero Nest PHI permissions', () => {
    const m = resolveNestMappingForEmergencyRole(EMERGENCY_ROLE_ID.publicDisplay);
    expect(m.nestPermissions).toHaveLength(0);
    expect(m.nestUserRole).toBe(NEST_USER_ROLE.student);
  });

  it('it_admin maps without PHI read/write', () => {
    const m = resolveNestMappingForEmergencyRole(EMERGENCY_ROLE_ID.itAdmin);
    expect(m.nestPermissions).toContain(NEST_PERMISSION.CONFIGURE_SYSTEM);
    expect(m.nestPermissions).not.toContain(NEST_PERMISSION.WRITE_PHI);
    expect(m.nestPermissions).not.toContain(NEST_PERMISSION.READ_PHI);
  });

  it('registration_clerk Nest set satisfies intake actions and not settings', () => {
    expect(
      emergencyRoleSatisfiesNestAction(
        EMERGENCY_ROLE_ID.registrationClerk,
        EMERGENCY_PERMISSION_KEYS.patientCreate,
      ),
    ).toBe(true);
    expect(
      emergencyRoleSatisfiesNestAction(
        EMERGENCY_ROLE_ID.registrationClerk,
        EMERGENCY_PERMISSION_KEYS.intakeVerify,
      ),
    ).toBe(true);
    expect(
      emergencyRoleSatisfiesNestAction(
        EMERGENCY_ROLE_ID.registrationClerk,
        EMERGENCY_PERMISSION_KEYS.emsConvertArrival,
      ),
    ).toBe(true);
    expect(
      emergencyRoleSatisfiesNestAction(
        EMERGENCY_ROLE_ID.registrationClerk,
        EMERGENCY_PERMISSION_KEYS.settingsManage,
      ),
    ).toBe(false);
  });

  it('public_display does not satisfy PHI write actions', () => {
    expect(
      emergencyRoleSatisfiesNestAction(
        EMERGENCY_ROLE_ID.publicDisplay,
        EMERGENCY_PERMISSION_KEYS.patientCreate,
      ),
    ).toBe(false);
  });

  it('physician Nest set includes export PHI; registration_clerk does not', () => {
    const phys = resolveNestMappingForEmergencyRole(EMERGENCY_ROLE_ID.physician);
    const clerk = resolveNestMappingForEmergencyRole(EMERGENCY_ROLE_ID.registrationClerk);
    expect(phys.nestPermissions).toContain(NEST_PERMISSION.EXPORT_PHI);
    expect(clerk.nestPermissions).not.toContain(NEST_PERMISSION.EXPORT_PHI);
  });
});
