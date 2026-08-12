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

  // User-reported: a batch of threeMinuteTimerEngine's "5-Minute Breach" alerts (one
  // per patient, all already past their threshold) all showed an identical, frozen
  // "0:00" timer, making genuinely distinct per-patient escalations look like
  // duplicated, meaningless notifications. Root cause: formatTimerFromAlert applied
  // a generic "count down from 3:00" formula to every alert regardless of source,
  // but threeMinuteTimerEngine alerts only ever fire AFTER their threshold has
  // already elapsed -- there's nothing left to count down, so anything past 3
  // minutes bottomed out at the same static "0:00" for every patient.
  it('shows a real elapsed-since-escalation time for threeMinuteTimerEngine alerts instead of a frozen 0:00', () => {
    const now = Date.now();
    const alerts = [
      alert({
        id: 'breach-5min',
        title: '5-Minute Breach: Administrator notification',
        patientId: 'p1',
        source: 'three-minute-timer-engine',
        createdAt: new Date(now - 320_000).toISOString(),
        metadata: { threshold: 'breach_admin', elapsed: 320 },
      }),
      alert({
        id: 'breach-3min',
        title: '3-MINUTE BREACH: Physician escalation required',
        patientId: 'p2',
        source: 'three-minute-timer-engine',
        createdAt: new Date(now - 185_000).toISOString(),
        metadata: { threshold: 'breach', elapsed: 185 },
      }),
    ];

    const snapshot = buildReceptionAttentionSnapshot(alerts, { limit: 3, now });
    const fiveMinRow = snapshot.rows.find((row) => row.patientId === 'p1');
    const threeMinRow = snapshot.rows.find((row) => row.patientId === 'p2');

    expect(fiveMinRow?.timerLabel).not.toBe('0:00');
    expect(threeMinRow?.timerLabel).not.toBe('0:00');
    // Distinct elapsed times must produce visibly distinct labels -- this is the
    // concrete symptom the user saw: every row looked identical.
    expect(fiveMinRow?.timerLabel).not.toBe(threeMinRow?.timerLabel);
    expect(fiveMinRow?.breached).toBe(true);
    expect(threeMinRow?.breached).toBe(true);
  });

  it('leaves the reception-critical-intake 3-minute countdown behavior unchanged', () => {
    const now = Date.now();
    const alerts = [
      alert({
        id: 'intake-1',
        title: 'Critical reception arrival',
        patientId: 'p1',
        source: 'reception-critical-intake',
        metadata: { responseStartedAt: new Date(now - 30_000).toISOString() },
      }),
    ];

    const snapshot = buildReceptionAttentionSnapshot(alerts, { limit: 3, now });
    const row = snapshot.rows.find((r) => r.patientId === 'p1');
    expect(row?.timerLabel).toBe('2:30');
    expect(row?.breached).toBe(false);
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
