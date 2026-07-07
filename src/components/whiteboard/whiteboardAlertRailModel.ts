import type { Alert, EMSArrival, Patient, Referral, Staff } from '../../types/emergency';
import type { LwbsRiskContext } from '../../services/lwbsRiskLayer';
import type { DeteriorationWatchContext } from '../../services/waitingRoomDeteriorationWatch';
import type { QueueReasonContext } from '../../services/queueReasonVisibility';
import { countReassessmentAttentionPatients } from './reassessmentVisibilityModel';
import { buildHighRiskComplaintBoardSummary } from '../../services/highRiskComplaintFlags';
import { summarizeTriageBreachBoard } from '../../services/triageBreachTimer';
import { buildProviderWaitBreachAttentionSnapshot } from '../../services/providerWaitBreachTimer';
import {
  buildProviderWaitVisibilitySnapshot,
  hasProviderWaitVisibilityActivity,
} from '../../services/providerWaitVisibilityModel';
import { summarizeLwbsRiskBoard, buildLwbsRiskAttentionSnapshot } from '../../services/lwbsRiskLayer';
import { summarizeDeteriorationWatchBoard, buildDeteriorationWatchAttentionSnapshot } from '../../services/waitingRoomDeteriorationWatch';
import { buildReceptionEscalationAttentionSnapshot } from '../../services/receptionEscalationWorkflow';
import { buildQueueReasonBoardSummary } from '../../services/queueReasonVisibility';
import { buildFitToWaitAttentionSnapshot } from '../../services/fitToWaitPathway';

export const MAX_WHITEBOARD_ALERT_METRICS = 6;

export type WhiteboardAlertMetric = {
  id: string;
  label: string;
  value: number;
  tone: 'critical' | 'warning' | 'info' | 'success' | 'neutral';
  hint?: string;
  patientId?: string;
  priority: number;
};

export type WaitingRoomAlertRailFeatures = {
  showTriageBreach?: boolean;
  showProviderWait?: boolean;
  showSafetyEscalation?: boolean;
};

export type BuildWaitingRoomAlertMetricsInput = {
  patients: Patient[];
  alerts?: Alert[];
  referrals?: Referral[];
  staff?: Staff[];
  workflowLogs?: unknown[];
  emsArrivals?: EMSArrival[];
  settings?: Record<string, unknown> | null;
  roleId?: string | null;
  features?: WaitingRoomAlertRailFeatures;
};

function pushMetric(
  metrics: WhiteboardAlertMetric[],
  metric: Omit<WhiteboardAlertMetric, 'priority'> & { priority?: number },
) {
  if (!metric.value) return;
  metrics.push({
    ...metric,
    priority: metric.priority ?? (metric.tone === 'critical' ? 0 : metric.tone === 'warning' ? 1 : 2),
  });
}

export function buildWaitingRoomAlertMetrics({
  patients,
  alerts = [] as any[],
  referrals = [] as any[],
  staff = [] as any[],
  workflowLogs = [] as any[],
  emsArrivals = [] as any[],
  settings = null,
  roleId = null,
  features = {} as any,
}: BuildWaitingRoomAlertMetricsInput): WhiteboardAlertMetric[] {
  const metrics: WhiteboardAlertMetric[] = [];
  const waitingCount = patients.filter((patient) => patient.state === 'Waiting').length;
  const lwbsContext = {
    settings: settings || undefined,
    waitingPatientCount: waitingCount,
    workflowLogs,
    staff,
  } as LwbsRiskContext;
  const deteriorationContext = {
    settings: settings || undefined,
    emsArrivals,
  } as DeteriorationWatchContext;
  const queueContext = { referrals, staff } as QueueReasonContext;

  if (features.showTriageBreach !== false) {
    const triage = summarizeTriageBreachBoard(patients, { settings: settings || undefined });
    const triageTotal = triage.breachedCount + triage.breachRiskCount;
    pushMetric(metrics, {
      id: 'triage-breach',
      label: triage.breachedCount ? 'Triage breached' : 'Triage at risk',
      value: triageTotal,
      tone: triage.breachedCount ? 'critical' : 'warning',
      hint: `${triage.awaitingTriageCount} awaiting triage`,
      priority: triage.breachedCount ? 0 : 1,
    });
  }

  if (features.showProviderWait !== false) {
    const providerContext = { settings: settings || undefined };
    const visibility = buildProviderWaitVisibilitySnapshot(patients, providerContext);
    if (hasProviderWaitVisibilityActivity(visibility)) {
      const provider = buildProviderWaitBreachAttentionSnapshot(patients, providerContext);
      pushMetric(metrics, {
        id: 'provider-wait',
        label: provider.summary.breachedCount ? 'Provider wait breach' : 'Provider wait risk',
        value: provider.summary.breachedCount + provider.summary.approachingThresholdCount,
        tone: provider.summary.breachedCount ? 'critical' : 'warning',
        hint: `Longest ${provider.summary.longestElapsedLabel}`,
        patientId: provider.previewRows[0]?.patientId,
        priority: provider.summary.breachedCount ? 0 : 1,
      });
    }
  }

  const reassessCount = countReassessmentAttentionPatients(patients);
  pushMetric(metrics, {
    id: 'reassessment',
    label: 'Reassess due',
    value: reassessCount,
    tone: reassessCount ? 'warning' : 'success',
    hint: 'Open reassessment queue',
    priority: 1,
  });

  const lwbsCounts = summarizeLwbsRiskBoard(patients, lwbsContext);
  const lwbsSnapshot = buildLwbsRiskAttentionSnapshot(patients, lwbsContext);
  const lwbsTotal = lwbsCounts.high + lwbsCounts.elevated;
  pushMetric(metrics, {
    id: 'lwbs-risk',
    label: 'LWBS risk',
    value: lwbsTotal,
    tone: lwbsCounts.high ? 'critical' : lwbsTotal ? 'warning' : 'success',
    hint: 'Left-without-being-seen advisory',
    patientId: lwbsSnapshot.previewRows[0]?.patientId,
    priority: lwbsCounts.high ? 0 : 1,
  });

  const deterioration = summarizeDeteriorationWatchBoard(patients, deteriorationContext);
  const deteriorationSnapshot = buildDeteriorationWatchAttentionSnapshot(patients, deteriorationContext);
  const deteriorationTotal =
    deterioration['urgent-review'] + deterioration['review-needed'] + deterioration.watch;
  pushMetric(metrics, {
    id: 'deterioration-watch',
    label: 'Deterioration watch',
    value: deteriorationTotal,
    tone: deterioration['urgent-review'] ? 'critical' : deteriorationTotal ? 'warning' : 'success',
    hint: 'Waiting-room deterioration signals',
    patientId: deteriorationSnapshot.previewRows[0]?.patientId,
    priority: deterioration['urgent-review'] ? 0 : 1,
  });

  const complaint = buildHighRiskComplaintBoardSummary(patients);
  pushMetric(metrics, {
    id: 'high-risk-complaint',
    label: 'High-risk complaint',
    value: complaint.flaggedCount,
    tone: complaint.rapidReviewCount ? 'critical' : complaint.flaggedCount ? 'warning' : 'success',
    hint: `${complaint.rapidReviewCount} rapid review`,
    patientId: complaint.patients[0]?.id,
    priority: complaint.rapidReviewCount ? 0 : 1,
  });

  const fitToWait = buildFitToWaitAttentionSnapshot(patients);
  pushMetric(metrics, {
    id: 'fit-to-wait',
    label: 'Fit-to-wait review',
    value: fitToWait.needsAttentionCount,
    tone: fitToWait.immediateRoomCount ? 'critical' : fitToWait.needsAttentionCount ? 'warning' : 'success',
    hint: `${fitToWait.unclassifiedCount} seating review`,
    patientId: fitToWait.previewRows[0]?.patientId,
    priority: fitToWait.immediateRoomCount ? 0 : 2,
  });

  const queueReason = buildQueueReasonBoardSummary(patients, queueContext);
  pushMetric(metrics, {
    id: 'queue-reason',
    label: 'Queue reasons',
    value: queueReason.activeCount,
    tone: queueReason.activeCount ? 'info' : 'success',
    hint: 'Patients with active queue rationale',
    priority: 2,
  });

  const reception = buildReceptionEscalationAttentionSnapshot(alerts, { roleId, limit: 4 });
  pushMetric(metrics, {
    id: 'reception-escalation',
    label: 'Reception escalation',
    value: reception.summary.activeCount,
    tone: reception.summary.criticalCount ? 'critical' : reception.summary.activeCount ? 'warning' : 'success',
    hint: `${reception.summary.triageCount} triage · ${reception.summary.chargeCount} charge`,
    patientId: reception.previewRows[0]?.patientId,
    priority: reception.summary.criticalCount ? 0 : 1,
  });

  return metrics
    .filter((metric) => metric.value > 0)
    .sort((left, right) => left.priority - right.priority || right.value - left.value);
}

export function capWhiteboardAlertMetrics(
  metrics: WhiteboardAlertMetric[],
  max = MAX_WHITEBOARD_ALERT_METRICS,
): WhiteboardAlertMetric[] {
  if (metrics.length <= max) return metrics;
  const visible = metrics.slice(0, max);
  const overflow = metrics.length - max;
  visible.push({
    id: 'alert-overflow',
    label: 'More signals',
    value: overflow,
    tone: 'neutral',
    hint: `${overflow} additional waiting-room signals — open safety board below`,
    priority: 99,
  });
  return visible;
}