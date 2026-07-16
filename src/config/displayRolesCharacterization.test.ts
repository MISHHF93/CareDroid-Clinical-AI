/**
 * Architect Mode Stage I — read-only viewer + public display PHI-free contracts.
 */
import { describe, expect, it } from 'vitest';
import {
  EMERGENCY_PERMISSION_KEYS,
  hasEmergencyPermission,
  ROLE_PERMISSION_GRANTS,
  canPerformEmergencyMutation,
} from './emergencyPermissionRegistry';
import { EMERGENCY_ROLE_ID } from './emergencyRoleScreenMatrix';
import { EMERGENCY_ACTIONS, EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import { presentEmergencyPermission } from './emergencyActionPresentationModel';
import {
  NEST_PERMISSION,
  resolveNestMappingForEmergencyRole,
} from './emergencyNestPermissionMap';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';

const MUTATING_KEYS = [
  EMERGENCY_PERMISSION_KEYS.patientCreate,
  EMERGENCY_PERMISSION_KEYS.patientDemographicsEdit,
  EMERGENCY_PERMISSION_KEYS.vitalsWrite,
  EMERGENCY_PERMISSION_KEYS.notesWrite,
  EMERGENCY_PERMISSION_KEYS.triageAssignAcuity,
  EMERGENCY_PERMISSION_KEYS.queueMove,
  EMERGENCY_PERMISSION_KEYS.patientDischarge,
  EMERGENCY_PERMISSION_KEYS.emsHandoffComplete,
  EMERGENCY_PERMISSION_KEYS.settingsManage,
] as const;

describe('Read-only viewer characterization', () => {
  const role = EMERGENCY_ROLE_ID.readOnlyViewer;

  it('can view analytics and boards only', () => {
    expect(ROLE_PERMISSION_GRANTS[role]).toEqual(
      expect.arrayContaining([
        EMERGENCY_PERMISSION_KEYS.analyticsView,
        EMERGENCY_PERMISSION_KEYS.displayWhiteboardReadonly,
        EMERGENCY_PERMISSION_KEYS.displayPublicWaitboard,
      ]),
    );
  });

  it('cannot perform any clinical mutations', () => {
    for (const key of MUTATING_KEYS) {
      expect(hasEmergencyPermission(role, key)).toBe(false);
    }
  });

  it('Nest map is student container without PHI write', () => {
    const m = resolveNestMappingForEmergencyRole(role);
    expect(m.nestUserRole).toBe('student');
    expect(m.nestPermissions).not.toContain(NEST_PERMISSION.WRITE_PHI);
    expect(m.nestPermissions).not.toContain(NEST_PERMISSION.READ_PHI);
  });
});

describe('Public display characterization', () => {
  const role = EMERGENCY_ROLE_ID.publicDisplay;

  it('only holds public waitboard publish/display permissions', () => {
    const grants = ROLE_PERMISSION_GRANTS[role];
    expect(grants).toEqual(
      expect.arrayContaining([
        EMERGENCY_PERMISSION_KEYS.displayPublicWaitboard,
        EMERGENCY_PERMISSION_KEYS.displayPublicPublish,
      ]),
    );
    expect(grants).toHaveLength(2);
  });

  it('blocks patient create presentation', () => {
    const presented = presentEmergencyPermission(
      EMERGENCY_ROLE_IDS.publicDisplay,
      EMERGENCY_ACTIONS.createPatient,
    );
    expect(presented.enabled && presented.visible).toBe(false);
  });

  it('Nest map has zero permissions (no PHI)', () => {
    const m = resolveNestMappingForEmergencyRole(role);
    expect(m.nestPermissions).toHaveLength(0);
  });

  it('cannot mutate via canPerformEmergencyMutation for clinical keys', () => {
    // public display context should block mutations even if role were over-granted
    expect(
      canPerformEmergencyMutation(
        role,
        EMERGENCY_PERMISSION_KEYS.patientCreate,
        {},
        { screenMode: CARE_DROID_SCREEN_MODES.publicWaiting },
      ),
    ).toBe(false);
  });
});
