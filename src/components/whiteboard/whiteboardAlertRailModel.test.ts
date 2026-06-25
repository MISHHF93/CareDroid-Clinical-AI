import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority, type Patient } from '../../types/emergency';
import {
  buildWaitingRoomAlertMetrics,
  capWhiteboardAlertMetrics,
  MAX_WHITEBOARD_ALERT_METRICS,
} from './whiteboardAlertRailModel';

function buildWaitingPatient(id: string, overrides: Partial<Patient> = {}): Patient {
  return {
    id,
    mrn: `MRN-${id}`,
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
    flags: [PatientFlag.ReassessmentDue],
    vitals: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('whiteboardAlertRailModel', () => {
  it('builds prioritized waiting-room metrics with non-zero counts only', () => {
    const metrics = buildWaitingRoomAlertMetrics({
      patients: [buildWaitingPatient('p1'), buildWaitingPatient('p2')],
      alerts: [],
    });

    expect(metrics.length).toBeGreaterThan(0);
    expect(metrics.some((metric) => metric.id === 'reassessment')).toBe(true);
    expect(metrics.every((metric) => metric.value > 0)).toBe(true);
  });

  it('caps visible metrics and adds overflow chip', () => {
    const metrics = Array.from({ length: 8 }, (_, index) => ({
      id: `metric-${index}`,
      label: `Signal ${index}`,
      value: 8 - index,
      tone: 'warning' as const,
      priority: index,
    }));

    const capped = capWhiteboardAlertMetrics(metrics, MAX_WHITEBOARD_ALERT_METRICS);
    expect(capped).toHaveLength(MAX_WHITEBOARD_ALERT_METRICS + 1);
    expect(capped[capped.length - 1]?.id).toBe('alert-overflow');
  });
});