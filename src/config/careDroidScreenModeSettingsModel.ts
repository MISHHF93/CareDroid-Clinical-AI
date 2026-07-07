/**
 * CareDroid screen mode settings — normalized tenant configuration for displays,
 * role access, privacy tiers, refresh cadence, and per-screen KPI visibility.
 */
import {
  CARE_DROID_SCREEN_MODES,
  CARE_DROID_SCREEN_MODE_OPTIONS,
  isValidCareDroidScreenMode,
  listScreenModesForSettings,
  normalizeCareDroidScreenMode,
  type CareDroidScreenMode,
} from './careDroidScreenModes';
import {
  EMERGENCY_SCREEN_KPI_POLICY,
  resolveScreenModeKpiIds,
  type EmergencyScreenKpiId,
} from './emergencyScreenKpiPolicy';
import {
  normalizeWallDisplayMonitorPrivacy,
  WALL_DISPLAY_MONITOR_PRIVACY,
  type WallDisplayMonitorPrivacy,
} from './wallDisplayMonitorPrivacyModel';

import {
  buildDefaultAllowedRolesByScreenMode,
  normalizeAllowedRolesByScreenMode,
  type EmergencyRoleId,
} from './emergencyScreenModeAccessModel';

export {
  EMERGENCY_ROLE_ID,
  SCREEN_MODE_ROLE_OPTIONS,
  buildDefaultAllowedRolesByScreenMode,
  coerceScreenModeForRole,
  isRoleAllowedForScreenMode,
  normalizeEmergencyRoleId,
  resolveAllowedRolesForScreenMode,
  type EmergencyRoleId,
} from './emergencyScreenModeAccessModel';

export const PUBLIC_DISPLAY_PRIVACY_LEVEL = Object.freeze({
  standard: 'standard',
  minimal: 'minimal',
} as const);

export type PublicDisplayPrivacyLevel =
  (typeof PUBLIC_DISPLAY_PRIVACY_LEVEL)[keyof typeof PUBLIC_DISPLAY_PRIVACY_LEVEL];

export const PUBLIC_DISPLAY_PRIVACY_OPTIONS: ReadonlyArray<{
  id: PublicDisplayPrivacyLevel;
  label: string;
  description: string;
}> = Object.freeze([
  {
    id: PUBLIC_DISPLAY_PRIVACY_LEVEL.standard,
    label: 'Standard public aggregate',
    description: 'Wait ranges, crowd level, and process-stage messaging — no PHI.',
  },
  {
    id: PUBLIC_DISPLAY_PRIVACY_LEVEL.minimal,
    label: 'Minimal public aggregate',
    description: 'Crowd level and generic guidance only — highest public privacy.',
  },
]);

export type CareDroidScreenModeSettingsInput = {
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

export type NormalizedCareDroidScreenModeSettings = {
  defaultScreenMode: CareDroidScreenMode;
  enabledScreenModes: CareDroidScreenMode[];
  allowedRolesByScreenMode: Record<CareDroidScreenMode, EmergencyRoleId[]>;
  publicDisplayPrivacy: PublicDisplayPrivacyLevel;
  readOnlyWhiteboardPrivacy: WallDisplayMonitorPrivacy;
  wallDisplayRefreshInterval: number;
  screenModeKpiVisibility: Partial<Record<CareDroidScreenMode, EmergencyScreenKpiId[]>>;
};

const DEFAULT_REFRESH_INTERVAL_MS = 30000;

export function normalizePublicDisplayPrivacy(
  value: unknown,
  fallback: PublicDisplayPrivacyLevel = PUBLIC_DISPLAY_PRIVACY_LEVEL.standard,
): PublicDisplayPrivacyLevel {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === PUBLIC_DISPLAY_PRIVACY_LEVEL.minimal) {
    return PUBLIC_DISPLAY_PRIVACY_LEVEL.minimal;
  }
  if (normalized === PUBLIC_DISPLAY_PRIVACY_LEVEL.standard) {
    return PUBLIC_DISPLAY_PRIVACY_LEVEL.standard;
  }
  return fallback;
}

export function buildDefaultScreenModeKpiVisibility(): Partial<
  Record<CareDroidScreenMode, EmergencyScreenKpiId[]>
> {
  return Object.fromEntries(
    CARE_DROID_SCREEN_MODE_OPTIONS.map((screenMode) => [
      screenMode,
      [...(EMERGENCY_SCREEN_KPI_POLICY[screenMode] || [])],
    ]),
  ) as Partial<Record<CareDroidScreenMode, EmergencyScreenKpiId[]>>;
}

function normalizeEnabledScreenModes(
  value: unknown,
  fallback: CareDroidScreenMode[],
): CareDroidScreenMode[] {
  if (!Array.isArray(value)) return fallback;
  const enabled = value
    .map((entry) => normalizeCareDroidScreenMode(entry))
    .filter((entry): entry is CareDroidScreenMode => Boolean(entry));
  return enabled.length ? enabled : fallback;
}

function normalizeScreenModeKpiVisibility(
  value: unknown,
  fallback: Partial<Record<CareDroidScreenMode, EmergencyScreenKpiId[]>>,
): Partial<Record<CareDroidScreenMode, EmergencyScreenKpiId[]>> {
  if (!value || typeof value !== 'object') return fallback;
  const next: Partial<Record<CareDroidScreenMode, EmergencyScreenKpiId[]>> = { ...fallback };

  for (const [rawScreenMode, kpiIds] of Object.entries(value as Record<string, unknown>)) {
    const screenMode = normalizeCareDroidScreenMode(rawScreenMode);
    if (!screenMode || !Array.isArray(kpiIds)) continue;
    const allowed = new Set(EMERGENCY_SCREEN_KPI_POLICY[screenMode] || []);
    const normalized = kpiIds
      .map((entry) => String(entry || '').trim())
      .filter((entry): entry is EmergencyScreenKpiId => allowed.has(entry as EmergencyScreenKpiId));
    if (normalized.length) {
      next[screenMode] = normalized;
    }
  }

  return next;
}

export function normalizeCareDroidScreenModeSettings(
  input: CareDroidScreenModeSettingsInput = {},
  fallback: Partial<NormalizedCareDroidScreenModeSettings> = {},
): NormalizedCareDroidScreenModeSettings {
  const defaultEnabled =
    fallback.enabledScreenModes ||
    normalizeEnabledScreenModes(input.enabledScreenModes, [...CARE_DROID_SCREEN_MODE_OPTIONS]);
  const defaultScreenMode =
    normalizeCareDroidScreenMode(input.defaultScreenMode) ||
    fallback.defaultScreenMode ||
    CARE_DROID_SCREEN_MODES.chargeNurse;

  return {
    defaultScreenMode: defaultEnabled.includes(defaultScreenMode)
      ? defaultScreenMode
      : defaultEnabled[0] || defaultScreenMode,
    enabledScreenModes: defaultEnabled,
    allowedRolesByScreenMode: normalizeAllowedRolesByScreenMode(
      input.allowedRolesByScreenMode,
      fallback.allowedRolesByScreenMode || buildDefaultAllowedRolesByScreenMode(),
    ),
    publicDisplayPrivacy: normalizePublicDisplayPrivacy(
      input.publicDisplayPrivacy,
      fallback.publicDisplayPrivacy || PUBLIC_DISPLAY_PRIVACY_LEVEL.standard,
    ),
    readOnlyWhiteboardPrivacy: normalizeWallDisplayMonitorPrivacy(
      input.wallDisplayMonitorPrivacy,
      fallback.readOnlyWhiteboardPrivacy || WALL_DISPLAY_MONITOR_PRIVACY.operational,
    ),
    wallDisplayRefreshInterval: Math.max(
      5000,
      Number(input.wallDisplayRefreshInterval ?? fallback.wallDisplayRefreshInterval) ||
        DEFAULT_REFRESH_INTERVAL_MS,
    ),
    screenModeKpiVisibility: normalizeScreenModeKpiVisibility(
      input.screenModeKpiVisibility,
      fallback.screenModeKpiVisibility || buildDefaultScreenModeKpiVisibility(),
    ),
  };
}

export function resolveConfiguredScreenModeKpiIds(
  screenMode: CareDroidScreenMode,
  settings: CareDroidScreenModeSettingsInput = {},
): readonly EmergencyScreenKpiId[] {
  const normalized = normalizeCareDroidScreenModeSettings(settings);
  return resolveScreenModeKpiIds(screenMode, {
    screenModeKpiVisibility: normalized.screenModeKpiVisibility,
    publicDisplayPrivacy: normalized.publicDisplayPrivacy,
  });
}

export function listConfigurableScreenModes(
  settings: CareDroidScreenModeSettingsInput = {},
): Array<{
  id: CareDroidScreenMode;
  label: string;
  allowedRoles: EmergencyRoleId[];
  kpiIds: EmergencyScreenKpiId[];
}> {
  const normalized = normalizeCareDroidScreenModeSettings(settings);
  return normalized.enabledScreenModes
    .filter((screenMode) => isValidCareDroidScreenMode(screenMode))
    .map((screenMode) => {
      const definition = listScreenModesForSettings().find((entry) => entry.id === screenMode);
      return {
        id: screenMode,
        label: definition?.label || screenMode.replace(/_/g, ' ').toLowerCase(),
        allowedRoles: normalized.allowedRolesByScreenMode[screenMode] || [],
        kpiIds: [...resolveConfiguredScreenModeKpiIds(screenMode, normalized)],
      };
    });
}

export function buildScreenModeSettingsPatch(
  settings: NormalizedCareDroidScreenModeSettings,
): CareDroidScreenModeSettingsInput {
  return {
    defaultScreenMode: settings.defaultScreenMode,
    enabledScreenModes: [...settings.enabledScreenModes],
    allowedRolesByScreenMode: settings.allowedRolesByScreenMode,
    publicDisplayPrivacy: settings.publicDisplayPrivacy,
    wallDisplayMonitorPrivacy: settings.readOnlyWhiteboardPrivacy,
    wallDisplayRefreshInterval: settings.wallDisplayRefreshInterval,
    screenModeKpiVisibility: settings.screenModeKpiVisibility,
  };
}
