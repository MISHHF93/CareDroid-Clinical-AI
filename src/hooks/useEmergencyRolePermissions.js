import { useMemo } from 'react';
import { useUser } from '../contexts/UserContext';
import {
  canAccessEmergencyRoute,
  getEmergencyDemoRoles,
  getEmergencyRoleDefinition,
  getNearestEmergencyRoute,
  hasEmergencyActionPermission,
  isEmergencyReadOnlyRole,
  normalizeEmergencyRole,
  resolveEmergencyRoleId,
} from '../config/emergencyRolePermissions';
import { useEmergencyStore } from '../store/emergencyStore';

export function useEmergencyRolePermissions() {
  const { user, setUser } = useUser();
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);
  const permissionsOverrides = useMemo(
    () =>
      emergencySettings?.permissionsOverrides ||
      emergencySettings?.roles?.permissionsOverrides ||
      {},
    [emergencySettings],
  );
  const role = useMemo(
    () => resolveEmergencyRoleId(user, emergencySettings),
    [user, emergencySettings],
  );
  const roleDefinition = getEmergencyRoleDefinition(role);

  return useMemo(
    () => ({
      role,
      roleLabel: roleDefinition.label,
      roleDescription: roleDefinition.description,
      readOnly: isEmergencyReadOnlyRole(role),
      allowedRoutes: roleDefinition.routes,
      allowedActions: roleDefinition.actions,
      defaultRoute: roleDefinition.defaultRoute,
      demoRoles: getEmergencyDemoRoles(),
      canAccessRoute: (path) => canAccessEmergencyRoute(role, path),
      nearestRoute: (path) => getNearestEmergencyRoute(role, path),
      can: (action) => hasEmergencyActionPermission(role, action, permissionsOverrides),
      switchDemoRole: (nextRole) => {
        const normalizedRole = normalizeEmergencyRole(nextRole);
        setUser({
          ...user,
          role: normalizedRole,
          profile: {
            ...(user?.profile || {}),
            roleProfileId: normalizedRole,
          },
        });
      },
    }),
    [permissionsOverrides, role, roleDefinition, setUser, user],
  );
}

export default useEmergencyRolePermissions;
