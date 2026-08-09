import { describe, expect, it } from 'vitest';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModeRegistry';
import {
  coerceScreenModeForRole,
  EMERGENCY_ROLE_ID,
  isRoleAllowedForScreenMode,
  normalizeEmergencyRoleId,
} from './emergencyScreenModeAccessModel';

/**
 * Regression coverage for a real bug found by a repository-wide domain-model
 * audit (2026-08-08): this file's own EMERGENCY_ROLE_ID (kept local to avoid
 * a circular import with emergencyRoleScreenMatrix.ts) had only 9 of the 12
 * canonical role ids -- missing itAdmin/dispatcher/emsCoordinator. Since
 * normalizeEmergencyRoleId() returns null for any id it doesn't recognize,
 * isRoleAllowedForScreenMode() was unconditionally false for those 3 roles
 * for every screen mode, and coerceScreenModeForRole()'s allow-list check
 * became a silent no-op: it neither redirects them to an allowed mode nor
 * blocks them, just returns the unmodified incoming mode.
 */
describe('emergencyScreenModeAccessModel — all 12 canonical roles resolve', () => {
  it('normalizes itAdmin/dispatcher/emsCoordinator instead of returning null', () => {
    expect(normalizeEmergencyRoleId('it_admin')).toBe(EMERGENCY_ROLE_ID.itAdmin);
    expect(normalizeEmergencyRoleId('dispatcher')).toBe(EMERGENCY_ROLE_ID.dispatcher);
    expect(normalizeEmergencyRoleId('ems_coordinator')).toBe(EMERGENCY_ROLE_ID.emsCoordinator);
  });

  it('grants dispatcher/emsCoordinator access to the EMS screen mode', () => {
    expect(isRoleAllowedForScreenMode('dispatcher', CARE_DROID_SCREEN_MODES.ems)).toBe(true);
    expect(isRoleAllowedForScreenMode('ems_coordinator', CARE_DROID_SCREEN_MODES.ems)).toBe(true);
  });

  it('grants itAdmin access to the admin screen mode', () => {
    expect(isRoleAllowedForScreenMode('it_admin', CARE_DROID_SCREEN_MODES.admin)).toBe(true);
  });

  it('coerceScreenModeForRole actually redirects these 3 roles instead of silently no-op-ing', () => {
    // Before the fix: dispatcher requesting the physician screen would fall
    // through the allow-list check entirely (isRoleAllowedForScreenMode
    // always false for an unrecognized role) and coerceScreenModeForRole
    // would return the unmodified, unauthorized incoming mode.
    expect(coerceScreenModeForRole(CARE_DROID_SCREEN_MODES.physician, 'dispatcher')).toBe(
      CARE_DROID_SCREEN_MODES.ems,
    );
    expect(coerceScreenModeForRole(CARE_DROID_SCREEN_MODES.physician, 'ems_coordinator')).toBe(
      CARE_DROID_SCREEN_MODES.ems,
    );
    expect(coerceScreenModeForRole(CARE_DROID_SCREEN_MODES.physician, 'it_admin')).toBe(
      CARE_DROID_SCREEN_MODES.admin,
    );
  });

  it('still correctly denies an unrecognized role entirely (not a blanket allow)', () => {
    expect(normalizeEmergencyRoleId('not_a_real_role')).toBeNull();
    expect(isRoleAllowedForScreenMode('not_a_real_role', CARE_DROID_SCREEN_MODES.ems)).toBe(false);
  });
});
