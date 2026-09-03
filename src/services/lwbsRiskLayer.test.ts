import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority } from '../types/emergency';
import {
  buildLwbsRiskAdvisoryAlerts,
  buildLwbsRiskAttentionSnapshot,
  resolveLwbsRisk,
  shouldSurfaceLwbsRisk,
  summarizeLwbsRiskBoard,
} from './lwbsRiskLayer';

const STABLE_NOW = new Date('2026-06-20T22:30:00.000Z');

function buildPatient(overrides: any = {}) {
  return {
    id: 'patient-1',
    firstName: 'Jordan',
    lastName: 'Lee',
    mrn: 'MRN-100',
    state: PatientState.Waiting,
    priority: Priority.P3,
    arrivalTime: '2026-06-20T20:00:00.000Z',
    triageTime: '2026-06-20T20:10:00.000Z',
    complaintCategory: 'Psych',
    chiefComplaint: 'Anxiety and long wait frustration',
    flags: [],
    timeline: [{ type: 'Triage', timestamp: '2026-06-20T20:10:00.000Z' }],
    reassessmentReminders: [],
    ...overrides,
  };
}

describe('lwbsRiskLayer', () => {
  it('returns null for non-waiting patients', () => {
    expect(
      resolveLwbsRisk(buildPatient({ state: PatientState.Assessment }), { now: STABLE_NOW }),
    ).toBeNull();
  });

  it('scores elevated risk from wait, overdue reassessment, low contact, congestion, and complaint context', () => {
    const snapshot = resolveLwbsRisk(
      buildPatient({
        flags: [PatientFlag.ReassessmentDue],
        reassessmentReminders: [
          { id: 'r1', status: 'overdue', dueAt: '2026-06-20T21:00:00.000Z' },
          { id: 'r2', status: 'missed', dueAt: '2026-06-20T21:30:00.000Z' },
        ],
      }),
      { now: STABLE_NOW, waitingPatientCount: 18, congestionThreshold: 12 },
    );

    expect(snapshot?.level).toBe('elevated');
    expect(snapshot?.advisoryOnly).toBe(true);
    expect(snapshot?.factors.map((factor) => factor.id)).toEqual(
      expect.arrayContaining([
        'wait-duration',
        'overdue-reassessment',
        'low-contact-frequency',
        'waiting-room-congestion',
        'time-of-day',
        'complaint-category',
      ]),
    );
  });

  it('surfaces medium risk and above to staff views', () => {
    const medium = resolveLwbsRisk(
      buildPatient({ arrivalTime: '2026-06-20T22:00:00.000Z', complaintCategory: 'General' }),
      { now: STABLE_NOW, waitingPatientCount: 4 },
    );
    const low = resolveLwbsRisk(
      buildPatient({
        arrivalTime: '2026-06-20T22:10:00.000Z',
        complaintCategory: 'Chest pain',
        timeline: [
          { type: 'Triage', timestamp: '2026-06-20T22:11:00.000Z' },
          { type: 'VitalsUpdated', timestamp: '2026-06-20T22:25:00.000Z' },
        ],
      }),
      { now: STABLE_NOW, waitingPatientCount: 3 },
    );

    expect(medium?.level).not.toBe('low');
    expect(shouldSurfaceLwbsRisk(medium)).toBe(true);
    expect(low?.level).toBe('low');
    expect(shouldSurfaceLwbsRisk(low)).toBe(false);
  });

  it('builds advisory notification center alerts for high and elevated risk only', () => {
    const alerts = buildLwbsRiskAdvisoryAlerts(
      [
        buildPatient(),
        buildPatient({
          id: 'patient-2',
          arrivalTime: '2026-06-20T22:10:00.000Z',
          complaintCategory: 'Chest pain',
          timeline: [
            { type: 'Triage', timestamp: '2026-06-20T22:11:00.000Z' },
            { type: 'VitalsUpdated', timestamp: '2026-06-20T22:25:00.000Z' },
          ],
        }),
      ],
      { now: STABLE_NOW, waitingPatientCount: 18 },
    );

    expect(alerts.length).toBe(1);
    expect(alerts[0]?.patientId).toBe('patient-1');
    expect(alerts[0]?.source).toBe('lwbs-risk-advisory');
    expect(alerts[0]?.metadata?.advisoryOnly).toBe(true);
    expect(alerts[0]?.severity).toBe('Critical');
  });

  it('summarizes risk levels across waiting patients', () => {
    const summary = summarizeLwbsRiskBoard(
      [
        buildPatient(),
        buildPatient({
          id: 'patient-2',
          arrivalTime: '2026-06-20T22:20:00.000Z',
          complaintCategory: 'Chest pain',
        }),
      ],
      { now: STABLE_NOW, waitingPatientCount: 18 },
    );

    expect(summary.elevated + summary.high + summary.medium + summary.low).toBe(2);
    expect(summary.elevated).toBe(1);
  });

  it('builds attention snapshot for the waiting-room board and other real consumers', () => {
    const snapshot = buildLwbsRiskAttentionSnapshot([buildPatient()], {
      now: STABLE_NOW,
      waitingPatientCount: 18,
    });

    expect(snapshot.elevatedAndHighCount).toBeGreaterThan(0);
    expect(snapshot.previewRows[0]?.level).toBe('elevated');
  });
});
