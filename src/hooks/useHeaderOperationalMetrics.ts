import { useEffect, useState } from 'react';
import { useEmergencyStore } from '../store/emergencyStore';
import useOperationalIntelligence from './useOperationalIntelligence';
import useRouteScreenMode from './useRouteScreenMode';
import useScreenModeCapabilities from './useScreenModeCapabilities';

function formatSyncAge(timestamp?: string | null): string {
  if (!timestamp) return 'no sync';
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return 'no sync';
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - parsed) / 60000));
  if (elapsedMinutes < 1) return 'now';
  if (elapsedMinutes < 60) return `${elapsedMinutes}m`;
  return `${Math.round(elapsedMinutes / 60)}h`;
}

/**
 * Shared operational KPI + sync props for the route-tab status rail
 * (not the minimal top header).
 */
export default function useHeaderOperationalMetrics() {
  const routeScreenMode = useRouteScreenMode();
  const screenCapabilities = useScreenModeCapabilities();
  const operationalIntelligence = useOperationalIntelligence({
    realtime: false,
    screenMode: routeScreenMode,
  });
  const websocket = useEmergencyStore((store) => store.websocket);
  const [syncPulse, setSyncPulse] = useState(false);

  const centralSnapshot = operationalIntelligence.centralSnapshot;
  const intelligenceSnapshot = operationalIntelligence.snapshot;

  useEffect(() => {
    if (!websocket.lastEventAt) return undefined;
    setSyncPulse(true);
    const timer = window.setTimeout(() => setSyncPulse(false), 1200);
    return () => window.clearTimeout(timer);
  }, [websocket.lastEventAt]);

  const syncMode = websocket.mode || centralSnapshot.sync.mode || 'polling';
  const syncAge = formatSyncAge(websocket.lastEventAt || centralSnapshot.sync.lastSyncedAt);
  const syncStale =
    websocket.status === 'connected'
      ? false
      : centralSnapshot.sync.stale || websocket.status === 'reconnecting';
  // Compact header pill value -- every sibling status pill ("Waiting WARN 2")
  // has a short value; the mode prefix here was redundant once the chip is
  // already labeled "Sync" and the full mode detail lives in syncTitle below.
  const syncLabel = syncStale ? 'Stale' : syncAge;
  const syncTitle = [
    `Status: ${websocket.status || centralSnapshot.sync.status}`,
    `Mode: ${syncMode}`,
    `Last update: ${syncAge}`,
    `Source: ${centralSnapshot.sync.source}`,
    websocket.message || centralSnapshot.sync.message,
  ]
    .filter(Boolean)
    .join('. ');

  return {
    showOperationalStrip: screenCapabilities.showOperationalStrip,
    centralSnapshot,
    intelligenceSnapshot,
    syncLabel,
    syncTitle,
    syncStale,
    syncPulse,
    screenMode: routeScreenMode,
  };
}
