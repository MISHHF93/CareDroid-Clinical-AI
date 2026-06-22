import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import {
  canAccessEmergencyRoute,
  canMutateEmergencySurface,
  canPerformEmergencyAction,
  getEmergencyDemoRoles,
  getEmergencyRoleDefinition,
  getNearestEmergencyRoute,
  hasEmergencyActionPermission,
  isEmergencyReadOnlyRole,
  listPermissionsForRole,
  normalizeEmergencyRole,
  resolveEmergencyRoleId,
} from '../config/emergencyRolePermissions';
import {
  getDefaultScreenModeForRole,
  getPersonaLabelForRole,
} from '../config/emergencyRoleScreenMatrix';
import {
  presentEmergencyRoleAction,
  resolveEmergencyRoleActionState,
  isEmergencyActionEnabled,
  isEmergencyActionReadOnly,
  isEmergencyActionVisible,
} from '../config/emergencyRoleActionMatrix';
import { resolveRoleLandingRoute } from '../config/emergencyRoleNavigationModel';
import useEmergencyDeviceContext from './useEmergencyDeviceContext';
import useRouteScreenMode from './useRouteScreenMode';
import { useEmergencyStore } from '../store/emergencyStore';

export function useEmergencyRolePermissions() {
  const { user, setUser } = useUser();
  const [searchParams] = useSearchParams();
  const screenMode = useRouteScreenMode();
  const deviceContext = useEmergencyDeviceContext();
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
  const permissionContext = useMemo(
    () => ({
      screenMode,
      displayParam: searchParams.get('display'),
      readOnlyDisplayMode: emergencySettings?.readOnlyDisplayMode,
      roleReadOnly: isEmergencyReadOnlyRole(role),
    }),
    [emergencySettings?.readOnlyDisplayMode, role, screenMode, searchParams],
  );
  const landingRoute = useMemo(
    () =>
      resolveRoleLandingRoute({
        role: user?.role || user?.profile?.roleProfileId || role,
        emergencySettings,
        displayParam: searchParams.get('display'),
        readOnly: isEmergencyReadOnlyRole(role),
        deviceContextId: deviceContext.deviceContextId,
      }),
    [
      deviceContext.deviceContextId,
      emergencySettings,
      role,
      searchParams,
      user?.profile?.roleProfileId,
      user?.role,
    ],
  );

  return useMemo(
    () => ({
      role,
      roleLabel: roleDefinition.label,
      personaLabel: getPersonaLabelForRole(role),
      roleDescription: roleDefinition.description,
      readOnly: isEmergencyReadOnlyRole(role),
      defaultScreenMode: getDefaultScreenModeForRole(role),
      landingRoute,
      deviceContextId: deviceContext.deviceContextId,
      deviceContextLabel: deviceContext.definition?.label || null,
      isDeviceKiosk: deviceContext.isKiosk,
      allowedRoutes: roleDefinition.routes,
      allowedActions: listPermissionsForRole(role),
      defaultRoute: landingRoute,
      demoRoles: getEmergencyDemoRoles(),
      permissionContext,
      canAccessRoute: (path) => canAccessEmergencyRoute(role, path),
      nearestRoute: (path) => getNearestEmergencyRoute(role, path),
      can: (action, context = {}) =>
        hasEmergencyActionPermission(role, action, permissionsOverrides, {
          ...permissionContext,
          ...context,
        }),
      canDisplay: (permission, context = {}) =>
        hasEmergencyActionPermission(role, permission, permissionsOverrides, {
          ...permissionContext,
          ...context,
        }),
      canMutate: (action, context = {}) =>
        canPerformEmergencyAction(role, action, permissionsOverrides, {
          ...permissionContext,
          ...context,
        }),
      canMutateSurface: (context = {}) =>
        canMutateEmergencySurface(role, { ...permissionContext, ...context }),
      presentAction: (actionOrPermission, context = {}) =>
        presentEmergencyRoleAction(role, actionOrPermission, permissionsOverrides, {
          ...permissionContext,
          ...context,
        }),
      actionState: (actionOrPermission, context = {}) =>
        resolveEmergencyRoleActionState(role, actionOrPermission, permissionsOverrides, {
          ...permissionContext,
          ...context,
        }),
      actionVisible: (actionOrPermission, context = {}) =>
        isEmergencyActionVisible(
          resolveEmergencyRoleActionState(role, actionOrPermission, permissionsOverrides, {
            ...permissionContext,
            ...context,
          }),
        ),
      actionEnabled: (actionOrPermission, context = {}) =>
        isEmergencyActionEnabled(
          resolveEmergencyRoleActionState(role, actionOrPermission, permissionsOverrides, {
            ...permissionContext,
            ...context,
          }),
        ),
      actionReadOnly: (actionOrPermission, context = {}) =>
        isEmergencyActionReadOnly(
          resolveEmergencyRoleActionState(role, actionOrPermission, permissionsOverrides, {
            ...permissionContext,
            ...context,
          }),
        ),
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
    [deviceContext.definition?.label, deviceContext.deviceContextId, deviceContext.isKiosk, emergencySettings, landingRoute, permissionContext, permissionsOverrides, role, roleDefinition, setUser, user],
  );
}

export default useEmergencyRolePermissions;
