import { useMemo } from 'react';
import {
  resolveCommandCenterScreenCapabilities,
  type CommandCenterScreenCapabilities,
} from '../config/commandCenterScreenModel';
import useScreenModeCapabilities from './useScreenModeCapabilities';
import { useEmergencyRolePermissions } from './useEmergencyRolePermissions';

export function useCommandCenterScreen(): CommandCenterScreenCapabilities {
  const screenCapabilities = useScreenModeCapabilities();
  const emergencyRole = useEmergencyRolePermissions();

  return useMemo(
    () =>
      resolveCommandCenterScreenCapabilities({
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

export default useCommandCenterScreen;
