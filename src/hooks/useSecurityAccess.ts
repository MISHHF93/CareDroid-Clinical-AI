/**
 * Unified security access hook — composes emergency RBAC and compiled CareDroid profile.
 */

import { useMemo } from 'react';
import { useUser } from '../contexts/UserContext';
import { useEmergencyRolePermissions } from './useEmergencyRolePermissions';
import { compileCareDroidAccessProfile } from '../lib/users/canonicalAccess';
import { getDefaultDemoUser } from '../lib/users/demoUsers';
import {
  buildSecurityContextFromUser,
  canAccessPhi,
  checkAllPermissions,
  checkAnyPermission,
  checkPermission,
  type SecurityAccessContext,
} from '../config/security';
import type { PhiAccessAction } from '../config/security';

export type { SecurityAccessContext };

export function useSecurityAccess() {
  const { user } = useUser();
  const emergency = useEmergencyRolePermissions();

  const context = useMemo<SecurityAccessContext>(() => {
    const base = buildSecurityContextFromUser(user);
    const compiledProfile =
      emergency.compiledProfile ||
      base.compiledProfile ||
      compileCareDroidAccessProfile(getDefaultDemoUser());
    return {
      ...base,
      compiledProfile,
      emergencyRole: emergency.role || base.emergencyRole,
      permissionContext: emergency.permissionContext,
      readOnly: emergency.readOnly ?? base.readOnly,
    };
  }, [emergency.compiledProfile, emergency.permissionContext, emergency.readOnly, emergency.role, user]);

  return useMemo(
    () => ({
      context,
      role: emergency.role,
      hospitalRole: context.compiledProfile?.user?.role ?? null,
      roleLabel: emergency.roleLabel,
      readOnly: emergency.readOnly,
      compiledProfile: context.compiledProfile,
      landingRoute: emergency.landingRoute,
      nearestRoute: emergency.nearestRoute,
      can: (permission: string) => checkPermission(context, permission),
      canAny: (permissions: readonly string[]) => checkAnyPermission(context, permissions),
      canAll: (permissions: readonly string[]) => checkAllPermissions(context, permissions),
      canRoute: (path: string) => emergency.canAccessRoute(path),
      canMutate: (emergencyKey: string) => emergency.canMutate(emergencyKey),
      canAccessPhi: (action: PhiAccessAction = 'view') => canAccessPhi(context, action),
      emergency,
    }),
    [context, emergency],
  );
}

export default useSecurityAccess;