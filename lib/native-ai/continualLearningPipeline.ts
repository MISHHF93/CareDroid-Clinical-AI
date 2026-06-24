import { proposeModelRollback } from './modelRegistry';
import type { DriftAlert, NativeAiSourceState, RetrainingAlert } from './types';

const retrainingQueue: RetrainingAlert[] = [];

function createRetrainId(): string {
  return `retrain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function queueRetrainingFromDrift(
  driftAlert: DriftAlert,
  options: { sourceState?: NativeAiSourceState } = {},
): RetrainingAlert {
  const rollback = proposeModelRollback(driftAlert.modelId);
  const alert: RetrainingAlert = {
    id: createRetrainId(),
    modelId: driftAlert.modelId,
    triggeredAt: new Date().toISOString(),
    reason: driftAlert.summary,
    status: 'pending_review',
    driftAlertId: driftAlert.id,
    proposedVersion: bumpPatchVersion(rollback?.version || '1.0.0'),
    rollbackVersion: rollback?.rollbackVersion || rollback?.version || '1.0.0',
    sourceState: options.sourceState || driftAlert.sourceState,
  };
  retrainingQueue.unshift(alert);
  return alert;
}

function bumpPatchVersion(version: string): string {
  const parts = version.split('.').map((part) => Number(part) || 0);
  parts[2] = (parts[2] || 0) + 1;
  return parts.join('.');
}

export function listRetrainingAlerts(status?: RetrainingAlert['status']): RetrainingAlert[] {
  return retrainingQueue.filter((alert) => (status ? alert.status === status : true));
}

export function reviewRetrainingAlert(
  alertId: string,
  status: RetrainingAlert['status'],
): RetrainingAlert | null {
  const index = retrainingQueue.findIndex((alert) => alert.id === alertId);
  if (index < 0) return null;
  retrainingQueue[index] = { ...retrainingQueue[index], status };
  return retrainingQueue[index];
}

export function buildContinualLearningSummary(): {
  pendingRetraining: number;
  latestAlerts: RetrainingAlert[];
  policy: string;
} {
  const pending = listRetrainingAlerts('pending_review');
  return {
    pendingRetraining: pending.length,
    latestAlerts: retrainingQueue.slice(0, 5),
    policy:
      'Weekly drift evaluation triggers retraining review. New models deploy in shadow mode with rollback to prior registry version.',
  };
}