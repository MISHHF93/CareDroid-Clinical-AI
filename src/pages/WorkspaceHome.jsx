import { Navigate } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { isPractitionerCleanupEnabled } from '../config/practitionerCleanup.config';
import FutureWorkspaceHome from '../features/future-modules/_review/pages/WorkspaceHome';

export default function WorkspaceHome() {
  if (isPractitionerCleanupEnabled()) {
    return <Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />;
  }

  return <FutureWorkspaceHome />;
}