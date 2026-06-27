import { useMemo } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useEffectiveUserProfile from '../hooks/useEffectiveUserProfile';
import { useUser } from '../contexts/UserContext';
import { resolvePlatformLanding } from '../config/platformEntryModel';
import { isStrictSaasEntitlementsEnabled, getPlatformEntitlementContext } from '../data/assetEntitlements';
import { compileUserProfile, isRouteAllowedInCompiledProfile } from '../config/userProfileCompiler';
import { expandEntitlementPacksToCatalogPacks } from '../config/profilePackTaxonomy';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';

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

export default function ProfileRouteGuard({ children }) {
  const location = useLocation();
  const { authMode, saasProfile } = useUser();
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
    authMode === 'open-access' ||
    isExemptProfileRoute(pathname) ||
    emergencyRole.canAccessRoute(pathname)
  ) {
    return children;
  }

  if (
    entitlementContext?.organization?.organizationType &&
    !compiled.assignableForOrg
  ) {
    const destination = resolvePlatformLanding({
      authMode,
      saasRole: 'student',
      onboardingStatus: saasProfile?.onboardingStatus,
    });
    return <Navigate to={destination} replace state={{ profileAccessDenied: true }} />;
  }

  if (!isRouteAllowedInCompiledProfile(pathname, compiled)) {
    const destination =
      resolvePlatformLanding({
        authMode,
        saasRole,
        onboardingStatus: saasProfile?.onboardingStatus,
      }) || compiled.routes.home || compiled.routes.allowed[0] || '/emergency/reception';

    return (
      <Navigate
        to={destination}
        replace
        state={{ profileAccessDenied: true, requestedPath: pathname }}
      />
    );
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
      const destination = resolvePlatformLanding({
        authMode,
        saasRole,
        onboardingStatus: saasProfile?.onboardingStatus,
      });
      return <Navigate to={destination} replace state={{ entitlementDenied: true }} />;
    }
  }

  return children;
}
