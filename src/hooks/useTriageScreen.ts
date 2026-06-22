import { useMemo } from 'react';
import {
  resolveTriageScreenCapabilities,
  type TriageScreenCapabilities,
} from '../config/triageScreenModel';
import useScreenModeCapabilities from './useScreenModeCapabilities';
import { useEmergencyRolePermissions } from './useEmergencyRolePermissions';

export function useTriageScreen(): TriageScreenCapabilities {
  const screenCapabilities = useScreenModeCapabilities();
  const emergencyRole = useEmergencyRolePermissions();

  return useMemo(
    () =>
      resolveTriageScreenCapabilities({
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

export default useTriageScreen;
