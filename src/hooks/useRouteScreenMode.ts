import { useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  CARE_DROID_SCREEN_MODES,
  CARE_DROID_SCREEN_MODE_CONFIG,
  type CareDroidScreenMode,
} from '../central-node/careDroidCentralNode';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { EMERGENCY_ROLE_IDS } from '../config/emergencyRolePermissions';
import { useEmergencyRolePermissions } from './useEmergencyRolePermissions';
import { useEmergencyStore } from '../store/emergencyStore';

function resolveConfiguredMode(value: string | undefined): CareDroidScreenMode | null {
  if (!value || !(value in CARE_DROID_SCREEN_MODE_CONFIG)) return null;
  return value as CareDroidScreenMode;
}

export function useRouteScreenMode(): CareDroidScreenMode {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const emergencyRole = useEmergencyRolePermissions();
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);

  return useMemo(() => {
    const displayParam = (searchParams.get('display') || '').toLowerCase();

    if (displayParam === 'readonly' || displayParam === 'read-only') {
      return CARE_DROID_SCREEN_MODES.readOnly;
    }

    if (emergencySettings.readOnlyDisplayMode || emergencyRole.readOnly) {
      return CARE_DROID_SCREEN_MODES.readOnly;
    }

    const path = location.pathname;

    if (
      path === CANONICAL_ROUTES.emergencyReception ||
      path === CANONICAL_ROUTES.emergencyIntake
    ) {
      return CARE_DROID_SCREEN_MODES.registration;
    }

    if (path === CANONICAL_ROUTES.emergencyEms) {
      return CARE_DROID_SCREEN_MODES.ems;
    }

    if (path === CANONICAL_ROUTES.emergencyWhiteboard || path === '/emergency') {
      if (emergencyRole.role === EMERGENCY_ROLE_IDS.triageNurse) {
        return CARE_DROID_SCREEN_MODES.triage;
      }
      if (emergencyRole.role === EMERGENCY_ROLE_IDS.chargeNurse) {
        return CARE_DROID_SCREEN_MODES.chargeNurse;
      }
      if (emergencyRole.role === EMERGENCY_ROLE_IDS.physician) {
        return CARE_DROID_SCREEN_MODES.physician;
      }
      if (emergencyRole.role === EMERGENCY_ROLE_IDS.registrationClerk) {
        return CARE_DROID_SCREEN_MODES.registration;
      }
      return (
        resolveConfiguredMode(emergencySettings.defaultScreenMode) ||
        CARE_DROID_SCREEN_MODES.commandCenter
      );
    }

    return (
      resolveConfiguredMode(emergencySettings.defaultScreenMode) ||
      CARE_DROID_SCREEN_MODES.chargeNurse
    );
  }, [
    emergencyRole.readOnly,
    emergencyRole.role,
    emergencySettings.defaultScreenMode,
    emergencySettings.readOnlyDisplayMode,
    location.pathname,
    searchParams,
  ]);
}

export default useRouteScreenMode;
