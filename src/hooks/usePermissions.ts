import { useRolePermissions, type UseRolePermissionsResult } from './useRolePermissions';

export type UsePermissionsResult = UseRolePermissionsResult;

export function usePermissions(): UsePermissionsResult {
  return useRolePermissions();
}

export default usePermissions;
