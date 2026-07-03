/**
 * @deprecated Prefer `useSecurityAccess` — this shim preserves hospital-role dashboard APIs.
 */
import { useMemo } from 'react';
import type { HospitalRole } from '../lib/users/userTypes';
import {
  getPermissionsForRole,
  type CareDroidPermission,
} from '../lib/users/permissions';
import { isReadOnlyRole, isClinicalRole, isAdminRole } from '../lib/users/roleAccess';
import useSecurityAccess from './useSecurityAccess';
import type { CompiledCareDroidAccessProfile } from '../lib/users/canonicalAccess';

export type UseRolePermissionsResult = {
  role: HospitalRole;
  permissions: readonly CareDroidPermission[];
  can: (permission: CareDroidPermission) => boolean;
  canAny: (...permissions: CareDroidPermission[]) => boolean;
  canAll: (...permissions: CareDroidPermission[]) => boolean;
  isReadOnly: boolean;
  isClinical: boolean;
  isAdmin: boolean;
  compiledProfile: CompiledCareDroidAccessProfile;
};

export function useRolePermissions(): UseRolePermissionsResult {
  const security = useSecurityAccess();
  const compiledProfile = security.compiledProfile!;
  const role = compiledProfile.user.role as HospitalRole;
  const permissions = useMemo(() => getPermissionsForRole(role), [role]);

  return {
    role,
    permissions,
    can: (permission) => security.can(permission),
    canAny: (...perms) => security.canAny(perms),
    canAll: (...perms) => security.canAll(perms),
    isReadOnly: security.readOnly ?? isReadOnlyRole(role),
    isClinical: isClinicalRole(role),
    isAdmin: isAdminRole(role),
    compiledProfile,
  };
}

export default useRolePermissions;