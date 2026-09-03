import { useEdOperatingSurface, type EdOperatingSurfaceContext } from './useEdOperatingSurface';
import useEmergencyOperatingSurface, {
  type OperatingSurfaceEnvelope,
} from './useEmergencyOperatingSurface';
import { resolveApiOperatingSurfaceId } from '../config/operatingSurfaceApiMapping';

export type UnifiedOperatingSurfaceContext = EdOperatingSurfaceContext &
  Readonly<{
    apiSurfaceId: ReturnType<typeof resolveApiOperatingSurfaceId>;
    apiEnvelope: OperatingSurfaceEnvelope;
    apiLoading: boolean;
    apiError: string | null;
    hasBackendSnapshot: boolean;
    refreshApi: () => Promise<void>;
  }>;

export function useUnifiedOperatingSurface(): UnifiedOperatingSurfaceContext {
  const edContext = useEdOperatingSurface();
  const apiSurfaceId = resolveApiOperatingSurfaceId(edContext.surface?.surfaceId);
  const api = useEmergencyOperatingSurface(apiSurfaceId);

  return {
    ...edContext,
    apiSurfaceId,
    apiEnvelope: api.envelope,
    apiLoading: api.loading,
    apiError: api.error,
    hasBackendSnapshot: api.envelope.source === 'backend' && !api.error,
    refreshApi: api.refresh,
  };
}

export default useUnifiedOperatingSurface;
