import { describe, expect, it } from 'vitest';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';
import {
  EMERGENCY_ROLE_ACTIONS,
  EMERGENCY_ROLE_ACTION_MATRIX,
  presentEmergencyRoleAction,
  resolveEmergencyRoleActionState,
} from './emergencyRoleActionMatrix';
import { EMERGENCY_ROLE_ID } from './emergencyRoleScreenMatrix';

describe('emergencyRoleActionMatrix', () => {
  it('defines matrix entries for every role and requested action', () => {
    for (const roleId of Object.values(EMERGENCY_ROLE_ID)) {
      for (const actionId of Object.values(EMERGENCY_ROLE_ACTIONS)) {
        expect(EMERGENCY_ROLE_ACTION_MATRIX[roleId][actionId]).toBeDefined();
      }
    }
  });

  it('allows receptionist intake actions and hides clinical controls', () => {
    expect(
      resolveEmergencyRoleActionState(
        EMERGENCY_ROLE_ID.registrationClerk,
        EMERGENCY_ROLE_ACTIONS.patientCreate,
      ),
    ).toBe('allowed');
    expect(
      resolveEmergencyRoleActionState(
        EMERGENCY_ROLE_ID.registrationClerk,
        EMERGENCY_ROLE_ACTIONS.assignAcuity,
      ),
    ).toBe('hidden');
  });

  it('allows triage nurse acuity and queue actions', () => {
    expect(
      resolveEmergencyRoleActionState(
        EMERGENCY_ROLE_ID.triageNurse,
        EMERGENCY_ROLE_ACTIONS.assignAcuity,
      ),
    ).toBe('allowed');
    expect(
      resolveEmergencyRoleActionState(
        EMERGENCY_ROLE_ID.triageNurse,
        EMERGENCY_ROLE_ACTIONS.createReferral,
      ),
    ).toBe('hidden');
  });

  it('disables charge nurse disposition while allowing referrals', () => {
    const disposition = presentEmergencyRoleAction(
      EMERGENCY_ROLE_ID.chargeNurse,
      EMERGENCY_ROLE_ACTIONS.disposition,
    );
    const referral = presentEmergencyRoleAction(
      EMERGENCY_ROLE_ID.chargeNurse,
      EMERGENCY_ROLE_ACTIONS.createReferral,
    );

    expect(disposition.visible).toBe(true);
    expect(disposition.enabled).toBe(false);
    expect(referral.enabled).toBe(true);
  });

  it('allows physician disposition and hides patient create', () => {
    expect(
      resolveEmergencyRoleActionState(
        EMERGENCY_ROLE_ID.physician,
        EMERGENCY_ROLE_ACTIONS.disposition,
      ),
    ).toBe('allowed');
    expect(
      resolveEmergencyRoleActionState(
        EMERGENCY_ROLE_ID.physician,
        EMERGENCY_ROLE_ACTIONS.patientCreate,
      ),
    ).toBe('hidden');
  });

  it('limits EMS handoff nurse to EMS workflow actions', () => {
    expect(
      resolveEmergencyRoleActionState(
        EMERGENCY_ROLE_ID.emsUser,
        EMERGENCY_ROLE_ACTIONS.completeEmsHandoff,
      ),
    ).toBe('allowed');
    expect(
      resolveEmergencyRoleActionState(
        EMERGENCY_ROLE_ID.emsUser,
        EMERGENCY_ROLE_ACTIONS.demographicsEdit,
      ),
    ).toBe('hidden');
  });

  it('shows manager operational actions as disabled or readonly where appropriate', () => {
    expect(
      resolveEmergencyRoleActionState(
        EMERGENCY_ROLE_ID.edManager,
        EMERGENCY_ROLE_ACTIONS.patientCreate,
      ),
    ).toBe('disabled');
    expect(
      resolveEmergencyRoleActionState(
        EMERGENCY_ROLE_ID.edManager,
        EMERGENCY_ROLE_ACTIONS.settingsEdit,
      ),
    ).toBe('readonly');
    expect(
      resolveEmergencyRoleActionState(
        EMERGENCY_ROLE_ID.edManager,
        EMERGENCY_ROLE_ACTIONS.publicDisplayPublish,
      ),
    ).toBe('allowed');
  });

  it('grants admin full action control', () => {
    for (const actionId of Object.values(EMERGENCY_ROLE_ACTIONS)) {
      expect(
        resolveEmergencyRoleActionState(EMERGENCY_ROLE_ID.admin, actionId),
      ).toBe('allowed');
    }
  });

  it('keeps public display role read-only for publish and hides mutations', () => {
    expect(
      resolveEmergencyRoleActionState(
        EMERGENCY_ROLE_ID.readOnlyViewer,
        EMERGENCY_ROLE_ACTIONS.publicDisplayPublish,
      ),
    ).toBe('readonly');
    expect(
      resolveEmergencyRoleActionState(
        EMERGENCY_ROLE_ID.readOnlyViewer,
        EMERGENCY_ROLE_ACTIONS.patientCreate,
      ),
    ).toBe('hidden');
  });

  it('downgrades allowed actions to readonly on public display context', () => {
    expect(
      resolveEmergencyRoleActionState(
        EMERGENCY_ROLE_ID.chargeNurse,
        EMERGENCY_ROLE_ACTIONS.moveQueue,
        {},
        { screenMode: CARE_DROID_SCREEN_MODES.publicWaiting, displayParam: 'waiting-room' },
      ),
    ).toBe('readonly');
  });
});
