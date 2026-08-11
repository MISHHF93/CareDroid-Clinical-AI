import { useCallback, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  buildCareDroidCentralNodeSnapshot,
  type CareDroidScreenMode,
} from '../central-node/careDroidCentralNode';
import { useEmergencyStore } from '../store/emergencyStore';
import { useEmergencyRolePermissions } from './useEmergencyRolePermissions';
import useRouteScreenMode from './useRouteScreenMode';
import { fetchCareDroidCentralNodeSnapshot } from '../services/emergencyOsApi';

type UseCareDroidCentralNodeOptions = {
  screenMode?: CareDroidScreenMode;
};

function readCentralNodeGeneratedAt(envelope: unknown): string {
  if (!envelope || typeof envelope !== 'object') {
    return new Date().toISOString();
  }
  const record = envelope as { data?: { generatedAt?: string }; generatedAt?: string };
  return record.data?.generatedAt || record.generatedAt || new Date().toISOString();
}

export function useCareDroidCentralNode(options: UseCareDroidCentralNodeOptions = {}) {
  const location = useLocation();
  const routeScreenMode = useRouteScreenMode();
  const emergencyRole = useEmergencyRolePermissions();
  const patients = useEmergencyStore((state) => state.patients);
  const capacity = useEmergencyStore((state) => state.capacity);
  const alerts = useEmergencyStore((state) => state.alerts);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const emsIncomingPatients = useEmergencyStore((state) => state.emsIncomingPatients);
  const emsUnits = useEmergencyStore((state) => state.emsUnits);
  const referrals = useEmergencyStore((state) => state.referrals);
  const staff = useEmergencyStore((state) => state.staff);
  const rooms = useEmergencyStore((state) => state.rooms);
  const workflowLogs = useEmergencyStore((state) => state.workflowLogs);
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);
  const websocket = useEmergencyStore((state) => state.websocket);
  const copilotMessages = useEmergencyStore((state) => state.copilotMessages);
  const integrationEvents = useEmergencyStore((state) => state.integrationEvents);
  const selectedPatientId = useEmergencyStore((state) => state.selectedPatientId);
  const activeQueueFilter = useEmergencyStore((state) => state.activeQueueFilter);
  const whiteboardSearchQuery = useEmergencyStore((state) => state.whiteboardSearchQuery);
  const loading = useEmergencyStore((state) => state.loading);
  const backendAvailable = useEmergencyStore((state) => state.backendAvailable);
  const dispatchWebSocketEvent = useEmergencyStore((state) => state.dispatchWebSocketEvent);
  const setWebSocketStatus = useEmergencyStore((state) => state.setWebSocketStatus);
  const [backendSnapshot, setBackendSnapshot] = useState<unknown>(null);
  const [refreshError, setRefreshError] = useState('');
  const source = useMemo(
    () => ({
      patients,
      capacity,
      alerts,
      emsArrivals,
      emsIncomingPatients,
      emsUnits,
      referrals,
      staff,
      rooms,
      workflowLogs,
      emergencySettings,
      websocket,
      copilotMessages,
      integrationEvents,
      selectedPatientId,
      activeQueueFilter,
      whiteboardSearchQuery,
      loading,
      backendAvailable,
    }),
    [
      activeQueueFilter,
      alerts,
      backendAvailable,
      capacity,
      copilotMessages,
      emergencySettings,
      emsArrivals,
      emsIncomingPatients,
      emsUnits,
      integrationEvents,
      loading,
      patients,
      referrals,
      staff,
      rooms,
      selectedPatientId,
      websocket,
      whiteboardSearchQuery,
      workflowLogs,
    ],
  );

  // Depended on the WHOLE emergencyRole object even though only these 5 fields are
  // actually read below -- emergencyRole carries ~20 other fields (compiledProfile,
  // securityContext, permissionContext, switchDemoRole, etc.) that can legitimately get
  // fresh references on renders where role/readOnly/allowedRoutes/can themselves haven't
  // changed, forcing this snapshot (and the expensive patient duplicate-detection +
  // hospital-operating-system-model work buildCareDroidCentralNodeSnapshot performs
  // internally) to recompute far more often than the actual inputs warrant. Depend on
  // only the fields this memo reads. Part of MB-P0-4/HEAL-082's ongoing investigation and
  // the standing "keep the globally-mounted Header cheap" requirement.
  const role = emergencyRole.role;
  const roleLabel = emergencyRole.roleLabel;
  const readOnly = emergencyRole.readOnly;
  const allowedRoutes = emergencyRole.allowedRoutes;
  const can = emergencyRole.can;
  const snapshot = useMemo(
    () =>
      buildCareDroidCentralNodeSnapshot(
        source,
        { role, roleLabel, readOnly, allowedRoutes, can },
        {
          screenMode: options.screenMode || routeScreenMode,
          source: backendSnapshot ? 'backend-snapshot' : 'store',
          backendSnapshot,
          pathname: location.pathname,
        },
      ),
    [
      allowedRoutes,
      backendSnapshot,
      can,
      location.pathname,
      options.screenMode,
      readOnly,
      role,
      roleLabel,
      routeScreenMode,
      source,
    ],
  );

  const refresh = useCallback(async (): Promise<unknown | null> => {
    try {
      const envelope = await fetchCareDroidCentralNodeSnapshot();
      setBackendSnapshot(envelope);
      setRefreshError('');
      dispatchWebSocketEvent({ type: 'central_node_snapshot', payload: envelope });
      setWebSocketStatus({
        status: 'connected',
        mode: 'polling',
        lastEventAt: readCentralNodeGeneratedAt(envelope),
        message: 'Central node snapshot refreshed.',
      });
      return envelope;
    } catch (error: any) {
      const message =
        error instanceof Error ? error.message : 'Unable to refresh CareDroid Central Node.';
      setRefreshError(message);
      setWebSocketStatus({
        status: 'reconnecting',
        mode: 'polling',
        message,
        updatedAt: new Date().toISOString(),
      });
      return null;
    }
  }, [dispatchWebSocketEvent, setWebSocketStatus]);

  // AppShell owns the singleton emergency realtime session (SSE + polling
  // fallback). Starting another connection here duplicated
  // /api/emergency/realtime/stream and doubled poll-driven refresh work on
  // AI Chief surfaces (copilot, executive) that mount this hook with
  // realtime enabled upstream. Subscribe via emergencyStore websocket state
  // and dispatchWebSocketEvent hydration instead.

  return {
    snapshot,
    backendSnapshot,
    refresh,
    refreshError,
    screenMode: snapshot.screenContext.mode,
    isRedacted: snapshot.screenContext.sensitiveDataRedacted,
  };
}

export default useCareDroidCentralNode;
