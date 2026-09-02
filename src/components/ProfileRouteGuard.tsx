import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import useEffectiveUserProfile from '../hooks/useEffectiveUserProfile';
import { useUser } from '../contexts/UserContext';
import { resolvePlatformLanding } from '../config/platformEntryModel';
import { isStrictSaasEntitlementsEnabled, getPlatformEntitlementContext } from '../data/assetEntitlements';
import { compileUserProfile, isRouteAllowedInCompiledProfile } from '../config/userProfileCompiler';
import { expandEntitlementPacksToCatalogPacks } from '../config/profilePackTaxonomy';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import { getRoleLabel } from '../lib/users/roleAccess';
import AccessDeniedPanel from './auth/AccessDeniedPanel';
import { CANONICAL_APP_ROUTE_TREE, IN_SHELL_ROUTE_REDIRECTS } from '../config/routes.config';

const PROFILE_ROUTE_EXEMPT_PREFIXES = Object.freeze([
  '/auth',
  '/welcome',
  '/start',
  '/profile',
]);

function isExemptProfileRoute(pathname) {
  return PROFILE_ROUTE_EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * In-shell redirect aliases render a <Navigate> and nothing else, so there is
 * no content here to protect -- the destination is guarded on arrival, one
 * render later. This guard wraps every route under RootLayout though, so it
 * used to evaluate the alias path itself and deny it whenever that path was
 * absent from PERMISSION_ROUTE_MAP, killing the redirect before it could run.
 * Live-reproduced 2026-09-02: a real dev-bypass physician session that could
 * open /emergency/whiteboard, /reception, /patients and /ems was told it did
 * not have access to bare /emergency, the alias forwarding to reception.
 * /marketplace, /vehicle, /protocols and /lab were the same bug, each patched
 * by adding the alias to PERMISSION_ROUTE_MAP one at a time.
 *
 * Exempting the alias here fixes the class at its source instead. It is
 * deliberately an exact-match Set and not one of the prefix rules above:
 * canAccessRoute matches by prefix (canonicalAccess.ts:492), so putting bare
 * '/emergency' into a permission bucket -- or exempting it as a prefix --
 * would hand every '/emergency/*' route to anyone holding that permission. A
 * registration-clerk would silently gain the physician whiteboard.
 */
const REDIRECT_ALIAS_PATHS = Object.freeze(
  new Set([
    ...IN_SHELL_ROUTE_REDIRECTS.map((redirect) => redirect.path),
    // Both inventories declare redirects, and bare '/emergency' -- the one this
    // was found through -- lives only in this second one, so covering just the
    // first silently missed it.
    // `route.to !== route.path` drops the one self-redirect in the tree,
    // '/admin' -> '/admin'. That entry is a data error rather than a real
    // alias, and exempting a path that forwards to itself would skip the
    // permission check on it for no benefit.
    ...CANONICAL_APP_ROUTE_TREE.filter(
      (route) => route.type === 'redirect' && route.to && route.to !== route.path,
    ).map((route) => route.path),
  ]),
);

function isRedirectAliasRoute(pathname) {
  return REDIRECT_ALIAS_PATHS.has(pathname);
}

export default function ProfileRouteGuard({ children }) {
  const location = useLocation();
  const { authMode, saasProfile, isLoading } = useUser();
  const effectiveProfile = useEffectiveUserProfile();
  const emergencyRole = useEmergencyRolePermissions();
  const pathname = location.pathname;
  const saasRole = saasProfile?.role || saasProfile?.saasRole || effectiveProfile?.saasRole;
  const entitlementContext = getPlatformEntitlementContext();
  const compiled = useMemo(
    () =>
      compileUserProfile({
        saasRole,
        orgContext: entitlementContext?.organization?.organizationType
          ? {
              organizationType: entitlementContext.organization.organizationType,
              entitledPackIds: entitlementContext.entitledPackIds || [],
            }
          : undefined,
        entitlementContext,
      }),
    [entitlementContext, saasRole],
  );

  if (
    isLoading ||
    authMode === 'open-access' ||
    isExemptProfileRoute(pathname) ||
    isRedirectAliasRoute(pathname) ||
    emergencyRole.canAccessRoute(pathname)
  ) {
    return children;
  }

  const roleLabel = getRoleLabel(saasRole || 'this role');

  if (
    entitlementContext?.organization?.organizationType &&
    !compiled.assignableForOrg
  ) {
    const destination = resolvePlatformLanding({
      authMode,
      saasRole: 'student',
      onboardingStatus: saasProfile?.onboardingStatus,
    });
    return <AccessDeniedPanel roleLabel={roleLabel} fallbackPath={destination} />;
  }

  if (!isRouteAllowedInCompiledProfile(pathname, compiled)) {
    const destination =
      emergencyRole.landingRoute ||
      resolvePlatformLanding({
        authMode,
        saasRole,
        onboardingStatus: saasProfile?.onboardingStatus,
      }) || compiled.routes.home || compiled.routes.allowed[0] || '/emergency/reception';

    return <AccessDeniedPanel roleLabel={roleLabel} fallbackPath={destination} />;
  }

  if (isStrictSaasEntitlementsEnabled(entitlementContext)) {
    const packIntersection = compiled.catalog.toolPolicy?.allowedPacks || [];
    const entitledPacks = new Set(
      expandEntitlementPacksToCatalogPacks(entitlementContext?.entitledPackIds || []),
    );
    if (
      packIntersection.length &&
      entitledPacks.size &&
      !packIntersection.some((pack) => entitledPacks.has(pack))
    ) {
      const destination =
        emergencyRole.landingRoute ||
        resolvePlatformLanding({
          authMode,
          saasRole,
          onboardingStatus: saasProfile?.onboardingStatus,
        });
      return (
        <AccessDeniedPanel
          roleLabel={roleLabel}
          fallbackPath={destination}
          message={`${roleLabel} isn't entitled to this CareDroid page under the organization's current packs.`}
        />
      );
    }
  }

  return children;
}
