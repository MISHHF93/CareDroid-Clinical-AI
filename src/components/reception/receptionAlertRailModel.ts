import type { Alert, EMSArrival, Patient, Referral, Room, Staff } from '../../types/emergency';
import { buildEmsOffloadAttentionSnapshot } from '../../services/emsOffloadTracker';
import {
  buildWaitingRoomAlertMetrics,
  type WaitingRoomAlertRailFeatures,
  type WhiteboardAlertMetric,
} from '../whiteboard/whiteboardAlertRailModel';

export type ReceptionAlertRailFeatures = WaitingRoomAlertRailFeatures & {
  showEmsOffload?: boolean;
};

export type BuildReceptionAlertMetricsInput = {
  patients: Patient[];
  alerts?: Alert[];
  referrals?: Referral[];
  staff?: Staff[];
  workflowLogs?: unknown[];
  emsArrivals?: EMSArrival[];
  rooms?: Room[];
  settings?: Record<string, unknown> | null;
  roleId?: string | null;
  features?: ReceptionAlertRailFeatures;
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

export function buildReceptionAlertMetrics({
  patients,
  alerts = [],
  referrals = [],
  staff = [],
  workflowLogs = [],
  emsArrivals = [],
  rooms = [],
  settings = null,
  roleId = null,
  features = {},
}: BuildReceptionAlertMetricsInput): WhiteboardAlertMetric[] {
  const metrics = buildWaitingRoomAlertMetrics({
    patients,
    alerts,
    referrals,
    staff,
    workflowLogs,
    emsArrivals,
    settings,
    roleId,
    features,
  });

  if (features.showEmsOffload !== false && emsArrivals.length) {
    const offloadTargetMinutes =
      Number(
        settings?.thresholds &&
          typeof settings.thresholds === 'object' &&
          'emsOffloadTargetMinutes' in settings.thresholds
          ? (settings.thresholds as { emsOffloadTargetMinutes?: number }).emsOffloadTargetMinutes
          : 15,
      ) || 15;
    const emsSnapshot = buildEmsOffloadAttentionSnapshot(emsArrivals, {
      patients,
      staff,
      rooms,
      offloadTargetMinutes,
    });
    const emsValue = emsSnapshot.delayedCount || emsSnapshot.awaitingOffloadCount;
    if (emsValue > 0) {
      pushMetric(metrics, {
        id: 'ems-offload',
        label: emsSnapshot.delayedCount ? 'EMS offload delay' : 'EMS awaiting offload',
        value: emsValue,
        tone: emsSnapshot.delayedCount ? 'critical' : 'warning',
        hint: `Target ${offloadTargetMinutes}m · longest ${emsSnapshot.longestOffloadMinutes ?? 0}m`,
        patientId: emsSnapshot.previewRows[0]?.patientId,
        priority: emsSnapshot.delayedCount ? 0 : 1,
      });
    }
  }

  return metrics
    .filter((metric) => metric.value > 0)
    .sort((left, right) => left.priority - right.priority || right.value - left.value);
}