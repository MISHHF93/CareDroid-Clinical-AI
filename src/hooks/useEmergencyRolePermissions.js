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
} from '../config/emergencyRolePermissions';

export function useEmergencyRolePermissions() {
  const { user, setUser } = useUser();
  const role = normalizeEmergencyRole(user?.role);
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
      can: (action) => hasEmergencyActionPermission(role, action),
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
    [role, roleDefinition, setUser, user],
  );
}

export default useEmergencyRolePermissions;
