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
  const fallbackPath =
    access.nearestRoute(checkPath) ||
    access.landingRoute ||
    getUnauthorizedFallback(hospitalRole);
  const roleLabel = access.roleLabel || getRoleLabel(hospitalRole || access.role);

  return (
    <AccessDeniedPanel roleLabel={roleLabel} fallbackPath={fallbackPath} />
  );
}

export default CareDroidRouteGuard;