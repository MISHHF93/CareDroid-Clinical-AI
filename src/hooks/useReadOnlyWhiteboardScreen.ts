import { useMemo } from 'react';
import {
  resolveReadOnlyWhiteboardScreenCapabilities,
  type ReadOnlyWhiteboardScreenCapabilities,
} from '../config/readOnlyWhiteboardScreenModel';
import useScreenModeCapabilities from './useScreenModeCapabilities';
import { useEmergencyRolePermissions } from './useEmergencyRolePermissions';

export function useReadOnlyWhiteboardScreen(): ReadOnlyWhiteboardScreenCapabilities {
  const screenCapabilities = useScreenModeCapabilities();
  const emergencyRole = useEmergencyRolePermissions();

  return useMemo(
    () =>
      resolveReadOnlyWhiteboardScreenCapabilities({
        screenMode: screenCapabilities.screenMode,
        role: emergencyRole.role,
        roleLabel: emergencyRole.roleLabel,
      }),
    [emergencyRole.role, emergencyRole.roleLabel, screenCapabilities.screenMode],
  );
}

export default useReadOnlyWhiteboardScreen;
