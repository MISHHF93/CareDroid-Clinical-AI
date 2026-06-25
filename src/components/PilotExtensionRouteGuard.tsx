import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { resolvePilotExtensionRedirect } from '../services/pilotExtensionRouteGuard';

type PilotExtensionRouteGuardProps = {
  children: React.ReactNode;
};

export default function PilotExtensionRouteGuard({ children }: PilotExtensionRouteGuardProps) {
  const location = useLocation();
  const redirectTo = resolvePilotExtensionRedirect(location.pathname);

  if (redirectTo) {
    const [pathname, hash = ''] = redirectTo.split('#');
    return (
      <Navigate
        to={{ pathname, hash: hash ? `#${hash}` : '', search: location.search }}
        replace
      />
    );
  }

  return children;
}