import { useCallback, useMemo, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import PublicWaitingDisplay from '../../components/whiteboard/PublicWaitingDisplay';
import { buildPublicWaitingDisplaySnapshot } from '../../components/whiteboard/publicWaitingDisplayModel';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';
import { useEmergencyStore } from '../../store/emergencyStore';
import { fetchPublicWaitingSnapshot } from '../../services/emergencyOsApi';
import useDisplayAutoRefresh, { useStableDisplaySnapshot } from '../../hooks/useDisplayAutoRefresh';
import type { CapacitySnapshot, Patient, Referral } from '../../types/emergency';

/**
 * Overhead / waiting-room display route — public-safe by default.
 * ?view=operational redirects to staff read-only whiteboard (AppShell), not a duplicate dashboard.
 *
 * HEAL-347.67: this used to read `patients`/`capacity`/`referrals`/`emsArrivals`
 * straight off the shared emergencyStore, which only ever gets populated by
 * READ_PHI-gated calls (initializeFromBackend -> GET /emergency/whiteboard).
 * public_display's role deliberately does NOT hold READ_PHI (see
 * role-permissions.config.ts), so a genuinely fresh public_display session --
 * the real deployment model for this route: an unauthenticated wall-mounted
 * screen, per DisplayShell.tsx's own "no sidebar, no copilot, PHI-safe layouts
 * only" comment -- could never populate that store and this display simply
 * never showed real data. Fetches its own local snapshot from the new
 * aggregate-only GET /emergency/public-waiting-snapshot endpoint instead
 * (Permission.VIEW_PUBLIC_DISPLAY), which strips every patient/referral down
 * to a server-side allowlist of non-identifying fields before it ever leaves
 * the backend -- see emergency-os.services.ts's getPublicWaitingSnapshot.
 * emsArrivals still omitted (see that method's own comment: the underlying
 * EMS service isn't tenant-scoped yet, a separate pre-existing gap).
 */
export default function WhiteboardDisplayRoute() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') || 'waiting-room';

  const [patients, setPatients] = useState<Patient[]>([]);
  const [capacity, setCapacity] = useState<CapacitySnapshot | undefined>(undefined);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);

  const publicWaitingSnapshot = useMemo(
    () =>
      buildPublicWaitingDisplaySnapshot({
        patients,
        capacity,
        referrals,
        showEmsCrowdingImpact: false,
        offloadTargetMinutes:
          Number(emergencySettings?.thresholds?.emsOffloadTargetMinutes ?? 15) || 15,
        updatedAt: capacity?.updatedAt || new Date().toISOString(),
      }),
    [capacity, emergencySettings?.thresholds?.emsOffloadTargetMinutes, patients, referrals],
  );

  const stableSnapshot = useStableDisplaySnapshot(publicWaitingSnapshot);

  const onRefresh = useCallback(async () => {
    const result = await fetchPublicWaitingSnapshot();
    const data = (
      result as {
        data?: { patients?: Patient[]; capacity?: CapacitySnapshot; referrals?: Referral[] };
      }
    )?.data;
    setPatients(Array.isArray(data?.patients) ? (data!.patients as Patient[]) : []);
    setCapacity(data?.capacity);
    setReferrals(Array.isArray(data?.referrals) ? (data!.referrals as Referral[]) : []);
  }, []);

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
    return <Navigate to={`${CANONICAL_ROUTES.emergencyWhiteboard}?display=readonly`} replace />;
  }

  return <PublicWaitingDisplay kioskMode snapshot={stableSnapshot} refreshStatus={refreshStatus} />;
}
