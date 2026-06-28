import { useMemo } from 'react';
import type { HospitalRole } from '../lib/users/userTypes';
import {
  getPermissionsForRole,
  hasCareDroidPermission,
  type CareDroidPermission,
} from '../lib/users/permissions';
import { isReadOnlyRole, isClinicalRole, isAdminRole } from '../lib/users/roleAccess';
import { useCareDroidUser } from './useCareDroidUser';

export type UseRolePermissionsResult = {
  role: HospitalRole;
  permissions: readonly CareDroidPermission[];
  can: (permission: CareDroidPermission) => boolean;
  canAny: (...permissions: CareDroidPermission[]) => boolean;
  canAll: (...permissions: CareDroidPermission[]) => boolean;
  isReadOnly: boolean;
  isClinical: boolean;
  isAdmin: boolean;
};

export function useRolePermissions(): UseRolePermissionsResult {
  const { profile } = useCareDroidUser();
  const role = profile.role;

  const permissions = useMemo(() => getPermissionsForRole(role), [role]);

  const can = useMemo(
    () =>
      (permission: CareDroidPermission): boolean =>
        hasCareDroidPermission(role, permission),
    [role],
  );

  const canAny = useMemo(
    () =>
      (...perms: CareDroidPermission[]): boolean =>
        perms.some((p) => hasCareDroidPermission(role, p)),
    [role],
  );

  const canAll = useMemo(
    () =>
      (...perms: CareDroidPermission[]): boolean =>
        perms.every((p) => hasCareDroidPermission(role, p)),
    [role],
  );

  return {
    role,
    permissions,
    can,
    canAny,
    canAll,
    isReadOnly: isReadOnlyRole(role),
    isClinical: isClinicalRole(role),
    isAdmin: isAdminRole(role),
  };
}

export default useRolePermissions;
