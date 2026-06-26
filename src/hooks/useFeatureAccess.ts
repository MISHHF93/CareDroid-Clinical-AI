import { useMemo } from 'react';
import { useOrganizationContext } from '../contexts/OrganizationContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { evaluateFeatureAccess } from '../services/featureFlagService';
import useFeature from './useFeature';

export function useFeatureAccess(featureId) {
  const { enabled: storeEnabled } = useFeature(featureId);
  const { organization } = useOrganizationContext() || {};
  const { identity } = ((useUserIdentity() || {}) as any);

  const access = useMemo(
    () =>
      evaluateFeatureAccess(featureId, {
        organization,
        tenant: organization,
        role: identity?.role || identity?.saasRole,
        saasRole: identity?.saasRole || identity?.role,
        subscriptionPlan: organization?.subscriptionPlan,
        entitledPackIds: organization?.entitledPackIds || [],
        featureFlagOverrides: organization?.settings?.featureFlagOverrides,
      }),
    [featureId, identity?.role, identity?.saasRole, organization],
  );

  return {
    ...access,
    enabled: storeEnabled && access.enabled,
  };
}

export default useFeatureAccess;