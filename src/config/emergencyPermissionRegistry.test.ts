import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import {
  EMERGENCY_PERMISSION_KEYS,
  ROLE_PERMISSION_GRANTS,
  canAccessEmergencyRoutePermission,
  canPerformEmergencyMutation,
  hasEmergencyPermission,
  isPublicDisplayContext,
  isReadOnlyOperationalContext,
  resolveEmergencyPermissionKey,
} from './emergencyPermissionRegistry';
import { EMERGENCY_ROLE_ID } from './emergencyRoleScreenMatrix';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';
import {
  EMERGENCY_ACTIONS,
  EMERGENCY_ROLE_IDS,
  canMutateEmergencySurface,
  hasEmergencyActionPermission,
} from './emergencyRolePermissions';

describe('emergencyPermissionRegistry', () => {
  it('normalizes legacy action aliases to canonical keys', () => {
    expect(resolveEmergencyPermissionKey('triage.manage')).toBe(
      EMERGENCY_PERMISSION_KEYS.triageAssignAcuity,
    );
    expect(resolveEmergencyPermissionKey('patient.transition')).toBe(
      EMERGENCY_PERMISSION_KEYS.queueMove,
    );
    expect(resolveEmergencyPermissionKey('ems.completeHandoff')).toBe(
      EMERGENCY_PERMISSION_KEYS.emsHandoffComplete,
    );
    expect(resolveEmergencyPermissionKey('referrals.manage')).toBe(
      EMERGENCY_PERMISSION_KEYS.referralCreate,
    );
  });

  it('exposes canonical permission keys requested for CareDroid', () => {
    expect(EMERGENCY_PERMISSION_KEYS.patientCreate).toBe('patient.create');
    expect(EMERGENCY_PERMISSION_KEYS.patientDemographicsEdit).toBe('patient.demographics.edit');
    expect(EMERGENCY_PERMISSION_KEYS.encounterCreate).toBe('encounter.create');
    expect(EMERGENCY_PERMISSION_KEYS.triageAssignAcuity).toBe('triage.assign_acuity');
    expect(EMERGENCY_PERMISSION_KEYS.queueMove).toBe('queue.move');
    expect(EMERGENCY_PERMISSION_KEYS.reassessmentComplete).toBe('reassessment.complete');
    expect(EMERGENCY_PERMISSION_KEYS.emsHandoffComplete).toBe('ems.handoff.complete');
    expect(EMERGENCY_PERMISSION_KEYS.referralCreate).toBe('referral.create');
    expect(EMERGENCY_PERMISSION_KEYS.settingsManage).toBe('settings.manage');
    expect(EMERGENCY_PERMISSION_KEYS.displayPublicWaitboard).toBe('display.public.waitboard');
    expect(EMERGENCY_PERMISSION_KEYS.displayWhiteboardReadonly).toBe('display.whiteboard.readonly');
  });

  it('grants triage and registration permissions to the right roles', () => {
    expect(
      hasEmergencyPermission(EMERGENCY_ROLE_ID.triageNurse, EMERGENCY_PERMISSION_KEYS.triageAssignAcuity),
    ).toBe(true);
    expect(
      hasEmergencyPermission(
        EMERGENCY_ROLE_ID.registrationClerk,
        EMERGENCY_PERMISSION_KEYS.encounterCreate,
      ),
    ).toBe(true);
    expect(
      hasEmergencyPermission(EMERGENCY_ROLE_ID.registrationClerk, EMERGENCY_PERMISSION_KEYS.triageAssignAcuity),
    ).toBe(false);
    expect(
      hasEmergencyPermission(EMERGENCY_ROLE_ID.readOnlyViewer, EMERGENCY_PERMISSION_KEYS.analyticsView),
    ).toBe(true);
    expect(
      hasEmergencyPermission(EMERGENCY_ROLE_ID.readOnlyViewer, EMERGENCY_PERMISSION_KEYS.patientCreate),
    ).toBe(false);
  });

  it('blocks mutations in public and read-only display contexts', () => {
    const publicContext = {
      screenMode: CARE_DROID_SCREEN_MODES.publicWaiting,
      displayParam: 'waiting-room',
    };
    expect(isPublicDisplayContext(publicContext)).toBe(true);
    expect(
      canPerformEmergencyMutation(
        EMERGENCY_ROLE_ID.chargeNurse,
        EMERGENCY_PERMISSION_KEYS.queueMove,
        {},
        publicContext,
      ),
    ).toBe(false);
    expect(
      hasEmergencyPermission(
        EMERGENCY_ROLE_ID.readOnlyViewer,
        EMERGENCY_PERMISSION_KEYS.displayPublicWaitboard,
      ),
    ).toBe(true);

    const readOnlyContext = {
      screenMode: CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
      displayParam: 'readonly',
    };
    expect(isReadOnlyOperationalContext(readOnlyContext)).toBe(true);
    expect(canMutateEmergencySurface(EMERGENCY_ROLE_ID.physician, readOnlyContext)).toBe(false);
  });

  it('maps route permissions for sensitive destinations', () => {
    expect(
      canAccessEmergencyRoutePermission(EMERGENCY_ROLE_ID.admin, CANONICAL_ROUTES.emergencySettings),
    ).toBe(true);
    expect(
      canAccessEmergencyRoutePermission(
        EMERGENCY_ROLE_ID.physician,
        CANONICAL_ROUTES.emergencySettings,
      ),
    ).toBe(false);
    expect(
      canAccessEmergencyRoutePermission(
        EMERGENCY_ROLE_ID.emsUser,
        CANONICAL_ROUTES.emergencyWhiteboard,
      ),
    ).toBe(true);
  });

  it('keeps EMERGENCY_ACTIONS aligned with canonical registry keys', () => {
    expect(EMERGENCY_ACTIONS.createPatient).toBe(EMERGENCY_PERMISSION_KEYS.patientCreate);
    expect(EMERGENCY_ACTIONS.triage).toBe(EMERGENCY_PERMISSION_KEYS.triageAssignAcuity);
    expect(EMERGENCY_ACTIONS.transitionPatient).toBe(EMERGENCY_PERMISSION_KEYS.queueMove);
    expect(EMERGENCY_ACTIONS.completeEmsHandoff).toBe(EMERGENCY_PERMISSION_KEYS.emsHandoffComplete);
    expect(EMERGENCY_ACTIONS.manageReferral).toBe(EMERGENCY_PERMISSION_KEYS.referralCreate);
  });

  it('merges tenant overrides through hasEmergencyActionPermission', () => {
    expect(
      hasEmergencyActionPermission(
        EMERGENCY_ROLE_IDS.readOnlyViewer,
        EMERGENCY_ACTIONS.createPatient,
        { [EMERGENCY_ROLE_IDS.readOnlyViewer]: [EMERGENCY_ACTIONS.createPatient] },
      ),
    ).toBe(true);
  });

  it('defines grants for every CareDroid role', () => {
    for (const roleId of Object.values(EMERGENCY_ROLE_ID)) {
      expect(ROLE_PERMISSION_GRANTS[roleId]?.length).toBeGreaterThan(0);
    }
  });
});
