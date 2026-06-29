import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import useEmergencyRolePermissions from './useEmergencyRolePermissions';
import {
  MANUAL_PLATFORM_INTRO,
  MANUAL_PATIENT_JOURNEY,
  MANUAL_SHORTCUTS,
  resolveManualTopicForPath,
  resolveRolePlaybook,
  listTopicsForRole,
  getManualTopicById,
  type ManualTopic,
} from '../config/userManual.config';

export function useContextualHelp(topicIdOverride?: string | null) {
  const location = useLocation();
  const emergencyRole = useEmergencyRolePermissions();

  return useMemo(() => {
    const pageTopic =
      (topicIdOverride ? getManualTopicById(topicIdOverride) : undefined) ||
      resolveManualTopicForPath(location.pathname);
    const hospitalRole = emergencyRole.compiledProfile?.role?.hospitalRole;
    const rolePlaybook =
      (hospitalRole ? resolveRolePlaybook(hospitalRole) : undefined) ||
      resolveRolePlaybook(emergencyRole.role);
    const roleTopics = listTopicsForRole(hospitalRole || emergencyRole.role);

    return {
      intro: MANUAL_PLATFORM_INTRO,
      journey: MANUAL_PATIENT_JOURNEY,
      shortcuts: MANUAL_SHORTCUTS,
      pageTopic,
      rolePlaybook,
      roleTopics,
      roleId: hospitalRole || emergencyRole.role,
      roleLabel: emergencyRole.roleLabel,
      pathname: location.pathname,
    };
  }, [
    emergencyRole.compiledProfile?.role?.hospitalRole,
    emergencyRole.role,
    emergencyRole.roleLabel,
    location.pathname,
    topicIdOverride,
  ]);
}

export type ContextualHelp = ReturnType<typeof useContextualHelp>;
export type { ManualTopic };
