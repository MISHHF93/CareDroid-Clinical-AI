import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useEmergencyStore } from '../store/emergencyStore';
import {
  buildHospitalOperatingContext,
  fetchHospitalSurfaceBackendSnapshot,
  type HospitalOperatingContext,
} from '../services/hospitalOperatingSystemService';
import { isBackendKnownOffline } from '../services/backendReachability';

export type HospitalOperatingSystemHook = HospitalOperatingContext &
  Readonly<{
    backendSnapshot: unknown | null;
    backendLoading: boolean;
    backendError: string | null;
  }>;

export function useHospitalOperatingSystem(
  options: { syncBackend?: boolean } = {},
): HospitalOperatingSystemHook {
  const { pathname } = useLocation();
  const patients = useEmergencyStore((state) => state.patients);
  const staff = useEmergencyStore((state) => state.staff);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const alerts = useEmergencyStore((state) => state.alerts);
  const capacity = useEmergencyStore((state) => state.capacity);
  const referrals = useEmergencyStore((state) => state.referrals);

  const context = useMemo(
    () =>
      buildHospitalOperatingContext({
        pathname,
        patients,
        staff,
        emsArrivals,
        alerts,
        capacity,
        referrals,
      }),
    [pathname, patients, staff, emsArrivals, alerts, capacity, referrals],
  );

  const [backendSnapshot, setBackendSnapshot] = useState<unknown | null>(null);
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const apiSurfaceId = context.snapshot.apiSurfaceId;
  const shouldSync =
    options.syncBackend !== false && Boolean(apiSurfaceId) && !isBackendKnownOffline();

  useEffect(() => {
    if (!shouldSync || !apiSurfaceId) {
      setBackendSnapshot(null);
      setBackendLoading(false);
      setBackendError(null);
      return;
    }

    let cancelled = false;
    setBackendLoading(true);
    setBackendError(null);

    void fetchHospitalSurfaceBackendSnapshot(apiSurfaceId)
      .then((payload) => {
        if (!cancelled) {
          setBackendSnapshot(payload);
          setBackendLoading(false);
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setBackendSnapshot(null);
          setBackendLoading(false);
          setBackendError(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiSurfaceId, shouldSync]);

  return useMemo(
    () =>
      Object.freeze({
        ...context,
        backendSnapshot,
        backendLoading,
        backendError,
      }),
    [context, backendSnapshot, backendLoading, backendError],
  );
}

export default useHospitalOperatingSystem;
