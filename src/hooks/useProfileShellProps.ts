import useEffectiveUserProfile from './useEffectiveUserProfile';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { resolveUserProfileCopy } from '../config/userProfileCopyModel';
import type { ProfileCopyStack } from '../config/userProfileCopyModel';
import type { UserProfileAccessSummary } from '../config/userProfileCatalog';

export type ProfileShellProps = {
  accessSummary: UserProfileAccessSummary | null;
  profileCopy: ProfileCopyStack;
};

export default function useProfileShellProps(): ProfileShellProps {
  const { accessSummary } = useUserIdentity();
  const { accessSummary: hookAccessSummary, profileCopy: hookProfileCopy } = useEffectiveUserProfile();
  const resolvedAccessSummary = accessSummary || hookAccessSummary;
  const profileCopy =
    hookProfileCopy ||
    resolveUserProfileCopy({
      saasRole: resolvedAccessSummary?.saasRole,
      emergencyRoleId: resolvedAccessSummary?.emergencyRole,
      accessSummary: resolvedAccessSummary,
    });

  return {
    accessSummary: resolvedAccessSummary,
    profileCopy,
  };
}
