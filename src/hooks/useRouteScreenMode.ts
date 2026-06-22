import { useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { type CareDroidScreenMode } from '../central-node/careDroidCentralNode';
import {
  isEmergencyReadOnlyRole,
  resolveEmergencyRoleId,
} from '../config/emergencyRolePermissions';
import { resolveEmergencyScreenMode } from '../config/emergencyRoleScreenMatrix';
import { useUser } from '../contexts/UserContext';
import useEmergencyDeviceContext from './useEmergencyDeviceContext';
import { useEmergencyStore } from '../store/emergencyStore';

export function useRouteScreenMode(): CareDroidScreenMode {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const deviceContext = useEmergencyDeviceContext();
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);
  const role = useMemo(
    () => resolveEmergencyRoleId(user, emergencySettings),
    [emergencySettings, user],
  );
  const readOnly = isEmergencyReadOnlyRole(role);

  return useMemo(
    () =>
      resolveEmergencyScreenMode({
        pathname: location.pathname,
        role,
        readOnly,
        emergencySettings: {
          defaultScreenMode: emergencySettings.defaultScreenMode,
          enabledScreenModes: emergencySettings.enabledScreenModes,
          readOnlyDisplayMode: emergencySettings.readOnlyDisplayMode,
          commandCenterMode: emergencySettings.commandCenterMode,
        },
        displayParam: searchParams.get('display'),
        queueParam: searchParams.get('queue'),
        deviceContextId: deviceContext.deviceContextId,
      }),
    [
      deviceContext.deviceContextId,
      emergencySettings.commandCenterMode,
      emergencySettings.defaultScreenMode,
      emergencySettings.enabledScreenModes,
      emergencySettings.readOnlyDisplayMode,
      location.pathname,
      readOnly,
      role,
      searchParams,
    ],
  );
}

export default useRouteScreenMode;
