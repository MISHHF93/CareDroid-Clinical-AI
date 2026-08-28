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
