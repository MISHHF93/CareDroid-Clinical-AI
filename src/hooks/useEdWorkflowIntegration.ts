import { useMemo } from 'react';
import { useUser } from '../contexts/UserContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { isDemoPersonaUser } from '../config/demoPersonaModel';
import {
  resolveNormalizedEdUserContext,
  summarizeBackendFrontendSync,
  type NormalizedEdUserContext,
} from '../config/edWorkflowIntegrationModel';
import { useEmergencyStore } from '../store/emergencyStore';

export type EdWorkflowIntegrationState = NormalizedEdUserContext & {
  backendSync: ReturnType<typeof summarizeBackendFrontendSync>;
};

export function useEdWorkflowIntegration(): EdWorkflowIntegrationState {
  const { user } = useUser();
  const { operationalProfile } = useUserIdentity();
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);
  const isDemo = isDemoPersonaUser(user);

  return useMemo(() => {
    const normalized = resolveNormalizedEdUserContext({
      user,
      operationalProfile,
      emergencySettings,
      isDemoPersona: isDemo,
    });
    return {
      ...normalized,
      backendSync: summarizeBackendFrontendSync(),
    };
  }, [emergencySettings, isDemo, operationalProfile, user]);
}

export default useEdWorkflowIntegration;
