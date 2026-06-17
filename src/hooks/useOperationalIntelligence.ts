import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CareDroidScreenMode } from '../central-node/careDroidCentralNode';
import { useCareDroidCentralNode } from './useCareDroidCentralNode';
import { useEmergencyStore } from '../store/emergencyStore';
import {
  buildCareDroidOperationalIntelligenceSnapshot,
  resolveOperationalIntelligenceSettings,
} from '../operational-intelligence/careDroidOperationalIntelligence';
import type { OperationalIntelligenceSnapshot } from '../operational-intelligence/operationalIntelligence.types';
import {
  evaluateOperationalIntelligence,
  fetchOperationalIntelligenceAlerts,
  fetchOperationalIntelligenceModelHealth,
  fetchOperationalIntelligenceSnapshot,
} from '../services/emergencyOsApi';

type UseOperationalIntelligenceOptions = {
  screenMode?: CareDroidScreenMode;
  realtime?: boolean;
};

function unwrapEnvelopeData<T>(envelope: unknown): T | null {
  if (!envelope || typeof envelope !== 'object') return null;
  const payload = envelope as { data?: T };
  return payload.data ?? (envelope as T);
}

export function useOperationalIntelligence(options: UseOperationalIntelligenceOptions = {}) {
  const centralNode = useCareDroidCentralNode(options);
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);
  const workflowLogs = useEmergencyStore((state) => state.workflowLogs);
  const [backendSnapshot, setBackendSnapshot] = useState<OperationalIntelligenceSnapshot | null>(null);
  const [refreshError, setRefreshError] = useState('');

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
        workflowLogs,
        backendSnapshot,
      }),
    [backendSnapshot, centralNode.snapshot, emergencySettings.tenantName, oiSettings, workflowLogs],
  );

  const refresh = useCallback(async () => {
    try {
      const envelope = await fetchOperationalIntelligenceSnapshot();
      const nextSnapshot = unwrapEnvelopeData<OperationalIntelligenceSnapshot>(envelope);
      if (nextSnapshot) setBackendSnapshot(nextSnapshot);
      setRefreshError('');
      await centralNode.refresh();
      return nextSnapshot;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to refresh operational intelligence.';
      setRefreshError(message);
      return null;
    }
  }, [centralNode]);

  useEffect(() => {
    if (!oiSettings.operationalIntelligenceEnabled) return undefined;
    const intervalMs = Math.max(15000, oiSettings.operationalIntelligencePollingInterval || 30000);
    if (!options.realtime) return undefined;
    const timer = window.setInterval(() => {
      void refresh();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [
    oiSettings.operationalIntelligenceEnabled,
    oiSettings.operationalIntelligencePollingInterval,
    options.realtime,
    refresh,
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

export default useOperationalIntelligence;
