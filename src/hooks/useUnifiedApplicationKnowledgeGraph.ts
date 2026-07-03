import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useEmergencyStore } from '../store/emergencyStore';
import { useUnifiedOperationalIntelligenceStore } from '../store/unifiedOperationalIntelligenceStore';
import { useUnifiedApplicationKnowledgeGraphStore } from '../store/unifiedApplicationKnowledgeGraphStore';
import { buildUnifiedApplicationKnowledgeGraph } from '../services/unifiedApplicationKnowledgeGraphService';
import {
  buildAnalyticsKnowledgeGraphSummary,
  buildCopilotKnowledgeGraphContext,
  buildDashboardKnowledgeGraphSummary,
  resolveAlertKnowledgeGraphContext,
  resolvePatientKnowledgeGraphSubgraph,
  type AnalyticsKnowledgeGraphSummary,
  type CopilotKnowledgeGraphContext,
  type DashboardKnowledgeGraphSummary,
  type PatientKnowledgeGraphContext,
} from '../services/unifiedApplicationKnowledgeGraphPresentation';
import type { UnifiedApplicationKnowledgeGraphSnapshot } from '../config/unifiedApplicationKnowledgeGraphModel';
import { enrichPatientTimelineContextFromKnowledgeGraph } from '../services/unifiedApplicationKnowledgeGraphPresentation';
import type { PatientTimelineContext } from '../utils/patientTimeline';

export type UseUnifiedApplicationKnowledgeGraphOptions = Readonly<{
  selectedPatientId?: string | null;
}>;

export function useUnifiedApplicationKnowledgeGraph(
  options: UseUnifiedApplicationKnowledgeGraphOptions = {},
) {
  const { pathname } = useLocation();
  const storedSnapshot = useUnifiedApplicationKnowledgeGraphStore((state) => state.snapshot);
  const lastRefreshedAt = useUnifiedApplicationKnowledgeGraphStore((state) => state.lastRefreshedAt);
  const patients = useEmergencyStore((state) => state.patients);
  const staff = useEmergencyStore((state) => state.staff);
  const alerts = useEmergencyStore((state) => state.alerts);
  const rooms = useEmergencyStore((state) => state.rooms);
  const queues = useEmergencyStore((state) => state.queues);
  const referrals = useEmergencyStore((state) => state.referrals);
  const workflowLogs = useEmergencyStore((state) => state.workflowLogs);
  const administrativeAutomationQueue = useEmergencyStore((state) => state.administrativeAutomationQueue);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const capacity = useEmergencyStore((state) => state.capacity);
  const patientFlowSnapshot = useEmergencyStore((state) => state.patientFlowSnapshot);
  const selectedPatientId =
    options.selectedPatientId ?? useEmergencyStore((state) => state.selectedPatientId);
  const unifiedSnapshot = useUnifiedOperationalIntelligenceStore((state) => state.unifiedSnapshot);

  const snapshot = useMemo((): UnifiedApplicationKnowledgeGraphSnapshot => {
    if (storedSnapshot) return storedSnapshot;
    return buildUnifiedApplicationKnowledgeGraph({
      patients,
      staff,
      alerts,
      rooms,
      queues,
      referrals,
      workflowLogs,
      administrativeTasks: administrativeAutomationQueue,
      emsArrivals,
      capacity,
      patientFlowSnapshot,
      operationalInsights: unifiedSnapshot?.insights,
    });
  }, [
    administrativeAutomationQueue,
    alerts,
    capacity,
    emsArrivals,
    patientFlowSnapshot,
    patients,
    queues,
    referrals,
    rooms,
    staff,
    storedSnapshot,
    unifiedSnapshot?.insights,
    workflowLogs,
  ]);

  const dashboardSummary = useMemo(
    (): DashboardKnowledgeGraphSummary => buildDashboardKnowledgeGraphSummary(snapshot),
    [snapshot],
  );

  const analyticsSummary = useMemo(
    (): AnalyticsKnowledgeGraphSummary => buildAnalyticsKnowledgeGraphSummary(snapshot),
    [snapshot],
  );

  const copilotContext = useMemo(
    (): CopilotKnowledgeGraphContext =>
      buildCopilotKnowledgeGraphContext(snapshot, selectedPatientId),
    [selectedPatientId, snapshot],
  );

  const selectedPatientContext = useMemo((): PatientKnowledgeGraphContext | null => {
    if (!selectedPatientId) return null;
    return resolvePatientKnowledgeGraphSubgraph(snapshot, selectedPatientId);
  }, [selectedPatientId, snapshot]);

  const enrichTimelineContext = useMemo(
    () => (patientId: string, baseContext: PatientTimelineContext = {}) => {
      const enriched = enrichPatientTimelineContextFromKnowledgeGraph(patientId, snapshot, baseContext);
      return Object.freeze({
        ...enriched,
        knowledgeGraphSnapshot: snapshot,
      });
    },
    [snapshot],
  );

  const resolveAlertContext = useMemo(
    () => (alertId: string) => resolveAlertKnowledgeGraphContext(snapshot, alertId),
    [snapshot],
  );

  return useMemo(
    () =>
      Object.freeze({
        snapshot,
        dashboardSummary,
        analyticsSummary,
        copilotContext,
        selectedPatientContext,
        enrichTimelineContext,
        resolveAlertContext,
        pathname,
        metrics: snapshot.metrics,
        nodeCount: snapshot.metrics.nodeCount,
        edgeCount: snapshot.metrics.edgeCount,
        lastRefreshedAt,
      }),
    [
      analyticsSummary,
      copilotContext,
      dashboardSummary,
      enrichTimelineContext,
      lastRefreshedAt,
      pathname,
      resolveAlertContext,
      selectedPatientContext,
      snapshot,
    ],
  );
}

export default useUnifiedApplicationKnowledgeGraph;