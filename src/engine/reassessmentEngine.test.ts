import { describe, expect, it, vi } from 'vitest';
import { PatientFlag, PatientState, Priority, type Alert, type Patient } from '../types/emergency';
import { hasLongWaitAlertForBucket, longWaitAlertBucket, syncReassessmentDueFlag } from './reassessmentEngine';

function alert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'alert-1',
    severity: 'Critical',
    title: 'Wait critical',
    message: 'Exceeded',
    patientId: 'patient-1',
    createdAt: '2026-06-13T16:00:00.000Z',
    dismissed: false,
    source: 'long-wait-rescue',
    metadata: {
      longWaitPhase: 'critical',
      dedupeBucket: 3,
    },
    ...overrides,
  };
}

function buildPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    mrn: 'ED-123456',
    firstName: 'Sam',
    lastName: 'Lee',
    dob: '1990-01-01',
    age: 35,
    sex: 'F',
    arrivalTime: '2026-06-20T08:00:00.000Z',
    triageTime: '2026-06-20T08:20:00.000Z',
    lastAssessedTime: '2026-06-20T08:20:00.000Z',
    chiefComplaint: 'Abdominal pain',
    complaintCategory: 'Other',
    state: PatientState.Triage,
    priority: Priority.P2,
    vitals: [],
    vitalsUpdatedAt: '2026-06-20T08:00:00.000Z',
    flags: [PatientFlag.ReassessmentDue],
    notes: [],
    timeline: [],
    reassessmentReminders: [],
    ...overrides,
  } as Patient;
}

describe('reassessment long-wait dedupe helpers', () => {
  it('buckets wait alerts into 15-minute windows', () => {
    expect(longWaitAlertBucket(0)).toBe(0);
    expect(longWaitAlertBucket(14.9)).toBe(0);
    expect(longWaitAlertBucket(15)).toBe(1);
    expect(longWaitAlertBucket(44.9)).toBe(2);
  });

  it('matches active long-wait alerts by patient, phase, and bucket', () => {
    const alerts = [
      alert(),
      alert({ id: 'dismissed', dismissed: true }),
      alert({ id: 'other-source', source: 'capacity-engine' }),
    ];

    expect(hasLongWaitAlertForBucket(alerts, 'patient-1', 'critical', 3)).toBe(true);
    expect(hasLongWaitAlertForBucket(alerts, 'patient-1', 'critical', 4)).toBe(false);
    expect(hasLongWaitAlertForBucket(alerts, 'patient-1', 'lwbs', 3)).toBe(false);
    expect(hasLongWaitAlertForBucket(alerts, 'patient-2', 'critical', 3)).toBe(false);
  });
});

describe('syncReassessmentDueFlag', () => {
  /**
   * Regression coverage for a real, patient-safety-relevant bug found by a
   * repository-wide domain-model audit (2026-08-08): Smart Intake sets
   * ReassessmentDue from a real vitals check (backend requiresReassessment())
   * and moves the patient straight to Triage. This engine ran every 60s and
   * cleared the flag on the very next tick for ANY state other than Waiting
   * -- including Triage, where the patient hasn't been reassessed by anyone
   * yet. Fixed by clearing only once the patient reaches active clinical
   * care (laterStates: Assessment/Orders/Results/Disposition/Admission/
   * Discharge), matching the same set the file's own HighRisk rule already
   * uses for the identical "hasn't been actively seen yet" concept.
   */
  it('does NOT clear ReassessmentDue when a patient moves from Arrival straight to Triage', () => {
    const patient = buildPatient({ state: PatientState.Triage, flags: [PatientFlag.ReassessmentDue] });
    const addFlag = vi.fn();
    const removeFlag = vi.fn();

    syncReassessmentDueFlag(patient, new Date('2026-06-20T08:21:00.000Z'), undefined as any, addFlag, removeFlag);

    expect(removeFlag).not.toHaveBeenCalled();
  });

  it('still clears ReassessmentDue once the patient reaches active clinical care (Assessment)', () => {
    const patient = buildPatient({ state: PatientState.Assessment, flags: [PatientFlag.ReassessmentDue] });
    const addFlag = vi.fn();
    const removeFlag = vi.fn();

    syncReassessmentDueFlag(patient, new Date('2026-06-20T09:00:00.000Z'), undefined as any, addFlag, removeFlag);

    expect(removeFlag).toHaveBeenCalledWith(patient.id, PatientFlag.ReassessmentDue);
  });

  it('still clears ReassessmentDue for a patient who reaches Disposition/Admission/Discharge', () => {
    const addFlag = vi.fn();
    const removeFlag = vi.fn();

    for (const state of [PatientState.Disposition, PatientState.Admission, PatientState.Discharge]) {
      removeFlag.mockClear();
      const patient = buildPatient({ state, flags: [PatientFlag.ReassessmentDue] });
      syncReassessmentDueFlag(patient, new Date('2026-06-20T09:00:00.000Z'), undefined as any, addFlag, removeFlag);
      expect(removeFlag).toHaveBeenCalledWith(patient.id, PatientFlag.ReassessmentDue);
    }
  });

  it('does not touch patients who never had the flag set', () => {
    const patient = buildPatient({ state: PatientState.Triage, flags: [] });
    const addFlag = vi.fn();
    const removeFlag = vi.fn();

    syncReassessmentDueFlag(patient, new Date('2026-06-20T08:21:00.000Z'), undefined as any, addFlag, removeFlag);

    expect(addFlag).not.toHaveBeenCalled();
    expect(removeFlag).not.toHaveBeenCalled();
  });
});
