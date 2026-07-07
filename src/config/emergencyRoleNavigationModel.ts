/**
 * Role + screen-mode landing navigation — one resolver for post-login, home, and redirects.
 * Same AppShell and routes; screen mode selects the landing path and query surface.
 */
import { CANONICAL_ROUTES, getDefaultRouteForProfile, getRouteByPath } from './routes.config';
import {
  CARE_DROID_SCREEN_MODE_OPTIONS,
  CARE_DROID_SCREEN_MODES,
  getScreenModeDefaultLandingRoute,
  isValidCareDroidScreenMode,
  normalizeCareDroidScreenMode,
  type CareDroidScreenMode,
} from './careDroidScreenModes';
import {
  coerceEnabledScreenMode,
  EMERGENCY_ROLE_ID,
  getDefaultScreenModeForRole,
  isPublicDisplayPersona,
  resolveDisplayParamScreenMode,
  type EmergencyScreenSettings,
} from './emergencyRoleScreenMatrix';
import {
  resolveDeviceContextLandingRoute,
  resolveDeviceContextScreenMode,
  type EmergencyDeviceContextId,
} from './emergencyDeviceContextModel';

export { isPublicDisplayPersona, PUBLIC_DISPLAY_PERSONA_ALIASES } from './emergencyRoleScreenMatrix';

export type ResolveRoleLandingInput = {
  role?: string;
  emergencySettings?: EmergencyScreenSettings;
  displayParam?: string | null;
  readOnly?: boolean;
  deviceContextId?: EmergencyDeviceContextId | null;
};

export function resolveRoleLandingScreenMode(input: ResolveRoleLandingInput = {}): CareDroidScreenMode {
  const settings = input.emergencySettings || {};
  const enabledModes = settings.enabledScreenModes?.length
    ? settings.enabledScreenModes
    : CARE_DROID_SCREEN_MODE_OPTIONS;
  const role = input.role || EMERGENCY_ROLE_ID.physician;

  const displayFromParam = resolveDisplayParamScreenMode(input.displayParam);
  if (displayFromParam) {
    return coerceEnabledScreenMode(displayFromParam, enabledModes);
  }

  const deviceContextMode = resolveDeviceContextScreenMode(input.deviceContextId, settings);
  if (deviceContextMode) {
    return deviceContextMode;
  }

  if (isPublicDisplayPersona(role)) {
    return coerceEnabledScreenMode(CARE_DROID_SCREEN_MODES.publicWaiting, enabledModes);
  }

  if (settings.readOnlyDisplayMode || input.readOnly) {
    return coerceEnabledScreenMode(CARE_DROID_SCREEN_MODES.readOnlyWhiteboard, enabledModes);
  }

  if (isValidCareDroidScreenMode(settings.defaultScreenMode)) {
    const tenantDefault = normalizeCareDroidScreenMode(settings.defaultScreenMode);
    if (tenantDefault) {
      return coerceEnabledScreenMode(tenantDefault, enabledModes);
    }
  }

  return coerceEnabledScreenMode(getDefaultScreenModeForRole(role), enabledModes);
}

export function resolveRoleLandingRoute(input: ResolveRoleLandingInput = {}): string {
  const deviceRoute = resolveDeviceContextLandingRoute(input.deviceContextId);
  if (deviceRoute) return deviceRoute;
  if (!input.displayParam && input.role) {
    return getDefaultRouteForProfile(input.role);
  }
  const screenMode = resolveRoleLandingScreenMode(input);
  return getScreenModeDefaultLandingRoute(screenMode);
}

export function resolveRoleHomeNavItemId(input: ResolveRoleLandingInput = {}): string {
  const landingRoute = getDefaultRouteForProfile(input.role);
  if (landingRoute.includes('queue=pretriage')) return 'queues';
  const defaultRoute = getRouteByPath(landingRoute);
  if (defaultRoute?.showInNav) return defaultRoute.id;
  const screenMode = resolveRoleLandingScreenMode(input);

  switch (screenMode) {
    case CARE_DROID_SCREEN_MODES.reception:
      return 'reception';
    case CARE_DROID_SCREEN_MODES.triage:
      return 'queues';
    case CARE_DROID_SCREEN_MODES.ems:
      return 'ems';
    case CARE_DROID_SCREEN_MODES.admin:
      return 'settings';
    case CARE_DROID_SCREEN_MODES.commandCenter:
      return 'analytics';
    case CARE_DROID_SCREEN_MODES.publicWaiting:
    case CARE_DROID_SCREEN_MODES.readOnlyWhiteboard:
    case CARE_DROID_SCREEN_MODES.chargeNurse:
    case CARE_DROID_SCREEN_MODES.physician:
      return 'whiteboard';
    default:
      return 'whiteboard';
  }
}

export const ROLE_LANDING_ROUTE_EXPECTATIONS: Record<
  string,
  { screenMode: CareDroidScreenMode; routeIncludes: string }
> = Object.freeze({
  [EMERGENCY_ROLE_ID.registrationClerk]: {
    screenMode: CARE_DROID_SCREEN_MODES.reception,
    routeIncludes: CANONICAL_ROUTES.emergencyReception,
  },
  [EMERGENCY_ROLE_ID.triageNurse]: {
    screenMode: CARE_DROID_SCREEN_MODES.triage,
    routeIncludes: 'queue=pretriage',
  },
  [EMERGENCY_ROLE_ID.chargeNurse]: {
    screenMode: CARE_DROID_SCREEN_MODES.chargeNurse,
    routeIncludes: CANONICAL_ROUTES.emergencyWhiteboard,
  },
  [EMERGENCY_ROLE_ID.physician]: {
    screenMode: CARE_DROID_SCREEN_MODES.physician,
    routeIncludes: CANONICAL_ROUTES.emergencyWhiteboard,
  },
  emergency_physician: {
    screenMode: CARE_DROID_SCREEN_MODES.physician,
    routeIncludes: CANONICAL_ROUTES.emergencyWhiteboard,
  },
  specialist: {
    screenMode: CARE_DROID_SCREEN_MODES.physician,
    routeIncludes: CANONICAL_ROUTES.emergencyPatients,
  },
  [EMERGENCY_ROLE_ID.dispatcher]: {
    screenMode: CARE_DROID_SCREEN_MODES.ems,
    routeIncludes: CANONICAL_ROUTES.emergencyDispatch,
  },
  [EMERGENCY_ROLE_ID.emsCoordinator]: {
    screenMode: CARE_DROID_SCREEN_MODES.ems,
    routeIncludes: CANONICAL_ROUTES.emergencyEms,
  },
  pharmacist: {
    screenMode: CARE_DROID_SCREEN_MODES.physician,
    routeIncludes: CANONICAL_ROUTES.emergencyDiagnostics,
  },
  lab_technician: {
    screenMode: CARE_DROID_SCREEN_MODES.physician,
    routeIncludes: CANONICAL_ROUTES.emergencyDiagnostics,
  },
  radiology_technician: {
    screenMode: CARE_DROID_SCREEN_MODES.physician,
    routeIncludes: CANONICAL_ROUTES.emergencyDiagnostics,
  },
  patient_flow_coordinator: {
    screenMode: CARE_DROID_SCREEN_MODES.commandCenter,
    routeIncludes: CANONICAL_ROUTES.emergencyQueues,
  },
  hospital_admin: {
    screenMode: CARE_DROID_SCREEN_MODES.commandCenter,
    routeIncludes: CANONICAL_ROUTES.emergencyAnalytics,
  },
  it_admin: {
    screenMode: CARE_DROID_SCREEN_MODES.admin,
    routeIncludes: CANONICAL_ROUTES.emergencySettings,
  },
  demo_observer: {
    screenMode: CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
    routeIncludes: CANONICAL_ROUTES.emergencyWhiteboard,
  },
  [EMERGENCY_ROLE_ID.readOnlyViewer]: {
    screenMode: CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
    routeIncludes: 'display=readonly',
  },
  publicDisplay: {
    screenMode: CARE_DROID_SCREEN_MODES.publicWaiting,
    routeIncludes: 'display=waiting-room',
  },
});
