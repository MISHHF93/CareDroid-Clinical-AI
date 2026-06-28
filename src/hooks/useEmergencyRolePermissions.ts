import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import {
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
import {
  canAccessRoute as canAccessCanonicalRoute,
  canMutateWithCompiledProfile,
  compileCareDroidAccessProfile,
  getCanonicalRoleMapping,
  normalizeCareDroidProfile,
  normalizeCanonicalEmergencyRole,
} from '../lib/users/canonicalAccess';
import { getDemoUserById, getDefaultDemoUser } from '../lib/users/demoUsers';

export function useEmergencyRolePermissions() {
  const { user, setUser } = useUser();
  const { operationalProfile } = useUserIdentity();
  const [searchParams] = useSearchParams();
  const screenMode = useRouteScreenMode();
  const deviceContext = useEmergencyDeviceContext();
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);
  const permissionsOverrides = useMemo(
    () =>
      (emergencySettings as any)?.permissionsOverrides ||
      (emergencySettings as any)?.roles?.permissionsOverrides ||
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

  const compiledProfile = useMemo(() => {
    const attached = user?.compiledAccessProfile;
    if (attached?.user) return attached;
    const caredroidProfile = user?.caredroidProfile;
    if (caredroidProfile?.role) return compileCareDroidAccessProfile(caredroidProfile);
    const demoProfile = getDemoUserById(user?.id) || getDefaultDemoUser();
    return compileCareDroidAccessProfile(
      normalizeCareDroidProfile({
        ...demoProfile,
        role:
          (user?.profile?.hospitalRole as any) ||
          (user?.profile?.roleProfileId as any) ||
          (user?.role as any) ||
          demoProfile.role,
      }),
    );
  }, [user]);

  const role = useMemo(
    () =>
      normalizeCanonicalEmergencyRole(
        compiledProfile?.role?.hospitalRole ||
          roleSubject?.profile?.roleProfileId ||
          roleSubject?.role ||
          resolveEmergencyRoleId(roleSubject, emergencySettings),
      ),
    [compiledProfile?.role?.hospitalRole, roleSubject, emergencySettings],
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
      compiledProfile,
      canonicalProfile: compiledProfile.user,
      roleLabel: roleDefinition.label,
      personaLabel: getPersonaLabelForRole(role),
      roleDescription: roleDefinition.description,
      readOnly: isEmergencyReadOnlyRole(role),
      defaultScreenMode: getDefaultScreenModeForRole(role),
      landingRoute,
      deviceContextId: deviceContext.deviceContextId,
      deviceContextLabel: deviceContext.definition?.label || null,
      isDeviceKiosk: deviceContext.isKiosk,
      allowedRoutes: compiledProfile.routeAccess,
      allowedActions: listPermissionsForRole(role),
      defaultRoute: landingRoute,
      demoRoles: getEmergencyDemoRoles(),
      permissionContext,
      canAccessRoute: (path) => canAccessCanonicalRoute(compiledProfile, path),
      nearestRoute: (path) => getNearestEmergencyRoute(role, path),
      can: (action, context: any = {}) =>
        hasEmergencyActionPermission(role, action, permissionsOverrides, {
          ...permissionContext,
          ...context,
        }),
      canDisplay: (permission, context: any = {}) =>
        hasEmergencyActionPermission(role, permission, permissionsOverrides, {
          ...permissionContext,
          ...context,
        }),
      canMutate: (action, context: any = {}) =>
        canMutateWithCompiledProfile(compiledProfile, action) &&
        canPerformEmergencyAction(role, action, permissionsOverrides, {
          ...permissionContext,
          ...context,
        }),
      canMutateSurface: (context: any = {}) =>
        !compiledProfile.readOnly &&
        canMutateEmergencySurface(role, { ...permissionContext, ...context }),
      presentAction: (actionOrPermission, context: any = {}) =>
        presentEmergencyPermission(role, actionOrPermission, permissionsOverrides, {
          ...permissionContext,
          ...context,
        }),
      actionState: (actionOrPermission, context: any = {}) =>
        presentEmergencyPermission(role, actionOrPermission, permissionsOverrides, {
          ...permissionContext,
          ...context,
        }).state,
      actionVisible: (actionOrPermission, context: any = {}) =>
        presentEmergencyPermission(role, actionOrPermission, permissionsOverrides, {
          ...permissionContext,
          ...context,
        }).visible,
      actionEnabled: (actionOrPermission, context: any = {}) =>
        presentEmergencyPermission(role, actionOrPermission, permissionsOverrides, {
          ...permissionContext,
          ...context,
        }).enabled,
      actionReadOnly: (actionOrPermission, context: any = {}) =>
        presentEmergencyPermission(role, actionOrPermission, permissionsOverrides, {
          ...permissionContext,
          ...context,
        }).readOnly,
      switchDemoRole: (nextRole) => {
        const normalizedRole = normalizeEmergencyRole(nextRole);
        const nextMapping = getCanonicalRoleMapping(nextRole);
        const nextProfile = normalizeCareDroidProfile({
          ...compiledProfile.user,
          role: nextMapping.hospitalRole,
          emergencyRoleId: nextMapping.emergencyRoleId,
          saasRole: nextMapping.saasRole,
          backendRole: nextMapping.backendRole,
          roleProfileId: nextMapping.roleProfileId,
        });
        const nextCompiledProfile = compileCareDroidAccessProfile(nextProfile);
        const nextUser = isDemoPersonaUser(user)
          ? applyDemoRoleView(
              {
                ...user,
                caredroidProfile: nextProfile,
                compiledAccessProfile: nextCompiledProfile,
                permissions: nextCompiledProfile.permissions,
                profile: {
                  ...(user?.profile || {}),
                  hospitalRole: nextMapping.hospitalRole,
                  roleProfileId: nextMapping.roleProfileId,
                  emergencyRoleId: nextMapping.emergencyRoleId,
                  saasRole: nextMapping.saasRole,
                  backendRole: nextMapping.backendRole,
                },
              },
              normalizedRole,
            )
          : {
              ...user,
              role: normalizedRole,
              caredroidProfile: nextProfile,
              compiledAccessProfile: nextCompiledProfile,
              permissions: nextCompiledProfile.permissions,
              profile: {
                ...(user?.profile || {}),
                hospitalRole: nextMapping.hospitalRole,
                roleProfileId: nextMapping.roleProfileId,
                emergencyRoleId: nextMapping.emergencyRoleId,
                saasRole: nextMapping.saasRole,
                backendRole: nextMapping.backendRole,
              },
            };
        setUser(nextUser);
      },
    }),
    [compiledProfile, deviceContext.definition?.label, deviceContext.deviceContextId, deviceContext.isKiosk, emergencySettings, landingRoute, permissionContext, permissionsOverrides, role, roleDefinition, roleSubject, setUser, user],
  );
}

export default useEmergencyRolePermissions;
