import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority, type Patient } from '../types/emergency';
import {
  applyWhiteboardAutomationToPatients,
  buildPhysicianDiagnosisPatch,
  evaluateWhiteboardAutomation,
} from './whiteboardAutomationEngine';
import { resolveWhiteboardStateLabel } from './whiteboardViewModel';

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p1',
    mrn: 'ED-1',
    firstName: 'Alex',
    lastName: 'Morgan',
    dob: '1990-01-01',
    age: 35,
    sex: 'F',
    arrivalTime: '2026-06-24T08:00:00.000Z',
    triageTime: '2026-06-24T08:10:00.000Z',
    chiefComplaint: 'Anxiety',
    complaintCategory: 'Psych',
    state: PatientState.Assessment,
    priority: Priority.P3,
    vitals: [],
    flags: [
      {
        type: PatientFlag.PsychAlert,
        reason: 'Columbia positive',
        detectedAt: '2026-06-24T08:10:00.000Z',
        severity: 'Warning',
      } as unknown as PatientFlag,
    ],
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('whiteboardAutomationEngine', () => {
  it('schedules MSE due after the psych pathway threshold', () => {
    const now = new Date('2026-06-24T09:00:00.000Z');
    const snapshot = evaluateWhiteboardAutomation(patient(), now);

    expect(snapshot.events.some((event) => event.id === 'mse-due')).toBe(true);
    expect(snapshot.events[0]?.remainingMinutes).toBeGreaterThan(0);
  });

  it('marks MSE overdue after two hours on the psych pathway', () => {
    const now = new Date('2026-06-24T10:15:00.000Z');
    const snapshot = evaluateWhiteboardAutomation(patient(), now);

    expect(snapshot.displayState).toBe('MSE Due');
    expect(snapshot.events.find((event) => event.id === 'mse-due')?.overdueMinutes).toBeGreaterThan(0);
  });

  it('flags awaiting nurse review when reassessment escalation is active', () => {
    const now = new Date('2026-06-24T09:30:00.000Z');
    const snapshot = evaluateWhiteboardAutomation(
      patient({
        chiefComplaint: 'Shortness of breath',
        complaintCategory: 'Respiratory',
        flags: [PatientFlag.ReassessmentDue, PatientFlag.DeteriorationRisk],
      }),
      now,
    );

    expect(snapshot.events.some((event) => event.id === 'nurse-review-required')).toBe(true);
    expect(snapshot.displayState).toBe('Nurse Review Required');
  });

  it('auto-advances to Results and flags nurse review when a lab result is posted', () => {
    const now = new Date('2026-06-24T09:30:00.000Z');
    const source = patient({
      state: PatientState.Orders,
      timeline: [
        {
          id: 'order-1',
          type: 'OrderPlaced',
          timestamp: '2026-06-24T09:00:00.000Z',
          to: PatientState.Orders,
        },
        {
          id: 'result-1',
          type: 'ResultReceived',
          timestamp: '2026-06-24T09:25:00.000Z',
          to: PatientState.Orders,
          summary: 'Troponin resulted',
        },
      ],
    });

    const [updated] = applyWhiteboardAutomationToPatients([source], now);

    expect(updated.state).toBe(PatientState.Results);
    expect(updated.whiteboardAutomation?.displayState).toBe('Nurse Review Required');
    expect(
      updated.timeline.some((event) => event.metadata?.automation === 'lab-result-to-results'),
    ).toBe(true);
    expect(resolveWhiteboardStateLabel(updated)).toBe('Nurse Review Required');
  });

  it('moves to awaiting disposition when a physician records a diagnosis', () => {
    const source = patient({
      state: PatientState.Results,
      chiefComplaint: 'Chest pain',
      complaintCategory: 'Cardiac',
      flags: [],
      timeline: [
        {
          id: 'result-1',
          type: 'ResultReceived',
          timestamp: '2026-06-24T10:40:00.000Z',
          to: PatientState.Results,
        },
      ],
    });

    const updated = buildPhysicianDiagnosisPatch(source, {
      diagnosis: 'Unstable angina',
      physicianId: 'md-1',
      physicianName: 'Dr. Patel',
    });

    expect(updated?.state).toBe(PatientState.Disposition);
    expect(updated?.whiteboardAutomation?.displayState).toBe('Awaiting Disposition');
    expect(resolveWhiteboardStateLabel(updated as Patient)).toBe('Awaiting Disposition');
  });

  it('moves to awaiting disposition through the BATCH path (applyWhiteboardAutomationToPatients), which shares the unreviewedResult/dispositionEvent lookups across the transition and evaluation steps for performance', () => {
    // Unlike the "physician records a diagnosis" test above (which calls
    // buildPhysicianDiagnosisPatch directly, bypassing the shared-context
    // optimization), this exercises the actual 30s-interval/workflow-transition
    // hot path (applyWhiteboardAutomationToPatients) for the disposition
    // transition specifically, proving the reused dispositionEvent lookup
    // still produces the correct post-transition automation snapshot.
    const now = new Date('2026-06-24T11:00:00.000Z');
    const source = patient({
      state: PatientState.Results,
      chiefComplaint: 'Chest pain',
      complaintCategory: 'Cardiac',
      flags: [],
      timeline: [
        {
          id: 'diagnosis-1',
          type: 'DispositionUpdated',
          timestamp: '2026-06-24T10:55:00.000Z',
          to: PatientState.Results,
          metadata: { diagnosis: 'Unstable angina' },
        },
      ],
    });

    const [updated] = applyWhiteboardAutomationToPatients([source], now);

    expect(updated.state).toBe(PatientState.Disposition);
    expect(updated.whiteboardAutomation?.displayState).toBe('Awaiting Disposition');
    expect(
      updated.timeline.some((event) => event.metadata?.automation === 'diagnosis-to-disposition'),
    ).toBe(true);
  });

  it('produces identical results whether latestUnreviewedResult/dispositionEvent are shared (batch path) or independently recomputed (standalone calls) for the same patient+timestamp', () => {
    const now = new Date('2026-06-24T09:30:00.000Z');
    const source = patient({
      state: PatientState.Orders,
      chiefComplaint: 'Chest pain',
      timeline: [
        { id: 'order-1', type: 'OrderPlaced', timestamp: '2026-06-24T09:00:00.000Z', to: PatientState.Orders },
        {
          id: 'result-1',
          type: 'ResultReceived',
          timestamp: '2026-06-24T09:25:00.000Z',
          to: PatientState.Orders,
          summary: 'Troponin resulted',
        },
      ],
    });

    const [batchResult] = applyWhiteboardAutomationToPatients([source], now);
    // Standalone: mirrors what applyWhiteboardAutomationToPatients did before
    // this round's optimization -- two independent, uncached calls.
    const standaloneSnapshot = evaluateWhiteboardAutomation(
      { ...source, state: batchResult.state, timeline: batchResult.timeline },
      now,
    );

    expect(batchResult.whiteboardAutomation).toEqual(standaloneSnapshot);
  });

  it('flags critical labs when a resulted value is marked critical', () => {
    const now = new Date('2026-06-24T09:40:00.000Z');
    const snapshot = evaluateWhiteboardAutomation(
      patient({
        state: PatientState.Results,
        flags: [],
        timeline: [
          {
            id: 'result-critical',
            type: 'ResultReceived',
            timestamp: '2026-06-24T09:35:00.000Z',
            to: PatientState.Results,
            metadata: { critical: true, analyte: 'Potassium' },
          },
        ],
      }),
      now,
    );

    expect(snapshot.displayState).toBe('Critical Labs');
    expect(snapshot.events.some((event) => event.id === 'critical-labs')).toBe(true);
  });
});