import { useMemo } from 'react';
import { useRolePermissions } from './useRolePermissions';
import {
  type AlertScenario,
  type AiRecommendationRoute,
  filterAiRecommendationsByProfile,
  getCanonicalAiRecommendationRoute,
  getVisibleScenariosForRole,
  isAlertVisibleToCompiledProfile,
} from '../lib/users/aiChiefRouting';

export type UseAiChiefRoutingResult = {
  visibleScenarios: AlertScenario[];
  canSeeScenario: (scenario: AlertScenario) => boolean;
  getRoutingFor: (scenario: AlertScenario) => AiRecommendationRoute;
  filterByProfile: <T extends { scenario: AlertScenario }>(recommendations: T[]) => T[];
};

export function useAiChiefRouting(): UseAiChiefRoutingResult {
  const { compiledProfile } = useRolePermissions();

  const visibleScenarios = useMemo(
    () => getVisibleScenariosForRole(compiledProfile.role.hospitalRole),
    [compiledProfile.role.hospitalRole],
  );

  const canSeeScenario = useMemo(
    () => (scenario: AlertScenario) => isAlertVisibleToCompiledProfile(scenario, compiledProfile),
    [compiledProfile],
  );

  const getRoutingFor = useMemo(
    () => (scenario: AlertScenario) => getCanonicalAiRecommendationRoute(scenario, compiledProfile),
    [compiledProfile],
  );

  const filterByProfile = useMemo(
    () =>
      <T extends { scenario: AlertScenario }>(recommendations: T[]): T[] =>
        filterAiRecommendationsByProfile(recommendations, compiledProfile),
    [compiledProfile],
  );

  return { visibleScenarios, canSeeScenario, getRoutingFor, filterByProfile };
}

export default useAiChiefRouting;
