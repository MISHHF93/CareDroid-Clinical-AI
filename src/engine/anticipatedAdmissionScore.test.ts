import { describe, expect, it } from 'vitest';
import { calculateAnticipatedAdmissionScore } from './anticipatedAdmissionScore';
import { PatientFlag, PatientState, Priority } from '../types/emergency';

describe('anticipatedAdmissionScore', () => {
  it('elevates score for boarding pathway patients', () => {
    const result = calculateAnticipatedAdmissionScore({
      patient: {
        state: PatientState.Admission,
        priority: Priority.P2,
        flags: [PatientFlag.PendingAdmission],
        chiefComplaint: 'Chest pain',
        vitals: [{ spo2: 88, recordedAt: new Date().toISOString() }],
        age: 78,
        complaintCategory: 'Cardiac',
      },
    });

    expect(result.thresholdBreached).toBe(true);
    expect(result.humanReviewRequired).toBe(true);
    expect(result.envelope.maturity).toBe('demo');
  });
});
