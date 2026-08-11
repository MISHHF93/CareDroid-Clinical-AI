import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getEmergencyDeviceContextDefinition,
  isDeviceContextKiosk,
  isDeviceContextReadOnlyWall,
  listEmergencyDeviceContexts,
  normalizeEmergencyDeviceContextId,
  parseEmergencyDeviceContextParam,
  readStoredEmergencyDeviceContext,
  resolveDeviceContextLandingRoute,
  resolveDeviceContextScreenMode,
  writeStoredEmergencyDeviceContext,
  type EmergencyDeviceContextDefinition,
  type EmergencyDeviceContextId,
} from '../config/emergencyDeviceContextModel';
import type { CareDroidScreenMode } from '../config/careDroidScreenModes';
import { useEmergencyStore } from '../store/emergencyStore';

export type EmergencyDeviceContextState = {
  deviceContextId: EmergencyDeviceContextId | null;
  definition: EmergencyDeviceContextDefinition | null;
  screenMode: CareDroidScreenMode | null;
  landingRoute: string | null;
  isKiosk: boolean;
  isReadOnlyWall: boolean;
  options: readonly EmergencyDeviceContextDefinition[];
  setDeviceContext: (id: EmergencyDeviceContextId | null) => void;
  clearDeviceContext: () => void;
};

export function useEmergencyDeviceContext(): EmergencyDeviceContextState {
  const [searchParams, setSearchParams] = useSearchParams();
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);
  const [storedRevision, setStoredRevision] = useState(0);
  const deviceParam = searchParams.get('device') || searchParams.get('deviceContext');

  useEffect(() => {
    const parsed = parseEmergencyDeviceContextParam(deviceParam);
    if (!parsed) return;
    writeStoredEmergencyDeviceContext(parsed);
    setStoredRevision((value) => value + 1);
  }, [deviceParam]);

  const deviceContextId = useMemo(() => {
    void storedRevision;
    return (
      parseEmergencyDeviceContextParam(deviceParam) || readStoredEmergencyDeviceContext()
    );
  }, [deviceParam, storedRevision]);

  const definition = useMemo(
    () => (deviceContextId ? getEmergencyDeviceContextDefinition(deviceContextId) : null),
    [deviceContextId],
  );

  const screenMode = useMemo(
    () =>
      resolveDeviceContextScreenMode(deviceContextId, {
        defaultScreenMode: emergencySettings.defaultScreenMode,
        enabledScreenModes: emergencySettings.enabledScreenModes,
        readOnlyDisplayMode: emergencySettings.readOnlyDisplayMode,
        commandCenterMode: emergencySettings.commandCenterMode,
      }),
    [
      deviceContextId,
      emergencySettings.commandCenterMode,
      emergencySettings.defaultScreenMode,
      emergencySettings.enabledScreenModes,
      emergencySettings.readOnlyDisplayMode,
    ],
  );

  const landingRoute = useMemo(
    () => resolveDeviceContextLandingRoute(deviceContextId),
    [deviceContextId],
  );

  const setDeviceContext = useCallback(
    (id: EmergencyDeviceContextId | null) => {
      const normalized = id ? normalizeEmergencyDeviceContextId(id) : null;
      writeStoredEmergencyDeviceContext(normalized);
      setStoredRevision((value) => value + 1);

      const nextParams = new URLSearchParams(searchParams);
      if (normalized) nextParams.set('device', normalized);
      else {
        nextParams.delete('device');
        nextParams.delete('deviceContext');
      }
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const clearDeviceContext = useCallback(() => {
    setDeviceContext(null);
  }, [setDeviceContext]);

  const isKiosk = isDeviceContextKiosk(deviceContextId);
  const isReadOnlyWall = isDeviceContextReadOnlyWall(deviceContextId);
  const options = useMemo(() => listEmergencyDeviceContexts(), []);

  return useMemo(
    () => ({
      deviceContextId,
      definition,
      screenMode,
      landingRoute,
      isKiosk,
      isReadOnlyWall,
      options,
      setDeviceContext,
      clearDeviceContext,
    }),
    [
      clearDeviceContext,
      definition,
      deviceContextId,
      isKiosk,
      isReadOnlyWall,
      landingRoute,
      options,
      screenMode,
      setDeviceContext,
    ],
  );
}

export default useEmergencyDeviceContext;
