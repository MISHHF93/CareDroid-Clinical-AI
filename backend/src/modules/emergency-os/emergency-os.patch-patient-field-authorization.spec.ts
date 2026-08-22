import { ForbiddenException } from '@nestjs/common';
import { assertCanWriteVitalsOrFlags } from './emergency-os.controller';

/**
 * P0 fix: PATCH /emergency/patients/:patientId bundled state-transition,
 * vitals, and flags writes behind one coarse @RequirePermission(WRITE_PHI)
 * check. Multiple emergency roles that map to UserRole.NURSE (which grants
 * WRITE_PHI unconditionally) -- registration_clerk, ems_user, dispatcher,
 * ems_coordinator -- could therefore write clinical vitals or manipulate
 * patient safety flags (e.g. clear a SepsisAlert/HighRisk flag) via direct
 * API call despite src/config/emergencyRolePermissions.ts never granting
 * them writeVitals/manageFlags, and the UI never exposing that control.
 * Only charge_nurse, triage_nurse, physician, and admin actually have both
 * actions in that registry -- ported verbatim here.
 */
describe('assertCanWriteVitalsOrFlags', () => {
  it('allows a state-only patch (no vitals/flags) for any/no roleProfileId', () => {
    expect(() => assertCanWriteVitalsOrFlags(null, {})).not.toThrow();
    expect(() => assertCanWriteVitalsOrFlags('registration_clerk', {})).not.toThrow();
  });

  it.each(['charge_nurse', 'triage_nurse', 'physician', 'admin'])(
    'allows vitals/flags writes for %s',
    (roleProfileId) => {
      expect(() => assertCanWriteVitalsOrFlags(roleProfileId, { vitals: [{}] })).not.toThrow();
      expect(() =>
        assertCanWriteVitalsOrFlags(roleProfileId, { flags: ['HighRisk'] }),
      ).not.toThrow();
    },
  );

  it.each([
    'registration_clerk',
    'ems_user',
    'dispatcher',
    'ems_coordinator',
    'ed_manager',
    'it_admin',
  ])(
    'rejects vitals/flags writes for %s -- confirmed live-exploitable before this fix',
    (roleProfileId) => {
      expect(() => assertCanWriteVitalsOrFlags(roleProfileId, { vitals: [{}] })).toThrow(
        ForbiddenException,
      );
      expect(() => assertCanWriteVitalsOrFlags(roleProfileId, { flags: ['HighRisk'] })).toThrow(
        ForbiddenException,
      );
    },
  );

  it('fails closed when roleProfileId is missing entirely', () => {
    expect(() => assertCanWriteVitalsOrFlags(null, { vitals: [{}] })).toThrow(ForbiddenException);
    expect(() => assertCanWriteVitalsOrFlags(undefined, { flags: ['HighRisk'] })).toThrow(
      ForbiddenException,
    );
  });
});
