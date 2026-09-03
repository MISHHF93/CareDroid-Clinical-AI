import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../../types/emergency';
import {
  buildDepartmentStatusSnapshot,
  filterDepartmentStatusSnapshot,
  formatDepartmentDuration,
  shouldUseDepartmentStatusScreen,
} from './departmentStatusScreenModel';
import { READ_ONLY_WHITEBOARD_METRIC_IDS } from '../../config/readOnlyWhiteboardScreenModel';

function buildPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    mrn: 'MRN-100',
    firstName: 'Alex',
    lastName: 'Lee',
    state: PatientState.Waiting,
    priority: Priority.P3,
    arrivalTime: '2026-06-20T08:00:00.000Z',
    triageTime: '2026-06-20T08:15:00.000Z',
    chiefComplaint: 'Chest pain',
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  } as unknown as Patient;
}

describe('departmentStatusScreenModel', () => {
  it('formats department durations without patient identifiers', () => {
    expect(formatDepartmentDuration(42)).toBe('42m');
    expect(formatDepartmentDuration(95)).toBe('1h 35m');
  });

  it('builds aggregate department metrics for wall display', () => {
    const now = new Date('2026-06-20T10:00:00.000Z');
    const snapshot = buildDepartmentStatusSnapshot({
      now,
      updatedAt: now.toISOString(),
      patients: [
        buildPatient({ id: 'w1', state: PatientState.Waiting }),
        buildPatient({
          id: 'w2',
          state: PatientState.Waiting,
          arrivalTime: '2026-06-20T07:00:00.000Z',
        }),
        buildPatient({ id: 't1', state: PatientState.Triage }),
      ],
      capacity: {
        score: 78,
        band: 'Orange',
        updatedAt: now.toISOString(),
        boardingCount: 3,
        longestWaitMinutes: 180,
      } as any,
      referrals: [{ id: 'r1', patientId: 'w1', status: 'Pending', reason: 'Cardiology' }],
      emsArrivals: [
        {
          id: 'ems-1',
          unitId: 'Medic 7',
          status: 'Inbound',
          severity: 'High',
          eta: 8,
          dispatchTime: '2026-06-20T09:50:00.000Z',
          estimatedArrivalTime: '2026-06-20T10:08:00.000Z',
        },
      ] as any,
    });

    expect(snapshot.metrics.map((metric) => metric.id)).toEqual(
      expect.arrayContaining([
        'waiting-count',
        'longest-wait',
        'triage-pending',
        'triage-breached',
        'reassessments-due',
        'lwbs-elevated',
        'deterioration-watch',
        'queue-pressure',
        'ems-inbound',
        'offload-delays',
        'boarders',
        'referrals-pending',
        'capacity-status',
      ]),
    );
    expect(snapshot.metrics.find((metric) => metric.id === 'triage-breached')).toBeTruthy();
    expect(snapshot.metrics.find((metric) => metric.id === 'waiting-count')?.value).toBe(2);
    expect(snapshot.metrics.find((metric) => metric.id === 'longest-wait')?.value).toBe('3h');
    expect(snapshot.metrics.find((metric) => metric.id === 'capacity-status')?.value).toBe(
      '78 · Orange',
    );
    expect(snapshot.summaryLine).toContain('2 waiting');
  });

  it('activates only for read-only display mode', () => {
    expect(shouldUseDepartmentStatusScreen(true)).toBe(true);
    expect(shouldUseDepartmentStatusScreen(false)).toBe(false);
  });

  it('filters department metrics to read-only whiteboard widget set', () => {
    const now = new Date('2026-06-20T10:00:00.000Z');
    const snapshot = buildDepartmentStatusSnapshot({
      now,
      patients: [buildPatient({ id: 'w1', state: PatientState.Waiting })],
      capacity: {
        score: 55,
        band: 'Yellow',
        updatedAt: now.toISOString(),
        boardingCount: 1,
      } as any,
    });

    const filtered = filterDepartmentStatusSnapshot(snapshot, READ_ONLY_WHITEBOARD_METRIC_IDS);
    expect(filtered.metrics.map((metric) => metric.id)).toEqual([
      ...READ_ONLY_WHITEBOARD_METRIC_IDS,
    ]);
    expect(filtered.metrics.find((metric) => metric.id === 'triage-breached')).toBeUndefined();
    expect(filtered.metrics.find((metric) => metric.id === 'lwbs-elevated')).toBeUndefined();
    expect(filtered.summaryLine).toContain('1 waiting');
    expect(filtered.summaryLine).toContain('Yellow capacity');
  });

  it('builds read-only summary from all nine wall metrics', () => {
    const now = new Date('2026-06-20T10:00:00.000Z');
    const snapshot = buildDepartmentStatusSnapshot({
      now,
      patients: [
        buildPatient({ id: 'w1', state: PatientState.Waiting }),
        buildPatient({ id: 'w2', state: PatientState.Waiting }),
        buildPatient({ id: 't1', state: PatientState.Triage }),
      ],
      capacity: {
        score: 72,
        band: 'Orange',
        updatedAt: now.toISOString(),
        boardingCount: 4,
      } as any,
      referrals: [
        { id: 'r1', patientId: 'w1', status: 'Pending', reason: 'Cardiology' },
        { id: 'r2', patientId: 'w2', status: 'Pending', reason: 'Neurology' },
      ],
      emsArrivals: [
        {
          id: 'ems-1',
          unitId: 'Medic 7',
          status: 'Inbound',
          severity: 'High',
          eta: 8,
          dispatchTime: '2026-06-20T09:50:00.000Z',
          estimatedArrivalTime: '2026-06-20T10:08:00.000Z',
        },
      ] as any,
    });

    const filtered = filterDepartmentStatusSnapshot(snapshot, READ_ONLY_WHITEBOARD_METRIC_IDS);
    expect(filtered.summaryLine).toContain('2 waiting');
    expect(filtered.summaryLine).toContain('triage pending');
    expect(filtered.summaryLine).toContain('EMS inbound');
    expect(filtered.summaryLine).toContain('4 boarders');
    expect(filtered.summaryLine).toContain('referrals pending');
    expect(filtered.summaryLine).toContain('Orange capacity');
  });
});
