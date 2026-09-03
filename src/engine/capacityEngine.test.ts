import { afterEach, describe, expect, it } from 'vitest';
import { calculateCapacity, deriveCapacityCrisisState, isCapacityCrisis } from './capacityEngine';
import { DEFAULT_EMERGENCY_THRESHOLDS, useEmergencyStore } from '../store/emergencyStore';
import {
  PatientFlag,
  PatientState,
  Priority,
  type CapacitySnapshot,
  type Patient,
  type Room,
} from '../types/emergency';

function patient(id: string, state: PatientState, overrides: Partial<Patient> = {}): Patient {
  return {
    id,
    mrn: `MRN-${id}`,
    firstName: 'Test',
    lastName: id,
    dob: '1980-01-01',
    age: 46,
    sex: 'Other',
    arrivalTime: '2026-06-13T12:00:00-04:00',
    chiefComplaint: 'Capacity test',
    complaintCategory: 'Other',
    state,
    priority: Priority.P3,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

function room(id: string, status: Room['status']): Room {
  return {
    id,
    name: id,
    type: 'Treatment',
    status,
  };
}

const orangeCapacity: CapacitySnapshot = {
  score: 58,
  band: 'Orange',
  totalPatients: 5,
  occupiedRooms: 0,
  boardingCount: 0,
  reassessmentDue: 0,
  updatedAt: '2026-06-13T14:00:00-04:00',
};

const originalStoreState = {
  patients: useEmergencyStore.getState().patients,
  rooms: useEmergencyStore.getState().rooms,
  thresholds: useEmergencyStore.getState().thresholds,
};

afterEach(() => {
  useEmergencyStore.setState({
    patients: originalStoreState.patients,
    rooms: originalStoreState.rooms,
    thresholds: originalStoreState.thresholds,
  });
});

describe('capacity crisis helpers', () => {
  it('uses store capacity thresholds for occupancy banding', () => {
    const rooms: Room[] = Array.from({ length: 10 }, (_, index) => ({
      id: `room-${index}`,
      name: `Room ${index}`,
      type: 'Treatment',
      status: index < 7 ? 'Occupied' : 'Available',
    }));

    useEmergencyStore.setState({
      patients: [] as Patient[],
      rooms,
      thresholds: {
        ...DEFAULT_EMERGENCY_THRESHOLDS,
        capacityWarningPct: 0.4,
        capacityOrangePct: 0.5,
        capacityRedPct: 0.6,
      },
    });

    expect(calculateCapacity()).toEqual(
      expect.objectContaining({
        band: 'Red',
        totalPatients: 0,
        occupiedRooms: 7,
      }),
    );
  });

  it('detects crisis only for Orange or Red bands', () => {
    expect(isCapacityCrisis({ band: 'Orange' })).toBe(true);
    expect(isCapacityCrisis({ band: 'Red' })).toBe(true);
    expect(isCapacityCrisis({ band: 'Yellow' })).toBe(false);
  });

  it('derives deterministic action lists and fallback documentation', () => {
    const result = deriveCapacityCrisisState({
      capacity: orangeCapacity,
      patients: [
        patient('boarding', PatientState.Admission, {
          timeline: [
            {
              id: 'journey-1',
              type: 'StateChange',
              timestamp: '2026-06-13T12:30:00-04:00',
              to: PatientState.Admission,
            },
          ],
          referral: {
            id: 'ref-1',
            patientId: 'boarding',
            targetDepartment: 'Internal Medicine',
            status: 'Accepted',
          },
        }),
        patient('ready', PatientState.Disposition, {
          lastAssessedTime: '2026-06-13T13:00:00-04:00',
        }),
        patient('reassess-1', PatientState.Waiting, { flags: [PatientFlag.ReassessmentDue] }),
        patient('reassess-2', PatientState.Waiting, { flags: [PatientFlag.ReassessmentDue] }),
        patient('reassess-3', PatientState.Waiting, { flags: [PatientFlag.ReassessmentDue] }),
        patient('reassess-4', PatientState.Waiting, { flags: [PatientFlag.ReassessmentDue] }),
      ],
      rooms: [
        room('r1', 'Occupied'),
        room('r2', 'Occupied'),
        room('r3', 'Occupied'),
        room('r4', 'Available'),
      ],
      emsArrivals: [
        {
          id: 'ems-critical',
          status: 'Inbound',
          severity: 'Critical',
          eta: 7,
          chiefComplaint: 'Respiratory failure',
        },
      ],
      now: new Date('2026-06-13T14:00:00-04:00'),
    });

    expect(result.active).toBe(true);
    expect(result.boardingPatients[0]).toMatchObject({
      name: 'Test boarding',
      targetDepartment: 'Internal Medicine',
      boardingMinutes: 90,
      timestampSource: 'timeline',
    });
    expect(result.dischargeReady[0]).toMatchObject({
      name: 'Test ready',
      dispositionMinutes: 60,
      timestampSource: 'lastAssessedTime',
    });
    expect(result.reassessmentQueue).toBe(4);
    expect(result.criticalEmsInbound).toHaveLength(1);
    expect(result.documentation.join(' ')).toMatch(/last assessed time/);
  });

  it('builds five transparent score factors', () => {
    const result = deriveCapacityCrisisState({
      capacity: orangeCapacity,
      patients: [patient('boarding', PatientState.Admission)],
      rooms: [room('r1', 'Occupied')],
      now: new Date('2026-06-13T14:00:00-04:00'),
    });

    expect(result.factors).toHaveLength(5);
    expect(result.factors.map((factor) => factor.id)).toEqual([
      'boarding',
      'occupancy',
      'reassessment',
      'discharge',
      'ems',
    ]);
    expect(result.factors[0].detail).toContain('Boarding: 1 patient (-8 pts)');
  });
});
