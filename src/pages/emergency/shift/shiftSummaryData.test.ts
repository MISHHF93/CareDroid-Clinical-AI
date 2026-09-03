import { describe, expect, it } from 'vitest';
import {
  PatientFlag,
  PatientState,
  Priority,
  type ActiveShift,
  type Patient,
} from '../../../types/emergency';
import { buildShiftSummary } from './shiftSummaryData';

const now = new Date('2026-06-13T10:00:00.000Z');
const shift: ActiveShift = {
  id: 'shift-test',
  label: 'Test shift',
  startTime: '2026-06-13T08:00:00.000Z',
  status: 'Open',
  chargeStaffId: 's1',
  staffIds: ['s1', 's2'],
};

function patient(overrides: Partial<Patient>): Patient {
  return {
    id: overrides.id || 'p-test',
    mrn: overrides.mrn || 'MRN',
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || 'Patient',
    dob: '1980-01-01',
    age: 46,
    sex: 'F',
    arrivalTime: '2026-06-13T08:10:00.000Z',
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Cardiac',
    state: PatientState.Waiting,
    priority: Priority.P3,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('buildShiftSummary', () => {
  it('computes shift volume and time metrics from patient timelines', () => {
    const summary = buildShiftSummary({
      now,
      activeShift: shift,
      staff: [
        { id: 's1', name: 'Charge RN', role: 'Charge', active: true },
        { id: 's2', name: 'Dr. Shift', role: 'MD', active: true },
        { id: 's3', name: 'Off Duty', role: 'RN', active: true },
      ],
      patients: [
        patient({
          id: 'p1',
          triageTime: '2026-06-13T08:20:00.000Z',
          state: PatientState.Discharge,
          priority: Priority.P2,
          flags: [PatientFlag.SepsisAlert],
          notes: [
            {
              id: 'n1',
              text: 'HEART score 5 and SEP-1 sepsis activated',
              timestamp: '2026-06-13T08:50:00.000Z',
            },
          ],
          timeline: [
            {
              id: 'p1-assessment',
              type: 'StateChange',
              timestamp: '2026-06-13T08:40:00.000Z',
              to: PatientState.Assessment,
            },
            {
              id: 'p1-discharge',
              type: 'DispositionUpdated',
              timestamp: '2026-06-13T09:30:00.000Z',
              to: PatientState.Discharge,
            },
          ],
        }),
        patient({
          id: 'p2',
          arrivalTime: '2026-06-13T08:30:00.000Z',
          state: PatientState.Admission,
          priority: Priority.P1,
          notes: [
            {
              id: 'n2',
              text: 'qSOFA positive, NIHSS documented, code stroke activated',
              timestamp: '2026-06-13T08:35:00.000Z',
            },
          ],
          timeline: [
            {
              id: 'p2-admission',
              type: 'StateChange',
              timestamp: '2026-06-13T09:00:00.000Z',
              to: PatientState.Admission,
            },
          ],
        }),
        patient({
          id: 'p3',
          arrivalTime: '2026-06-13T08:45:00.000Z',
          state: PatientState.Discharge,
          flags: ['LWBSRisk' as PatientFlag],
          notes: [
            {
              id: 'n3',
              text: 'Patient left without being seen',
              timestamp: '2026-06-13T09:00:00.000Z',
            },
          ],
          timeline: [
            {
              id: 'p3-discharge',
              type: 'DispositionUpdated',
              timestamp: '2026-06-13T09:05:00.000Z',
              to: PatientState.Discharge,
            },
          ],
        }),
      ],
      referrals: [
        { id: 'r1', patientId: 'p2', status: 'Accepted', createdAt: '2026-06-13T08:50:00.000Z' },
      ],
      alerts: [],
      capacity: {
        score: 50,
        band: 'Orange',
        totalPatients: 2,
        occupiedRooms: 1,
        boardingCount: 1,
        reassessmentDue: 0,
        updatedAt: now.toISOString(),
      },
      capacityHistory: [
        { id: 'c1', timestamp: '2026-06-13T08:00:00.000Z', band: 'Green', score: 88 },
        {
          id: 'c2',
          timestamp: '2026-06-13T09:00:00.000Z',
          band: 'Orange',
          fromBand: 'Green',
          score: 55,
        },
        {
          id: 'c3',
          timestamp: '2026-06-13T09:30:00.000Z',
          band: 'Red',
          fromBand: 'Orange',
          score: 35,
        },
      ],
      workflowLogs: [
        {
          id: 'w1',
          type: 'reassessment_created',
          title: 'Reassessment created',
          summary: 'Patient flagged',
          timestamp: '2026-06-13T08:45:00.000Z',
          patientId: 'p2',
          source: 'test',
          severity: 'Warning',
          status: 'recorded',
          metadata: {},
        },
        {
          id: 'w2',
          type: 'reassessment_completed',
          title: 'Reassessment completed',
          summary: 'Patient reassessed',
          timestamp: '2026-06-13T09:15:00.000Z',
          patientId: 'p2',
          source: 'test',
          severity: 'Info',
          status: 'completed',
          metadata: {},
        },
      ],
      emsUnits: [],
      emsArrivals: [
        {
          id: 'ems1',
          status: 'Complete',
          severity: 'Critical',
          arrivedAt: '2026-06-13T08:15:00.000Z',
          handoffCompletedAt: '2026-06-13T08:30:00.000Z',
        },
      ],
    });

    expect(summary.shift.staffOnDuty).toEqual(['Charge RN', 'Dr. Shift']);
    expect(summary.volume).toMatchObject({
      patientsSeen: 3,
      discharged: 2,
      admitted: 1,
      active: 1,
      lwbs: 1,
    });
    expect(summary.timeMetrics).toMatchObject({
      avgDoorToTriageMinutes: 10,
      avgDoorToProviderMinutes: 30,
      avgLengthOfStayMinutes: 50,
      longestWaitMinutes: 90,
    });
    expect(summary.queues.find((queue) => queue.queue === PatientState.Admission)).toMatchObject({
      patients: 1,
      breaches: 1,
    });
    expect(summary.capacity.events).toHaveLength(2);
    expect(summary.capacity.totals.find((item) => item.band === 'Red')?.minutes).toBe(30);
    expect(summary.clinical.scores).toEqual(
      expect.arrayContaining([
        { type: 'HEART', count: 1 },
        { type: 'qSOFA', count: 1 },
        { type: 'NIHSS', count: 1 },
      ]),
    );
    expect(summary.clinical.protocols).toMatchObject({ sepsis: 1, stroke: 1 });
    expect(summary.clinical.referrals).toMatchObject({ sent: 1, accepted: 1, declined: 0 });
    expect(summary.clinical.reassessments).toMatchObject({ flagged: 1, completed: 1 });
    expect(summary.ems).toMatchObject({
      unitsReceived: 1,
      avgOffloadMinutes: 15,
      criticalArrivals: 1,
    });
  });
});
