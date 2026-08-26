import { ForbiddenException } from '@nestjs/common';
import { assertCanRequestEmergencyTransport } from './emergency-os.controller';

/**
 * Request Emergency Transport (physician-initiated SIMULATED transport
 * request from a patient chart -- see EMSIntakeService.requestPhysicianTransport's
 * own doc comment for why this is a simulation, not a real dispatch).
 * WRITE_PHI alone is too coarse: every clinical role that can write PHI
 * (charge_nurse, triage_nurse, registration_clerk, ems_user, dispatcher,
 * ems_coordinator) should NOT automatically get a physician's clinical
 * decision to request transport for a patient -- only physician-tier roles
 * (plus admin, the same superuser override every other role-scoped check in
 * this controller already grants) can. Mirrors
 * emergency-os.patch-patient-field-authorization.spec.ts's coverage shape
 * for assertCanWriteVitalsOrFlags.
 */
describe('assertCanRequestEmergencyTransport', () => {
  it.each(['physician', 'admin'])('allows %s to request emergency transport', (roleProfileId) => {
    expect(() => assertCanRequestEmergencyTransport(roleProfileId)).not.toThrow();
  });

  it.each([
    'charge_nurse',
    'triage_nurse',
    'registration_clerk',
    'ems_user',
    'dispatcher',
    'ems_coordinator',
    'ed_manager',
    'it_admin',
    'read_only_viewer',
  ])('rejects %s -- physician-tier only, not every WRITE_PHI-capable role', (roleProfileId) => {
    expect(() => assertCanRequestEmergencyTransport(roleProfileId)).toThrow(ForbiddenException);
  });

  it('fails closed when roleProfileId is missing entirely', () => {
    expect(() => assertCanRequestEmergencyTransport(null)).toThrow(ForbiddenException);
    expect(() => assertCanRequestEmergencyTransport(undefined)).toThrow(ForbiddenException);
    expect(() => assertCanRequestEmergencyTransport('')).toThrow(ForbiddenException);
  });
});
