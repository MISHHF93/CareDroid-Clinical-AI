import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
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
import { presentEmergencyPermission } from '../config/emergencyActionPresentationModel';
import { applyDemoRoleView, isDemoPersonaUser } from '../config/demoPersonaModel';
import { resolveRoleLandingRoute } from '../config/emergencyRoleNavigationModel';
import useEmergencyDeviceContext from './useEmergencyDeviceContext';
import useRouteScreenMode from './useRouteScreenMode';
import { useEmergencyStore } from '../store/emergencyStore';

export function useEmergencyRolePermissions() {
  const { user, setUser } = useUser();
  const { operationalProfile } = useUserIdentity();
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
  const roleSubject = useMemo(() => {
    if (isDemoPersonaUser(user)) return user;

    const effective = operationalProfile?.effectiveProfile;
    const access = operationalProfile?.accessSummary;
    if (!effective && !access) return user;

    const emergencyRoleId =
      access?.emergencyRole ||
      effective?.emergencyRoleId ||
      user?.profile?.roleProfileId;
    const saasRole = effective?.saasRole || access?.saasRole;

    return {
      ...user,
      role: emergencyRoleId || user?.role,
      profile: {
        ...(user?.profile || {}),
        roleProfileId: emergencyRoleId || saasRole || user?.profile?.roleProfileId,
      },
    };
  }, [operationalProfile?.accessSummary, operationalProfile?.effectiveProfile, user]);

  const role = useMemo(
    () => resolveEmergencyRoleId(roleSubject, emergencySettings),
    [roleSubject, emergencySettings],
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
        role: roleSubject?.role || roleSubject?.profile?.roleProfileId || role,
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
      roleSubject?.profile?.roleProfileId,
      roleSubject?.role,
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
        presentEmergencyPermission(role, actionOrPermission, permissionsOverrides, {
          ...permissionContext,
          ...context,
        }),
      actionState: (actionOrPermission, context = {}) =>
        presentEmergencyPermission(role, actionOrPermission, permissionsOverrides, {
          ...permissionContext,
          ...context,
        }).state,
      actionVisible: (actionOrPermission, context = {}) =>
        presentEmergencyPermission(role, actionOrPermission, permissionsOverrides, {
          ...permissionContext,
          ...context,
        }).visible,
      actionEnabled: (actionOrPermission, context = {}) =>
        presentEmergencyPermission(role, actionOrPermission, permissionsOverrides, {
          ...permissionContext,
          ...context,
        }).enabled,
      actionReadOnly: (actionOrPermission, context = {}) =>
        presentEmergencyPermission(role, actionOrPermission, permissionsOverrides, {
          ...permissionContext,
          ...context,
        }).readOnly,
      switchDemoRole: (nextRole) => {
        const normalizedRole = normalizeEmergencyRole(nextRole);
        const nextUser = isDemoPersonaUser(user)
          ? applyDemoRoleView(user, normalizedRole)
          : {
              ...user,
              role: normalizedRole,
              profile: {
                ...(user?.profile || {}),
                roleProfileId: normalizedRole,
              },
            };
        setUser(nextUser);
      },
    }),
    [deviceContext.definition?.label, deviceContext.deviceContextId, deviceContext.isKiosk, emergencySettings, landingRoute, permissionContext, permissionsOverrides, role, roleDefinition, roleSubject, setUser, user],
  );
}

export default useEmergencyRolePermissions;
