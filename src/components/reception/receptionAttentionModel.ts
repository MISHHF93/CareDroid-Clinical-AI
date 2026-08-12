/**
 * Single attention source for the reception desk.
 * Merges critical intake timers + escalations; dedupes by patient.
 */
import type { Alert } from '../../types/emergency';
import {
  buildReceptionEscalationAttentionSnapshot,
  isReceptionEscalationAlert,
  RECEPTION_ESCALATION_ALERT_SOURCE,
} from '../../services/receptionEscalationWorkflow';

export type ReceptionAttentionTone = 'critical' | 'warning' | 'info';

export type ReceptionAttentionAction = 'open_patient' | 'escalate' | 'timer';

export type ReceptionAttentionRow = {
  id: string;
  patientId?: string;
  title: string;
  detail: string;
  tone: ReceptionAttentionTone;
  primaryAction: ReceptionAttentionAction;
  /** Optional live timer label (e.g. "2:14") */
  timerLabel?: string | null;
  breached?: boolean;
  source: 'critical-intake' | 'escalation' | 'three-minute';
};

export type ReceptionAttentionSnapshot = {
  count: number;
  criticalCount: number;
  rows: ReceptionAttentionRow[];
};

const CRITICAL_INTAKE_SOURCES = new Set([
  'reception-critical-intake',
  'reception-escalation-workflow',
  'three-minute-timer-engine',
  RECEPTION_ESCALATION_ALERT_SOURCE,
]);

export function isReceptionCriticalAttentionAlert(alert: Alert): boolean {
  return (
    alert.severity === 'Critical' &&
    !alert.dismissed &&
    !alert.acknowledged &&
    CRITICAL_INTAKE_SOURCES.has(String(alert.source || ''))
  );
}

function severityToTone(severity: Alert['severity'] | string | undefined): ReceptionAttentionTone {
  if (severity === 'Critical') return 'critical';
  if (severity === 'Warning') return 'warning';
  return 'info';
}

/**
 * threeMinuteTimerEngine's escalation alerts (30s/2min/3min/5min thresholds) only
 * ever fire AFTER their threshold has already elapsed -- they describe a milestone
 * already in the past, not a deadline still counting down. Applying the generic
 * 180-second countdown below to one of these (as this function used to do
 * unconditionally) makes every alert past the 3-minute mark show a permanently
 * frozen "0:00", which is why a batch of them looks like duplicated, meaningless
 * notifications rather than distinct, informative escalations.
 */
function formatElapsedSinceEscalation(alert: Alert, now: number): { label: string; breached: boolean } {
  const firedAt = String(alert.createdAt || '');
  const fired = new Date(firedAt).getTime();
  if (!Number.isFinite(fired)) return { label: 'Escalated', breached: true };
  const elapsedSeconds = Math.max(0, Math.floor((now - fired) / 1000));
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const label = minutes > 0 ? `${minutes}m ${seconds}s ago` : `${seconds}s ago`;
  return { label, breached: true };
}

function formatTimerFromAlert(alert: Alert, now: number): { label: string; breached: boolean } {
  if (String(alert.source || '') === 'three-minute-timer-engine') {
    return formatElapsedSinceEscalation(alert, now);
  }
  const startedAt = String(alert.metadata?.responseStartedAt || alert.createdAt || '');
  const started = new Date(startedAt).getTime();
  if (!Number.isFinite(started)) return { label: '3:00', breached: false };
  const elapsed = now - started;
  const breached = elapsed >= 180000;
  const remaining = Math.max(0, 180 - Math.floor(elapsed / 1000));
  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, '0');
  return { label: `${minutes}:${seconds}`, breached };
}

/**
 * Build a flat, action-first attention list for the reception desk.
 * Prefer patient-linked rows; dedupe by patientId (keep highest priority).
 */
export function buildReceptionAttentionSnapshot(
  alerts: Alert[] = [],
  options: { roleId?: string | null; limit?: number; now?: number } = {},
): ReceptionAttentionSnapshot {
  const now = options.now ?? Date.now();
  const limit = options.limit ?? 3;
  const rows: ReceptionAttentionRow[] = [];

  // 1) Critical intake / 3-minute timers (non-escalation sources first for timer UI)
  const critical = alerts.filter(isReceptionCriticalAttentionAlert);
  for (const alert of critical) {
    if (isReceptionEscalationAlert(alert)) continue;
    const timer = formatTimerFromAlert(alert, now);
    const source =
      String(alert.source || '') === 'three-minute-timer-engine' ? 'three-minute' : 'critical-intake';
    rows.push({
      id: `crit-${alert.id}`,
      patientId: alert.patientId,
      title: alert.title || 'Critical response',
      detail: alert.message || '3-minute response active',
      tone: timer.breached ? 'critical' : severityToTone(alert.severity),
      primaryAction: alert.patientId ? 'open_patient' : 'timer',
      timerLabel: timer.label,
      breached: timer.breached,
      source,
    });
  }

  // 2) Escalation workflow (all active for role, or all if no role filter for desk origin)
  const escalation = buildReceptionEscalationAttentionSnapshot(alerts, {
    // Reception desk should see escalations it raised; don't filter by clinical recipient role
    roleId: null,
    limit: 8,
  });
  for (const row of escalation.previewRows) {
    rows.push({
      id: `esc-${row.alertId}`,
      patientId: row.patientId,
      title: row.reasonLabel || row.title || 'Escalation',
      detail: row.message || row.targetsLabel || 'Nurse notified',
      tone: severityToTone(row.severity),
      primaryAction: row.patientId ? 'open_patient' : 'escalate',
      timerLabel: null,
      breached: false,
      source: 'escalation',
    });
  }

  // Priority: critical > warning > info; breached timers first
  const rank = (row: ReceptionAttentionRow) => {
    if (row.breached) return 0;
    if (row.tone === 'critical') return 1;
    if (row.tone === 'warning') return 2;
    return 3;
  };

  rows.sort((a, b) => rank(a) - rank(b));

  // Dedupe by patientId (keep first / highest priority)
  const seenPatients = new Set<string>();
  const seenIds = new Set<string>();
  const deduped: ReceptionAttentionRow[] = [];
  for (const row of rows) {
    if (seenIds.has(row.id)) continue;
    if (row.patientId) {
      if (seenPatients.has(row.patientId)) continue;
      seenPatients.add(row.patientId);
    }
    seenIds.add(row.id);
    deduped.push(row);
  }

  const limited = deduped.slice(0, limit);
  return {
    count: deduped.length,
    criticalCount: deduped.filter((r) => r.tone === 'critical' || r.breached).length,
    rows: limited,
  };
}

export type ReceptionQueueRowAction =
  | 'complete_id'
  | 'escalate'
  | 'handoff'
  | 'select';

export type ReceptionQueueRowModel = {
  patientId: string;
  riskTone: 'critical' | 'warning' | 'neutral';
  riskLabel: string;
  primaryAction: ReceptionQueueRowAction;
  primaryLabel: string;
};

export function resolveReceptionQueueRowModel(input: {
  patientId: string;
  isHighRisk: boolean;
  registrationStatus?: string | null;
  triagePending?: boolean;
  state?: string;
}): ReceptionQueueRowModel {
  const provisional =
    input.registrationStatus === 'provisional' || input.registrationStatus === 'in-progress';
  if (input.isHighRisk) {
    return {
      patientId: input.patientId,
      riskTone: 'critical',
      riskLabel: 'High risk',
      primaryAction: 'escalate',
      primaryLabel: 'Escalate',
    };
  }
  if (provisional) {
    return {
      patientId: input.patientId,
      riskTone: 'warning',
      riskLabel: 'ID incomplete',
      primaryAction: 'complete_id',
      primaryLabel: 'Complete ID',
    };
  }
  if (input.triagePending || input.state === 'Triage' || input.state === 'Waiting') {
    return {
      patientId: input.patientId,
      riskTone: 'neutral',
      riskLabel: 'Queue',
      primaryAction: 'handoff',
      primaryLabel: 'Handoff',
    };
  }
  return {
    patientId: input.patientId,
    riskTone: 'neutral',
    riskLabel: 'Open',
    primaryAction: 'select',
    primaryLabel: 'Open',
  };
}
