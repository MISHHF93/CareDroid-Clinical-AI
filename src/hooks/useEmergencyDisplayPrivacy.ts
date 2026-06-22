import { useMemo } from 'react';
import { useEmergencyStore } from '../store/emergencyStore';
import {
  resolveEmergencyDisplayPrivacyPolicy,
  type EmergencyDisplayPrivacyPolicy,
} from '../config/emergencyDisplayPrivacyPolicy';
import useRouteScreenMode from './useRouteScreenMode';
import type { CareDroidScreenMode } from '../config/careDroidScreenModes';

export function useEmergencyDisplayPrivacy(
  overrides: Partial<{
    screenMode: CareDroidScreenMode;
    wallDisplayMonitorPrivacy: string;
    readOnlyDisplayMode: boolean;
  }> = {},
): EmergencyDisplayPrivacyPolicy {
  const routeScreenMode = useRouteScreenMode();
  const emergencySettings = useEmergencyStore((store) => store.emergencySettings);

  return useMemo(
    () =>
      resolveEmergencyDisplayPrivacyPolicy({
        screenMode: overrides.screenMode ?? routeScreenMode,
        wallDisplayMonitorPrivacy:
          overrides.wallDisplayMonitorPrivacy ?? emergencySettings.wallDisplayMonitorPrivacy,
        readOnlyDisplayMode:
          overrides.readOnlyDisplayMode ?? Boolean(emergencySettings.readOnlyDisplayMode),
      }),
    [
      emergencySettings.readOnlyDisplayMode,
      emergencySettings.wallDisplayMonitorPrivacy,
      overrides.readOnlyDisplayMode,
      overrides.screenMode,
      overrides.wallDisplayMonitorPrivacy,
      routeScreenMode,
    ],
  );
}

export default useEmergencyDisplayPrivacy;
