import { describe, expect, it } from 'vitest';
import { EMERGENCY_PERMISSION_KEYS } from './emergencyPermissionRegistry';
import { EMERGENCY_ROLE_ID } from './emergencyRoleScreenMatrix';
import {
  assertUnauthorizedRolesCannotSeeDestructiveClinicalActions,
  auditRoleActionSurfaces,
  presentEmergencyPermission,
} from './emergencyActionPresentationModel';
import { EMERGENCY_ROLE_ACTIONS } from './emergencyRoleActionMatrix';

describe('emergencyActionPresentationModel', () => {
  it('hides clinical create for receptionist while allowing intake', () => {
    const create = presentEmergencyPermission(
      EMERGENCY_ROLE_ID.registrationClerk,
      EMERGENCY_PERMISSION_KEYS.patientCreate,
    );
    const triage = presentEmergencyPermission(
      EMERGENCY_ROLE_ID.registrationClerk,
      EMERGENCY_PERMISSION_KEYS.triageAssignAcuity,
    );

    expect(create.visible).toBe(true);
    expect(create.enabled).toBe(true);
    expect(triage.visible).toBe(false);
  });

  it('shows manager clinical actions as disabled rather than enabled', () => {
    const create = presentEmergencyPermission(
      EMERGENCY_ROLE_ID.edManager,
      EMERGENCY_PERMISSION_KEYS.patientCreate,
    );
    const queue = presentEmergencyPermission(
      EMERGENCY_ROLE_ID.edManager,
      EMERGENCY_PERMISSION_KEYS.queueMove,
    );

    expect(create.visible).toBe(true);
    expect(create.enabled).toBe(false);
    expect(queue.enabled).toBe(true);
  });

  it('keeps settings readonly for manager and allowed for admin', () => {
    expect(
      presentEmergencyPermission(EMERGENCY_ROLE_ID.edManager, EMERGENCY_PERMISSION_KEYS.settingsManage)
        .readOnly,
    ).toBe(true);
    expect(
      presentEmergencyPermission(EMERGENCY_ROLE_ID.admin, EMERGENCY_PERMISSION_KEYS.settingsManage)
        .enabled,
    ).toBe(true);
  });

  it('hides destructive clinical actions from public and read-only display roles', () => {
    expect(
      assertUnauthorizedRolesCannotSeeDestructiveClinicalActions([
        EMERGENCY_ROLE_ID.publicDisplay,
        EMERGENCY_ROLE_ID.readOnlyViewer,
        'public display',
      ]),
    ).toBe(true);

    for (const role of [EMERGENCY_ROLE_ID.publicDisplay, EMERGENCY_ROLE_ID.readOnlyViewer]) {
      const discharge = presentEmergencyPermission(role, EMERGENCY_ROLE_ACTIONS.disposition);
      const vitals = presentEmergencyPermission(role, EMERGENCY_PERMISSION_KEYS.vitalsWrite);
      expect(discharge.visible).toBe(false);
      expect(vitals.visible).toBe(false);
    }
  });

  it('audits every registered UI action surface', () => {
    const adminAudit = auditRoleActionSurfaces(EMERGENCY_ROLE_ID.admin);
    expect(adminAudit.length).toBeGreaterThan(20);
    expect(adminAudit.every((entry) => entry.permission)).toBe(true);
    expect(adminAudit.filter((entry) => entry.enabled).length).toBeGreaterThan(10);
  });
});
