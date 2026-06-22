import { useMemo } from 'react';
import {
  resolveChargeNurseScreenCapabilities,
  type ChargeNurseScreenCapabilities,
} from '../config/chargeNurseScreenModel';
import useScreenModeCapabilities from './useScreenModeCapabilities';
import { useEmergencyRolePermissions } from './useEmergencyRolePermissions';

export function useChargeNurseScreen(): ChargeNurseScreenCapabilities {
  const screenCapabilities = useScreenModeCapabilities();
  const emergencyRole = useEmergencyRolePermissions();

  return useMemo(
    () =>
      resolveChargeNurseScreenCapabilities({
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

export default useChargeNurseScreen;
