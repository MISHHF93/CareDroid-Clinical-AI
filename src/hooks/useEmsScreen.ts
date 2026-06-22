import { useMemo } from 'react';
import {
  resolveEmsScreenCapabilities,
  type EmsScreenCapabilities,
} from '../config/emsScreenModel';
import useScreenModeCapabilities from './useScreenModeCapabilities';
import { useEmergencyRolePermissions } from './useEmergencyRolePermissions';

export function useEmsScreen(): EmsScreenCapabilities {
  const screenCapabilities = useScreenModeCapabilities();
  const emergencyRole = useEmergencyRolePermissions();

  return useMemo(
    () =>
      resolveEmsScreenCapabilities({
        screenMode: screenCapabilities.screenMode,
        can: emergencyRole.can,
        role: emergencyRole.role,
        roleLabel: emergencyRole.roleLabel,
      }),
    [
      emergencyRole.can,
      emergencyRole.role,
      emergencyRole.roleLabel,
      screenCapabilities.screenMode,
    ],
  );
}

export default useEmsScreen;
