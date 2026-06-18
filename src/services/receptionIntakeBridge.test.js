import { describe, expect, it, vi } from 'vitest';
import { PatientFlag, PatientState, Priority } from '../types/emergency';

vi.mock('../store/emergencyStore', () => {
  let patients = [];
  let emsArrivals = [
    {
      id: 'ems-1',
      unitId: 'Medic 12',
      status: 'Inbound',
      estimatedArrivalTime: '2026-06-17T12:30:00.000Z',
      eta: 8,
      chiefComplaint: 'Chest pain',
      acuity: 'P2',
    },
  ];
  return {
    useEmergencyStore: {
      getState: () => ({
        patients,
        emsArrivals,
        convertEMSArrivalToPatient: (arrivalId) => {
          emsArrivals = emsArrivals.map((entry) =>
            entry.id === arrivalId
              ? { ...entry, patientId: 'patient-ems-1', status: 'Handoff' }
              : entry,
          );
          patients = [
            {
              id: 'patient-ems-1',
              mrn: 'ED-EMS-1',
              firstName: 'EMS',
              lastName: 'Patient',
              dob: '1990-01-01',
              age: 36,
              sex: 'M',
              arrivalTime: '2026-06-17T12:00:00.000Z',
              chiefComplaint: 'Chest pain',
              complaintCategory: 'Chest Pain',
              state: PatientState.Registration,
              priority: Priority.P2,
              vitals: [],
              flags: [PatientFlag.EMSArrival],
              notes: [],
              timeline: [],
            },
          ];
        },
      }),
    },
  };
});

vi.mock('./queueAssignment', () => ({
  enterEmsRegistrationQueue: vi.fn(() => ({ ok: true, queue: 'ems' })),
}));

import { convertEmsArrivalForReception } from './receptionIntakeBridge';

describe('receptionIntakeBridge', () => {
  it('converts EMS arrivals into reception verify paths', () => {
    const result = convertEmsArrivalForReception('ems-1', { actorName: 'Reception' });
    expect(result.ok).toBe(true);
    expect(result.patientId).toBe('patient-ems-1');
    expect(result.receptionVerifyPath).toContain('/emergency/reception?');
    expect(result.receptionVerifyPath).toContain('step=verify');
    expect(result.receptionVerifyPath).toContain('patientId=patient-ems-1');
    expect(result.receptionVerifyPath).toContain('emsArrivalId=ems-1');
  });
});
