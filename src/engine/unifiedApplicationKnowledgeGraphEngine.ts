import { UNIFIED_OPERATIONAL_INTELLIGENCE_TRIGGER_EVENTS } from '../config/unifiedOperationalIntelligenceModel';
import { startWorkflowTrace } from '../services/observabilityTrace';
import { buildUnifiedApplicationKnowledgeGraph } from '../services/unifiedApplicationKnowledgeGraphService';
import { buildCigSnapshotFromEmergencyBoard } from '../services/cigFeProjection';
import { getUnifiedApplicationKnowledgeGraphStoreState } from '../store/unifiedApplicationKnowledgeGraphStore';
import { useUnifiedOperationalIntelligenceStore } from '../store/unifiedOperationalIntelligenceStore';
import { useEmergencyStore } from '../store/emergencyStore';

const REFRESH_DEBOUNCE_MS = 800;

let refreshTimerId: number | null = null;
let unsubscribeEmergency: (() => void) | null = null;
let unsubscribeOperationalIntelligence: (() => void) | null = null;

const KNOWLEDGE_GRAPH_TRIGGER_EVENTS = new Set<string>([
  ...UNIFIED_OPERATIONAL_INTELLIGENCE_TRIGGER_EVENTS,
  'alert_created',
  'alert_updated',
  'emergency_alert',
  'notification',
  'referrals_updated',
  'ems_updated',
  'staff_assigned',
  'patient_created',
  'patient_escalated',
  'patient_note_added',
]);

export function isKnowledgeGraphTriggerEvent(eventType: string): boolean {
  return KNOWLEDGE_GRAPH_TRIGGER_EVENTS.has(eventType);
}

export function refreshUnifiedApplicationKnowledgeGraph(eventType?: string): void {
  const trace = startWorkflowTrace('knowledge-graph-refresh', {
    source: 'unifiedApplicationKnowledgeGraphEngine',
    summary: eventType ? `Knowledge graph refresh (${eventType})` : 'Knowledge graph refresh',
    metadata: eventType ? { triggerEvent: eventType } : undefined,
  });
  const emergencyState = useEmergencyStore.getState();
  const operationalSnapshot = useUnifiedOperationalIntelligenceStore.getState().unifiedSnapshot;

  const snapshot = buildUnifiedApplicationKnowledgeGraph({
    patients: emergencyState.patients,
    staff: emergencyState.staff,
    alerts: emergencyState.alerts,
    rooms: emergencyState.rooms,
    queues: emergencyState.queues,
    referrals: emergencyState.referrals,
    workflowLogs: emergencyState.workflowLogs,
    administrativeTasks: emergencyState.administrativeAutomationQueue,
    emsArrivals: emergencyState.emsArrivals,
    capacity: emergencyState.capacity,
    patientFlowSnapshot: emergencyState.patientFlowSnapshot,
    operationalInsights: operationalSnapshot?.insights,
  });

  // Mode B CIG shadow projection (session durability — no multi-user twin claim).
  // Not yet published to a dual-read store (PR-8); metrics only until then.
  const cigSnapshot = buildCigSnapshotFromEmergencyBoard({
    generatedAt: snapshot.generatedAt,
    snapshotVersion: 1,
    patients: emergencyState.patients,
    staff: emergencyState.staff,
    alerts: emergencyState.alerts,
    rooms: emergencyState.rooms,
    queues: emergencyState.queues,
    emsArrivals: emergencyState.emsArrivals,
    recommendations: (operationalSnapshot?.insights || [])
      .filter((insight) => insight.type === 'intervention' || insight.type === 'recommendation')
      .map((insight) => ({
        id: insight.id,
        action: insight.title,
        rationale: insight.summary,
        patientId: insight.patientId,
        humanReviewRequired: insight.humanReviewRequired ?? true,
        confidence: insight.confidence,
        updatedAt: insight.updatedAt,
      })),
  });

  const store = getUnifiedApplicationKnowledgeGraphStoreState();
  if (eventType) store.setLastTriggerEvent(eventType);
  store.setSnapshot(snapshot);
  store.markRefreshed();
  trace.end('success', {
    nodeCount: snapshot.metrics.nodeCount,
    edgeCount: snapshot.metrics.edgeCount,
    cigNodeCount: cigSnapshot.meta.nodeCount,
    cigEdgeCount: cigSnapshot.meta.edgeCount,
    cigDurability: cigSnapshot.durability,
    triggerEvent: eventType,
  });
}

export function scheduleUnifiedApplicationKnowledgeGraphRefresh(eventType?: string): void {
  if (refreshTimerId) window.clearTimeout(refreshTimerId);
  refreshTimerId = window.setTimeout(() => {
    refreshTimerId = null;
    refreshUnifiedApplicationKnowledgeGraph(eventType);
  }, REFRESH_DEBOUNCE_MS);
}

export function handleUnifiedApplicationKnowledgeGraphBackendEvent(eventType: string): void {
  if (!isKnowledgeGraphTriggerEvent(eventType)) return;
  scheduleUnifiedApplicationKnowledgeGraphRefresh(eventType);
}

export function startUnifiedApplicationKnowledgeGraphEngine(): () => void {
  refreshUnifiedApplicationKnowledgeGraph('engine_start');

  unsubscribeEmergency = useEmergencyStore.subscribe((state, previousState) => {
    if (
      state.patients === previousState.patients &&
      state.staff === previousState.staff &&
      state.alerts === previousState.alerts &&
      state.rooms === previousState.rooms &&
      state.queues === previousState.queues &&
      state.referrals === previousState.referrals &&
      state.workflowLogs === previousState.workflowLogs &&
      state.administrativeAutomationQueue === previousState.administrativeAutomationQueue &&
      state.emsArrivals === previousState.emsArrivals &&
      state.capacity === previousState.capacity &&
      state.patientFlowSnapshot === previousState.patientFlowSnapshot
    ) {
      return;
    }
    scheduleUnifiedApplicationKnowledgeGraphRefresh('emergency_store_updated');
  });

  unsubscribeOperationalIntelligence = useUnifiedOperationalIntelligenceStore.subscribe(
    (state, previousState) => {
      if (state.unifiedSnapshot === previousState.unifiedSnapshot) return;
      scheduleUnifiedApplicationKnowledgeGraphRefresh('operational_intelligence_updated');
    },
  );

  return () => {
    if (refreshTimerId) {
      window.clearTimeout(refreshTimerId);
      refreshTimerId = null;
    }
    unsubscribeEmergency?.();
    unsubscribeEmergency = null;
    unsubscribeOperationalIntelligence?.();
    unsubscribeOperationalIntelligence = null;
  };
}
