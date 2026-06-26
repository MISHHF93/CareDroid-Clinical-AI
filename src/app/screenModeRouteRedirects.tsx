import { Navigate } from 'react-router-dom';
import { getScreenModeDefaultLandingRoute } from '../config/careDroidScreenModes';

function parseLandingTarget(target) {
  const normalized = String(target || '/').trim();
  const queryIndex = normalized.indexOf('?');
  if (queryIndex === -1) {
    return { pathname: normalized, search: '', hash: '' };
  }
  return {
    pathname: normalized.slice(0, queryIndex) || '/',
    search: normalized.slice(queryIndex),
    hash: '',
  };
}

/** Deep-link a role screen mode into its canonical ED surface. */
export function ScreenModeLandingRedirect({ mode }) {
  const target = getScreenModeDefaultLandingRoute(mode);
  return <Navigate to={parseLandingTarget(target)} replace />;
}