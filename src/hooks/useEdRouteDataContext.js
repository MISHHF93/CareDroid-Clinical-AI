import { useMemo } from 'react';
import { useEmergencyStore } from '../store/emergencyStore';

/** Shared ED route envelope meta — one store read for backend rendering banners. */
export function useEdRouteDataContext() {
  const backendAvailable = useEmergencyStore((state) => state.backendAvailable);
  const activeScenarioId = useEmergencyStore((state) => state.activeScenarioId);
  const capacity = useEmergencyStore((state) => state.capacity);
  const loading = useEmergencyStore((state) => state.loading);

  const envelope = useMemo(
    () => ({
      source: backendAvailable ? 'backend' : 'local-store-fallback',
      generatedAt: capacity.updatedAt,
    }),
    [backendAvailable, capacity.updatedAt],
  );

  return {
    backendAvailable,
    activeScenarioId,
    loading,
    envelope,
  };
}

export default useEdRouteDataContext;