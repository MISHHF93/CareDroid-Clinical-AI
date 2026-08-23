import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import {
  canMutateEmergencySurface,
  getEmergencyDemoRoles,
  getEmergencyRoleDefinition,
  getNearestEmergencyRoute,
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
  compileCareDroidAccessProfile,
  getCanonicalRoleMapping,
  normalizeCareDroidProfile,
  normalizeCanonicalEmergencyRole,
} from '../lib/users/canonicalAccess';
import {
  buildEmergencySecurityContext,
  checkEmergencyMutation,
  checkEmergencyPermission,
} from '../services/securityAccessService';
import { getDemoUserById, getDefaultDemoUser } from '../lib/users/demoUsers';
import { ensureDevBackendSession, isDev } from '../services/devBackendAuth';
import {
  beginTenantContextTransition,
  endTenantContextTransition,
} from '../services/tenantContextStore';

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
  const securityContext = useMemo(
    () =>
      buildEmergencySecurityContext({
        compiledProfile,
        emergencyRole: role,
        permissionsOverrides,
        permissionContext,
        readOnly: isEmergencyReadOnlyRole(role),
      }),
    [compiledProfile, permissionContext, permissionsOverrides, role],
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
      securityContext,
      can: (action, context: any = {}) => checkEmergencyPermission(securityContext, action, context),
      canDisplay: (permission, context: any = {}) =>
        checkEmergencyPermission(securityContext, permission, context),
      canMutate: (action, context: any = {}) => checkEmergencyMutation(securityContext, action, context),
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
      switchDemoRole: async (nextRole) => {
        // HEAL: found live -- switching roles left tenantContextStore's cached
        // `role` (used by apiClient.ts's getTenantHeaders() to build the
        // X-CareDroid-Role assertion header on every request) pointing at the
        // OLD persona until TenantContext.tsx's own effect finished a full
        // /api/tenant/context round-trip. ProfileRoleSwitcher navigates to the
        // new persona's landing route in the same tick (see its own comment:
        // "the backend session sync continues in the background and only
        // needs to land before the new screen's data requests fire") -- but
        // nothing enforced that ordering, so the new screen's mount-time
        // fetches raced the stale cache and got rejected with "Tenant role
        // header does not match authenticated user." (tenant-context.service.ts)
        // even though the client-side role switch had already visibly
        // succeeded. Confirmed live via Playwright: a burst of 403s
        // (analytics, reassessment, boarding, referrals, queues, ai/node,
        // central-node/snapshot...) immediately after switching to ed_manager.
        //
        // A first attempt just cleared the cache (hasRequiredTenantContext()
        // fails closed, no headers sent) and later re-applied the fresh
        // tenantContext from ensureDevBackendSession's own response once that
        // resolved -- but TenantContext.tsx's independent effect (re-fires on
        // this same `user` change, below) races that same window with its own
        // GET /api/tenant/context, and a plain GET routinely resolves *faster*
        // than the dev-session POST it's racing. Confirmed live: it kept
        // winning and repopulating the cache with the role the backend still
        // had *before* this switch's sync applied -- the 403s persisted.
        // beginTenantContextTransition() makes every OTHER setTenantContext()
        // caller (specifically that effect) a no-op until this switch calls
        // endTenantContextTransition() with its own guaranteed-fresh result,
        // so it can no longer win that race.
        const tenantTransitionToken = beginTenantContextTransition();
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
        // switchDemoRole only ever updated this client-side profile -- the
        // real backend JWT stayed pinned to whatever UserRole the dev-bypass
        // session was originally issued with (always UserRole.PHYSICIAN, see
        // auth.service.ts's createDevSession), so every persona actually hit
        // the API under fixed physician permissions regardless of which role
        // was selected here. Confirmed live: ed_manager 403'd on GET
        // /emergency/analytics and POST /operational-intelligence/evaluate,
        // both gated on permissions physician's fixed set lacks, silently
        // masked by a frontend "local analytics fallback". Sync the backend
        // session to match before any of the new persona's screens fire real
        // requests; dev-only (isDev), and errors here must never block the
        // (already-applied) client-side role switch.
        try {
          if (isDev) {
            const sessionResult = await ensureDevBackendSession({
              force: true,
              roleProfileId: normalizedRole,
            });
            // sessionResult.tenantContext is the dev-session response's own
            // tenantContext (already in the exact flat shape tenantContextStore
            // expects -- see auth.service.ts's ensureDevTenantForUser), built
            // from `user.role` strictly *after* the sync wrote it -- the one
            // guaranteed-fresh source, no second fetch or race possible.
            endTenantContextTransition(tenantTransitionToken, sessionResult?.tenantContext ?? null);
          } else {
            // No backend sync to wait for outside dev -- release the
            // transition immediately so TenantContext's own refresh (already
            // in flight from the `user` change above) can populate normally.
            endTenantContextTransition(tenantTransitionToken);
          }
        } catch {
          // best-effort: FE role state above is already updated regardless.
          // Still release the transition -- leaving it held forever would
          // permanently block every future tenant-context update, not just
          // this switch's.
          endTenantContextTransition(tenantTransitionToken, null);
        }
      },
    }),
    [compiledProfile, deviceContext.definition?.label, deviceContext.deviceContextId, deviceContext.isKiosk, emergencySettings, landingRoute, permissionContext, permissionsOverrides, role, roleDefinition, roleSubject, securityContext, setUser, user],
  );
}

export default useEmergencyRolePermissions;
