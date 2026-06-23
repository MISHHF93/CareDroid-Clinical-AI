/**
 * Profile- and entitlement-aware navigation — use instead of raw navigate() for product surfaces.
 */
import { CANONICAL_ROUTES } from '../config/routes.config';
import { isRouteAllowedForProfile, resolveUserProfileFromSaasRole } from '../config/userProfileCatalog';
import { resolvePlatformLanding } from '../config/platformEntryModel';
import {
  getPlatformEntitlementContext,
  isStrictSaasEntitlementsEnabled,
} from '../data/assetEntitlements';
import { isProfileAssignableForOrganization } from '../config/userProfileSegregation';

function normalizePath(to) {
  if (typeof to === 'string') return to.split('?')[0];
  if (to && typeof to === 'object' && to.pathname) return String(to.pathname).split('?')[0];
  return '';
}

export function resolveProfileRouteLaunchAccess(path, options = {}) {
  const context = options.context || getPlatformEntitlementContext();
  const saasRole =
    options.saasRole ||
    context?.roleProfile?.id ||
    context?.membership?.roleProfileId ||
    context?.saasRole ||
    'student';
  const profile = resolveUserProfileFromSaasRole(saasRole);
  const pathname = normalizePath(path);

  if (
    context?.organization?.organizationType &&
    !isProfileAssignableForOrganization(profile, {
      organizationType: context.organization.organizationType,
      entitledPackIds: context.entitledPackIds || [],
    })
  ) {
    return {
      allowed: false,
      reason: 'profile-org-mismatch',
      redirectTo: resolvePlatformLanding({ saasRole: 'student' }),
    };
  }

  if (!isRouteAllowedForProfile(profile, pathname)) {
    return {
      allowed: false,
      reason: 'profile-route-denied',
      redirectTo:
        resolvePlatformLanding({ saasRole }) ||
        profile.navigationRoutes[0] ||
        CANONICAL_ROUTES.emergencyReception,
    };
  }

  if (isStrictSaasEntitlementsEnabled(context)) {
    const allowedPacks = profile.toolPolicy?.allowedPacks || [];
    const entitledPacks = new Set(context?.entitledPackIds || []);
    if (
      allowedPacks.length &&
      entitledPacks.size &&
      !allowedPacks.some((pack) => entitledPacks.has(pack))
    ) {
      return {
        allowed: false,
        reason: 'entitlement-pack-denied',
        redirectTo: resolvePlatformLanding({ saasRole }),
      };
    }
  }

  return { allowed: true, reason: null, redirectTo: null };
}

/**
 * @param {import('react-router-dom').NavigateFunction} navigate
 * @param {import('react-router-dom').To} to
 * @param {{ replace?: boolean; state?: unknown; saasRole?: string; context?: object }} [options]
 */
export function navigateWithProfileAccess(navigate, to, options = {}) {
  const access = resolveProfileRouteLaunchAccess(to, options);
  if (!access.allowed) {
    navigate(
      {
        pathname: access.redirectTo || CANONICAL_ROUTES.emergencyReception,
        search: `?access=${encodeURIComponent(access.reason || 'denied')}`,
      },
      { replace: options.replace !== false, state: { accessDenied: access.reason, ...(options.state || {}) } },
    );
    return access;
  }
  navigate(to, { replace: options.replace, state: options.state });
  return access;
}

/**
 * Combines emergency-role nearest-route guard with SaaS profile bottleneck.
 * @param {import('react-router-dom').To} path
 */
export function resolveProfileAwareDestination(path, options = {}) {
  const emergencyRole = options.emergencyRole;
  let target = path;
  const permissionPath = normalizePath(path);

  if (emergencyRole?.canAccessRoute) {
    target = emergencyRole.canAccessRoute(permissionPath)
      ? path
      : emergencyRole.nearestRoute(permissionPath);
  }

  const access = resolveProfileRouteLaunchAccess(target, options);
  if (!access.allowed) {
    return {
      destination: access.redirectTo || CANONICAL_ROUTES.emergencyReception,
      allowed: false,
      access,
    };
  }

  return { destination: target, allowed: true, access };
}

/**
 * Preferred navigation entry point — emergency role matrix + SaaS profile bottleneck.
 * @param {import('react-router-dom').NavigateFunction} navigate
 * @param {import('react-router-dom').To} to
 */
export function navigateProfileAware(navigate, to, options = {}) {
  const resolved = resolveProfileAwareDestination(to, options);
  if (!resolved.allowed) {
    return navigateWithProfileAccess(navigate, to, options);
  }
  navigate(resolved.destination, { replace: options.replace, state: options.state });
  return resolved.access;
}
