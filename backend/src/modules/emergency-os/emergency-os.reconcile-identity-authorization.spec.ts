import { ForbiddenException } from '@nestjs/common';
import { assertCanReconcilePatientIdentity } from './emergency-os.controller';

/**
 * Reconcile Patient Identity (confirms a provisional "Unknown Patient" /
 * "Temporary Patient" / "Identity Pending" record's real identity once it
 * becomes known -- see EmergencyPatientService.reconcilePatientIdentity's
 * own doc comment). WRITE_PHI alone is too coarse: this mirrors the
 * frontend's own patientDemographicsEdit permission grant (src/config/
 * emergencyPermissionRegistry.ts's ROLE_PERMISSION_GRANTS), which is
 * admin/charge_nurse/triage_nurse/physician/registration_clerk -- NOT every
 * WRITE_PHI-capable role (ems_user, dispatcher, ems_coordinator lack
 * patientDemographicsEdit there). Mirrors
 * emergency-os.transport-request-authorization.spec.ts's coverage shape for
 * assertCanRequestEmergencyTransport.
 */
describe('assertCanReconcilePatientIdentity', () => {
  it.each(['admin', 'charge_nurse', 'triage_nurse', 'physician', 'registration_clerk'])(
    'allows %s to reconcile a patient identity',
    (roleProfileId) => {
      expect(() => assertCanReconcilePatientIdentity(roleProfileId)).not.toThrow();
    },
  );

  it.each([
    'ems_user',
    'dispatcher',
    'ems_coordinator',
    'ed_manager',
    'it_admin',
    'read_only_viewer',
  ])(
    'rejects %s -- not every WRITE_PHI-capable role has patientDemographicsEdit',
    (roleProfileId) => {
      expect(() => assertCanReconcilePatientIdentity(roleProfileId)).toThrow(ForbiddenException);
    },
  );

  it('fails closed when roleProfileId is missing entirely', () => {
    expect(() => assertCanReconcilePatientIdentity(null)).toThrow(ForbiddenException);
    expect(() => assertCanReconcilePatientIdentity(undefined)).toThrow(ForbiddenException);
    expect(() => assertCanReconcilePatientIdentity('')).toThrow(ForbiddenException);
  });
});
