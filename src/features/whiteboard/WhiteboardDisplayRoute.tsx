import { useCallback, useMemo } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import PublicWaitingDisplay from '../../components/whiteboard/PublicWaitingDisplay';
import { buildPublicWaitingDisplaySnapshot } from '../../components/whiteboard/publicWaitingDisplayModel';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';
import { useEmergencyStore } from '../../store/emergencyStore';
import useDisplayAutoRefresh, { useStableDisplaySnapshot } from '../../hooks/useDisplayAutoRefresh';

/**
 * Overhead / waiting-room display route — public-safe by default.
 * ?view=operational redirects to staff read-only whiteboard (AppShell), not a duplicate dashboard.
 */
export default function WhiteboardDisplayRoute() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') || 'waiting-room';

  const patients = useEmergencyStore((state) => state.patients);
  const capacity = useEmergencyStore((state) => state.capacity);
  const referrals = useEmergencyStore((state) => state.referrals);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);
  const initializeFromBackend = useEmergencyStore((state) => state.initializeFromBackend);

  const publicWaitingSnapshot = useMemo(
    () =>
      buildPublicWaitingDisplaySnapshot({
        patients,
        capacity,
        referrals,
        emsArrivals,
        showEmsCrowdingImpact: false,
        offloadTargetMinutes:
          Number(emergencySettings?.thresholds?.emsOffloadTargetMinutes ?? 15) || 15,
        updatedAt: capacity?.updatedAt || new Date().toISOString(),
      }),
    [capacity, emsArrivals, emergencySettings?.thresholds?.emsOffloadTargetMinutes, patients, referrals],
  );

  const stableSnapshot = useStableDisplaySnapshot(publicWaitingSnapshot);

  const onRefresh = useCallback(async () => initializeFromBackend(), [initializeFromBackend]);

  const refreshStatus = useDisplayAutoRefresh({
    enabled: view !== 'operational',
    screenMode: CARE_DROID_SCREEN_MODES.publicWaiting,
    settings: {
      wallDisplayRefreshInterval: emergencySettings?.wallDisplayRefreshInterval,
    },
    contentUpdatedAt: stableSnapshot?.updatedAt || null,
    hasContent: Boolean(stableSnapshot),
    onRefresh,
  });

  if (view === 'operational') {
    return (
      <Navigate
        to={`${CANONICAL_ROUTES.emergencyWhiteboard}?display=readonly`}
        replace
      />
    );
  }

  return (
    <PublicWaitingDisplay
      kioskMode
      snapshot={stableSnapshot}
      refreshStatus={refreshStatus}
    />
  );
}