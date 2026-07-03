import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { CareDroidScreenMode } from '../central-node/careDroidCentralNode';
import { useEmergencyStore } from '../store/emergencyStore';
import useRouteScreenMode from './useRouteScreenMode';
import useOperationalIntelligenceCore from './useOperationalIntelligenceCore';
import useAiChiefRouting from './useAiChiefRouting';
import {
  buildAiChiefOrchestrationSnapshot,
  type AiChiefOrchestrationSnapshot,
} from '../services/aiChiefContinuousMonitoringService';
import {
  requestAiChiefCopilotQuery,
  requestAiChiefStructured,
  requestAiChiefConversational,
  type AIChiefStructuredRequest,
  type AIChiefConversationalRequest,
  type AIChiefCopilotQueryOptions,
} from '../services/aiChiefOrchestrator';
import useUnifiedApplicationKnowledgeGraph from './useUnifiedApplicationKnowledgeGraph';

export type UseAiChiefOrchestratorOptions = Readonly<{
  screenMode?: CareDroidScreenMode;
  realtime?: boolean;
  selectedPatientId?: string | null;
}>;

export function useAiChiefOrchestrator(options: UseAiChiefOrchestratorOptions = {}) {
  const { pathname } = useLocation();
  const routeScreenMode = useRouteScreenMode();
  const screenMode = options.screenMode ?? routeScreenMode;

  const patients = useEmergencyStore((state) => state.patients);
  const staff = useEmergencyStore((state) => state.staff);
  const alerts = useEmergencyStore((state) => state.alerts);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const capacity = useEmergencyStore((state) => state.capacity);
  const referrals = useEmergencyStore((state) => state.referrals);
  const workflowLogs = useEmergencyStore((state) => state.workflowLogs);
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);
  const selectedPatientId = options.selectedPatientId ?? useEmergencyStore((state) => state.selectedPatientId);

  const operationalIntelligence = useOperationalIntelligenceCore({
    screenMode,
    realtime: options.realtime,
  });
  const aiChiefRouting = useAiChiefRouting();

  const snapshot = useMemo(
    () =>
      buildAiChiefOrchestrationSnapshot({
        pathname,
        screenMode,
        patients,
        staff,
        alerts,
        emsArrivals,
        capacity,
        referrals,
        workflowLogs,
        emergencySettings,
        backendOperationalIntelligence: operationalIntelligence.snapshot,
        selectedPatientId,
      }),
    [
      pathname,
      screenMode,
      patients,
      staff,
      alerts,
      emsArrivals,
      capacity,
      referrals,
      workflowLogs,
      emergencySettings,
      operationalIntelligence.snapshot,
      selectedPatientId,
    ],
  );

  const knowledgeGraphBundle = useUnifiedApplicationKnowledgeGraph({ selectedPatientId });
  const knowledgeGraph = knowledgeGraphBundle.snapshot;
  const knowledgeGraphSummary = knowledgeGraphBundle.dashboardSummary;

  const topRecommendation = snapshot.recommendations[0] ?? null;
  const topRisk = snapshot.risks.find((risk) => risk.severity === 'critical') ?? snapshot.risks[0] ?? null;
  const criticalDomainCount = snapshot.domainStatuses.filter((domain) => domain.status === 'critical').length;
  const watchDomainCount = snapshot.domainStatuses.filter((domain) => domain.status === 'watch').length;

  const requestStructured = useCallback(
    (request: AIChiefStructuredRequest) => requestAiChiefStructured(request),
    [],
  );

  const requestConversational = useCallback(
    (request: AIChiefConversationalRequest) => requestAiChiefConversational(request),
    [],
  );

  const requestCopilotQuery = useCallback(
    (query: string, queryOptions: AIChiefCopilotQueryOptions = {}) =>
      requestAiChiefCopilotQuery(query, queryOptions),
    [],
  );

  return useMemo(
    () =>
      Object.freeze({
        snapshot,
        knowledgeGraph,
        knowledgeGraphSummary,
        operationalIntelligence,
        aiChiefRouting,
        centralSnapshot: operationalIntelligence.centralSnapshot,
        intelligenceSnapshot: operationalIntelligence.snapshot,
        topRecommendation,
        topRisk,
        criticalDomainCount,
        watchDomainCount,
        enabled: operationalIntelligence.enabled,
        refresh: operationalIntelligence.refresh,
        refreshError: operationalIntelligence.refreshError,
        requestStructured,
        requestConversational,
        requestCopilotQuery,
      }),
    [
      snapshot,
      knowledgeGraph,
      knowledgeGraphSummary,
      operationalIntelligence,
      aiChiefRouting,
      topRecommendation,
      topRisk,
      criticalDomainCount,
      watchDomainCount,
      requestStructured,
      requestConversational,
      requestCopilotQuery,
    ],
  );
}

export type AiChiefOrchestratorContext = ReturnType<typeof useAiChiefOrchestrator>;

export default useAiChiefOrchestrator;