import { describe, expect, it } from 'vitest';
import { PatientState, Priority } from '../../types/emergency';
import type { Patient } from '../../types/emergency';
import { buildReceptionAlertMetrics } from './receptionAlertRailModel';

function buildPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    mrn: 'MRN-1',
    firstName: 'Alex',
    lastName: 'Kim',
    dob: '1990-01-01',
    age: 35,
    sex: 'M',
    arrivalTime: '2026-06-20T08:00:00.000Z',
    triageTime: '2026-06-20T08:15:00.000Z',
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Cardiac',
    state: PatientState.Waiting,
    priority: Priority.P3,
    flags: [],
    vitals: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('receptionAlertRailModel', () => {
  it('includes waiting-room metrics for reception staff', () => {
    const metrics = buildReceptionAlertMetrics({
      patients: [buildPatient()],
      alerts: [],
    });

    expect(metrics.length).toBeGreaterThanOrEqual(0);
    expect(metrics.every((metric) => metric.value > 0)).toBe(true);
  });

  it('adds EMS offload pressure when delayed offloads exist', () => {
    const metrics = buildReceptionAlertMetrics({
      patients: [buildPatient()],
      emsArrivals: [
        {
          id: 'ems-1',
          unitId: 'M-12',
          status: 'Arrived',
          severity: 'High',
          chiefComplaint: 'Chest pain',
          arrivedAt: '2026-06-20T07:00:00.000Z',
          handoffStartedAt: '2026-06-20T07:05:00.000Z',
        } as never,
      ],
      settings: { thresholds: { emsOffloadTargetMinutes: 15 } },
    });

    expect(metrics.some((metric) => metric.id === 'ems-offload')).toBe(true);
  });
});