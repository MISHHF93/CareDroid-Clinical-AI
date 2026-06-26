import { CANONICAL_ROUTES } from '../config/routes.config';
import { getEmergencySurface } from '../config/emergencyPipelineModel';
import {
  getReceptionEmbeddedIntakePath,
  getReceptionExpressCreatePath,
  prefersReceptionForPatientCreate,
  prefersReceptionForPatientSearch,
} from '../config/emergencyRolePermissions';
import { isReceptionFirstUxEnabled, RECEPTION_FIRST_UX } from '../config/receptionFirstUx.config';
import { NAVIGATION_ITEMS } from '../config/unified-navigation.config';
import { navigateProfileAware } from '../navigation/profileRouteLaunch';
import { buildReceptionDeepLink } from '../utils/receptionQueryParams';

const FRONT_DOOR_REDIRECT_ROLES = new Set([
  'registration_clerk',
  'triage_nurse',
]);

export function shouldRedirectEmergencySurface(surfaceId, role) {
  if (!isReceptionFirstUxEnabled()) return false;
  const normalizedRole = String(role || '').trim().toLowerCase();

  switch (surfaceId) {
    case 'intake':
      return (
        RECEPTION_FIRST_UX.redirectStandaloneIntake &&
        FRONT_DOOR_REDIRECT_ROLES.has(normalizedRole)
      );
    case 'queues':
      return (
        RECEPTION_FIRST_UX.redirectStandaloneQueues &&
        FRONT_DOOR_REDIRECT_ROLES.has(normalizedRole)
      );
    case 'patients':
      return (
        RECEPTION_FIRST_UX.redirectStandalonePatientsForClerk &&
        normalizedRole === 'registration_clerk'
      );
    default:
      return false;
  }
}

function navItemForSurface(surfaceId) {
  return NAVIGATION_ITEMS.find((item) => item.id === surfaceId) || null;
}

export function resolveEmergencySurfacePath(surfaceId, options: any = {}) {
  const surface = getEmergencySurface(surfaceId);
  if (!surface) return CANONICAL_ROUTES.emergencyReception;

  const role = options.role;
  const resetReceptionQuery = options.resetReceptionQuery !== false;

  if (surfaceId === 'reception' && resetReceptionQuery) {
    return surface.canonicalRoute;
  }

  if (surfaceId === 'patients' && isReceptionFirstUxEnabled() && prefersReceptionForPatientSearch(role)) {
    return buildReceptionDeepLink({
      patientId: options.patientId,
      query: options.query,
    });
  }

  if (surfaceId === 'intake' && isReceptionFirstUxEnabled() && RECEPTION_FIRST_UX.redirectStandaloneIntake) {
    if (prefersReceptionForPatientCreate(role)) {
      return getReceptionEmbeddedIntakePath(options.intakeOptions || {});
    }
  }

  if (surfaceId === 'queues' && isReceptionFirstUxEnabled() && RECEPTION_FIRST_UX.redirectStandaloneQueues) {
    return buildReceptionDeepLink({
      queue: options.queue || 'pretriage',
      patientId: options.patientId,
    });
  }

  return surface.canonicalRoute;
}

export function navigateToEmergencySurface(navigate, surfaceId, options: any = {}) {
  const emergencyRole = options.emergencyRole;
  const path = resolveEmergencySurfacePath(surfaceId, {
    role: emergencyRole?.role,
    patientId: options.patientId,
    query: options.query,
    queue: options.queue,
    intakeOptions: options.intakeOptions,
    resetReceptionQuery: options.resetReceptionQuery,
  });

  const navItem = navItemForSurface(surfaceId);
  const permissionPath = navItem?.path || path;

  navigateProfileAware(navigate, path, {
    emergencyRole,
    saasRole: options.saasRole,
    context: options.context,
  });

  return emergencyRole?.canAccessRoute
    ? emergencyRole.canAccessRoute(permissionPath)
      ? path
      : emergencyRole.nearestRoute(permissionPath)
    : path;
}

export function getEmergencySurfaceTitle(surfaceId) {
  return getEmergencySurface(surfaceId)?.label || 'CareDroid';
}

export default navigateToEmergencySurface;
