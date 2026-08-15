import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { alertPatientLabel, redactAlertForRole } from './notificationCenterUtils';
import type { Alert, Patient } from '../types/emergency';

const __dirname = dirname(fileURLToPath(import.meta.url));

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'alert-1',
    severity: 'Warning',
    title: 'Deterioration risk flagged',
    message: 'Sarah Okafor has a deterioration risk flag requiring review.',
    patientId: 'patient-1',
    createdAt: '2026-08-15T12:00:00.000Z',
    dismissed: false,
    ...overrides,
  };
}

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    firstName: 'Sarah',
    lastName: 'Okafor',
    mrn: 'MRN-9001',
    ...overrides,
  } as Patient;
}

describe('redactAlertForRole (HEAL-215)', () => {
  it('replaces title and message when the role cannot view patients and the alert is patient-linked', () => {
    const alert = makeAlert();
    const redacted = redactAlertForRole(alert, false);
    expect(redacted.title).toBe('Patient alert');
    expect(redacted.message).toBe('Details restricted for this role.');
    expect(redacted.message).not.toContain('Sarah Okafor');
  });

  it('leaves the alert untouched when the role can view patients', () => {
    const alert = makeAlert();
    expect(redactAlertForRole(alert, true)).toBe(alert);
  });

  it('leaves non-patient-linked alerts untouched even when the role cannot view patients', () => {
    const alert = makeAlert({ patientId: undefined });
    expect(redactAlertForRole(alert, false)).toBe(alert);
  });

  it('preserves every other field (routing/actions) on the redacted copy', () => {
    const alert = makeAlert({ type: 'deterioration_watch', source: 'waiting-room-monitor' });
    const redacted = redactAlertForRole(alert, false);
    expect(redacted.id).toBe(alert.id);
    expect(redacted.patientId).toBe(alert.patientId);
    expect(redacted.type).toBe(alert.type);
    expect(redacted.source).toBe(alert.source);
  });
});

describe('alertPatientLabel (HEAL-215)', () => {
  it('returns the real name and MRN when the role can view patients', () => {
    const alert = makeAlert();
    const patientById = new Map([['patient-1', makePatient()]]);
    expect(alertPatientLabel(alert, patientById, true)).toBe('Sarah Okafor · MRN-9001');
  });

  it('defaults to allowing patient visibility when canViewPatients is omitted (back-compat)', () => {
    const alert = makeAlert();
    const patientById = new Map([['patient-1', makePatient()]]);
    expect(alertPatientLabel(alert, patientById)).toBe('Sarah Okafor · MRN-9001');
  });

  it('returns a generic restricted label instead of the real name when the role cannot view patients', () => {
    const alert = makeAlert();
    const patientById = new Map([['patient-1', makePatient()]]);
    const label = alertPatientLabel(alert, patientById, false);
    expect(label).toBe('Patient details restricted');
    expect(label).not.toContain('Sarah');
    expect(label).not.toContain('MRN-9001');
  });

  it('returns null for non-patient-linked alerts regardless of role', () => {
    const alert = makeAlert({ patientId: undefined });
    const patientById = new Map<string, Patient>();
    expect(alertPatientLabel(alert, patientById, false)).toBeNull();
    expect(alertPatientLabel(alert, patientById, true)).toBeNull();
  });
});

describe('useNotificationCenter intelligenceAlerts mapping carries patientId (HEAL-217)', () => {
  it('copies patientId from the source OperationalAlert, not just category/reasonCodes', () => {
    // OperationalAlert (operationalIntelligence.types.ts) declares
    // patientId?: string right alongside category/reasonCodes -- without
    // this field, redactAlertForRole (HEAL-215) can never redact a name
    // embedded in one of these alerts' title/message, since it bails out
    // whenever alert.patientId is falsy.
    const hookSource = readFileSync(
      join(__dirname, '../hooks/useNotificationCenter.ts'),
      'utf8',
    );
    const mappingBlock = hookSource.slice(
      hookSource.indexOf('const intelligenceAlerts = useMemo'),
      hookSource.indexOf('[intelligenceSnapshot.alerts]'),
    );
    expect(mappingBlock).toContain('patientId: alert.patientId');
  });
});
