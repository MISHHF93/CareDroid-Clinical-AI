import { useMemo, useCallback } from 'react';
import { useUser } from '../contexts/UserContext';
import {
  buildTrackMindRoleContext,
  canAccessTrackMindSurface,
  canPerformTrackMindMutation,
  getNearestTrackMindRoute,
  getTrackMindDemoRoles,
  getTrackMindRoleDefinition,
  getTrackMindRoleSummary,
  hasTrackMindActionPermission,
  isTrackMindReadOnlyRole,
  listTrackMindPermissionsForRole,
  listTrackMindRoutesForRole,
  resolveTrackMindRoleId,
} from '../config/trackMindRolePermissions';
import { resolveTrackMindRoleLandingRoute } from '../config/trackMindRoleNavigationModel';
import {
  filterWorkspaceKpiKeys,
  filterWorkspaceQuickActions,
  getTrackMindWorkspaceDefinition,
} from '../config/trackMindWorkspaceModel';
import { resolveTrackMindKpisForRole } from '../config/trackMindKpiPolicy';
import { resolveTrackMindNotificationChannels } from '../config/trackMindNotificationPolicy';
import {
  canViewTrackMindPrivacyScope,
  canViewTrackMindSensitivity,
} from '../config/trackMindPrivacyScope';
import {
  canViewTrackMindAuditArtifact,
  canExportTrackMindAudit,
} from '../config/trackMindAuditVisibility';
import { canAccessTrackMindEntityCapability } from '../config/trackMindEntityVisibility';
import type {
  TrackMindEntityCapability,
  TrackMindEntityId,
} from '../config/trackMindEntityVisibility';
import type { TrackMindPrivacyScope } from '../config/trackMindPrivacyScope';
import type { TrackMindAuditArtifact } from '../config/trackMindAuditVisibility';

export function useTrackMindRolePermissions() {
  const { user, setUser } = useUser();

  const role = useMemo(() => resolveTrackMindRoleId(user), [user]);
  const roleDefinition = useMemo(() => getTrackMindRoleDefinition(role), [role]);
  const workspace = useMemo(() => getTrackMindWorkspaceDefinition(role), [role]);
  const permissionContext = useMemo(() => buildTrackMindRoleContext(role), [role]);
  const landingRoute = useMemo(() => resolveTrackMindRoleLandingRoute(role), [role]);

  const can = useCallback(
    (permission: string) => hasTrackMindActionPermission(role, permission, {}, permissionContext),
    [permissionContext, role],
  );

  const canMutate = useCallback(
    (permission: string) => canPerformTrackMindMutation(role, permission, {}, permissionContext),
    [permissionContext, role],
  );

  return useMemo(
    () => ({
      role,
      roleLabel: roleDefinition.label,
      roleDescription: roleDefinition.description,
      readOnly: isTrackMindReadOnlyRole(role),
      primaryScope: roleDefinition.primaryScope,
      landingRoute,
      workspace,
      allowedRoutes: listTrackMindRoutesForRole(role),
      allowedPermissions: listTrackMindPermissionsForRole(role),
      demoRoles: getTrackMindDemoRoles(),
      permissionContext,
      canAccessRoute: (path: string) =>
        canAccessTrackMindSurface(role, path, {}, permissionContext),
      nearestRoute: (path: string) => getNearestTrackMindRoute(role, path),
      can,
      canMutate,
      kpis: resolveTrackMindKpisForRole(role, can),
      quickActions: filterWorkspaceQuickActions(role, can),
      kpiPermissionKeys: filterWorkspaceKpiKeys(role, can),
      notificationChannels: resolveTrackMindNotificationChannels(role, can),
      canViewPrivacyScope: (scope: TrackMindPrivacyScope) =>
        canViewTrackMindPrivacyScope(role, scope),
      canViewSensitivity: (sensitivity: string) => canViewTrackMindSensitivity(role, sensitivity),
      canViewAuditArtifact: (artifact: TrackMindAuditArtifact) =>
        canViewTrackMindAuditArtifact(role, artifact),
      canExportAudit: () => canExportTrackMindAudit(role, can),
      canEntity: (entity: TrackMindEntityId, capability: TrackMindEntityCapability) =>
        canAccessTrackMindEntityCapability(role, entity, capability),
      summary: getTrackMindRoleSummary(role),
      setDemoRole: (nextRole: string) => {
        if (!setUser || !user) return;
        (setUser as (u: object) => void)({ ...(user as object), trackMindRole: nextRole });
      },
    }),
    [can, canMutate, landingRoute, permissionContext, role, roleDefinition, setUser, workspace],
  );
}

export default useTrackMindRolePermissions;
