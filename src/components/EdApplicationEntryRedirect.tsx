import { Navigate, useLocation } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../config/routes.config';

/**
 * Legacy platform aliases (/workspace) resolve to the platform entry hub.
 */
export default function EdApplicationEntryRedirect() {
  const location = useLocation();
  return (
    <Navigate
      to={{ pathname: CANONICAL_ROUTES.platformStart, search: location.search, hash: location.hash }}
      replace
    />
  );
}