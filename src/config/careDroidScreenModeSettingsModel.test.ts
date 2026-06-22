import { describe, expect, it } from 'vitest';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';
import {
  EMERGENCY_ROLE_ID,
  coerceScreenModeForRole,
  isRoleAllowedForScreenMode,
} from './emergencyScreenModeAccessModel';
import {
  normalizeCareDroidScreenModeSettings,
  PUBLIC_DISPLAY_PRIVACY_LEVEL,
  resolveConfiguredScreenModeKpiIds,
} from './careDroidScreenModeSettingsModel';

describe('careDroidScreenModeSettingsModel', () => {
  it('normalizes tenant screen mode settings with defaults', () => {
    const settings = normalizeCareDroidScreenModeSettings({
      defaultScreenMode: CARE_DROID_SCREEN_MODES.chargeNurse,
      enabledScreenModes: [
        CARE_DROID_SCREEN_MODES.chargeNurse,
        CARE_DROID_SCREEN_MODES.publicWaiting,
      ],
      wallDisplayRefreshInterval: 15000,
    });

    expect(settings.defaultScreenMode).toBe(CARE_DROID_SCREEN_MODES.chargeNurse);
    expect(settings.enabledScreenModes).toContain(CARE_DROID_SCREEN_MODES.publicWaiting);
    expect(settings.wallDisplayRefreshInterval).toBe(15000);
    expect(settings.publicDisplayPrivacy).toBe('standard');
  });

  it('enforces allowed roles per screen mode', () => {
    const settings = normalizeCareDroidScreenModeSettings({
      allowedRolesByScreenMode: {
        [CARE_DROID_SCREEN_MODES.triage]: [EMERGENCY_ROLE_ID.triageNurse],
      },
    });

    expect(
      isRoleAllowedForScreenMode(
        EMERGENCY_ROLE_ID.triageNurse,
        CARE_DROID_SCREEN_MODES.triage,
        settings,
      ),
    ).toBe(true);
    expect(
      isRoleAllowedForScreenMode(
        EMERGENCY_ROLE_ID.registrationClerk,
        CARE_DROID_SCREEN_MODES.triage,
        settings,
      ),
    ).toBe(false);
  });

  it('coerces disallowed screen modes to an enabled fallback for the role', () => {
    const settings = normalizeCareDroidScreenModeSettings({
      enabledScreenModes: [
        CARE_DROID_SCREEN_MODES.reception,
        CARE_DROID_SCREEN_MODES.triage,
      ],
      allowedRolesByScreenMode: {
        [CARE_DROID_SCREEN_MODES.reception]: [EMERGENCY_ROLE_ID.registrationClerk],
        [CARE_DROID_SCREEN_MODES.triage]: [EMERGENCY_ROLE_ID.triageNurse],
      },
    });

    expect(
      coerceScreenModeForRole(
        CARE_DROID_SCREEN_MODES.triage,
        EMERGENCY_ROLE_ID.registrationClerk,
        {
          allowedRolesByScreenMode: settings.allowedRolesByScreenMode,
          enabledScreenModes: settings.enabledScreenModes,
          defaultScreenMode: settings.defaultScreenMode,
        },
      ),
    ).toBe(CARE_DROID_SCREEN_MODES.reception);
  });

  it('limits public waiting KPIs under minimal public display privacy', () => {
    const settings = normalizeCareDroidScreenModeSettings({
      publicDisplayPrivacy: PUBLIC_DISPLAY_PRIVACY_LEVEL.minimal,
      screenModeKpiVisibility: {
        [CARE_DROID_SCREEN_MODES.publicWaiting]: [
          'average-wait-range',
          'crowd-level',
          'process-stage-messaging',
        ],
      },
    });

    expect(resolveConfiguredScreenModeKpiIds(CARE_DROID_SCREEN_MODES.publicWaiting, settings)).toEqual(
      ['crowd-level'],
    );
  });
});
