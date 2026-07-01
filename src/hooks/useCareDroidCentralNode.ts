import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  buildCareDroidCentralNodeSnapshot,
  type CareDroidScreenMode,
} from '../central-node/careDroidCentralNode';
import { useEmergencyStore } from '../store/emergencyStore';
import { useEmergencyRolePermissions } from './useEmergencyRolePermissions';
import useRouteScreenMode from './useRouteScreenMode';
import { fetchCareDroidCentralNodeSnapshot } from '../services/emergencyOsApi';
import { startEmergencyRealtime } from '../services/emergencyRealtimeService';

type UseCareDroidCentralNodeOptions = {
  screenMode?: CareDroidScreenMode;
  realtime?: boolean;
};

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

  const snapshot = useMemo(
    () =>
      buildCareDroidCentralNodeSnapshot(
        source,
        {
          role: emergencyRole.role,
          roleLabel: emergencyRole.roleLabel,
          readOnly: emergencyRole.readOnly,
          allowedRoutes: emergencyRole.allowedRoutes,
          can: emergencyRole.can,
        },
        {
          screenMode: options.screenMode || routeScreenMode,
          source: backendSnapshot ? 'backend-snapshot' : 'store',
          backendSnapshot,
          pathname: location.pathname,
        },
      ),
    [backendSnapshot, emergencyRole, location.pathname, options.screenMode, routeScreenMode, source],
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
        lastEventAt: envelope?.data?.generatedAt || envelope?.generatedAt || new Date().toISOString(),
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

  useEffect(() => {
    if (!options.realtime) return undefined;
    return startEmergencyRealtime({
      onEvent: dispatchWebSocketEvent,
      onStatus: setWebSocketStatus,
      onPoll: refresh,
    });
  }, [dispatchWebSocketEvent, options.realtime, refresh, setWebSocketStatus]);

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
