import { useMemo } from 'react';
import {
  resolvePublicWaitingScreenCapabilities,
  type PublicWaitingScreenCapabilities,
} from '../config/publicWaitingScreenModel';
import useScreenModeCapabilities from './useScreenModeCapabilities';
import { useEmergencyRolePermissions } from './useEmergencyRolePermissions';

export function usePublicWaitingScreen(): PublicWaitingScreenCapabilities {
  const screenCapabilities = useScreenModeCapabilities();
  const emergencyRole = useEmergencyRolePermissions();

  return useMemo(
    () =>
      resolvePublicWaitingScreenCapabilities({
        screenMode: screenCapabilities.screenMode,
        role: emergencyRole.role,
        roleLabel: emergencyRole.roleLabel,
      }),
    [emergencyRole.role, emergencyRole.roleLabel, screenCapabilities.screenMode],
  );
}

export default usePublicWaitingScreen;
