import { useState, useCallback, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import type { CareDroidUserProfile, HospitalRole } from '../lib/users/userTypes';
import { DEMO_USERS, getDemoUserById, getDefaultDemoUser } from '../lib/users/demoUsers';
import { toEmergencyRoleId } from '../lib/users/roleAccess';
import { applyDemoRoleView } from '../config/demoPersonaModel';

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
  const { setUser } = useUser();
  const [profile, setProfile] = useState<CareDroidUserProfile>(resolveInitialDemoUser);

  useEffect(() => {
    const storedId = readStoredDemoUserId();
    if (storedId) {
      const stored = getDemoUserById(storedId);
      if (stored && stored.id !== profile.id) {
        setProfile(stored);
      }
    }
  }, []);

  const switchDemoUser = useCallback(
    (userId: string) => {
      const next = getDemoUserById(userId) ?? getDefaultDemoUser();
      setProfile(next);
      writeStoredDemoUserId(next.id);

      const emergencyRoleId = toEmergencyRoleId(next.role as HospitalRole);
      setUser(
        applyDemoRoleView(
          {
            id: next.id,
            email: next.email,
            authMode: 'open-access',
          },
          emergencyRoleId,
        ),
      );
    },
    [setUser],
  );

  const hasPermission = useCallback(
    (permission: string): boolean =>
      (profile.permissions as string[]).includes(permission),
    [profile.permissions],
  );

  return {
    profile,
    allDemoUsers: DEMO_USERS,
    switchDemoUser,
    hasPermission,
    can: hasPermission,
  };
}

export default useCareDroidUser;
