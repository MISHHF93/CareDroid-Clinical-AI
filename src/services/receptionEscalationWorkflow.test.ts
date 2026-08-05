import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Alert } from '../types/emergency';
import {
  buildReceptionEscalationAlert,
  buildReceptionEscalationAttentionSnapshot,
  buildReceptionEscalationSubmission,
  buildReceptionEscalationTargetsLabel,
  filterReceptionEscalationsForRole,
  listActiveReceptionEscalations,
  RECEPTION_ESCALATION_ALERT_SOURCE,
  RECEPTION_ESCALATION_REASONS,
  RECEPTION_ESCALATION_SURFACES,
  resolveReceptionEscalationReason,
  summarizeReceptionEscalationBoard,
  syncReceptionEscalationOperationalSurfaces,
} from './receptionEscalationWorkflow';

function buildPatient(overrides: any = {}) {
  return {
    id: 'patient-1',
    mrn: 'MRN-900',
    firstName: 'Alex',
    lastName: 'Kim',
    state: PatientState.Waiting,
    priority: Priority.P3,
    chiefComplaint: 'Chest pain',
    flags: [],
    timeline: [],
    notes: [],
    ...overrides,
  };
}

describe('receptionEscalationWorkflow', () => {
  it('defines five reception escalation reasons', () => {
    expect(RECEPTION_ESCALATION_REASONS.map((reason) => reason.id)).toEqual([
      'worsening-symptoms',
      'collapse-distress',
      'duplicate-registration',
      'identity-mismatch',
      'urgent-triage-attention',
    ]);
  });

  it('builds triage and charge target labels', () => {
    expect(buildReceptionEscalationTargetsLabel(['triage', 'charge'])).toBe(
      'Triage nurse · Charge nurse',
    );
  });

  it('creates a critical alert for collapse distress that is not toast-suppressed', () => {
    const alert = buildReceptionEscalationAlert(
      {
        reasonId: 'collapse-distress',
        detail: 'Patient on floor near chairs',
        actorName: 'Desk Clerk',
      },
      { patient: buildPatient() },
    );

    expect(alert.source).toBe(RECEPTION_ESCALATION_ALERT_SOURCE);
    expect(alert.severity).toBe('Critical');
    // Critical escalations surface as toasts for triage/charge recipients on
    // shared boards (see buildReceptionEscalationAlert); only non-Critical
    // reasons are toast-suppressed.
    expect(alert.metadata?.suppressToast).toBe(false);
    expect(alert.title).toContain('Collapse / distress');
    expect(alert.message).toContain('Patient on floor near chairs');
  });

  it('submits escalation with workflow log, communication log, and clinical flags', () => {
    const submission = buildReceptionEscalationSubmission(
      {
        reasonId: 'worsening-symptoms',
        patientId: 'patient-1',
        detail: 'Pain increasing over 10 minutes',
        actorStaffId: 'clerk-1',
        actorName: 'Reception Clerk',
      },
      { patients: [buildPatient()] },
    );

    expect(submission?.record.reasonId).toBe('worsening-symptoms');
    expect(submission?.workflowLog.source).toBe(RECEPTION_ESCALATION_ALERT_SOURCE);
    expect(submission?.communicationLog?.metadata?.communicationKind).toBe('concern-escalated');
    expect(submission?.patients[0].flags).toContain('HighRisk');
    expect(submission?.patients[0].timeline.at(-1)?.type).toBe('ESCALATION');
  });

  it('summarizes active reception escalations for charge and triage workflows', () => {
    const alerts: Alert[] = [
      {
        id: 'a1',
        severity: 'Critical',
        title: 'Reception escalation — Collapse / distress',
        message: 'Waiting room',
        createdAt: '2026-06-20T10:00:00.000Z',
        dismissed: false,
        acknowledged: false,
        source: RECEPTION_ESCALATION_ALERT_SOURCE,
        metadata: { receptionEscalationTargets: 'triage,charge' },
      },
      {
        id: 'a2',
        severity: 'Warning',
        title: 'Reception escalation — Duplicate registration',
        message: 'Desk',
        createdAt: '2026-06-20T09:50:00.000Z',
        dismissed: false,
        acknowledged: true,
        source: RECEPTION_ESCALATION_ALERT_SOURCE,
        metadata: { receptionEscalationTargets: 'charge' },
      },
    ];

    expect(listActiveReceptionEscalations(alerts)).toHaveLength(1);
    expect(summarizeReceptionEscalationBoard(alerts)).toMatchObject({
      activeCount: 1,
      criticalCount: 1,
      triageCount: 1,
      chargeCount: 1,
    });
    expect(resolveReceptionEscalationReason('identity-mismatch')?.notifyTargets).toEqual([
      'triage',
      'charge',
    ]);
  });

  it('filters escalations by triage and charge nurse role', () => {
    const alerts: Alert[] = [
      {
        id: 'a1',
        severity: 'Critical',
        title: 'Reception escalation — Collapse / distress',
        message: 'Waiting room',
        createdAt: '2026-06-20T10:00:00.000Z',
        dismissed: false,
        acknowledged: false,
        source: RECEPTION_ESCALATION_ALERT_SOURCE,
        metadata: { receptionEscalationTargets: 'triage,charge' },
      },
      {
        id: 'a2',
        severity: 'Warning',
        title: 'Reception escalation — Duplicate registration',
        message: 'Desk',
        createdAt: '2026-06-20T09:50:00.000Z',
        dismissed: false,
        acknowledged: false,
        source: RECEPTION_ESCALATION_ALERT_SOURCE,
        metadata: { receptionEscalationTargets: 'charge' },
      },
    ];

    expect(filterReceptionEscalationsForRole(alerts, 'triage_nurse')).toHaveLength(1);
    expect(filterReceptionEscalationsForRole(alerts, 'charge_nurse')).toHaveLength(2);
    expect(buildReceptionEscalationAttentionSnapshot(alerts, { roleId: 'triage_nurse' }).rows).toHaveLength(1);
  });

  it('syncs reception escalation attention to operational surfaces', () => {
    const events: Array<{ type: string; payload: Record<string, unknown> }> = [];
    const alerts: Alert[] = [
      {
        id: 'a1',
        severity: 'Critical',
        title: 'Reception escalation — Urgent triage',
        message: 'Desk',
        createdAt: '2026-06-20T10:00:00.000Z',
        dismissed: false,
        acknowledged: false,
        source: RECEPTION_ESCALATION_ALERT_SOURCE,
        metadata: { receptionEscalationTargets: 'triage,charge' },
      },
    ];

    syncReceptionEscalationOperationalSurfaces(alerts, {
      dispatchWebSocketEvent: (event) => events.push(event),
    });

    expect(events[0]?.type).toBe('reception_escalation_sync');
    expect(events[0]?.payload.surfaces).toEqual([...RECEPTION_ESCALATION_SURFACES]);
  });
});
