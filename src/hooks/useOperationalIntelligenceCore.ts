import { useCallback, useEffect, useMemo } from 'react';
import type { CareDroidScreenMode } from '../central-node/careDroidCentralNode';
import { useCareDroidCentralNode } from './useCareDroidCentralNode';
import { useEmergencyStore } from '../store/emergencyStore';
import {
  buildCareDroidOperationalIntelligenceSnapshot,
  resolveOperationalIntelligenceSettings,
} from '../operational-intelligence/careDroidOperationalIntelligence';
import {
  evaluateOperationalIntelligence,
  fetchOperationalIntelligenceAlerts,
  fetchOperationalIntelligenceModelHealth,
} from '../services/emergencyOsApi';
import { refreshUnifiedOperationalIntelligenceFromBackend } from '../engine/unifiedOperationalIntelligenceEngine';
import { useUnifiedOperationalIntelligenceStore } from '../store/unifiedOperationalIntelligenceStore';

export type UseOperationalIntelligenceOptions = {
  screenMode?: CareDroidScreenMode;
  realtime?: boolean;
};

function unwrapEnvelopeData<T>(envelope: unknown): T | null {
  if (!envelope || typeof envelope !== 'object') return null;
  const payload = envelope as { data?: T };
  return payload.data ?? (envelope as T);
}

type OperationalIntelligenceRefreshListener = () => unknown;

// useAiChiefOrchestrator({ realtime: true }) — and therefore this hook — is mounted
// independently in several places at once (OperationalIntelligenceBar, CopilotPanel,
// AiChiefRouteRecommendationsPanel, HospitalCommandCenter), and each instance previously
// started its own setInterval. Since intervalMs is derived from the same global
// emergencySettings store for every caller, a single shared timer is enough — this
// collapses N independent, unsynchronized intervals into one, calling every currently
// mounted instance's refresh() together per tick instead of N times spread arbitrarily.
let sharedPolling: {
  intervalMs: number;
  timerId: any;
  listeners: Set<OperationalIntelligenceRefreshListener>;
} | null = null;

function registerSharedOperationalIntelligencePolling(
  intervalMs: number,
  listener: OperationalIntelligenceRefreshListener,
): () => void {
  if (!sharedPolling) {
    const listeners = new Set<OperationalIntelligenceRefreshListener>([listener]);
    const timerId = window.setInterval(() => {
      listeners.forEach((l) => void l());
    }, intervalMs);
    sharedPolling = { intervalMs, timerId, listeners };
  } else {
    sharedPolling.listeners.add(listener);
  }

  return () => {
    if (!sharedPolling) return;
    sharedPolling.listeners.delete(listener);
    if (sharedPolling.listeners.size === 0) {
      window.clearInterval(sharedPolling.timerId);
      sharedPolling = null;
    }
  };
}

/** Low-level operational intelligence hook — prefer useAiChiefOrchestrator for unified monitoring. */
export function useOperationalIntelligenceCore(options: UseOperationalIntelligenceOptions = {}) {
  const centralNode = useCareDroidCentralNode({ screenMode: options.screenMode });
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);
  const patients = useEmergencyStore((state) => state.patients);
  const referrals = useEmergencyStore((state) => state.referrals);
  const workflowLogs = useEmergencyStore((state) => state.workflowLogs);
  const backendSnapshot = useUnifiedOperationalIntelligenceStore((state) => state.backendSnapshot);
  const unifiedSnapshot = useUnifiedOperationalIntelligenceStore((state) => state.unifiedSnapshot);
  const refreshError = useUnifiedOperationalIntelligenceStore((state) => state.refreshError);
  const intelligenceSource = useUnifiedOperationalIntelligenceStore((state) => state.source);

  const oiSettings = useMemo(
    () =>
      resolveOperationalIntelligenceSettings(
        (emergencySettings as { operationalIntelligenceSettings?: Record<string, unknown> })
          ?.operationalIntelligenceSettings,
      ),
    [emergencySettings],
  );

  const snapshot = useMemo(
    () =>
      buildCareDroidOperationalIntelligenceSnapshot({
        centralSnapshot: centralNode.snapshot,
        settings: oiSettings,
        tenantId: emergencySettings.tenantName,
        patients,
        referrals,
        workflowLogs,
        backendSnapshot,
      }),
    [backendSnapshot, centralNode.snapshot, emergencySettings.tenantName, oiSettings, patients, referrals, workflowLogs],
  );

  const refresh = useCallback(async () => {
    const nextSnapshot = await refreshUnifiedOperationalIntelligenceFromBackend();
    await centralNode.refresh();
    return nextSnapshot;
  }, [centralNode]);

  useEffect(() => {
    if (!oiSettings.operationalIntelligenceEnabled) return undefined;
    if (!options.realtime) return undefined;
    const intervalMs = Math.max(15000, oiSettings.operationalIntelligencePollingInterval || 30000);
    // Central-node hydration is owned by AppShell realtime; this shared interval only
    // refreshes operational-intelligence snapshots for AI Chief surfaces, and must not
    // also call centralNode.refresh() (that would duplicate AppShell's own hydration).
    return registerSharedOperationalIntelligencePolling(intervalMs, () =>
      refreshUnifiedOperationalIntelligenceFromBackend(),
    );
  }, [
    oiSettings.operationalIntelligenceEnabled,
    oiSettings.operationalIntelligencePollingInterval,
    options.realtime,
  ]);

  const fetchModelHealth = useCallback(async () => {
    const envelope = await fetchOperationalIntelligenceModelHealth();
    return unwrapEnvelopeData(envelope);
  }, []);

  const fetchAlerts = useCallback(async () => {
    const envelope = await fetchOperationalIntelligenceAlerts();
    return unwrapEnvelopeData(envelope);
  }, []);

  const evaluate = useCallback(async (events: unknown[] = []) => {
    const envelope = await evaluateOperationalIntelligence(events);
    return unwrapEnvelopeData(envelope);
  }, []);

  return {
    snapshot,
    unifiedSnapshot,
    intelligenceSource,
    centralSnapshot: centralNode.snapshot,
    settings: oiSettings,
    refresh,
    refreshError: refreshError || centralNode.refreshError,
    enabled: oiSettings.operationalIntelligenceEnabled,
    fetchModelHealth,
    fetchAlerts,
    evaluate,
    screenMode: centralNode.screenMode,
    isRedacted: centralNode.isRedacted,
  };
}

export default useOperationalIntelligenceCore;