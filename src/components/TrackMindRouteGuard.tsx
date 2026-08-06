import { Link, Navigate } from 'react-router-dom';
import useTrackMindRolePermissions from '../hooks/useTrackMindRolePermissions';
import { useUser } from '../contexts/UserContext';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { PILOT_CUSTOMER_MODE } from '../config/unified-navigation.config';
import { getPlatformHomeRoute } from '../config/receptionFirstUx.config';
import { resolveUserProfileFromSaasRole } from '../config/userProfileCatalog';

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

function resolveSaasRoleFromUser(user) {
  const profile = user?.profile || {};
  return (
    user?.saasRole ||
    profile.saasRole ||
    profile.roleProfileId ||
    user?.role ||
    ''
  );
}

function hasTrackMindProfile(user) {
  const saasRole = resolveSaasRoleFromUser(user);
  const profile = resolveUserProfileFromSaasRole(saasRole);
  return Boolean(profile.trackMindRoleId);
}

export default function TrackMindRouteGuard({ path, children }) {
  const { user } = useUser();
  const trackMindRole = useTrackMindRolePermissions();
  if (PILOT_CUSTOMER_MODE.enabled && !hasTrackMindProfile(user)) {
    return <Navigate to={getPlatformHomeRoute()} replace />;
  }
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
