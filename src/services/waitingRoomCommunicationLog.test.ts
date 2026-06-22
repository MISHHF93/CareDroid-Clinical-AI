import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient, type WorkflowActionLog } from '../types/emergency';
import {
  buildCommunicationEvents,
  classifyWorkflowCommunicationKind,
  createWaitingRoomCommunicationLogInput,
  formatCommunicationDuration,
  isDelayInformedNoteText,
  recordWaitingRoomCommunication,
  resolveCommunicationRecency,
  summarizeCommunicationBoard,
  syncWaitingRoomCommunicationOperationalSurfaces,
  WAITING_ROOM_COMMUNICATION_SOURCE,
  WAITING_ROOM_COMMUNICATION_SURFACES,
} from './waitingRoomCommunicationLog';

const NOW = new Date('2026-06-20T10:00:00.000Z');

function buildPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    mrn: 'MRN-100',
    firstName: 'Jamie',
    lastName: 'Lee',
    dob: '1990-01-01',
    age: 36,
    sex: 'F',
    arrivalTime: '2026-06-20T08:00:00.000Z',
    triageTime: '2026-06-20T08:15:00.000Z',
    state: PatientState.Waiting,
    priority: Priority.P3,
    chiefComplaint: 'Abdominal pain',
    notes: [],
    timeline: [],
    ...overrides,
  };
}

describe('waitingRoomCommunicationLog', () => {
  it('detects delay-informed note text', () => {
    expect(isDelayInformedNoteText('Informed patient of ED delay due to backlog')).toBe(true);
    expect(isDelayInformedNoteText('Patient resting comfortably')).toBe(false);
  });

  it('classifies workflow logs into communication kinds', () => {
    expect(
      classifyWorkflowCommunicationKind({
        id: 'log-1',
        type: 'journey_state_changed',
        title: 'Journey state changed',
        summary: 'Moved patient from Waiting to Assessment.',
        timestamp: '2026-06-20T09:00:00.000Z',
        source: 'patient-journey-engine',
        severity: 'Info',
        status: 'recorded',
        metadata: {},
      }),
    ).toBe('queue-status-moved');

    expect(
      classifyWorkflowCommunicationKind({
        id: 'log-2',
        type: 'reassessment_completed',
        title: 'Reassessment completed',
        summary: 'Vitals reassessment recorded.',
        timestamp: '2026-06-20T09:10:00.000Z',
        source: 'reassessment-engine',
        severity: 'Info',
        status: 'recorded',
        metadata: {},
      }),
    ).toBe('vitals-repeated');
  });

  it('builds communication events from workflow logs, notes, and timeline', () => {
    const workflowLogs: WorkflowActionLog[] = [
      createWaitingRoomCommunicationLogInput({
        kind: 'delay-informed',
        patientId: 'patient-1',
        summary: 'Informed patient of provider delay.',
        actorStaffId: 'rn-1',
        timestamp: '2026-06-20T09:45:00.000Z',
      }) as WorkflowActionLog,
      {
        id: 'log-queue',
        type: 'journey_state_changed',
        title: 'Journey state changed',
        summary: 'Moved patient from Triage to Waiting.',
        timestamp: '2026-06-20T08:20:00.000Z',
        patientId: 'patient-1',
        source: 'patient-journey-engine',
        severity: 'Info',
        status: 'recorded',
        metadata: {},
      },
    ];

    const patient = buildPatient({
      notes: [
        {
          id: 'note-1',
          text: 'Checked in with patient.',
          authorId: 'rn-1',
          type: 'Nursing',
          timestamp: '2026-06-20T09:30:00.000Z',
        },
      ],
      timeline: [
        {
          id: 'evt-1',
          type: 'VitalsUpdated',
          timestamp: '2026-06-20T09:00:00.000Z',
          to: PatientState.Waiting,
          summary: 'Repeat vitals recorded.',
        },
      ],
    });

    const events = buildCommunicationEvents(patient, { workflowLogs, now: NOW });
    expect(events.map((event) => event.kind)).toEqual([
      'delay-informed',
      'patient-updated',
      'vitals-repeated',
      'queue-status-moved',
    ]);
  });

  it('resolves communication recency for patient detail and board display', () => {
    const patient = buildPatient({
      notes: [
        {
          id: 'note-1',
          text: 'Updated patient on wait.',
          authorId: 'rn-1',
          type: 'Nursing',
          timestamp: '2026-06-20T09:50:00.000Z',
        },
      ],
    });

    const recency = resolveCommunicationRecency(patient, { now: NOW });
    expect(recency.minutesSinceContact).toBe(10);
    expect(recency.recencyLabel).toContain('10m ago');
    expect(recency.lastEventKind).toBe('patient-updated');
    expect(formatCommunicationDuration(10)).toBe('10m ago');
  });

  it('summarizes stale and overdue communication counts for the board', () => {
    const patients = [
      buildPatient({ id: 'fresh', notes: [{ id: 'n1', text: 'Checked in', timestamp: '2026-06-20T09:50:00.000Z' }] }),
      buildPatient({ id: 'stale', notes: [{ id: 'n2', text: 'Checked in', timestamp: '2026-06-20T09:20:00.000Z' }] }),
      buildPatient({ id: 'none', notes: [] }),
    ];

    const summary = summarizeCommunicationBoard(patients, { now: NOW });
    expect(summary.staleContactCount).toBe(1);
    expect(summary.noContactCount).toBe(1);
  });

  it('creates workflow log input with waiting-room communication source', () => {
    const input = createWaitingRoomCommunicationLogInput({
      kind: 'concern-escalated',
      patientId: 'patient-1',
      summary: 'Escalated for urgent review.',
      actorStaffId: 'charge-1',
      severity: 'Critical',
    });

    expect(input.source).toBe(WAITING_ROOM_COMMUNICATION_SOURCE);
    expect(input.metadata?.communicationKind).toBe('concern-escalated');
  });

  it('records communication events through workflow audit infrastructure', () => {
    const patient = buildPatient();
    const logs: WorkflowActionLog[] = [];

    const recorded = recordWaitingRoomCommunication(
      {
        patients: [patient],
        recordWorkflowAction: (input) => {
          const log = { ...input, id: 'log-1', status: 'recorded' } as WorkflowActionLog;
          logs.push(log);
          return log;
        },
      },
      {
        kind: 'delay-informed',
        patientId: patient.id,
        summary: 'Informed patient of provider delay.',
        actorStaffId: 'rn-1',
      },
    );

    expect(recorded?.metadata?.communicationKind).toBe('delay-informed');
    expect(logs).toHaveLength(1);
  });

  it('syncs communication recency to operational surfaces', () => {
    const events: Array<{ type: string; payload: Record<string, unknown> }> = [];
    const patient = buildPatient({
      notes: [{ id: 'n1', text: 'Checked in', timestamp: '2026-06-20T09:50:00.000Z' }],
    });

    syncWaitingRoomCommunicationOperationalSurfaces(
      {
        patients: [patient],
        dispatchWebSocketEvent: (event) => events.push(event),
      },
      { patientId: patient.id, source: 'test' },
    );

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('waiting_room_communication_sync');
    expect(events[0]?.payload.surfaces).toEqual([...WAITING_ROOM_COMMUNICATION_SURFACES]);
  });
});
