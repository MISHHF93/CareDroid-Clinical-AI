import { useState, useCallback, useEffect, useMemo } from 'react';
import { useUser } from '../contexts/UserContext';
import type { CareDroidUserProfile } from '../lib/users/userTypes';
import { DEMO_USERS, getDemoUserById, getDefaultDemoUser } from '../lib/users/demoUsers';
import { applyDemoRoleView } from '../config/demoPersonaModel';
import { compileCareDroidAccessProfile, normalizeCareDroidProfile } from '../lib/users/canonicalAccess';
import {
  buildSecurityContextFromUser,
  checkPermission,
} from '../services/securityAccessService';

const STORAGE_KEY = 'cd_demo_user_id';

function readStoredDemoUserId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredDemoUserId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // storage unavailable
  }
}

function resolveInitialDemoUser(): CareDroidUserProfile {
  const storedId = readStoredDemoUserId();
  return (storedId ? getDemoUserById(storedId) : undefined) ?? getDefaultDemoUser();
}

export type UseCareDroidUserResult = {
  profile: CareDroidUserProfile;
  allDemoUsers: readonly CareDroidUserProfile[];
  switchDemoUser: (userId: string) => void;
  hasPermission: (permission: string) => boolean;
  can: (permission: string) => boolean;
};

export function useCareDroidUser(): UseCareDroidUserResult {
  const { user, setUser } = useUser();
  const [profile, setProfile] = useState<CareDroidUserProfile>(resolveInitialDemoUser);

  useEffect(() => {
    if (user?.caredroidProfile) {
      setProfile(normalizeCareDroidProfile(user.caredroidProfile as CareDroidUserProfile));
      return;
    }
    const storedId = readStoredDemoUserId();
    if (storedId) {
      const stored = getDemoUserById(storedId);
      if (stored && stored.id !== profile.id) {
        setProfile(stored);
      }
    }
  }, [profile.id, user?.caredroidProfile, user?.id]);

  const securityContext = useMemo(() => buildSecurityContextFromUser(user), [user]);

  const can = useCallback(
    (permission: string): boolean => checkPermission(securityContext, permission),
    [securityContext],
  );

  const switchDemoUser = useCallback(
    (userId: string) => {
      const next = getDemoUserById(userId) ?? getDefaultDemoUser();
      const compiled = compileCareDroidAccessProfile(next);
      setProfile(next);
      writeStoredDemoUserId(next.id);

      const emergencyRoleId = compiled.role.emergencyRoleId;
      const nextUser = applyDemoRoleView(
        {
          id: next.id,
          email: next.email,
          name: next.fullName,
          displayName: next.fullName,
          authMode: 'open-access',
          permissions: compiled.permissions,
          caredroidProfile: compiled.user,
          compiledAccessProfile: compiled,
          profile: {
            roleProfileId: compiled.role.roleProfileId,
            hospitalRole: compiled.role.hospitalRole,
            emergencyRoleId,
            saasRole: compiled.role.saasRole,
            backendRole: compiled.role.backendRole,
            organizationId: next.organizationId,
            networkId: next.networkId,
            hospitalSiteId: next.hospitalSiteId,
            departmentId: next.departmentId,
            unitId: next.unitId,
            department: next.department,
            hospitalSite: next.hospitalSite,
          },
        },
        emergencyRoleId,
      );
      setUser(nextUser);
      try {
        window.dispatchEvent(new CustomEvent('caredroid:demo-user-switched', { detail: compiled }));
      } catch {
        // no window/event target in tests
      }
    },
    [setUser],
  );

  return {
    profile,
    allDemoUsers: DEMO_USERS,
    switchDemoUser,
    hasPermission: can,
    can,
  };
}

export default useCareDroidUser;