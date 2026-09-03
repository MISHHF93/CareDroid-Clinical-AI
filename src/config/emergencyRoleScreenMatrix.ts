/**
 * Canonical CareDroid role → screen-mode matrix.
 * Single resolver for route, role, tenant settings, and wall-display query params.
 */
import { CANONICAL_ROUTES, LABORATORY_ROUTE_ALIASES } from './routes.config';
import {
  CARE_DROID_SCREEN_MODES,
  CARE_DROID_SCREEN_MODE_CONFIG,
  CARE_DROID_SCREEN_MODE_OPTIONS,
  coerceEnabledScreenMode,
  isValidCareDroidScreenMode,
  normalizeCareDroidScreenMode,
  shouldUseMinimalAppChromeForMode,
  type CareDroidScreenMode,
} from './careDroidScreenModes';

// Re-exported for existing callers (e.g. emergencyRoleNavigationModel.ts) —
// the real definition lives in careDroidScreenModeRegistry.ts now, moved
// there to break a circular dependency with emergencyDeviceContextModel.ts.
export { coerceEnabledScreenMode };
import {
  resolveDeviceContextScreenMode,
  type EmergencyDeviceContextId,
} from './emergencyDeviceContextModel';
import { coerceScreenModeForRole } from './emergencyScreenModeAccessModel';

/** Stable ED role ids — kept local to avoid circular imports with emergencyRolePermissions.js */
export const EMERGENCY_ROLE_ID = Object.freeze({
  admin: 'admin',
  /** Technical admin — no PHI/clinical grants (Stage D alignment). */
  itAdmin: 'it_admin',
  edManager: 'ed_manager',
  chargeNurse: 'charge_nurse',
  triageNurse: 'triage_nurse',
  physician: 'physician',
  registrationClerk: 'registration_clerk',
  emsUser: 'ems_user',
  dispatcher: 'dispatcher',
  emsCoordinator: 'ems_coordinator',
  readOnlyViewer: 'read_only_viewer',
  publicDisplay: 'public_display',
});

export type EmergencyRoleId = (typeof EMERGENCY_ROLE_ID)[keyof typeof EMERGENCY_ROLE_ID];

/**
 * Non-ED department pages that share the app shell's Header but have no
 * screen-mode branch of their own -- kept out of the reception/triage/etc.
 * matrix entirely so resolveEmergencyScreenMode() can force them to a
 * no-misleading-pills mode instead of falling through to a visiting role's
 * unrelated ED default.
 */
export const NON_EMERGENCY_DEPARTMENT_ROUTES: ReadonlySet<string> = new Set([
  CANONICAL_ROUTES.laboratory,
  ...LABORATORY_ROUTE_ALIASES,
  CANONICAL_ROUTES.pharmacy,
  CANONICAL_ROUTES.radiology,
]);

/** Staff-facing persona labels aligned to ED operations (not separate product roles). */
export const ED_PERSONA_LABELS = Object.freeze({
  receptionClerk: 'Receptionist / ED Clerk',
  triageNurse: 'Triage Nurse',
  chargeNurse: 'Charge Nurse / Flow Nurse',
  physician: 'ED Physician / NP / PA',
  emsHandoff: 'EMS Handoff Nurse',
  departmentManager: 'Department Manager / Director',
  siteAdmin: 'Site Admin',
  publicWaiting: 'Public Waiting Display',
  readOnlyWhiteboard: 'Read-Only Whiteboard Display',
});

/** Default screen mode when no route override applies. */
export const DEFAULT_SCREEN_MODE_BY_ROLE: Record<EmergencyRoleId, CareDroidScreenMode> =
  Object.freeze({
    [EMERGENCY_ROLE_ID.registrationClerk]: CARE_DROID_SCREEN_MODES.reception,
    [EMERGENCY_ROLE_ID.triageNurse]: CARE_DROID_SCREEN_MODES.triage,
    [EMERGENCY_ROLE_ID.chargeNurse]: CARE_DROID_SCREEN_MODES.chargeNurse,
    [EMERGENCY_ROLE_ID.physician]: CARE_DROID_SCREEN_MODES.physician,
    [EMERGENCY_ROLE_ID.emsUser]: CARE_DROID_SCREEN_MODES.ems,
    [EMERGENCY_ROLE_ID.dispatcher]: CARE_DROID_SCREEN_MODES.ems,
    [EMERGENCY_ROLE_ID.emsCoordinator]: CARE_DROID_SCREEN_MODES.ems,
    [EMERGENCY_ROLE_ID.edManager]: CARE_DROID_SCREEN_MODES.commandCenter,
    [EMERGENCY_ROLE_ID.admin]: CARE_DROID_SCREEN_MODES.admin,
    [EMERGENCY_ROLE_ID.itAdmin]: CARE_DROID_SCREEN_MODES.admin,
    [EMERGENCY_ROLE_ID.readOnlyViewer]: CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
    [EMERGENCY_ROLE_ID.publicDisplay]: CARE_DROID_SCREEN_MODES.publicWaiting,
  });

export const ED_PERSONA_TO_ROLE: Record<keyof typeof ED_PERSONA_LABELS, EmergencyRoleId> =
  Object.freeze({
    receptionClerk: EMERGENCY_ROLE_ID.registrationClerk,
    triageNurse: EMERGENCY_ROLE_ID.triageNurse,
    chargeNurse: EMERGENCY_ROLE_ID.chargeNurse,
    physician: EMERGENCY_ROLE_ID.physician,
    emsHandoff: EMERGENCY_ROLE_ID.emsUser,
    departmentManager: EMERGENCY_ROLE_ID.edManager,
    siteAdmin: EMERGENCY_ROLE_ID.admin,
    publicWaiting: EMERGENCY_ROLE_ID.readOnlyViewer,
    readOnlyWhiteboard: EMERGENCY_ROLE_ID.readOnlyViewer,
  });

export const DISPLAY_QUERY_MODES = Object.freeze({
  readOnly: ['readonly', 'read-only'],
  waitingRoom: ['waiting-room', 'waiting', 'public'],
});

export const PUBLIC_DISPLAY_PERSONA_ALIASES = Object.freeze([
  'public display',
  'public waiting display',
  'waiting room display',
  'waiting-room display',
  'public waiting',
]);

function normalizePersonaToken(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ');
}

export function isPublicDisplayPersona(role: string | null | undefined): boolean {
  return PUBLIC_DISPLAY_PERSONA_ALIASES.includes(normalizePersonaToken(role || ''));
}

export type EmergencyScreenSettings = {
  defaultScreenMode?: string;
  enabledScreenModes?: string[];
  allowedRolesByScreenMode?: Partial<Record<string, string[]>>;
  publicDisplayPrivacy?: string | null;
  wallDisplayMonitorPrivacy?: string | null;
  wallDisplayRefreshInterval?: number;
  screenModeKpiVisibility?: Partial<Record<string, readonly string[]>>;
  readOnlyDisplayMode?: boolean;
  commandCenterMode?: boolean;
};

export type ResolveEmergencyScreenModeInput = {
  pathname?: string;
  role?: string;
  readOnly?: boolean;
  emergencySettings?: EmergencyScreenSettings;
  displayParam?: string | null;
  queueParam?: string | null;
  screenModeOverride?: CareDroidScreenMode | null;
  deviceContextId?: EmergencyDeviceContextId | null;
};

function isValidScreenMode(value: unknown): value is CareDroidScreenMode {
  return isValidCareDroidScreenMode(value);
}

export function resolveDisplayParamScreenMode(
  displayParam: string | null | undefined,
): CareDroidScreenMode | null {
  const normalized = String(displayParam || '')
    .trim()
    .toLowerCase();
  if (!normalized) return null;
  if (DISPLAY_QUERY_MODES.readOnly.includes(normalized)) {
    return CARE_DROID_SCREEN_MODES.readOnlyWhiteboard;
  }
  if (DISPLAY_QUERY_MODES.waitingRoom.includes(normalized)) {
    return CARE_DROID_SCREEN_MODES.publicWaiting;
  }
  return null;
}

const HOSPITAL_PROFILE_SCREEN_MODES: Readonly<Record<string, CareDroidScreenMode>> = Object.freeze({
  dispatcher: CARE_DROID_SCREEN_MODES.ems,
  ems_coordinator: CARE_DROID_SCREEN_MODES.ems,
  pharmacist: CARE_DROID_SCREEN_MODES.physician,
  lab_technician: CARE_DROID_SCREEN_MODES.physician,
  radiology_technician: CARE_DROID_SCREEN_MODES.physician,
  specialist: CARE_DROID_SCREEN_MODES.physician,
  patient_flow_coordinator: CARE_DROID_SCREEN_MODES.commandCenter,
  hospital_admin: CARE_DROID_SCREEN_MODES.commandCenter,
  it_admin: CARE_DROID_SCREEN_MODES.admin,
  demo_observer: CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
});

export function getDefaultScreenModeForRole(role: string): CareDroidScreenMode {
  const normalized = String(role || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  const mode =
    HOSPITAL_PROFILE_SCREEN_MODES[normalized] ||
    DEFAULT_SCREEN_MODE_BY_ROLE[normalized as EmergencyRoleId] ||
    DEFAULT_SCREEN_MODE_BY_ROLE[EMERGENCY_ROLE_ID.physician];
  return mode;
}

export function resolveRouteScreenMode(
  pathname: string,
  role: string,
  settings: EmergencyScreenSettings = {},
  queueParam?: string | null,
): CareDroidScreenMode | null {
  const normalized = String(role || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  const triageCapableRoles = new Set<string>([
    EMERGENCY_ROLE_ID.triageNurse,
    EMERGENCY_ROLE_ID.chargeNurse,
    EMERGENCY_ROLE_ID.physician,
    EMERGENCY_ROLE_ID.admin,
  ]);

  if (
    pathname === CANONICAL_ROUTES.emergencyQueues ||
    pathname === CANONICAL_ROUTES.emergencyReassessment
  ) {
    return CARE_DROID_SCREEN_MODES.triage;
  }

  if (
    pathname === CANONICAL_ROUTES.emergencyReception ||
    pathname === CANONICAL_ROUTES.emergencyIntake
  ) {
    const queue = String(queueParam || '')
      .trim()
      .toLowerCase();
    if (queue === 'pretriage' && triageCapableRoles.has(normalized as EmergencyRoleId)) {
      return CARE_DROID_SCREEN_MODES.triage;
    }
    if (normalized === EMERGENCY_ROLE_ID.triageNurse) {
      return CARE_DROID_SCREEN_MODES.triage;
    }
    return CARE_DROID_SCREEN_MODES.reception;
  }

  if (pathname === CANONICAL_ROUTES.emergencyEms) {
    return CARE_DROID_SCREEN_MODES.ems;
  }

  if (pathname === CANONICAL_ROUTES.emergencySettings) {
    const normalized = String(role || '')
      .trim()
      .toLowerCase()
      .replace(/-/g, '_');
    if (normalized === EMERGENCY_ROLE_ID.admin || normalized === EMERGENCY_ROLE_ID.edManager) {
      return CARE_DROID_SCREEN_MODES.admin;
    }
  }

  if (pathname === CANONICAL_ROUTES.emergencyAnalytics) {
    return CARE_DROID_SCREEN_MODES.commandCenter;
  }

  if (pathname === CANONICAL_ROUTES.emergencyWhiteboard || pathname === '/emergency') {
    const normalized = String(role || '')
      .trim()
      .toLowerCase()
      .replace(/-/g, '_');
    if (settings.commandCenterMode) {
      if (
        normalized === EMERGENCY_ROLE_ID.edManager ||
        normalized === EMERGENCY_ROLE_ID.admin ||
        normalized === EMERGENCY_ROLE_ID.chargeNurse
      ) {
        return CARE_DROID_SCREEN_MODES.commandCenter;
      }
    }
    if (isValidScreenMode(settings.defaultScreenMode)) {
      return normalizeCareDroidScreenMode(settings.defaultScreenMode)!;
    }
    return getDefaultScreenModeForRole(role);
  }

  if (isValidScreenMode(settings.defaultScreenMode)) {
    return normalizeCareDroidScreenMode(settings.defaultScreenMode)!;
  }

  return getDefaultScreenModeForRole(role);
}

/**
 * Unified screen-mode resolver — used by route hooks and central-node snapshot builder.
 */
export function resolveEmergencyScreenMode(
  input: ResolveEmergencyScreenModeInput,
): CareDroidScreenMode {
  const settings = input.emergencySettings || {};
  const enabledModes = settings.enabledScreenModes?.length
    ? settings.enabledScreenModes
        .map((entry) => normalizeCareDroidScreenMode(entry))
        .filter((entry): entry is CareDroidScreenMode => Boolean(entry))
    : [...CARE_DROID_SCREEN_MODE_OPTIONS];
  const role = input.role || EMERGENCY_ROLE_ID.physician;
  const roleAccessSettings = {
    allowedRolesByScreenMode: settings.allowedRolesByScreenMode,
    enabledScreenModes: enabledModes,
    defaultScreenMode: normalizeCareDroidScreenMode(settings.defaultScreenMode) || undefined,
  };

  const finalize = (
    mode: CareDroidScreenMode,
    options: { skipRoleCoercion?: boolean } = {},
  ): CareDroidScreenMode => {
    const enabled = coerceEnabledScreenMode(mode, enabledModes);
    if (options.skipRoleCoercion) return enabled;
    return coerceScreenModeForRole(enabled, role, roleAccessSettings);
  };

  if (input.screenModeOverride && isValidScreenMode(input.screenModeOverride)) {
    return finalize(normalizeCareDroidScreenMode(input.screenModeOverride)!);
  }

  const displayMode = resolveDisplayParamScreenMode(input.displayParam);
  if (displayMode) {
    return finalize(displayMode, { skipRoleCoercion: true });
  }

  const deviceContextMode = resolveDeviceContextScreenMode(input.deviceContextId, settings);
  if (deviceContextMode) {
    return finalize(deviceContextMode, { skipRoleCoercion: true });
  }

  if (isPublicDisplayPersona(input.role)) {
    return finalize(CARE_DROID_SCREEN_MODES.publicWaiting);
  }

  if (settings.readOnlyDisplayMode || input.readOnly) {
    return finalize(CARE_DROID_SCREEN_MODES.readOnlyWhiteboard, { skipRoleCoercion: true });
  }

  // Laboratory/Pharmacy/Radiology aren't part of the ED role/screen-mode
  // matrix at all -- resolveRouteScreenMode() has no branch for them, so
  // every role used to fall through to getDefaultScreenModeForRole() and
  // show that role's own (irrelevant) header pills on someone else's
  // department page. skipRoleCoercion so this can't itself get redirected
  // to a different mode for roles readOnlyWhiteboard doesn't allow.
  if (input.pathname && NON_EMERGENCY_DEPARTMENT_ROUTES.has(input.pathname)) {
    return finalize(CARE_DROID_SCREEN_MODES.readOnlyWhiteboard, { skipRoleCoercion: true });
  }

  const pathname = input.pathname || '';
  const routeMode = pathname
    ? resolveRouteScreenMode(pathname, role, settings, input.queueParam)
    : null;

  if (routeMode) {
    return finalize(routeMode);
  }

  return finalize(getDefaultScreenModeForRole(role));
}

export function isPublicDisplayScreenMode(screenMode: CareDroidScreenMode): boolean {
  return Boolean(CARE_DROID_SCREEN_MODE_CONFIG[screenMode]?.publicDisplay);
}

export function isWallKioskScreenMode(screenMode: CareDroidScreenMode): boolean {
  return shouldUseMinimalAppChromeForMode(screenMode);
}

export function shouldUseMinimalAppChrome(screenMode: CareDroidScreenMode): boolean {
  return isWallKioskScreenMode(screenMode);
}

export function getPersonaLabelForRole(role: string): string {
  const normalized = String(role || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  switch (normalized) {
    case EMERGENCY_ROLE_ID.registrationClerk:
      return ED_PERSONA_LABELS.receptionClerk;
    case EMERGENCY_ROLE_ID.triageNurse:
      return ED_PERSONA_LABELS.triageNurse;
    case EMERGENCY_ROLE_ID.chargeNurse:
      return ED_PERSONA_LABELS.chargeNurse;
    case EMERGENCY_ROLE_ID.physician:
      return ED_PERSONA_LABELS.physician;
    case EMERGENCY_ROLE_ID.emsUser:
      return ED_PERSONA_LABELS.emsHandoff;
    case EMERGENCY_ROLE_ID.edManager:
      return ED_PERSONA_LABELS.departmentManager;
    case EMERGENCY_ROLE_ID.admin:
      return ED_PERSONA_LABELS.siteAdmin;
    case EMERGENCY_ROLE_ID.readOnlyViewer:
      return ED_PERSONA_LABELS.readOnlyWhiteboard;
    default:
      return ED_PERSONA_LABELS.physician;
  }
}
