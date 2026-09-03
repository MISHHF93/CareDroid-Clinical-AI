import { describe, expect, it } from 'vitest';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';
import {
  resolvePatientCardDensityVariant,
  resolveScreenDensityProfile,
  screenDensityShellClassName,
} from './screenDensityModeModel';

describe('screenDensityModeModel', () => {
  it('maps primary screen modes to role-specific density profiles', () => {
    expect(resolveScreenDensityProfile(CARE_DROID_SCREEN_MODES.reception).id).toBe('simple-fast');
    expect(resolveScreenDensityProfile(CARE_DROID_SCREEN_MODES.triage).id).toBe('medium-safety');
    expect(resolveScreenDensityProfile(CARE_DROID_SCREEN_MODES.chargeNurse).id).toBe(
      'high-operational',
    );
    expect(resolveScreenDensityProfile(CARE_DROID_SCREEN_MODES.physician).id).toBe(
      'patient-clinical',
    );
    expect(resolveScreenDensityProfile(CARE_DROID_SCREEN_MODES.publicWaiting).id).toBe(
      'public-aggregate',
    );
    expect(resolveScreenDensityProfile(CARE_DROID_SCREEN_MODES.commandCenter).id).toBe(
      'metric-aggregate',
    );
  });

  it('enables safety flags on triage medium density but not reception simple mode', () => {
    expect(
      resolveScreenDensityProfile(CARE_DROID_SCREEN_MODES.triage).patientCard.showSafetyFlags,
    ).toBe(true);
    expect(
      resolveScreenDensityProfile(CARE_DROID_SCREEN_MODES.reception).patientCard.showSafetyFlags,
    ).toBe(false);
  });

  it('uses operational patient cards for charge nurse and clinical cards for physician', () => {
    expect(resolvePatientCardDensityVariant(CARE_DROID_SCREEN_MODES.chargeNurse)).toBe(
      'operational',
    );
    expect(resolvePatientCardDensityVariant(CARE_DROID_SCREEN_MODES.physician)).toBe('clinical');
    expect(resolvePatientCardDensityVariant(CARE_DROID_SCREEN_MODES.reception)).toBe('simple');
  });

  it('hides patient grid clutter on command center and public aggregate modes', () => {
    expect(
      resolveScreenDensityProfile(CARE_DROID_SCREEN_MODES.commandCenter).whiteboard.maxVisibleCards,
    ).toBeNull();
    expect(
      resolveScreenDensityProfile(CARE_DROID_SCREEN_MODES.publicWaiting).patientCard
        .showQueueReason,
    ).toBe(false);
  });

  it('exposes shell class names without forking layout components', () => {
    expect(screenDensityShellClassName(CARE_DROID_SCREEN_MODES.triage)).toContain(
      'emergency-app-shell--density-comfortable',
    );
    expect(screenDensityShellClassName(CARE_DROID_SCREEN_MODES.triage)).toContain(
      'emergency-app-shell--screen-density-medium-safety',
    );
    expect(screenDensityShellClassName(CARE_DROID_SCREEN_MODES.chargeNurse)).toContain(
      'emergency-app-shell--density-compact',
    );
  });
});
