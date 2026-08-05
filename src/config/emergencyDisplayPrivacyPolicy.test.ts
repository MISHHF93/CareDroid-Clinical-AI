import { describe, expect, it } from 'vitest';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';
import {
  formatPrivacySafeComplaint,
  formatPrivacySafeMrn,
  formatPrivacySafePatientName,
  pseudonymizePatientId,
  resolveEmergencyDisplayPrivacyPolicy,
  shouldRedactCentralNodeForDisplayPrivacy,
  shouldRedactSensitiveEmergencyData,
} from './emergencyDisplayPrivacyPolicy';
import { WALL_DISPLAY_MONITOR_PRIVACY } from './wallDisplayMonitorPrivacyModel';

describe('emergencyDisplayPrivacyPolicy', () => {
  const patient = {
    id: 'patient-abc-1234',
    firstName: 'Avery',
    lastName: 'Stone',
    mrn: 'MRN-001',
    chiefComplaint: 'Chest pain',
  };

  it('redacts all PHI on public waiting display', () => {
    const policy = resolveEmergencyDisplayPrivacyPolicy({
      screenMode: CARE_DROID_SCREEN_MODES.publicWaiting,
    });

    expect(policy.tier).toBe('public');
    expect(policy.showPatientName).toBe(false);
    expect(policy.aggregateMetricsOnly).toBe(true);
    expect(shouldRedactSensitiveEmergencyData(policy)).toBe(true);
    expect(formatPrivacySafePatientName(patient, policy)).toBe('Patient 1234');
    expect(formatPrivacySafeMrn(patient, policy)).toBe('Identifier hidden');
    expect(formatPrivacySafeComplaint(patient.chiefComplaint, policy)).toContain('hidden');
  });

  it('allows full operational detail on reception and clinical screens', () => {
    const reception = resolveEmergencyDisplayPrivacyPolicy({
      screenMode: CARE_DROID_SCREEN_MODES.reception,
    });
    const physician = resolveEmergencyDisplayPrivacyPolicy({
      screenMode: CARE_DROID_SCREEN_MODES.physician,
    });

    expect(reception.showPatientName).toBe(true);
    expect(reception.showMrn).toBe(true);
    expect(reception.showChiefComplaint).toBe(true);
    expect(physician.showVitals).toBe(true);
    expect(shouldRedactSensitiveEmergencyData(physician)).toBe(false);
    expect(formatPrivacySafePatientName(patient, physician)).toBe('Avery Stone');
  });

  it('honors hallway monitor privacy on read-only whiteboard', () => {
    const operational = resolveEmergencyDisplayPrivacyPolicy({
      screenMode: CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
      wallDisplayMonitorPrivacy: WALL_DISPLAY_MONITOR_PRIVACY.operational,
    });
    const restricted = resolveEmergencyDisplayPrivacyPolicy({
      screenMode: CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
      wallDisplayMonitorPrivacy: WALL_DISPLAY_MONITOR_PRIVACY.restricted,
    });
    const minimal = resolveEmergencyDisplayPrivacyPolicy({
      screenMode: CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
      wallDisplayMonitorPrivacy: WALL_DISPLAY_MONITOR_PRIVACY.minimal,
    });

    expect(operational.showPatientName).toBe(true);
    expect(restricted.showPatientName).toBe(false);
    expect(restricted.showHealthCard).toBe(false);
    expect(restricted.showNotes).toBe(false);
    expect(restricted.showStaffComments).toBe(false);
    expect(restricted.showRoomAssignment).toBe(false);
    expect(restricted.showClinicalFlags).toBe(false);
    expect(restricted.aggregateMetricsOnly).toBe(true);
    expect(restricted.centralNodeRedaction).toBe('identifiers');
    expect(minimal.centralNodeRedaction).toBe('full');
    expect(shouldRedactSensitiveEmergencyData(restricted)).toBe(true);
    expect(shouldRedactSensitiveEmergencyData(minimal)).toBe(true);
  });

  it('uses aggregate identifier redaction on command center', () => {
    const policy = resolveEmergencyDisplayPrivacyPolicy({
      screenMode: CARE_DROID_SCREEN_MODES.commandCenter,
    });

    expect(policy.aggregateMetricsOnly).toBe(true);
    expect(policy.centralNodeRedaction).toBe('identifiers');
    expect(formatPrivacySafePatientName(patient, policy)).toBe('Patient 1234');
  });

  it('pseudonymizes using stable patient id suffix', () => {
    expect(pseudonymizePatientId('patient-abc-1234')).toBe('Patient 1234');
  });

  it('requires central-node redaction for restricted and minimal read-only whiteboard privacy', () => {
    expect(
      shouldRedactCentralNodeForDisplayPrivacy(CARE_DROID_SCREEN_MODES.readOnlyWhiteboard, 'minimal'),
    ).toBe(true);
    expect(
      shouldRedactCentralNodeForDisplayPrivacy(
        CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
        'restricted',
      ),
    ).toBe(true);
    expect(
      shouldRedactCentralNodeForDisplayPrivacy(
        CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
        'operational',
      ),
    ).toBe(false);
    expect(
      shouldRedactCentralNodeForDisplayPrivacy(CARE_DROID_SCREEN_MODES.chargeNurse, 'minimal'),
    ).toBe(false);
  });
});
