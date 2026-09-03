import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority } from '../types/emergency';
import {
  buildWaitingRoomSafetyEscalationAlerts,
  buildWaitingRoomSafetyEscalationSnapshot,
  resolveWaitingRoomSafetyEscalationTriggers,
  selectWaitingRoomSafetyEscalationMetrics,
} from './waitingRoomSafetyEscalationVisibilityModel';

const now = new Date('2026-06-20T12:00:00.000Z');

function waitingPatient(overrides: any = {}) {
  return {
    id: 'p-1',
    mrn: 'MRN-1',
    firstName: 'Alex',
    lastName: 'Patient',
    state: PatientState.Waiting,
    priority: Priority.P3,
    arrivalTime: new Date(now.getTime() - 90 * 60000).toISOString(),
    triageTime: new Date(now.getTime() - 80 * 60000).toISOString(),
    chiefComplaint: 'Chest pain',
    highRiskComplaintFlags: [{ id: 'chest-pain', label: 'Chest pain' }],
    flags: [PatientFlag.DeteriorationRisk],
    vitals: [
      { hr: 150, sbp: 85, spo2: 88, recordedAt: new Date(now.getTime() - 5 * 60000).toISOString() },
    ],
    reassessmentReminders: [
      { id: 'r-1', dueAt: new Date(now.getTime() - 30 * 60000).toISOString(), status: 'overdue' },
    ],
    ...overrides,
  };
}

describe('waitingRoomSafetyEscalationVisibilityModel', () => {
  it('detects all five escalation triggers for a waiting patient', () => {
    const triggers = resolveWaitingRoomSafetyEscalationTriggers(waitingPatient(), {
      now,
      communicationOverdueMinutes: 30,
    });

    expect(triggers).toEqual(
      expect.arrayContaining([
        'overdue-reassessment',
        'abnormal-vitals',
        'high-risk-complaint',
        'long-since-contact',
        'worsening-symptoms',
      ]),
    );
  });

  it('builds aggregate snapshot and strip metrics', () => {
    const snapshot = buildWaitingRoomSafetyEscalationSnapshot([waitingPatient()], { now });
    expect(snapshot.escalatedPatientCount).toBe(1);
    expect(snapshot.abnormalVitalsCount).toBe(1);
    expect(snapshot.worseningSymptomsCount).toBe(1);

    const metrics = selectWaitingRoomSafetyEscalationMetrics([waitingPatient()], {
      now,
      surface: 'chargeNurse',
    });
    expect(metrics).toHaveLength(5);
    expect(metrics.map((metric) => metric.label)).toContain('Abnormal vitals');
  });

  it('creates notification-center alerts for escalated patients', () => {
    const alerts = buildWaitingRoomSafetyEscalationAlerts([waitingPatient()], { now });
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].source).toBe('waiting-room-safety-escalation');
    expect(alerts[0].patientId).toBe('p-1');
  });
});
