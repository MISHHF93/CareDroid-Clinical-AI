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
    const intervalMs = Math.max(15000, oiSettings.operationalIntelligencePollingInterval || 30000);
    if (!options.realtime) return undefined;
    // Central-node hydration is owned by AppShell realtime; interval here only
    // refreshes operational-intelligence snapshots for AI Chief surfaces.
    const timer = window.setInterval(() => {
      void refreshUnifiedOperationalIntelligenceFromBackend();
    }, intervalMs);
    return () => window.clearInterval(timer);
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