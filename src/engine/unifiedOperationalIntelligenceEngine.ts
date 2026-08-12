import {
  isUnifiedOperationalIntelligenceTriggerEvent,
} from '../config/unifiedOperationalIntelligenceModel';
import type { OperationalInputEvent, OperationalIntelligenceSnapshot } from '../operational-intelligence/operationalIntelligence.types';
import {
  evaluateOperationalIntelligence,
  fetchOperationalIntelligenceSnapshot,
} from '../services/emergencyOsApi';
import { buildUnifiedOperationalIntelligenceSnapshot } from '../services/unifiedOperationalIntelligenceService';
import { getUnifiedOperationalIntelligenceStoreState } from '../store/unifiedOperationalIntelligenceStore';
import { useEmergencyStore } from '../store/emergencyStore';
import { startWorkflowTrace } from '../services/observabilityTrace';

const REFRESH_DEBOUNCE_MS = 1_500;
const MAX_PENDING_EVENTS = 24;

let refreshTimerId: number | null = null;
let lastBackendEventType: string | undefined;
const pendingEvents: OperationalInputEvent[] = [];
// The 4 backend operational-intelligence routes require VIEW_OBSERVABILITY, a
// permission PHYSICIAN/NURSE (the roles this engine is mounted for on every route
// via AppShell) never hold -- confirmed via role-permissions.config.ts. Rather than
// duplicate that role/permission decision here (which would drift from the backend's
// real source of truth), this engine detects the resulting 403 itself and stops
// retrying for the rest of the session, instead of repeating a doomed authenticated
// request on every realtime event and every polling tick.
let permissionDenied = false;

function unwrapEnvelopeData<T>(envelope: unknown): T | null {
  if (!envelope || typeof envelope !== 'object') return null;
  const payload = envelope as { data?: T };
  return payload.data ?? (envelope as T);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, unknown>;
}

function normalizeBackendEvent(eventType: string, payload: unknown): OperationalInputEvent {
  const record = asRecord(payload);
  const tenantId =
    String(record.tenantId ?? useEmergencyStore.getState().emergencySettings.tenantName ?? 'CareDroid Emergency Department');

  const normalizedPayload: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(record)) {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      normalizedPayload[key] = value;
    }
  }

  return {
    id: `${eventType}-${Date.now()}-${pendingEvents.length}`,
    type: eventType,
    source: 'backend_realtime',
    timestamp: new Date().toISOString(),
    tenantId,
    payload: normalizedPayload,
    humanReviewRequired: true,
  };
}

export function getLastUnifiedOperationalIntelligenceBackendEvent(): string | undefined {
  return lastBackendEventType;
}

export function queueUnifiedOperationalIntelligenceEvent(
  eventType: string,
  payload?: unknown,
): void {
  if (permissionDenied) return;
  if (!isUnifiedOperationalIntelligenceTriggerEvent(eventType)) return;
  pendingEvents.push(normalizeBackendEvent(eventType, payload));
  if (pendingEvents.length > MAX_PENDING_EVENTS) {
    pendingEvents.splice(0, pendingEvents.length - MAX_PENDING_EVENTS);
  }
}

export function scheduleUnifiedOperationalIntelligenceRefresh(eventType?: string): void {
  if (permissionDenied) return;
  if (eventType) {
    lastBackendEventType = eventType;
    getUnifiedOperationalIntelligenceStoreState().setLastBackendEventType(eventType);
  }
  if (refreshTimerId) {
    window.clearTimeout(refreshTimerId);
  }
  refreshTimerId = window.setTimeout(() => {
    refreshTimerId = null;
    void refreshUnifiedOperationalIntelligenceFromBackend(eventType);
  }, REFRESH_DEBOUNCE_MS);
}

async function applyUnifiedSnapshot(
  backendSnapshot: OperationalIntelligenceSnapshot | null,
  source: 'backend' | 'backend_evaluate' | 'degraded',
  eventType?: string,
): Promise<void> {
  const store = getUnifiedOperationalIntelligenceStoreState();
  const emergencyState = useEmergencyStore.getState();
  const workflowPendingReview = emergencyState.administrativeAutomationQueue.filter(
    (task) => task.status === 'pending_review',
  ).length;

  store.setBackendSnapshot(backendSnapshot);
  store.setSource(source);
  store.setUnifiedSnapshot(
    buildUnifiedOperationalIntelligenceSnapshot({
      backendSnapshot,
      patientFlowSnapshot: emergencyState.patientFlowSnapshot,
      source,
      lastBackendEventType: eventType ?? lastBackendEventType,
      workflowPendingReview,
    }),
  );
  store.markRefreshed();
}

export async function refreshUnifiedOperationalIntelligenceFromBackend(
  eventType?: string,
): Promise<OperationalIntelligenceSnapshot | null> {
  const trace = startWorkflowTrace('operational-intelligence-refresh', {
    source: 'unified-operational-intelligence-engine',
    summary: `Refresh operational intelligence${eventType ? ` (${eventType})` : ''}`,
    metadata: { eventType },
  });
  const store = getUnifiedOperationalIntelligenceStoreState();
  if (eventType) {
    lastBackendEventType = eventType;
    store.setLastBackendEventType(eventType);
  }

  if (permissionDenied) {
    trace.end('success', { mode: 'degraded-unauthorized' });
    return store.backendSnapshot;
  }

  store.setIsRefreshing(true);
  const emergencyState = useEmergencyStore.getState();
  const eventsToEvaluate = [...pendingEvents];
  pendingEvents.length = 0;

  if (!emergencyState.backendAvailable) {
    await applyUnifiedSnapshot(null, 'degraded', eventType);
    store.setRefreshError('');
    store.setIsRefreshing(false);
    trace.end('success', { mode: 'degraded-offline' });
    return null;
  }

  try {
    let snapshot: OperationalIntelligenceSnapshot | null = null;
    let source: 'backend' | 'backend_evaluate' = 'backend';

    if (eventsToEvaluate.length > 0) {
      const evaluationEnvelope = await evaluateOperationalIntelligence(eventsToEvaluate);
      const evaluation = unwrapEnvelopeData<{
        snapshot?: OperationalIntelligenceSnapshot;
      }>(evaluationEnvelope);
      snapshot = evaluation?.snapshot ?? null;
      source = 'backend_evaluate';
    }

    if (!snapshot) {
      const snapshotEnvelope = await fetchOperationalIntelligenceSnapshot();
      snapshot = unwrapEnvelopeData<OperationalIntelligenceSnapshot>(snapshotEnvelope);
      source = 'backend';
    }

    if (snapshot) {
      await applyUnifiedSnapshot(snapshot, source, eventType);
      store.setRefreshError('');
      store.setIsRefreshing(false);
      trace.end('success', { mode: source, insightCount: snapshot.recommendations?.length ?? 0 });
      return snapshot;
    }

    await applyUnifiedSnapshot(null, 'degraded', eventType);
    store.setRefreshError('Operational intelligence snapshot unavailable.');
    store.setIsRefreshing(false);
    trace.end('error', { reason: 'snapshot_unavailable' });
    return null;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Unable to refresh unified operational intelligence.';
    if (error && typeof error === 'object' && (error as { status?: unknown }).status === 403) {
      permissionDenied = true;
      pendingEvents.length = 0;
      if (refreshTimerId) {
        window.clearTimeout(refreshTimerId);
        refreshTimerId = null;
      }
    }
    store.setRefreshError(message);
    await applyUnifiedSnapshot(store.backendSnapshot, store.source, eventType);
    store.setIsRefreshing(false);
    trace.end('error', { message, permissionDenied });
    return store.backendSnapshot;
  }
}

export function handleUnifiedOperationalIntelligenceBackendEvent(
  eventType: string,
  payload?: unknown,
): void {
  if (!isUnifiedOperationalIntelligenceTriggerEvent(eventType)) return;
  queueUnifiedOperationalIntelligenceEvent(eventType, payload);
  scheduleUnifiedOperationalIntelligenceRefresh(eventType);
}

export function startUnifiedOperationalIntelligenceEngine(): () => void {
  void refreshUnifiedOperationalIntelligenceFromBackend('engine_start');
  return () => {
    if (refreshTimerId) {
      window.clearTimeout(refreshTimerId);
      refreshTimerId = null;
    }
    pendingEvents.length = 0;
  };
}