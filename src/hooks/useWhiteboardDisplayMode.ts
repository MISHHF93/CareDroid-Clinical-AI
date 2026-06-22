import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CARE_DROID_SCREEN_MODE_CONFIG,
  CARE_DROID_SCREEN_MODES,
  type CareDroidScreenMode,
} from '../central-node/careDroidCentralNode';
import useRouteScreenMode from './useRouteScreenMode';
import useEmergencyDeviceContext from './useEmergencyDeviceContext';
import { useEmergencyStore } from '../store/emergencyStore';
import {
  isPublicDisplayContext,
  isReadOnlyOperationalContext,
} from '../config/emergencyPermissionRegistry';
import {
  DISPLAY_QUERY_MODES,
  isPublicDisplayScreenMode,
  isWallKioskScreenMode,
} from '../config/emergencyRoleScreenMatrix';

export type WhiteboardDisplayProfile = {
  /** Wall / kiosk display — no mutations, auto-refresh, operational awareness only. */
  isDisplayMode: boolean;
  canMutate: boolean;
  autoRefresh: boolean;
  operationalAwarenessOnly: boolean;
  isPublicDisplay: boolean;
  isWaitingRoomDisplay: boolean;
  isReadOnlyWhiteboardDisplay: boolean;
  screenMode: CareDroidScreenMode;
  label: string;
  refreshIntervalMs: number;
};

export function resolveWhiteboardDisplayProfile(options: {
  screenMode: CareDroidScreenMode;
  wallDisplayRefreshInterval: number;
  displayQueryReadOnly: boolean;
}): WhiteboardDisplayProfile {
  const config = CARE_DROID_SCREEN_MODE_CONFIG[options.screenMode];
  const isPublicDisplay = isPublicDisplayScreenMode(options.screenMode);
  const isWaitingRoomDisplay = options.screenMode === CARE_DROID_SCREEN_MODES.publicWaiting;
  const isReadOnlyWhiteboardDisplay =
    options.screenMode === CARE_DROID_SCREEN_MODES.readOnlyWhiteboard;
  const isDisplayMode =
    config.readOnly || options.displayQueryReadOnly || isWallKioskScreenMode(options.screenMode);
  const refreshIntervalMs = Math.max(
    15000,
    Number(options.wallDisplayRefreshInterval) || 30000,
  );

  return {
    isDisplayMode,
    canMutate: !isDisplayMode,
    autoRefresh: isDisplayMode,
    operationalAwarenessOnly: isDisplayMode,
    isPublicDisplay,
    isWaitingRoomDisplay,
    isReadOnlyWhiteboardDisplay,
    screenMode: options.screenMode,
    label: config.label,
    refreshIntervalMs,
  };
}

export function useWhiteboardDisplayMode(): WhiteboardDisplayProfile {
  const screenMode = useRouteScreenMode();
  const deviceContext = useEmergencyDeviceContext();
  const [searchParams] = useSearchParams();
  const wallDisplayRefreshInterval = useEmergencyStore(
    (state) => state.emergencySettings.wallDisplayRefreshInterval,
  );
  const displayParam = (searchParams.get('display') || '').toLowerCase();
  const displayQueryReadOnly =
    DISPLAY_QUERY_MODES.readOnly.includes(displayParam) ||
    DISPLAY_QUERY_MODES.waitingRoom.includes(displayParam) ||
    deviceContext.isKiosk;

  return useMemo(
    () => {
      const profile = resolveWhiteboardDisplayProfile({
        screenMode,
        wallDisplayRefreshInterval,
        displayQueryReadOnly,
      });
      const displayContext = {
        screenMode,
        displayParam,
        readOnlyDisplayMode: profile.isDisplayMode || deviceContext.isReadOnlyWall,
      };
      return {
        ...profile,
        isDisplayMode: profile.isDisplayMode || deviceContext.isKiosk,
        canMutate:
          !deviceContext.isKiosk &&
          !isPublicDisplayContext(displayContext) &&
          !isReadOnlyOperationalContext(displayContext),
        autoRefresh: profile.autoRefresh || deviceContext.isKiosk,
      };
    },
    [
      deviceContext.isKiosk,
      deviceContext.isReadOnlyWall,
      displayParam,
      displayQueryReadOnly,
      screenMode,
      wallDisplayRefreshInterval,
    ],
  );
}

export default useWhiteboardDisplayMode;
