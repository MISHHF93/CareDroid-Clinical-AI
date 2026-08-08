import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import {
  FIT_TO_WAIT_CLASSIFICATIONS,
  buildFitToWaitAttentionSnapshot,
  buildFitToWaitClassificationPatch,
  buildFitToWaitClassificationRecord,
  canClassifyFitToWait,
  patientNeedsFitToWaitAttention,
  patientNeedsFitToWaitReview,
  resolveFitToWaitClassification,
  sortPatientsForFitToWaitAttention,
  summarizeFitToWaitBoardCounts,
} from './fitToWaitPathway';

function buildPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-wait-1',
    mrn: 'ED-9001',
    firstName: 'Jamie',
    lastName: 'Lee',
    dob: '1990-01-01',
    age: 35,
    sex: 'F',
    arrivalTime: '2026-06-20T10:00:00.000Z',
    triageTime: '2026-06-20T10:15:00.000Z',
    chiefComplaint: 'Abdominal pain',
    complaintCategory: 'Abdominal',
    state: PatientState.Waiting,
    priority: Priority.P3,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('fitToWaitPathway', () => {
  it('exposes all five staff classification options', () => {
    expect(FIT_TO_WAIT_CLASSIFICATIONS.map((entry) => entry.id)).toEqual([
      'fit-to-sit',
      'monitored-chair',
      'stretcher-needed',
      'immediate-room-needed',
      'reassessment-required',
    ]);
  });

  it('allows classification only for waiting patients', () => {
    expect(canClassifyFitToWait(buildPatient())).toBe(true);
    expect(canClassifyFitToWait(buildPatient({ state: PatientState.Triage }))).toBe(false);
  });

  it('requires human review when waiting patient is unclassified', () => {
    expect(patientNeedsFitToWaitReview(buildPatient())).toBe(true);
    expect(
      patientNeedsFitToWaitReview(
        buildPatient({
          fitToWaitClassification: buildFitToWaitClassificationRecord('fit-to-sit', {
            staffName: 'RN Lee',
          }),
        }),
      ),
    ).toBe(false);
  });

  it('builds staff-confirmed classification records without auto inference', () => {
    const patch = buildFitToWaitClassificationPatch(
      'monitored-chair',
      { staffId: 'rn-1', staffName: 'RN Park' },
      { notes: 'Needs chair near nursing station' },
    );

    expect(patch.fitToWaitClassification).toMatchObject({
      id: 'monitored-chair',
      label: 'Monitored chair',
      staffConfirmed: true,
      classifiedByStaffName: 'RN Park',
      notes: 'Needs chair near nursing station',
    });
    expect(resolveFitToWaitClassification(buildPatient(patch))).toMatchObject({
      id: 'monitored-chair',
    });
  });

  it('summarizes classified and unclassified waiting patients', () => {
    const summary = summarizeFitToWaitBoardCounts([
      buildPatient({ id: 'a' }),
      buildPatient({
        id: 'b',
        fitToWaitClassification: buildFitToWaitClassificationRecord('immediate-room-needed'),
      }),
      buildPatient({
        id: 'c',
        fitToWaitClassification: buildFitToWaitClassificationRecord('reassessment-required'),
      }),
      buildPatient({ id: 'd', state: PatientState.Assessment }),
    ]);

    expect(summary.waitingCount).toBe(3);
    expect(summary.unclassifiedCount).toBe(1);
    expect(summary.immediateRoomCount).toBe(1);
    expect(summary.reassessmentRequiredCount).toBe(1);
  });

  it('prioritizes immediate room and unclassified patients for attention surfaces', () => {
    const patients = [
      buildPatient({ id: 'unclassified' }),
      buildPatient({
        id: 'room',
        fitToWaitClassification: buildFitToWaitClassificationRecord('immediate-room-needed'),
      }),
      buildPatient({
        id: 'sit',
        fitToWaitClassification: buildFitToWaitClassificationRecord('fit-to-sit'),
      }),
    ];

    expect(patientNeedsFitToWaitAttention(patients[0])).toBe(true);
    expect(patientNeedsFitToWaitAttention(patients[1])).toBe(true);
    expect(patientNeedsFitToWaitAttention(patients[2])).toBe(false);

    const sorted = sortPatientsForFitToWaitAttention(patients);
    expect(sorted.map((patient) => patient.id)).toEqual(['room', 'unclassified']);

    const snapshot = buildFitToWaitAttentionSnapshot(patients);
    expect(snapshot.needsAttentionCount).toBe(2);
    expect(snapshot.previewRows[0]?.patientId).toBe('room');
  });

  it('builds an attention snapshot without inferring classifications', () => {
    const snapshot = buildFitToWaitAttentionSnapshot([buildPatient()]);

    expect(snapshot).toMatchObject({
      unclassifiedCount: 1,
      needsAttentionCount: 1,
    });
  });
});
