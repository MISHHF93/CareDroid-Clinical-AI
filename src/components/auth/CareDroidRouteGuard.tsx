import React from 'react';
import { useLocation } from 'react-router-dom';
import { getUnauthorizedFallback } from '../../lib/navigation';
import { getRoleLabel } from '../../lib/users/roleAccess';
import useSecurityAccess from '../../hooks/useSecurityAccess';
import AccessDeniedPanel from './AccessDeniedPanel';

type CareDroidRouteGuardProps = {
  children: React.ReactNode;
  path?: string;
};

export function CareDroidRouteGuard({ children, path }: CareDroidRouteGuardProps) {
  const access = useSecurityAccess();
  const { pathname } = useLocation();
  const checkPath = path || pathname;

  if (access.canRoute(checkPath)) {
    return <>{children}</>;
  }

  const hospitalRole = access.compiledProfile?.user?.role;
  // HEAL: access.nearestRoute() resolves through canAccessEmergencyRoute(),
  // a separate permission check from the access.canRoute() gate just above
  // (canAccessCanonicalRoute()) -- when the two disagree, nearestRoute() can
  // hand back the exact path that was just denied, since its own internal
  // "is preferredPath already allowed" check passes even though the gate's
  // check didn't. Confirmed live: physician denied /emergency/intake, then
  // clicking "Go to permitted CareDroid page" didn't navigate anywhere
  // because the fallback silently resolved back to /emergency/intake itself.
  // Re-validate every candidate against the same check that produced this
  // denial before offering it as the escape hatch.
  const nearestRoute = access.nearestRoute(checkPath);
  const fallbackPath =
    (nearestRoute && access.canRoute(nearestRoute) ? nearestRoute : null) ||
    (access.landingRoute && access.canRoute(access.landingRoute) ? access.landingRoute : null) ||
    getUnauthorizedFallback(hospitalRole);
  const roleLabel = access.roleLabel || getRoleLabel(hospitalRole || access.role);

  return (
    <AccessDeniedPanel roleLabel={roleLabel} fallbackPath={fallbackPath} />
  );
}

export default CareDroidRouteGuard;