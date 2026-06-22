import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import useTrackMindRolePermissions from '../hooks/useTrackMindRolePermissions';
import { CANONICAL_ROUTES } from '../config/routes.config';

function TrackMindAccessDenied({ requestedPath }) {
  const trackMindRole = useTrackMindRolePermissions();
  return (
    <section className="trackmind-access-denied" aria-live="polite">
      <h1>TrackMind access restricted</h1>
      <p>
        Your role ({trackMindRole.roleLabel}) does not have permission to access{' '}
        <code>{requestedPath}</code>.
      </p>
      <Link to={trackMindRole.landingRoute || CANONICAL_ROUTES.trackMindWorkspace}>
        Go to your workspace
      </Link>
    </section>
  );
}

export default function TrackMindRouteGuard({ path, children }) {
  const trackMindRole = useTrackMindRolePermissions();
  if (!trackMindRole.canAccessRoute(path)) {
    return <TrackMindAccessDenied requestedPath={path} />;
  }
  return children;
}

export function TrackMindDefaultRedirect() {
  const trackMindRole = useTrackMindRolePermissions();
  return (
    <Navigate
      to={trackMindRole.landingRoute || CANONICAL_ROUTES.trackMindWorkspace}
      replace
    />
  );
}
