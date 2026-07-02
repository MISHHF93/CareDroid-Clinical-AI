import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchEmergencyOperatingSurface, type OperatingSurfaceId } from '../services/emergencyOsApi';
import { useEmergencyStore } from '../store/emergencyStore';

export type OperatingSurfaceEnvelope = {
  source: 'backend' | 'local-store-fallback';
  generatedAt?: string;
  surfaceId: OperatingSurfaceId;
  data?: Record<string, unknown>;
};

type UseEmergencyOperatingSurfaceResult = {
  loading: boolean;
  error: string | null;
  envelope: OperatingSurfaceEnvelope;
  refresh: () => Promise<void>;
};

export default function useEmergencyOperatingSurface(
  surfaceId: OperatingSurfaceId | null | undefined,
): UseEmergencyOperatingSurfaceResult {
  const backendAvailable = useEmergencyStore((state) => state.backendAvailable);
  const capacityUpdatedAt = useEmergencyStore((state) => state.capacity.updatedAt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiEnvelope, setApiEnvelope] = useState<{
    generatedAt?: string;
    data?: Record<string, unknown>;
  } | null>(null);

  const refresh = useCallback(async () => {
    if (!surfaceId || !backendAvailable) {
      setApiEnvelope(null);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      const response = await fetchEmergencyOperatingSurface(surfaceId);
      setApiEnvelope({
        generatedAt: response?.generatedAt,
        data: (response?.data as Record<string, unknown>) || {},
      });
      setError(null);
    } catch (refreshError: unknown) {
      setApiEnvelope(null);
      setError(refreshError instanceof Error ? refreshError.message : 'Operating surface unavailable');
    } finally {
      setLoading(false);
    }
  }, [backendAvailable, surfaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const envelope = useMemo<OperatingSurfaceEnvelope>(
    () => ({
      source: apiEnvelope && !error ? 'backend' : 'local-store-fallback',
      generatedAt: apiEnvelope?.generatedAt || capacityUpdatedAt,
      surfaceId: surfaceId || 'ed-readiness',
      data: apiEnvelope?.data,
    }),
    [apiEnvelope, capacityUpdatedAt, error, surfaceId],
  );

  return { loading, error, envelope, refresh };
}