import { describe, expect, it } from 'vitest';
import { EMERGENCY_ACTIONS, EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import {
  RECEPTION_SCREEN_ACTIONS,
  RECEPTION_SCREEN_WIDGETS,
  resolveReceptionScreenCapabilities,
} from './receptionScreenModel';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';

describe('receptionScreenModel', () => {
  const clerkCan = (action: string) =>
    action === EMERGENCY_ACTIONS.createPatient ||
    action === EMERGENCY_ACTIONS.verifyIntake ||
    action === EMERGENCY_ACTIONS.createEncounter ||
    action === EMERGENCY_ACTIONS.receptionEscalate ||
    action === EMERGENCY_ACTIONS.convertEmsArrival ||
    action === 'patient.create' ||
    action === 'intake.verify' ||
    action === 'encounter.create' ||
    action === 'reception.escalate' ||
    action === 'ems.convertArrival';

  it('enables reception workflow artifacts for registration clerk on RECEPTION_SCREEN', () => {
    const reception = resolveReceptionScreenCapabilities({
      screenMode: CARE_DROID_SCREEN_MODES.reception,
      role: EMERGENCY_ROLE_IDS.registrationClerk,
      roleLabel: 'Registration Clerk',
      can: clerkCan,
    });

    expect(reception.isReceptionScreen).toBe(true);
    expect(reception.showWidget(RECEPTION_SCREEN_WIDGETS.patientSearch)).toBe(true);
    expect(reception.showWidget(RECEPTION_SCREEN_WIDGETS.smartIntake)).toBe(true);
    expect(reception.showWidget(RECEPTION_SCREEN_WIDGETS.queues)).toBe(true);
    expect(reception.showWidget(RECEPTION_SCREEN_WIDGETS.urgentTriageEscalation)).toBe(true);
    expect(reception.canSearchPatients).toBe(true);
    expect(reception.canCreatePatient).toBe(true);
    expect(reception.canVerifyIdentity).toBe(true);
    expect(reception.canCreateEncounter).toBe(true);
    expect(reception.canCaptureArrivalReason).toBe(true);
    expect(reception.canEscalateToNurse).toBe(true);
    expect(reception.canOpenSmartIntake).toBe(true);
    expect(reception.canAssignQueue).toBe(false);
    expect(reception.showClinicalTriageAssist).toBe(false);
    expect(reception.defaultLandingRoute).toContain('/emergency/reception');
  });

  it('blocks reception actions outside RECEPTION_SCREEN', () => {
    const triage = resolveReceptionScreenCapabilities({
      screenMode: CARE_DROID_SCREEN_MODES.triage,
      role: EMERGENCY_ROLE_IDS.triageNurse,
      can: () => true,
    });

    expect(triage.isReceptionScreen).toBe(false);
    expect(triage.canCreatePatient).toBe(false);
    expect(triage.showWidget(RECEPTION_SCREEN_WIDGETS.patientCreation)).toBe(false);
    expect(triage.canPerform(RECEPTION_SCREEN_ACTIONS.createPatient)).toBe(false);
  });
});
