import { useMemo } from 'react';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import {
  buildUserProfileAccessSummary,
  resolveUserProfileFromSaasRole,
  type ResolvedUserProfile,
  type UserProfileAccessSummary,
} from '../config/userProfileCatalog';
import {
  resolveUserProfileCopy,
  type ProfileCopyStack,
} from '../config/userProfileCopyModel';

export type EffectiveUserProfileState = {
  saasRole: string;
  effectiveProfile: ResolvedUserProfile | null;
  accessSummary: UserProfileAccessSummary | null;
  profileCopy: ProfileCopyStack;
  canPersonalizeTools: boolean;
};

export function useEffectiveUserProfile(): EffectiveUserProfileState {
  const { saasProfile, operationalProfile: _operationalProfile } = useUserIdentity();
  const operationalProfile = _operationalProfile as {
    effectiveProfile?: ResolvedUserProfile | null;
    accessSummary?: UserProfileAccessSummary | null;
  } | null;

  return useMemo(() => {
    const apiEffective = operationalProfile?.effectiveProfile;
    const apiSummary = operationalProfile?.accessSummary;
    const saasRole = saasProfile?.role || 'student';

    const effectiveProfile = apiEffective
      ? resolveUserProfileFromSaasRole(apiEffective.saasRole || saasRole)
      : resolveUserProfileFromSaasRole(saasRole);

    const accessSummary =
      apiSummary ||
      buildUserProfileAccessSummary(effectiveProfile.saasRole);

    const profileCopy = resolveUserProfileCopy({
      saasRole: effectiveProfile.saasRole,
      emergencyRoleId: accessSummary.emergencyRole,
      accessSummary,
    });

    return {
      saasRole: effectiveProfile.saasRole,
      effectiveProfile,
      accessSummary,
      profileCopy,
      canPersonalizeTools: true,
    };
  }, [operationalProfile?.accessSummary, operationalProfile?.effectiveProfile, saasProfile?.role]);
}

export default useEffectiveUserProfile;
