/**
 * Screen-mode role access — role allow-lists without KPI policy dependencies.
 */
import {
  CARE_DROID_SCREEN_MODES,
  CARE_DROID_SCREEN_MODE_OPTIONS,
  normalizeCareDroidScreenMode,
  type CareDroidScreenMode,
} from './careDroidScreenModes';

export const EMERGENCY_ROLE_ID = Object.freeze({
  admin: 'admin',
  edManager: 'ed_manager',
  chargeNurse: 'charge_nurse',
  triageNurse: 'triage_nurse',
  physician: 'physician',
  registrationClerk: 'registration_clerk',
  emsUser: 'ems_user',
  readOnlyViewer: 'read_only_viewer',
  publicDisplay: 'public_display',
} as const);

export type EmergencyRoleId = (typeof EMERGENCY_ROLE_ID)[keyof typeof EMERGENCY_ROLE_ID];

export const SCREEN_MODE_ROLE_OPTIONS: ReadonlyArray<{
  id: EmergencyRoleId;
  label: string;
}> = Object.freeze([
  { id: EMERGENCY_ROLE_ID.registrationClerk, label: 'Reception / registration clerk' },
  { id: EMERGENCY_ROLE_ID.triageNurse, label: 'Triage nurse' },
  { id: EMERGENCY_ROLE_ID.chargeNurse, label: 'Charge / flow nurse' },
  { id: EMERGENCY_ROLE_ID.physician, label: 'Physician / NP / PA' },
  { id: EMERGENCY_ROLE_ID.emsUser, label: 'EMS handoff nurse' },
  { id: EMERGENCY_ROLE_ID.edManager, label: 'Department manager' },
  { id: EMERGENCY_ROLE_ID.admin, label: 'Site admin' },
  { id: EMERGENCY_ROLE_ID.readOnlyViewer, label: 'Read-only / wall display' },
  { id: EMERGENCY_ROLE_ID.publicDisplay, label: 'Public waiting display' },
]);

export const DEFAULT_ALLOWED_ROLES_BY_SCREEN_MODE: Readonly<
  Record<CareDroidScreenMode, readonly EmergencyRoleId[]>
> = Object.freeze({
  [CARE_DROID_SCREEN_MODES.reception]: Object.freeze([
    EMERGENCY_ROLE_ID.registrationClerk,
    EMERGENCY_ROLE_ID.triageNurse,
    EMERGENCY_ROLE_ID.chargeNurse,
    EMERGENCY_ROLE_ID.edManager,
    EMERGENCY_ROLE_ID.admin,
  ]),
  [CARE_DROID_SCREEN_MODES.triage]: Object.freeze([
    EMERGENCY_ROLE_ID.triageNurse,
    EMERGENCY_ROLE_ID.chargeNurse,
    EMERGENCY_ROLE_ID.physician,
    EMERGENCY_ROLE_ID.edManager,
    EMERGENCY_ROLE_ID.admin,
  ]),
  [CARE_DROID_SCREEN_MODES.ems]: Object.freeze([
    EMERGENCY_ROLE_ID.emsUser,
    EMERGENCY_ROLE_ID.chargeNurse,
    EMERGENCY_ROLE_ID.edManager,
    EMERGENCY_ROLE_ID.admin,
  ]),
  [CARE_DROID_SCREEN_MODES.chargeNurse]: Object.freeze([
    EMERGENCY_ROLE_ID.chargeNurse,
    EMERGENCY_ROLE_ID.physician,
    EMERGENCY_ROLE_ID.edManager,
    EMERGENCY_ROLE_ID.admin,
  ]),
  [CARE_DROID_SCREEN_MODES.physician]: Object.freeze([
    EMERGENCY_ROLE_ID.physician,
    EMERGENCY_ROLE_ID.chargeNurse,
    EMERGENCY_ROLE_ID.edManager,
    EMERGENCY_ROLE_ID.admin,
  ]),
  [CARE_DROID_SCREEN_MODES.commandCenter]: Object.freeze([
    EMERGENCY_ROLE_ID.edManager,
    EMERGENCY_ROLE_ID.admin,
    EMERGENCY_ROLE_ID.chargeNurse,
  ]),
  [CARE_DROID_SCREEN_MODES.publicWaiting]: Object.freeze([
    EMERGENCY_ROLE_ID.publicDisplay,
    EMERGENCY_ROLE_ID.readOnlyViewer,
    EMERGENCY_ROLE_ID.edManager,
    EMERGENCY_ROLE_ID.admin,
  ]),
  [CARE_DROID_SCREEN_MODES.readOnlyWhiteboard]: Object.freeze([
    EMERGENCY_ROLE_ID.readOnlyViewer,
    EMERGENCY_ROLE_ID.chargeNurse,
    EMERGENCY_ROLE_ID.edManager,
    EMERGENCY_ROLE_ID.admin,
  ]),
  [CARE_DROID_SCREEN_MODES.admin]: Object.freeze([
    EMERGENCY_ROLE_ID.admin,
    EMERGENCY_ROLE_ID.edManager,
  ]),
});

export type ScreenModeRoleAccessSettings = {
  allowedRolesByScreenMode?: Partial<Record<string, string[]>>;
  enabledScreenModes?: readonly CareDroidScreenMode[];
  defaultScreenMode?: CareDroidScreenMode;
};

export function normalizeEmergencyRoleId(value: unknown): EmergencyRoleId | null {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  return (Object.values(EMERGENCY_ROLE_ID) as string[]).includes(normalized)
    ? (normalized as EmergencyRoleId)
    : null;
}

export function buildDefaultAllowedRolesByScreenMode(): Record<
  CareDroidScreenMode,
  EmergencyRoleId[]
> {
  return Object.fromEntries(
    CARE_DROID_SCREEN_MODE_OPTIONS.map((screenMode) => [
      screenMode,
      [...(DEFAULT_ALLOWED_ROLES_BY_SCREEN_MODE[screenMode] || [])],
    ]),
  ) as Record<CareDroidScreenMode, EmergencyRoleId[]>;
}

export function normalizeAllowedRolesByScreenMode(
  value: unknown,
  fallback: Record<CareDroidScreenMode, EmergencyRoleId[]>,
): Record<CareDroidScreenMode, EmergencyRoleId[]> {
  const next = { ...fallback };
  if (!value || typeof value !== 'object') return next;

  for (const [rawScreenMode, roles] of Object.entries(value as Record<string, unknown>)) {
    const screenMode = normalizeCareDroidScreenMode(rawScreenMode);
    if (!screenMode || !Array.isArray(roles)) continue;
    const normalizedRoles = roles
      .map((role) => normalizeEmergencyRoleId(role))
      .filter((role): role is EmergencyRoleId => Boolean(role));
    if (normalizedRoles.length) {
      next[screenMode] = normalizedRoles;
    }
  }

  return next;
}

export function resolveAllowedRolesForScreenMode(
  screenMode: CareDroidScreenMode,
  settings: ScreenModeRoleAccessSettings = {},
): EmergencyRoleId[] {
  const fallback = buildDefaultAllowedRolesByScreenMode();
  const normalized = normalizeAllowedRolesByScreenMode(
    settings.allowedRolesByScreenMode,
    fallback,
  );
  return normalized[screenMode] || [];
}

export function isRoleAllowedForScreenMode(
  role: string,
  screenMode: CareDroidScreenMode,
  settings: ScreenModeRoleAccessSettings = {},
): boolean {
  const normalizedRole = normalizeEmergencyRoleId(role);
  if (!normalizedRole) return false;
  return resolveAllowedRolesForScreenMode(screenMode, settings).includes(normalizedRole);
}

export function coerceScreenModeForRole(
  screenMode: CareDroidScreenMode,
  role: string,
  settings: ScreenModeRoleAccessSettings = {},
): CareDroidScreenMode {
  if (isRoleAllowedForScreenMode(role, screenMode, settings)) {
    return screenMode;
  }

  const enabledModes = settings.enabledScreenModes?.length
    ? settings.enabledScreenModes
    : CARE_DROID_SCREEN_MODE_OPTIONS;
  const fallback = enabledModes.find((candidate) =>
    isRoleAllowedForScreenMode(role, candidate, settings),
  );
  return fallback || settings.defaultScreenMode || screenMode;
}
