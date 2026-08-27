import { describe, expect, it } from 'vitest';
import { CARE_DROID_SCREEN_MODES } from '../config/careDroidScreenModes';
import { CANONICAL_ROUTES } from './routes.config';
import { EMERGENCY_ROLE_ID } from './emergencyRoleScreenMatrix';
import {
  DEFAULT_SCREEN_MODE_BY_ROLE,
  coerceEnabledScreenMode,
  getDefaultScreenModeForRole,
  getPersonaLabelForRole,
  isPublicDisplayScreenMode,
  isWallKioskScreenMode,
  resolveDisplayParamScreenMode,
  resolveEmergencyScreenMode,
  resolveRouteScreenMode,
} from './emergencyRoleScreenMatrix';

describe('emergencyRoleScreenMatrix', () => {
  it('maps canonical ED roles to default screen modes', () => {
    expect(DEFAULT_SCREEN_MODE_BY_ROLE[EMERGENCY_ROLE_ID.registrationClerk]).toBe(
      CARE_DROID_SCREEN_MODES.reception,
    );
    expect(DEFAULT_SCREEN_MODE_BY_ROLE[EMERGENCY_ROLE_ID.triageNurse]).toBe(
      CARE_DROID_SCREEN_MODES.triage,
    );
    expect(DEFAULT_SCREEN_MODE_BY_ROLE[EMERGENCY_ROLE_ID.chargeNurse]).toBe(
      CARE_DROID_SCREEN_MODES.chargeNurse,
    );
    expect(DEFAULT_SCREEN_MODE_BY_ROLE[EMERGENCY_ROLE_ID.physician]).toBe(
      CARE_DROID_SCREEN_MODES.physician,
    );
    expect(DEFAULT_SCREEN_MODE_BY_ROLE[EMERGENCY_ROLE_ID.emsUser]).toBe(
      CARE_DROID_SCREEN_MODES.ems,
    );
    expect(DEFAULT_SCREEN_MODE_BY_ROLE[EMERGENCY_ROLE_ID.edManager]).toBe(
      CARE_DROID_SCREEN_MODES.commandCenter,
    );
    expect(DEFAULT_SCREEN_MODE_BY_ROLE[EMERGENCY_ROLE_ID.admin]).toBe(
      CARE_DROID_SCREEN_MODES.admin,
    );
    expect(DEFAULT_SCREEN_MODE_BY_ROLE[EMERGENCY_ROLE_ID.readOnlyViewer]).toBe(
      CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
    );
  });

  it('resolves display query params to wall modes', () => {
    expect(resolveDisplayParamScreenMode('readonly')).toBe(
      CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
    );
    expect(resolveDisplayParamScreenMode('waiting-room')).toBe(
      CARE_DROID_SCREEN_MODES.publicWaiting,
    );
  });

  it('resolves reception and EMS routes to role screens', () => {
    expect(
      resolveRouteScreenMode(CANONICAL_ROUTES.emergencyReception, EMERGENCY_ROLE_ID.physician),
    ).toBe(CARE_DROID_SCREEN_MODES.reception);
    expect(
      resolveRouteScreenMode(
        CANONICAL_ROUTES.emergencyReception,
        EMERGENCY_ROLE_ID.triageNurse,
        {},
        'pretriage',
      ),
    ).toBe(CARE_DROID_SCREEN_MODES.triage);
    expect(
      resolveRouteScreenMode(CANONICAL_ROUTES.emergencyReception, EMERGENCY_ROLE_ID.triageNurse),
    ).toBe(CARE_DROID_SCREEN_MODES.triage);
    expect(
      resolveEmergencyScreenMode({
        pathname: CANONICAL_ROUTES.emergencyReception,
        role: EMERGENCY_ROLE_ID.physician,
      }),
    ).toBe(CARE_DROID_SCREEN_MODES.reception);
    expect(resolveRouteScreenMode(CANONICAL_ROUTES.emergencyEms, EMERGENCY_ROLE_ID.emsUser)).toBe(
      CARE_DROID_SCREEN_MODES.ems,
    );
    expect(
      resolveRouteScreenMode(CANONICAL_ROUTES.emergencyQueues, EMERGENCY_ROLE_ID.triageNurse),
    ).toBe(CARE_DROID_SCREEN_MODES.triage);
    expect(
      resolveRouteScreenMode(CANONICAL_ROUTES.emergencyReassessment, EMERGENCY_ROLE_ID.triageNurse),
    ).toBe(CARE_DROID_SCREEN_MODES.triage);
  });

  it('forces non-ED department pages to a no-pills mode for every visiting role (regression: was falling through to the visiting role\'s own unrelated default)', () => {
    expect(
      resolveEmergencyScreenMode({
        pathname: CANONICAL_ROUTES.laboratory,
        role: EMERGENCY_ROLE_ID.readOnlyViewer,
      }),
    ).toBe(CARE_DROID_SCREEN_MODES.readOnlyWhiteboard);
    expect(
      resolveEmergencyScreenMode({
        pathname: CANONICAL_ROUTES.pharmacy,
        role: EMERGENCY_ROLE_ID.physician,
      }),
    ).toBe(CARE_DROID_SCREEN_MODES.readOnlyWhiteboard);
    expect(
      resolveEmergencyScreenMode({
        pathname: CANONICAL_ROUTES.radiology,
        role: EMERGENCY_ROLE_ID.triageNurse,
      }),
    ).toBe(CARE_DROID_SCREEN_MODES.readOnlyWhiteboard);
  });

  it('uses command center on whiteboard when tenant commandCenterMode is enabled', () => {
    expect(
      resolveRouteScreenMode(CANONICAL_ROUTES.emergencyWhiteboard, EMERGENCY_ROLE_ID.edManager, {
        commandCenterMode: true,
      }),
    ).toBe(CARE_DROID_SCREEN_MODES.commandCenter);
  });

  it('uses command center on analytics route', () => {
    expect(resolveRouteScreenMode(CANONICAL_ROUTES.emergencyAnalytics, EMERGENCY_ROLE_ID.edManager)).toBe(
      CARE_DROID_SCREEN_MODES.commandCenter,
    );
  });

  it('respects enabledScreenModes tenant filter', () => {
    const mode = resolveEmergencyScreenMode({
      pathname: CANONICAL_ROUTES.emergencyWhiteboard,
      role: EMERGENCY_ROLE_ID.triageNurse,
      emergencySettings: {
        enabledScreenModes: [CARE_DROID_SCREEN_MODES.chargeNurse],
      },
    });
    expect(mode).toBe(CARE_DROID_SCREEN_MODES.chargeNurse);
  });

  it('coerces disabled modes to first enabled mode and accepts legacy aliases', () => {
    expect(
      coerceEnabledScreenMode(CARE_DROID_SCREEN_MODES.triage, [
        CARE_DROID_SCREEN_MODES.chargeNurse,
        CARE_DROID_SCREEN_MODES.physician,
      ]),
    ).toBe(CARE_DROID_SCREEN_MODES.chargeNurse);
    expect(
      coerceEnabledScreenMode('REGISTRATION_SCREEN', [CARE_DROID_SCREEN_MODES.reception]),
    ).toBe(CARE_DROID_SCREEN_MODES.reception);
  });

  it('identifies wall kiosk layouts', () => {
    expect(isWallKioskScreenMode(CARE_DROID_SCREEN_MODES.readOnlyWhiteboard)).toBe(true);
    expect(isWallKioskScreenMode(CARE_DROID_SCREEN_MODES.publicWaiting)).toBe(true);
    expect(isWallKioskScreenMode(CARE_DROID_SCREEN_MODES.chargeNurse)).toBe(false);
  });

  it('returns ED persona labels for roles', () => {
    expect(getPersonaLabelForRole('registration_clerk')).toContain('Receptionist');
    expect(getDefaultScreenModeForRole('triage_nurse')).toBe(CARE_DROID_SCREEN_MODES.triage);
    expect(getPersonaLabelForRole('ed_manager')).toContain('Director');
  });

  it('identifies public waiting display screen mode without runtime errors', () => {
    expect(isPublicDisplayScreenMode(CARE_DROID_SCREEN_MODES.publicWaiting)).toBe(true);
    expect(isPublicDisplayScreenMode(CARE_DROID_SCREEN_MODES.chargeNurse)).toBe(false);
  });
});
