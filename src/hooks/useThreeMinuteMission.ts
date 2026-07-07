import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildThreeMinuteMissionSnapshotFromMissions,
  syncThreeMinuteMissionsFromEngine,
} from '../services/threeMinuteMissionService';
import { useThreeMinuteMissionStore } from '../store/threeMinuteMissionStore';
import { useEmergencyStore } from '../store/emergencyStore';
import { acknowledgeThreeMinuteMission } from '../services/threeMinuteMissionService';

export function useThreeMinuteMission(options: { realtime?: boolean } = {}) {
  const missions = useThreeMinuteMissionStore((state) => state.missions);
  const patients = useEmergencyStore((state) => state.patients);
  const alerts = useEmergencyStore((state) => state.alerts);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const [tick, setTick] = useState(0);

  // Syncing from the timer engine can write to the missions store (see
  // syncThreeMinuteMissionsFromEngine). Doing that from a render-phase useMemo trips
  // React's "Cannot update a component while rendering a different component" warning
  // whenever this hook's own component is subscribed to that store. Keeping the sync in
  // effects only means it always runs post-render, in the commit phase.
  useEffect(() => {
    syncThreeMinuteMissionsFromEngine();
  }, [patients, alerts, emsArrivals]);

  useEffect(() => {
    if (options.realtime === false) return undefined;
    const timer = window.setInterval(() => {
      setTick((value) => value + 1);
      syncThreeMinuteMissionsFromEngine();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [options.realtime, patients, alerts, emsArrivals]);

  const snapshot = useMemo(
    () => buildThreeMinuteMissionSnapshotFromMissions(missions),
    // alerts isn't read directly here, but buildThreeMinuteMissionSnapshotFromMissions
    // computes complianceRate from the live emergency store's alerts, so it must stay a
    // dep to avoid a stale complianceRate when alerts change without missions changing.
    [missions, alerts, tick],
  );

  const acknowledgeMission = useCallback((missionId: string, acknowledgedBy: string) => {
    return acknowledgeThreeMinuteMission(missionId, acknowledgedBy);
  }, []);

  return useMemo(
    () =>
      Object.freeze({
        snapshot,
        missions: snapshot.activeMissions,
        topMission: snapshot.activeMissions[0] ?? null,
        breachCount: snapshot.breachCount,
        unacknowledgedCount: snapshot.unacknowledgedCount,
        complianceRate: snapshot.complianceRate,
        acknowledgeMission,
      }),
    [snapshot, acknowledgeMission],
  );
}

export default useThreeMinuteMission;