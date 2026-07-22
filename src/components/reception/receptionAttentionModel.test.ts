import { describe, expect, it } from 'vitest';
import {
  buildReceptionAttentionSnapshot,
  resolveReceptionQueueRowModel,
} from './receptionAttentionModel';
import type { Alert } from '../../types/emergency';
import { RECEPTION_ESCALATION_ALERT_SOURCE } from '../../services/receptionEscalationWorkflow';

function alert(partial: Partial<Alert> & Pick<Alert, 'id' | 'title'>): Alert {
  return {
    message: partial.message || 'msg',
    severity: partial.severity || 'Critical',
    createdAt: partial.createdAt || new Date().toISOString(),
    dismissed: false,
    acknowledged: false,
    source: partial.source || 'reception-critical-intake',
    patientId: partial.patientId,
    metadata: partial.metadata || {},
    ...partial,
  } as Alert;
}

describe('receptionAttentionModel', () => {
  it('merges critical timers and escalations into a flat capped list', () => {
    const now = Date.now();
    const alerts = [
      alert({
        id: 'a1',
        title: 'Critical intake',
        patientId: 'p1',
        source: 'three-minute-timer-engine',
        metadata: { responseStartedAt: new Date(now - 30000).toISOString() },
      }),
      alert({
        id: 'a2',
        title: 'Reception escalation',
        patientId: 'p2',
        source: RECEPTION_ESCALATION_ALERT_SOURCE,
        severity: 'Critical',
        metadata: {
          receptionEscalationReason: 'urgent-triage-attention',
          receptionEscalationTargets: 'triage,charge',
        },
      }),
      alert({
        id: 'a3',
        title: 'Dup patient',
        patientId: 'p1',
        source: RECEPTION_ESCALATION_ALERT_SOURCE,
        severity: 'Warning',
        metadata: {
          receptionEscalationReason: 'identity-mismatch',
          receptionEscalationTargets: 'triage',
        },
      }),
    ];

    const snapshot = buildReceptionAttentionSnapshot(alerts, { limit: 3, now });
    expect(snapshot.count).toBeGreaterThanOrEqual(2);
    expect(snapshot.rows.length).toBeLessThanOrEqual(3);
    // p1 deduped — only one row for patient p1
    const p1Rows = snapshot.rows.filter((row) => row.patientId === 'p1');
    expect(p1Rows.length).toBe(1);
    expect(snapshot.rows.some((row) => row.timerLabel)).toBe(true);
  });

  it('resolves queue row primary actions for reception tasks', () => {
    expect(
      resolveReceptionQueueRowModel({
        patientId: 'p1',
        isHighRisk: true,
      }).primaryAction,
    ).toBe('escalate');

    expect(
      resolveReceptionQueueRowModel({
        patientId: 'p2',
        isHighRisk: false,
        registrationStatus: 'provisional',
      }).primaryLabel,
    ).toBe('Complete ID');

    expect(
      resolveReceptionQueueRowModel({
        patientId: 'p3',
        isHighRisk: false,
        triagePending: true,
      }).primaryAction,
    ).toBe('handoff');
  });
});
