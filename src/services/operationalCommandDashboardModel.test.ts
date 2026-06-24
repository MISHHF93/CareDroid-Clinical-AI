import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  PatientFlag,
  PatientState,
  Priority,
  type Patient,
  type Room,
} from '../types/emergency';
import {
  buildOperationalCommandDashboardSnapshot,
  buildZoneBedOccupancy,
} from './operationalCommandDashboardModel';

const rooms: Room[] = [
  { id: 'r1', name: 'Resus 1', type: 'Resus', status: 'Occupied', patientId: 'p1' },
  { id: 'r2', name: 'Resus 2', type: 'Resus', status: 'Available' },
  { id: 'r3', name: 'Room 3', type: 'Treatment', status: 'Occupied', patientId: 'p2' },
  { id: 'r4', name: 'Room 4', type: 'Treatment', status: 'Available' },
  { id: 'r5', name: 'ISO 1', type: 'Isolation', status: 'Occupied', patientId: 'p3' },
  { id: 'r6', name: 'WR 1', type: 'Waiting', status: 'Occupied', patientId: 'p4' },
];

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-base',
    mrn: 'ED-1',
    firstName: 'Alex',
    lastName: 'Kim',
    dob: '1990-01-01',
    age: 35,
    sex: 'F',
    arrivalTime: '2026-06-24T08:00:00.000Z',
    chiefComplaint: 'Pain',
    complaintCategory: 'Other',
    state: PatientState.Waiting,
    priority: Priority.P3,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('operationalCommandDashboardModel', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-06-24T10:00:00.000Z').getTime());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds zone occupancy with red/amber/green thresholds', () => {
    const zones = buildZoneBedOccupancy(rooms);
    expect(zones.find((zone) => zone.zoneId === 'resus')).toMatchObject({
      occupied: 1,
      total: 2,
      occupancyPercent: 50,
      tone: 'green',
    });
    expect(zones.find((zone) => zone.zoneId === 'isolation')).toMatchObject({
      occupied: 1,
      total: 1,
      occupancyPercent: 100,
      tone: 'red',
    });
  });

  it('derives dashboard metrics from whiteboard store inputs', () => {
    const patients = [
      patient({ id: 'p1', state: PatientState.Assessment, roomId: 'r1' }),
      patient({ id: 'p2', state: PatientState.Waiting, arrivalTime: '2026-06-24T09:00:00.000Z' }),
      patient({ id: 'p3', state: PatientState.Waiting, arrivalTime: '2026-06-24T07:00:00.000Z' }),
      patient({
        id: 'p4',
        state: PatientState.Admission,
        flags: [PatientFlag.PendingAdmission],
      }),
      patient({ id: 'p5', state: PatientState.Discharge }),
    ];

    const snapshot = buildOperationalCommandDashboardSnapshot({
      patients,
      rooms,
      capacity: {
        score: 72,
        band: 'Orange',
        label: 'Orange capacity',
        riskLevel: 'Orange',
        totalPatients: 4,
        occupiedRooms: 4,
        boardingCount: 1,
        reassessmentDue: 0,
        currentOccupancy: 4,
        maxCapacity: 6,
        occupancyPercent: 67,
        waitingCount: 2,
        dischargeReadyCount: 0,
        incomingEMSCriticalCount: 0,
        deductions: [],
        updatedAt: '2026-06-24T10:00:00.000Z',
      },
      now: new Date('2026-06-24T10:00:00.000Z'),
    });

    expect(snapshot.metrics.find((metric) => metric.id === 'total-patients')).toMatchObject({
      value: 4,
      tone: 'green',
    });
    expect(snapshot.metrics.find((metric) => metric.id === 'waiting-room-count')).toMatchObject({
      value: 2,
      tone: 'green',
    });
    expect(snapshot.metrics.find((metric) => metric.id === 'boarding-patients')).toMatchObject({
      value: 1,
      tone: 'green',
    });
    expect(snapshot.metrics.find((metric) => metric.id === 'average-wait-time')).toMatchObject({
      value: '2h',
      tone: 'red',
    });
    expect(snapshot.zoneOccupancy.length).toBeGreaterThan(0);
    expect(snapshot.summaryLine).toContain('4 total');
  });
});