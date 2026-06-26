import { lazy, Suspense, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import PublicWaitingDisplay from '../../components/whiteboard/PublicWaitingDisplay';
import { buildPublicWaitingDisplaySnapshot } from '../../components/whiteboard/publicWaitingDisplayModel';
import { MEDICAL_THEME } from '../../config/medicalTheme.constants';
import { useEmergencyStore } from '../../store/emergencyStore';
import { useStableDisplaySnapshot } from '../../hooks/useDisplayAutoRefresh';

const EmergencyWhiteboard = lazy(() => import('../../pages/emergency'));

function DisplayLoadingFallback() {
  return (
    <div role="status" style={{ padding: 24, color: MEDICAL_THEME.inkSubtle }}>
      Loading display whiteboard...
    </div>
  );
}

/**
 * Overhead / waiting-room display route — public-safe by default.
 * ?view=operational shows read-only departmental whiteboard (no PHI identifiers).
 */
export default function WhiteboardDisplayRoute() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') || 'waiting-room';

  const patients = useEmergencyStore((state) => state.patients);
  const capacity = useEmergencyStore((state) => state.capacity);
  const referrals = useEmergencyStore((state) => state.referrals);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);

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

  return (
    <Suspense fallback={<DisplayLoadingFallback />}>
      {view === 'operational' ? (
        <EmergencyWhiteboard />
      ) : (
        <PublicWaitingDisplay kioskMode snapshot={stableSnapshot} />
      )}
    </Suspense>
  );
}