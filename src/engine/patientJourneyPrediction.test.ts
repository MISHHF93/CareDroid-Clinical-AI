import { describe, expect, it } from 'vitest';
import { predictPatientJourney } from './patientJourneyPrediction';
import { PatientFlag, PatientState, Priority } from '../types/emergency';

describe('patientJourneyPrediction', () => {
  it('elevates admission probability for high-acuity EMS arrivals', () => {
    const prediction = predictPatientJourney({
      patient: {
        state: PatientState.Assessment,
        priority: Priority.P2,
        flags: [PatientFlag.EMSArrival],
        chiefComplaint: 'Chest pain',
        vitals: [{ hr: 112, spo2: 90, recordedAt: new Date().toISOString() }],
        age: 74,
        complaintCategory: 'Cardiac',
        arrivalTime: new Date().toISOString(),
        source: 'EMS',
      },
    });
    expect(prediction.admissionProbability).toBeGreaterThan(40);
    expect(prediction.keyPredictors.length).toBeGreaterThan(0);
    expect(prediction.humanReviewRequired).toBe(true);
  });

  it('flags prolonged stay risk after long elapsed time', () => {
    const sevenHoursAgo = new Date(Date.now() - 7 * 3600000).toISOString();
    const prediction = predictPatientJourney({
      patient: {
        state: PatientState.Waiting,
        priority: Priority.P3,
        flags: [],
        chiefComplaint: 'Abdominal pain',
        vitals: [],
        age: 45,
        complaintCategory: 'GI',
        arrivalTime: sevenHoursAgo,
        source: 'walk-in',
      },
      pendingOrders: 4,
    });
    expect(prediction.prolongedStayRisk).not.toBe('low');
  });
});
