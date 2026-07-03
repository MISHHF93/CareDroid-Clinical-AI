import { useMemo } from 'react';
import useSecurityAccess from './useSecurityAccess';
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
  const { compiledProfile } = useSecurityAccess();
  const profile = compiledProfile!;

  const visibleScenarios = useMemo(
    () => getVisibleScenariosForRole(profile.role.hospitalRole),
    [profile.role.hospitalRole],
  );

  const canSeeScenario = useMemo(
    () => (scenario: AlertScenario) => isAlertVisibleToCompiledProfile(scenario, profile),
    [profile],
  );

  const getRoutingFor = useMemo(
    () => (scenario: AlertScenario) => getCanonicalAiRecommendationRoute(scenario, profile),
    [profile],
  );

  const filterByProfile = useMemo(
    () =>
      <T extends { scenario: AlertScenario }>(recommendations: T[]): T[] =>
        filterAiRecommendationsByProfile(recommendations, profile),
    [profile],
  );

  return { visibleScenarios, canSeeScenario, getRoutingFor, filterByProfile };
}

export default useAiChiefRouting;
