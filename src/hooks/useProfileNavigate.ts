import { useCallback } from 'react';
import { useNavigate, type NavigateFunction, type To } from 'react-router-dom';
import { navigateProfileAware } from '../navigation/profileRouteLaunch';
import { useEmergencyRolePermissions } from './useEmergencyRolePermissions';
import useEffectiveUserProfile from './useEffectiveUserProfile';

export type ProfileNavigateOptions = Readonly<{
  replace?: boolean;
  state?: unknown;
  saasRole?: string;
  emergencyRole?: ReturnType<typeof useEmergencyRolePermissions>;
}>;

export type ProfileNavigate = (
  to: To,
  options?: Omit<ProfileNavigateOptions, 'saasRole' | 'emergencyRole'>,
) => ReturnType<typeof navigateProfileAware>;

export function useProfileNavigate(): {
  profileNavigate: ProfileNavigate;
  rawNavigate: NavigateFunction;
  saasRole: string;
} {
  const rawNavigate = useNavigate();
  const emergencyRole = useEmergencyRolePermissions();
  const { saasRole } = useEffectiveUserProfile();

  const profileNavigate = useCallback<ProfileNavigate>(
    (to, options = {}) =>
      navigateProfileAware(rawNavigate, to, {
        saasRole,
        emergencyRole,
        ...options,
      }),
    [emergencyRole, rawNavigate, saasRole],
  );

  return { profileNavigate, rawNavigate, saasRole };
}

export default useProfileNavigate;
