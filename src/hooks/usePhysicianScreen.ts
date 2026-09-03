import { useMemo } from 'react';
import {
  resolvePhysicianScreenCapabilities,
  type PhysicianScreenCapabilities,
} from '../config/physicianScreenModel';
import useScreenModeCapabilities from './useScreenModeCapabilities';
import { useEmergencyRolePermissions } from './useEmergencyRolePermissions';

export function usePhysicianScreen(): PhysicianScreenCapabilities {
  const screenCapabilities = useScreenModeCapabilities();
  const emergencyRole = useEmergencyRolePermissions();

  return useMemo(
    () =>
      resolvePhysicianScreenCapabilities({
        screenMode: screenCapabilities.screenMode,
        can: emergencyRole.can,
        role: emergencyRole.role,
        roleLabel: emergencyRole.roleLabel,
      }),
    [emergencyRole.can, emergencyRole.role, emergencyRole.roleLabel, screenCapabilities.screenMode],
  );
}

export default usePhysicianScreen;
