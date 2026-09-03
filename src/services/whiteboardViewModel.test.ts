import { describe, expect, it } from 'vitest';
import {
  PatientFlag,
  PatientState,
  Priority,
  type Patient,
  type Room,
  type Staff,
} from '../types/emergency';
import {
  applyWhiteboardViewFilters,
  buildWhiteboardPhysicianOptions,
  buildWhiteboardZoneOptions,
  compareWhiteboardColumn,
  sortWhiteboardViewPatients,
  resolveWhiteboardStateLabel,
  buildWhiteboardCardOperationalMeta,
  toggleWhiteboardSort,
} from './whiteboardViewModel';
import { buildPreArrivalPlaceholderPatient } from './preArrivalWorkflow';

const rooms: Room[] = [
  { id: 'r-resus-1', name: 'Resus 1', type: 'Resus', status: 'Occupied', patientId: 'p1' },
  { id: 'r-treat-2', name: 'Room 2', type: 'Treatment', status: 'Occupied', patientId: 'p2' },
  { id: 'r-wait-1', name: 'WR Chair 1', type: 'Waiting', status: 'Occupied', patientId: 'p3' },
];

const staff: Staff[] = [
  { id: 'md-1', name: 'Dr. Patel', role: 'MD', status: 'OnShift', active: true },
  { id: 'md-2', name: 'Dr. Chen', role: 'MD', status: 'OnShift', active: true },
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
    arrivalTime: '2026-06-20T08:00:00.000Z',
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

describe('whiteboardViewModel', () => {
  const boardPatients = [
    patient({
      id: 'p1',
      lastName: 'Lee',
      priority: Priority.P2,
      roomId: 'r-resus-1',
      assignedStaffId: 'md-1',
      state: PatientState.Assessment,
      arrival: {
        arrivalMode: 'EMS',
        arrivalTimestamp: '2026-06-20T07:00:00.000Z',
        chiefComplaint: 'Trauma',
        triageAcuity: { code: Priority.P2, system: 'PRIORITY', level: 2, status: 'confirmed' },
        waitingRoomStatus: 'waiting-for-clinician',
        registrationStatus: 'complete',
        queueDestination: 'whiteboard',
        triagePending: false,
      },
    }),
    patient({
      id: 'p2',
      lastName: 'Nguyen',
      priority: Priority.P4,
      roomId: 'r-treat-2',
      assignedStaffId: 'md-2',
      state: PatientState.Waiting,
      arrivalTime: '2026-06-20T09:00:00.000Z',
    }),
    patient({
      id: 'p3',
      lastName: 'Singh',
      priority: Priority.P3,
      roomId: 'r-wait-1',
      state: PatientState.Waiting,
      flags: [PatientFlag.ReassessmentDue],
      arrivalTime: '2026-06-20T06:00:00.000Z',
    }),
  ];

  it('filters by zone and attending physician', () => {
    const filtered = applyWhiteboardViewFilters(boardPatients, rooms, {
      quickFilter: 'all',
      zoneId: 'resus',
      roomId: 'all',
      physicianId: 'all',
      sortColumn: 'triage',
      sortDirection: 'asc',
    });

    expect(filtered.map((entry) => entry.id)).toEqual(['p1']);

    const byPhysician = applyWhiteboardViewFilters(boardPatients, rooms, {
      quickFilter: 'all',
      zoneId: 'all',
      roomId: 'all',
      physicianId: 'md-2',
      sortColumn: 'triage',
      sortDirection: 'asc',
    });

    expect(byPhysician.map((entry) => entry.id)).toEqual(['p2']);
  });

  it('sorts by triage level and wait time columns', () => {
    const byTriage = sortWhiteboardViewPatients(boardPatients, {
      sortColumn: 'triage',
      sortDirection: 'asc',
    });
    expect(byTriage.map((entry) => entry.id)).toEqual(['p1', 'p3', 'p2']);

    const byWaitDesc = sortWhiteboardViewPatients(boardPatients, {
      sortColumn: 'wait',
      sortDirection: 'desc',
    });
    expect(byWaitDesc[0].id).toBe('p3');
  });

  it('builds zone and physician filter options from local board data', () => {
    const zones = buildWhiteboardZoneOptions(boardPatients, rooms);
    expect(zones.find((zone) => zone.id === 'resus')?.count).toBe(1);
    expect(zones.find((zone) => zone.id === 'waiting')?.count).toBe(1);

    const physicians = buildWhiteboardPhysicianOptions(boardPatients, staff);
    expect(physicians.find((entry) => entry.id === 'md-1')?.count).toBe(1);
    expect(physicians.find((entry) => entry.id === 'unassigned')?.count).toBe(1);
  });

  it('labels inbound EMS placeholders with ETA on the board', () => {
    const inbound = buildPreArrivalPlaceholderPatient({
      id: 'ems-pre-1',
      unitId: 'Medic 1',
      unitName: 'Medic 1',
      crewNames: [],
      patientAge: 50,
      patientSex: 'Male',
      chiefComplaint: 'Stroke symptoms',
      eta: 7,
      severity: 'Critical',
      dispatchTime: '2026-06-24T10:00:00.000Z',
      estimatedArrivalTime: '2026-06-24T10:07:00.000Z',
      notes: '',
      status: 'Inbound',
      prearrivalComplaint: 'Stroke symptoms',
      priority: Priority.P1,
    });

    expect(resolveWhiteboardStateLabel(inbound as Patient)).toBe('Inbound EMS · 7 min');
  });

  it('labels triage-pending arrivals as Waiting for Triage on the board', () => {
    expect(
      resolveWhiteboardStateLabel(
        patient({
          state: PatientState.Triage,
          arrival: {
            arrivalMode: 'self-check-in',
            arrivalTimestamp: '2026-06-20T08:00:00.000Z',
            chiefComplaint: 'Pain',
            triageAcuity: {
              code: Priority.P3,
              system: 'PRIORITY',
              level: 3,
              status: 'suggested',
            },
            waitingRoomStatus: 'waiting-for-triage',
            registrationStatus: 'complete',
            queueDestination: 'triage-queue',
            triagePending: true,
          },
        }),
      ),
    ).toBe('Waiting for Triage');
  });

  it('builds operational meta for whiteboard cards', () => {
    const now = new Date('2026-06-20T10:30:00.000Z').getTime();
    const meta = buildWhiteboardCardOperationalMeta(
      patient({
        id: 'p-meta',
        arrivalTime: '2026-06-20T08:00:00.000Z',
        updatedAt: '2026-06-20T10:00:00.000Z',
        assignedStaffId: 'md-1',
        assignedPhysicianId: 'md-2',
        state: PatientState.Assessment,
      }),
      staff,
      now,
    );

    expect(meta.waitingMinutes).toBe(150);
    expect(meta.lastUpdatedAt).toBe('2026-06-20T10:00:00.000Z');
    expect(meta.assignedNurseLabel).toBe('Dr. Patel');
    expect(meta.assignedPhysicianLabel).toBe('Dr. Chen');
    expect(meta.statusLabel).toBe('Assessment');
  });

  it('toggles sort direction when the same column is clicked twice', () => {
    expect(toggleWhiteboardSort({ sortColumn: 'triage', sortDirection: 'asc' }, 'triage')).toEqual({
      sortColumn: 'triage',
      sortDirection: 'desc',
    });
    expect(
      compareWhiteboardColumn(
        patient({ lastName: 'A' }),
        patient({ lastName: 'B' }),
        'patient',
        'asc',
      ),
    ).toBeLessThan(0);
  });
});
