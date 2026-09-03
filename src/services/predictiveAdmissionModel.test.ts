import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority, type Patient } from '../types/emergency';
import {
  ADMISSION_PROBABILITY_ALERT_THRESHOLD,
  assessPatientAdmissionProbability,
  probabilityToAdmitScore,
  scanPatientsForAdmissionAlerts,
} from './predictiveAdmissionModel';

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p1',
    mrn: 'ED-1',
    firstName: 'Alex',
    lastName: 'Kim',
    dob: '1950-01-01',
    age: 78,
    sex: 'F',
    arrivalTime: '2026-06-24T08:00:00.000Z',
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Cardiac',
    state: PatientState.Assessment,
    priority: Priority.P2,
    vitals: [{ hr: 110, sbp: 88, dbp: 55, spo2: 90 }] as unknown as Patient['vitals'],
    flags: [PatientFlag.HighRisk],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('predictiveAdmissionModel', () => {
  it('maps probability percent to a 10-point admit score', () => {
    expect(probabilityToAdmitScore(0)).toBe(0);
    expect(probabilityToAdmitScore(75)).toBe(8);
    expect(probabilityToAdmitScore(100)).toBe(10);
  });

  it('flags high admission probability patients', () => {
    const assessment = assessPatientAdmissionProbability({ patient: patient() });
    expect(assessment.admitScore).toBeGreaterThanOrEqual(5);
    expect(assessment.thresholdBreached).toBe(
      assessment.probabilityPercent >= ADMISSION_PROBABILITY_ALERT_THRESHOLD,
    );
  });

  it('returns elevated patients sorted by probability', () => {
    const alerts = scanPatientsForAdmissionAlerts([
      patient({
        id: 'low',
        priority: Priority.P4,
        chiefComplaint: 'Sore throat',
        age: 20,
        flags: [],
      }),
      patient({ id: 'high', state: PatientState.Admission, flags: [PatientFlag.PendingAdmission] }),
    ]);
    expect(alerts[0]?.patientId).toBe('high');
  });
});
