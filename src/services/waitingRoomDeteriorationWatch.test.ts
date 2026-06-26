import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority } from '../types/emergency';
import {
  buildDeteriorationWatchAlerts,
  buildDeteriorationWatchAttentionSnapshot,
  resolveDeteriorationWatch,
  shouldSurfaceDeteriorationWatch,
  summarizeDeteriorationWatchBoard,
  syncDeteriorationWatchOperationalSurfaces,
  DETERIORATION_WATCH_SURFACES,
} from './waitingRoomDeteriorationWatch';

const STABLE_NOW = new Date('2026-06-20T10:30:00.000Z');

function buildPatient(overrides: any = {}) {
  return {
    id: 'patient-1',
    firstName: 'Sam',
    lastName: 'Nguyen',
    mrn: 'MRN-200',
    state: PatientState.Waiting,
    priority: Priority.P2,
    arrivalTime: '2026-06-20T08:00:00.000Z',
    triageTime: '2026-06-20T08:15:00.000Z',
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Chest pain',
    highRiskComplaintFlags: [
      {
        id: 'chest-pain',
        label: 'Chest pain',
        detectedAt: '2026-06-20T08:00:00.000Z',
        source: 'complaint-category',
      },
    ],
    vitals: [{ recordedAt: '2026-06-20T08:20:00.000Z', hr: 102, spo2: 93 }],
    vitalsUpdatedAt: '2026-06-20T08:20:00.000Z',
    flags: [PatientFlag.HighRisk],
    timeline: [],
    reassessmentReminders: [],
    ...overrides,
  };
}

describe('waitingRoomDeteriorationWatch', () => {
  it('returns null for non-waiting patients', () => {
    expect(
      resolveDeteriorationWatch(buildPatient({ state: PatientState.Assessment }), {
        now: STABLE_NOW,
      }),
    ).toBeNull();
  });

  it('flags overdue vitals, high-risk complaint, and EMS observations without clinical decisions', () => {
    const snapshot = resolveDeteriorationWatch(buildPatient(), {
      now: STABLE_NOW,
      emsArrivals: [
        {
          id: 'ems-1',
          patientId: 'patient-1',
          unitId: 'unit-1',
          unitName: 'Medic 12',
          crewNames: ['A. Lee'],
          patientAge: 54,
          patientSex: 'M',
          chiefComplaint: 'Chest pain',
          mechanismOfInjury: 'Fall from standing',
          severity: 'Critical',
          eta: 0,
          dispatchTime: '2026-06-20T07:50:00.000Z',
          estimatedArrivalTime: '2026-06-20T08:00:00.000Z',
          notes: 'Critical EMS handoff',
          status: 'Complete',
          prearrivalComplaint: 'Chest pain',
          priority: Priority.P2,
        },
      ],
    });

    expect(snapshot?.watchActive).toBe(true);
    expect(snapshot?.advisoryOnly).toBe(true);
    expect(snapshot?.level).toBe('urgent-review');
    expect(snapshot?.factors.map((factor) => factor.id)).toEqual(
      expect.arrayContaining([
        'overdue-vitals',
        'high-risk-complaint',
        'ems-intake-observation',
      ]),
    );
  });

  it('flags repeated reassessment delays as a watch factor', () => {
    const snapshot = resolveDeteriorationWatch(
      buildPatient({
        highRiskComplaintFlags: [],
        flags: [],
        complaintCategory: 'General',
        chiefComplaint: 'Abdominal pain',
        vitalsUpdatedAt: '2026-06-20T10:10:00.000Z',
        vitals: [{ recordedAt: '2026-06-20T10:10:00.000Z', hr: 88 }],
        reassessmentReminders: [
          { id: 'r1', status: 'overdue', dueAt: '2026-06-20T09:40:00.000Z' },
          { id: 'r2', status: 'missed', dueAt: '2026-06-20T10:00:00.000Z' },
        ],
      }),
      { now: STABLE_NOW },
    );

    expect(snapshot?.factors.some((factor) => factor.id === 'reassessment-delays')).toBe(true);
    expect(shouldSurfaceDeteriorationWatch(snapshot)).toBe(true);
  });

  it('builds staff alerts only for review-needed and urgent-review levels', () => {
    const alerts = buildDeteriorationWatchAlerts(
      [
        buildPatient(),
        buildPatient({
          id: 'patient-2',
          chiefComplaint: 'Sore throat',
          triageTime: '2026-06-20T10:15:00.000Z',
          lastAssessedTime: '2026-06-20T10:20:00.000Z',
          arrivalTime: '2026-06-20T10:00:00.000Z',
          vitalsUpdatedAt: '2026-06-20T10:25:00.000Z',
          vitals: [{ recordedAt: '2026-06-20T10:25:00.000Z', hr: 80 }],
          highRiskComplaintFlags: [],
          flags: [],
          complaintCategory: 'General',
          reassessmentReminders: [{ id: 'r-ok', status: 'pending', dueAt: '2026-06-20T10:45:00.000Z' }],
        }),
      ],
      { now: STABLE_NOW },
    );

    expect(alerts.length).toBe(1);
    expect(alerts[0]?.source).toBe('deterioration-watch-advisory');
    expect(alerts[0]?.metadata?.advisoryOnly).toBe(true);
  });

  it('summarizes deterioration watch levels across waiting patients', () => {
    const summary = summarizeDeteriorationWatchBoard([buildPatient()], { now: STABLE_NOW });
    expect(summary['urgent-review'] + summary['review-needed'] + summary.watch).toBeGreaterThan(0);
  });

  it('builds attention snapshot and syncs advisory surfaces', () => {
    const events: Array<{ type: string; payload: Record<string, unknown> }> = [];
    const snapshot = buildDeteriorationWatchAttentionSnapshot([buildPatient()], {
      now: STABLE_NOW,
    });

    expect(snapshot.activeCount).toBeGreaterThan(0);
    expect(snapshot.reviewAndUrgentCount).toBeGreaterThan(0);

    syncDeteriorationWatchOperationalSurfaces(
      {
        patients: [buildPatient()],
        dispatchWebSocketEvent: (event) => events.push(event),
      },
      { patientId: 'patient-1', source: 'test' },
    );

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe('deterioration_watch_sync');
    expect(events[0]?.payload.surfaces).toEqual([...DETERIORATION_WATCH_SURFACES]);
    expect(events[0]?.payload.rows?.[0]).toMatchObject({ advisoryOnly: true });
  });
});
