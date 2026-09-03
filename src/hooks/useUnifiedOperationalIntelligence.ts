import { useMemo } from 'react';
import type { CareDroidScreenMode } from '../central-node/careDroidCentralNode';
import useOperationalIntelligenceCore from './useOperationalIntelligenceCore';
import { buildUnifiedOperationalIntelligenceSnapshot } from '../services/unifiedOperationalIntelligenceService';
import { useUnifiedOperationalIntelligenceStore } from '../store/unifiedOperationalIntelligenceStore';
import { useEmergencyStore } from '../store/emergencyStore';

export type UseUnifiedOperationalIntelligenceOptions = Readonly<{
  screenMode?: CareDroidScreenMode;
  realtime?: boolean;
}>;

/** Canonical unified operational intelligence hook — composes operationalIntelligenceCore only. */
export function useUnifiedOperationalIntelligence(
  options: UseUnifiedOperationalIntelligenceOptions = {},
) {
  const operationalIntelligence = useOperationalIntelligenceCore({
    screenMode: options.screenMode,
    realtime: options.realtime ?? false,
  });
  const patientFlowSnapshot = useEmergencyStore((state) => state.patientFlowSnapshot);
  const administrativeAutomationQueue = useEmergencyStore(
    (state) => state.administrativeAutomationQueue,
  );
  const storedUnifiedSnapshot = useUnifiedOperationalIntelligenceStore(
    (state) => state.unifiedSnapshot,
  );
  const backendSnapshot = useUnifiedOperationalIntelligenceStore((state) => state.backendSnapshot);
  const source = useUnifiedOperationalIntelligenceStore((state) => state.source);
  const lastBackendEventType = useUnifiedOperationalIntelligenceStore(
    (state) => state.lastBackendEventType,
  );
  const refreshError = useUnifiedOperationalIntelligenceStore((state) => state.refreshError);
  const isRefreshing = useUnifiedOperationalIntelligenceStore((state) => state.isRefreshing);
  const lastRefreshedAt = useUnifiedOperationalIntelligenceStore((state) => state.lastRefreshedAt);

  const workflowPendingReview = useMemo(
    () => administrativeAutomationQueue.filter((task) => task.status === 'pending_review').length,
    [administrativeAutomationQueue],
  );

  const unifiedSnapshot = useMemo(() => {
    if (storedUnifiedSnapshot) return storedUnifiedSnapshot;
    return buildUnifiedOperationalIntelligenceSnapshot({
      backendSnapshot,
      patientFlowSnapshot,
      source,
      lastBackendEventType,
      workflowPendingReview,
    });
  }, [
    backendSnapshot,
    lastBackendEventType,
    patientFlowSnapshot,
    source,
    storedUnifiedSnapshot,
    workflowPendingReview,
  ]);

  return useMemo(
    () =>
      Object.freeze({
        unifiedSnapshot,
        backendSnapshot,
        operationalIntelligence,
        intelligenceSnapshot: operationalIntelligence.snapshot,
        centralSnapshot: operationalIntelligence.centralSnapshot,
        topInsight: unifiedSnapshot.insights[0] ?? null,
        criticalDomainCount: unifiedSnapshot.domainStatuses.filter(
          (domain) => domain.status === 'critical',
        ).length,
        watchDomainCount: unifiedSnapshot.domainStatuses.filter(
          (domain) => domain.status === 'watch',
        ).length,
        source,
        refresh: operationalIntelligence.refresh,
        refreshError: refreshError || operationalIntelligence.refreshError,
        isRefreshing,
        enabled: operationalIntelligence.enabled,
        lastRefreshedAt,
        screenMode: operationalIntelligence.screenMode,
        isRedacted: operationalIntelligence.isRedacted,
      }),
    [
      backendSnapshot,
      isRefreshing,
      lastRefreshedAt,
      operationalIntelligence,
      refreshError,
      source,
      unifiedSnapshot,
    ],
  );
}

export default useUnifiedOperationalIntelligence;
