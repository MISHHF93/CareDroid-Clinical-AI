import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CARE_DROID_SCREEN_MODE_CONFIG,
  type CareDroidScreenMode,
} from '../central-node/careDroidCentralNode';
import useRouteScreenMode from './useRouteScreenMode';
import { useEmergencyStore } from '../store/emergencyStore';

export type WhiteboardDisplayProfile = {
  /** Wall / kiosk display — no mutations, auto-refresh, operational awareness only. */
  isDisplayMode: boolean;
  canMutate: boolean;
  autoRefresh: boolean;
  operationalAwarenessOnly: boolean;
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
  const isDisplayMode = config.readOnly || options.displayQueryReadOnly;
  const refreshIntervalMs = Math.max(
    15000,
    Number(options.wallDisplayRefreshInterval) || 30000,
  );

  return {
    isDisplayMode,
    canMutate: !isDisplayMode,
    autoRefresh: isDisplayMode,
    operationalAwarenessOnly: isDisplayMode,
    screenMode: options.screenMode,
    label: config.label,
    refreshIntervalMs,
  };
}

export function useWhiteboardDisplayMode(): WhiteboardDisplayProfile {
  const screenMode = useRouteScreenMode();
  const [searchParams] = useSearchParams();
  const wallDisplayRefreshInterval = useEmergencyStore(
    (state) => state.emergencySettings.wallDisplayRefreshInterval,
  );
  const displayQueryReadOnly = ['readonly', 'read-only'].includes(
    (searchParams.get('display') || '').toLowerCase(),
  );

  return useMemo(
    () =>
      resolveWhiteboardDisplayProfile({
        screenMode,
        wallDisplayRefreshInterval,
        displayQueryReadOnly,
      }),
    [displayQueryReadOnly, screenMode, wallDisplayRefreshInterval],
  );
}

export default useWhiteboardDisplayMode;
