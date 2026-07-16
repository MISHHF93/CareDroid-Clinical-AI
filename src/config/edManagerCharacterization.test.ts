/**
 * Architect Mode Stage I — ED Manager characterization.
 */
import { describe, expect, it } from 'vitest';
import {
  EMERGENCY_PERMISSION_KEYS,
  hasEmergencyPermission,
  ROLE_PERMISSION_GRANTS,
} from './emergencyPermissionRegistry';
import { EMERGENCY_ROLE_ID } from './emergencyRoleScreenMatrix';
import {
  NEST_PERMISSION,
  resolveNestMappingForEmergencyRole,
} from './emergencyNestPermissionMap';

describe('ED Manager characterization', () => {
  const role = EMERGENCY_ROLE_ID.edManager;
  const grants = ROLE_PERMISSION_GRANTS[role];

  it('owns ops analytics, capacity, simulation, settings — not bedside vitals', () => {
    expect(grants).toEqual(
      expect.arrayContaining([
        EMERGENCY_PERMISSION_KEYS.capacityManage,
        EMERGENCY_PERMISSION_KEYS.boardingManage,
        EMERGENCY_PERMISSION_KEYS.analyticsView,
        EMERGENCY_PERMISSION_KEYS.simulationRun,
        EMERGENCY_PERMISSION_KEYS.settingsManage,
        EMERGENCY_PERMISSION_KEYS.screenCommandCenter,
      ]),
    );
    expect(hasEmergencyPermission(role, EMERGENCY_PERMISSION_KEYS.vitalsWrite)).toBe(false);
    expect(hasEmergencyPermission(role, EMERGENCY_PERMISSION_KEYS.patientCreate)).toBe(false);
  });

  it('Nest map is admin container without DELETE_PHI requirement for ops role', () => {
    const m = resolveNestMappingForEmergencyRole(role);
    expect(m.nestUserRole).toBe('admin');
    expect(m.nestPermissions).toContain(NEST_PERMISSION.VIEW_ANALYTICS);
    expect(m.nestPermissions).toContain(NEST_PERMISSION.VIEW_OPERATIONS);
    // Ops manager may read PHI for analytics contexts but is not full clinical delete
    expect(m.nestPermissions).not.toContain(NEST_PERMISSION.DELETE_PHI);
  });
});
