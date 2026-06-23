import { useMemo } from 'react';
import { getPlatformEntitlementContext } from '../data/assetEntitlements';
import { compileUserProfile, type CompiledUserProfile } from '../config/userProfileCompiler';
import useEffectiveUserProfile from './useEffectiveUserProfile';

export function useCompiledUserProfile(
  orgContext?: { organizationType?: string | null; entitledPackIds?: readonly string[] },
): CompiledUserProfile {
  const { saasRole, effectiveProfile } = useEffectiveUserProfile();
  const platformContext = getPlatformEntitlementContext();

  return useMemo(
    () =>
      compileUserProfile({
        saasRole: effectiveProfile?.saasRole || saasRole,
        orgContext: {
          organizationType:
            orgContext?.organizationType ||
            platformContext?.organization?.type ||
            'hospital',
          entitledPackIds:
            orgContext?.entitledPackIds ||
            platformContext?.entitledPackIds ||
            [],
        },
        entitlementContext: platformContext,
      }),
    [
      effectiveProfile?.saasRole,
      orgContext?.entitledPackIds,
      orgContext?.organizationType,
      platformContext,
      saasRole,
    ],
  );
}

export default useCompiledUserProfile;
