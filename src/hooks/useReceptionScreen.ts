import { useMemo } from 'react';
import {
  resolveReceptionScreenCapabilities,
  type ReceptionScreenCapabilities,
} from '../config/receptionScreenModel';
import useScreenModeCapabilities from './useScreenModeCapabilities';
import { useEmergencyRolePermissions } from './useEmergencyRolePermissions';

export function useReceptionScreen(): ReceptionScreenCapabilities {
  const screenCapabilities = useScreenModeCapabilities();
  const emergencyRole = useEmergencyRolePermissions();

  return useMemo(
    () =>
      resolveReceptionScreenCapabilities({
        screenMode: screenCapabilities.screenMode,
        can: emergencyRole.can,
        presentAction: emergencyRole.presentAction,
        role: emergencyRole.role,
        roleLabel: emergencyRole.roleLabel,
      }),
    [
      emergencyRole.can,
      emergencyRole.presentAction,
      emergencyRole.role,
      emergencyRole.roleLabel,
      screenCapabilities.screenMode,
    ],
  );
}

export default useReceptionScreen;
