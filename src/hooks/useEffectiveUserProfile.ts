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
import { EMERGENCY_ROLE_IDS } from '../config/emergencyRolePermissions';

const KNOWN_EMERGENCY_ROLE_IDS = new Set<string>(Object.values(EMERGENCY_ROLE_IDS));

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

    // HEAL-323: saasProfile.role can hold a real EMERGENCY_ROLE_ID directly
    // (HEAL-195 made this dynamic -- e.g. 'charge_nurse' for the switched
    // demo persona), but SAAS_USER_ROLES/the profile catalog only recognize
    // a coarser, separate clinical-tier vocabulary (no 1:1 entry for most
    // hospital roles). accessSummary.emergencyRole below is derived by
    // round-tripping saasRole through that coarser catalog -- e.g.
    // 'charge_nurse' normalizes to the generic 'nurse' saasRole, whose
    // catalog entry hardcodes emergencyRoleId 'triage_nurse', silently
    // losing the real distinction (confirmed live: a charge_nurse persona's
    // account-menu badge showed "Triage lane"). Prefer the already-correct
    // raw value when it's a real emergency role id -- exactly the same
    // "prefer the dynamic value, don't round-trip it" fix HEAL-195 already
    // applied one layer up.
    const rawEmergencyRoleId = KNOWN_EMERGENCY_ROLE_IDS.has(saasRole) ? saasRole : null;

    const profileCopy = resolveUserProfileCopy({
      saasRole: effectiveProfile.saasRole,
      emergencyRoleId: rawEmergencyRoleId || accessSummary.emergencyRole,
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
