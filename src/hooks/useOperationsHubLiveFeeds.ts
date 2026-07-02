import { useCallback, useEffect, useState } from 'react';
import { fetchClinicalAlerts } from '../services/clinicalAlertsApi';
import { fetchEmergencyCapacityDashboard } from '../services/emergencyAnalyticsApi';
import { fetchFleetCommandSnapshot } from '../services/fleetTelemetryService';
import { fetchHospitalMapSnapshot } from '../services/hospitalMapService';
import { fetchMedicalIotSnapshot } from '../services/medicalIotService';
import { fetchUnifiedPlatformHealth } from '../services/unifiedServiceRegistry';
import type { OperationsLiveFeeds } from '../utils/operationsHubLiveMetrics';

type UseOperationsHubLiveFeedsOptions = {
  source?: string;
  refreshIntervalMs?: number;
  enabled?: boolean;
};

export function useOperationsHubLiveFeeds({
  source = 'Operations',
  refreshIntervalMs = 60_000,
  enabled = true,
}: UseOperationsHubLiveFeedsOptions = {}) {
  const [loading, setLoading] = useState(enabled);
  const [liveFeeds, setLiveFeeds] = useState<OperationsLiveFeeds>({});
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const [
        capacityResult,
        hospitalMapResult,
        medicalIotResult,
        fleetResult,
        platformHealth,
        clinicalAlerts,
      ] = await Promise.all([
        fetchEmergencyCapacityDashboard(),
        fetchHospitalMapSnapshot(),
        fetchMedicalIotSnapshot(),
        fetchFleetCommandSnapshot({ delayMs: 0 }),
        fetchUnifiedPlatformHealth({
          sync: {
            status: 'operations-hub',
            source,
            stale: false,
            message: `${source} live metric refresh.`,
          },
        }),
        fetchClinicalAlerts(),
      ]);

      setLiveFeeds({
        capacity: (capacityResult as { ok?: boolean; data?: unknown }).ok
          ? ((capacityResult as { data?: OperationsLiveFeeds['capacity'] }).data ?? null)
          : null,
        hospitalMap: hospitalMapResult,
        medicalIot: medicalIotResult,
        fleet: fleetResult,
        platformHealth,
        clinicalAlerts,
      });
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
    }
  }, [enabled, source]);

  useEffect(() => {
    if (!enabled) return undefined;
    void refresh();
    if (!refreshIntervalMs || refreshIntervalMs <= 0) return undefined;
    const interval = setInterval(() => void refresh(), refreshIntervalMs);
    return () => clearInterval(interval);
  }, [enabled, refresh, refreshIntervalMs]);

  const liveFeedCount = Object.values(liveFeeds).filter((value) => value != null).length;

  return {
    loading,
    liveFeeds,
    lastRefreshed,
    liveFeedCount,
    refresh,
  };
}