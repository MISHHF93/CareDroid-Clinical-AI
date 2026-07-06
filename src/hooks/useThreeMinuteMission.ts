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

  useEffect(() => {
    syncThreeMinuteMissionsFromEngine();
    if (options.realtime === false) return undefined;
    const timer = window.setInterval(() => {
      setTick((value) => value + 1);
      syncThreeMinuteMissionsFromEngine();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [options.realtime, patients, alerts, emsArrivals]);

  const snapshot = useMemo(
    () => buildThreeMinuteMissionSnapshotFromMissions(missions),
    [missions, patients, alerts, emsArrivals, tick],
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