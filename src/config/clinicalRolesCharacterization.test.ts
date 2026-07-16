/**
 * Architect Mode Stage I — Charge nurse + Physician + EMS role contracts.
 * Extends Reception/Triage characterization template.
 */
import { describe, expect, it } from 'vitest';
import {
  EMERGENCY_PERMISSION_KEYS,
  hasEmergencyPermission,
  ROLE_PERMISSION_GRANTS,
} from './emergencyPermissionRegistry';
import { EMERGENCY_ROLE_ID } from './emergencyRoleScreenMatrix';
import { EMERGENCY_ACTIONS, EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import { presentEmergencyPermission } from './emergencyActionPresentationModel';
import {
  emergencyRoleSatisfiesNestAction,
  NEST_PERMISSION,
  resolveNestMappingForEmergencyRole,
} from './emergencyNestPermissionMap';

describe('Charge nurse characterization', () => {
  const role = EMERGENCY_ROLE_ID.chargeNurse;
  const grants = ROLE_PERMISSION_GRANTS[role];

  it('owns flow: capacity, boarding, workload, EMS handoff, acuity', () => {
    expect(grants).toEqual(
      expect.arrayContaining([
        EMERGENCY_PERMISSION_KEYS.capacityManage,
        EMERGENCY_PERMISSION_KEYS.boardingManage,
        EMERGENCY_PERMISSION_KEYS.workloadReassign,
        EMERGENCY_PERMISSION_KEYS.emsHandoffComplete,
        EMERGENCY_PERMISSION_KEYS.triageAssignAcuity,
        EMERGENCY_PERMISSION_KEYS.queueMove,
        EMERGENCY_PERMISSION_KEYS.screenChargeNurse,
      ]),
    );
  });

  it('cannot manage system settings', () => {
    expect(hasEmergencyPermission(role, EMERGENCY_PERMISSION_KEYS.settingsManage)).toBe(false);
  });

  it('presents EMS handoff complete as enabled', () => {
    const presented = presentEmergencyPermission(
      EMERGENCY_ROLE_IDS.chargeNurse,
      EMERGENCY_ACTIONS.completeEmsHandoff,
    );
    expect(presented.visible && presented.enabled).toBe(true);
  });

  it('Nest map is nurse container with PHI write and ops visibility', () => {
    const m = resolveNestMappingForEmergencyRole(role);
    expect(m.nestUserRole).toBe('nurse');
    expect(m.nestPermissions).toEqual(
      expect.arrayContaining([
        NEST_PERMISSION.WRITE_PHI,
        NEST_PERMISSION.VIEW_OPERATIONS,
      ]),
    );
    expect(m.nestPermissions).not.toContain(NEST_PERMISSION.CONFIGURE_SYSTEM);
  });
});

describe('Physician characterization', () => {
  const role = EMERGENCY_ROLE_ID.physician;
  const grants = ROLE_PERMISSION_GRANTS[role];

  it('owns clinical disposition path: discharge, escalate, notes, referrals', () => {
    expect(grants).toEqual(
      expect.arrayContaining([
        EMERGENCY_PERMISSION_KEYS.patientDischarge,
        EMERGENCY_PERMISSION_KEYS.patientEscalate,
        EMERGENCY_PERMISSION_KEYS.notesWrite,
        EMERGENCY_PERMISSION_KEYS.referralCreate,
        EMERGENCY_PERMISSION_KEYS.screenPhysician,
      ]),
    );
  });

  it('does not own EMS handoff complete or settings', () => {
    expect(hasEmergencyPermission(role, EMERGENCY_PERMISSION_KEYS.emsHandoffComplete)).toBe(false);
    expect(hasEmergencyPermission(role, EMERGENCY_PERMISSION_KEYS.settingsManage)).toBe(false);
  });

  it('presents discharge as enabled; EMS handoff as not fully enabled', () => {
    const discharge = presentEmergencyPermission(
      EMERGENCY_ROLE_IDS.physician,
      EMERGENCY_ACTIONS.dischargePatient,
    );
    expect(discharge.visible && discharge.enabled).toBe(true);
    const handoff = presentEmergencyPermission(
      EMERGENCY_ROLE_IDS.physician,
      EMERGENCY_ACTIONS.completeEmsHandoff,
    );
    expect(handoff.enabled && handoff.visible).toBe(false);
  });

  it('Nest map is physician with export PHI and no CONFIGURE_SYSTEM', () => {
    const m = resolveNestMappingForEmergencyRole(role);
    expect(m.nestUserRole).toBe('physician');
    expect(m.nestPermissions).toContain(NEST_PERMISSION.EXPORT_PHI);
    expect(m.nestPermissions).not.toContain(NEST_PERMISSION.CONFIGURE_SYSTEM);
    expect(
      emergencyRoleSatisfiesNestAction(role, EMERGENCY_PERMISSION_KEYS.patientDischarge),
    ).toBe(true);
  });
});

describe('EMS role cluster characterization', () => {
  it('ems_user can convert and complete handoff; no analytics/settings', () => {
    const role = EMERGENCY_ROLE_ID.emsUser;
    expect(hasEmergencyPermission(role, EMERGENCY_PERMISSION_KEYS.emsConvertArrival)).toBe(true);
    expect(hasEmergencyPermission(role, EMERGENCY_PERMISSION_KEYS.emsHandoffComplete)).toBe(true);
    expect(hasEmergencyPermission(role, EMERGENCY_PERMISSION_KEYS.analyticsView)).toBe(false);
    expect(hasEmergencyPermission(role, EMERGENCY_PERMISSION_KEYS.settingsManage)).toBe(false);
  });

  it('dispatcher prepares bay but does not complete handoff by default', () => {
    const role = EMERGENCY_ROLE_ID.dispatcher;
    expect(hasEmergencyPermission(role, EMERGENCY_PERMISSION_KEYS.emsPrepareBay)).toBe(true);
    expect(hasEmergencyPermission(role, EMERGENCY_PERMISSION_KEYS.emsHandoffComplete)).toBe(false);
    expect(hasEmergencyPermission(role, EMERGENCY_PERMISSION_KEYS.emsConvertArrival)).toBe(false);
  });

  it('ems_coordinator has handoff + analytics + command screen, not settings', () => {
    const role = EMERGENCY_ROLE_ID.emsCoordinator;
    expect(hasEmergencyPermission(role, EMERGENCY_PERMISSION_KEYS.emsHandoffComplete)).toBe(true);
    expect(hasEmergencyPermission(role, EMERGENCY_PERMISSION_KEYS.analyticsView)).toBe(true);
    expect(hasEmergencyPermission(role, EMERGENCY_PERMISSION_KEYS.screenCommandCenter)).toBe(true);
    expect(hasEmergencyPermission(role, EMERGENCY_PERMISSION_KEYS.settingsManage)).toBe(false);
  });

  it('public_display has no EMS clinical actions', () => {
    const role = EMERGENCY_ROLE_ID.publicDisplay;
    expect(hasEmergencyPermission(role, EMERGENCY_PERMISSION_KEYS.emsHandoffComplete)).toBe(false);
    expect(hasEmergencyPermission(role, EMERGENCY_PERMISSION_KEYS.patientCreate)).toBe(false);
    expect(hasEmergencyPermission(role, EMERGENCY_PERMISSION_KEYS.displayPublicWaitboard)).toBe(
      true,
    );
  });

  it('Nest maps EMS roles without CONFIGURE_SYSTEM', () => {
    for (const role of [
      EMERGENCY_ROLE_ID.emsUser,
      EMERGENCY_ROLE_ID.dispatcher,
      EMERGENCY_ROLE_ID.emsCoordinator,
    ]) {
      const m = resolveNestMappingForEmergencyRole(role);
      expect(m.nestPermissions).not.toContain(NEST_PERMISSION.CONFIGURE_SYSTEM);
    }
  });
});
