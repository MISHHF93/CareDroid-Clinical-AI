/**
 * Multi-screen device context — binds a physical workstation to a CareDroid screen mode.
 * Same user account, different device contexts; one app shell, no duplicate renderers.
 * Persists per browser; reuses existing kiosk / read-only wall display modes.
 */
import {
  CARE_DROID_SCREEN_MODES,
  getScreenModeDefaultLandingRoute,
  type CareDroidScreenMode,
} from './careDroidScreenModes';
import { coerceEnabledScreenMode, type EmergencyScreenSettings } from './emergencyRoleScreenMatrix';

export const EMERGENCY_DEVICE_CONTEXT_STORAGE_KEY = 'caredroid.emergency.deviceContext.v1';

export const EMERGENCY_DEVICE_CONTEXT_IDS = Object.freeze({
  receptionDesk: 'reception-desk',
  triageStation: 'triage-station',
  chargeNurseWorkstation: 'charge-nurse-workstation',
  wallDisplay: 'wall-display',
  publicWaitingDisplay: 'public-waiting-display',
  managerLaptop: 'manager-laptop',
} as const);

export type EmergencyDeviceContextId =
  (typeof EMERGENCY_DEVICE_CONTEXT_IDS)[keyof typeof EMERGENCY_DEVICE_CONTEXT_IDS];

export type EmergencyDeviceContextDefinition = {
  id: EmergencyDeviceContextId;
  label: string;
  description: string;
  screenMode: CareDroidScreenMode;
  landingRoute: string;
  /** Reuses wall/kiosk chrome — minimal app shell, auto-refresh surfaces. */
  kiosk: boolean;
  /** Maps to existing read-only whiteboard / hallway monitor behavior. */
  readOnlyWall: boolean;
};

const DEVICE_CONTEXT_ALIASES: Record<string, EmergencyDeviceContextId> = Object.freeze({
  reception: EMERGENCY_DEVICE_CONTEXT_IDS.receptionDesk,
  'reception-desk': EMERGENCY_DEVICE_CONTEXT_IDS.receptionDesk,
  'reception desk': EMERGENCY_DEVICE_CONTEXT_IDS.receptionDesk,
  triage: EMERGENCY_DEVICE_CONTEXT_IDS.triageStation,
  'triage-station': EMERGENCY_DEVICE_CONTEXT_IDS.triageStation,
  'triage station': EMERGENCY_DEVICE_CONTEXT_IDS.triageStation,
  'charge-nurse': EMERGENCY_DEVICE_CONTEXT_IDS.chargeNurseWorkstation,
  'charge-nurse-workstation': EMERGENCY_DEVICE_CONTEXT_IDS.chargeNurseWorkstation,
  'charge nurse': EMERGENCY_DEVICE_CONTEXT_IDS.chargeNurseWorkstation,
  wall: EMERGENCY_DEVICE_CONTEXT_IDS.wallDisplay,
  'wall-display': EMERGENCY_DEVICE_CONTEXT_IDS.wallDisplay,
  kiosk: EMERGENCY_DEVICE_CONTEXT_IDS.wallDisplay,
  readonly: EMERGENCY_DEVICE_CONTEXT_IDS.wallDisplay,
  'read-only': EMERGENCY_DEVICE_CONTEXT_IDS.wallDisplay,
  'public-waiting': EMERGENCY_DEVICE_CONTEXT_IDS.publicWaitingDisplay,
  'public-waiting-display': EMERGENCY_DEVICE_CONTEXT_IDS.publicWaitingDisplay,
  'waiting-room': EMERGENCY_DEVICE_CONTEXT_IDS.publicWaitingDisplay,
  manager: EMERGENCY_DEVICE_CONTEXT_IDS.managerLaptop,
  'manager-laptop': EMERGENCY_DEVICE_CONTEXT_IDS.managerLaptop,
  'command-center': EMERGENCY_DEVICE_CONTEXT_IDS.managerLaptop,
});

export const EMERGENCY_DEVICE_CONTEXT_REGISTRY: readonly EmergencyDeviceContextDefinition[] =
  Object.freeze([
    Object.freeze({
      id: EMERGENCY_DEVICE_CONTEXT_IDS.receptionDesk,
      label: 'Reception desk terminal',
      description: 'Front-desk registration, verification, and arrival queues.',
      screenMode: CARE_DROID_SCREEN_MODES.reception,
      landingRoute: getScreenModeDefaultLandingRoute(CARE_DROID_SCREEN_MODES.reception),
      kiosk: false,
      readOnlyWall: false,
    }),
    Object.freeze({
      id: EMERGENCY_DEVICE_CONTEXT_IDS.triageStation,
      label: 'Triage station',
      description: 'Pre-triage queue, acuity assignment, and EMS handoff intake.',
      screenMode: CARE_DROID_SCREEN_MODES.triage,
      landingRoute: getScreenModeDefaultLandingRoute(CARE_DROID_SCREEN_MODES.triage),
      kiosk: false,
      readOnlyWall: false,
    }),
    Object.freeze({
      id: EMERGENCY_DEVICE_CONTEXT_IDS.chargeNurseWorkstation,
      label: 'Charge nurse workstation',
      description: 'Flow command whiteboard with queue health and capacity signals.',
      screenMode: CARE_DROID_SCREEN_MODES.chargeNurse,
      landingRoute: getScreenModeDefaultLandingRoute(CARE_DROID_SCREEN_MODES.chargeNurse),
      kiosk: false,
      readOnlyWall: false,
    }),
    Object.freeze({
      id: EMERGENCY_DEVICE_CONTEXT_IDS.wallDisplay,
      label: 'Wall display',
      description: 'Hallway / nurse-station read-only operations wall — reuses kiosk mode.',
      screenMode: CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
      landingRoute: getScreenModeDefaultLandingRoute(CARE_DROID_SCREEN_MODES.readOnlyWhiteboard),
      kiosk: true,
      readOnlyWall: true,
    }),
    Object.freeze({
      id: EMERGENCY_DEVICE_CONTEXT_IDS.publicWaitingDisplay,
      label: 'Public waiting display',
      description: 'PHI-safe waiting room wall — crowd level and wait messaging only.',
      screenMode: CARE_DROID_SCREEN_MODES.publicWaiting,
      landingRoute: getScreenModeDefaultLandingRoute(CARE_DROID_SCREEN_MODES.publicWaiting),
      kiosk: true,
      readOnlyWall: false,
    }),
    Object.freeze({
      id: EMERGENCY_DEVICE_CONTEXT_IDS.managerLaptop,
      label: 'Manager laptop',
      description: 'Director / manager throughput and command center surfaces.',
      screenMode: CARE_DROID_SCREEN_MODES.commandCenter,
      landingRoute: getScreenModeDefaultLandingRoute(CARE_DROID_SCREEN_MODES.commandCenter),
      kiosk: false,
      readOnlyWall: false,
    }),
  ]);

const DEVICE_CONTEXT_BY_ID = Object.freeze(
  Object.fromEntries(EMERGENCY_DEVICE_CONTEXT_REGISTRY.map((entry) => [entry.id, entry])),
) as Record<EmergencyDeviceContextId, EmergencyDeviceContextDefinition>;

function normalizeDeviceContextToken(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, ' ');
}

export function isEmergencyDeviceContextId(value: unknown): value is EmergencyDeviceContextId {
  return typeof value === 'string' && Boolean(DEVICE_CONTEXT_BY_ID[value as EmergencyDeviceContextId]);
}

export function normalizeEmergencyDeviceContextId(
  value: unknown,
): EmergencyDeviceContextId | null {
  const normalized = normalizeDeviceContextToken(String(value || ''));
  if (!normalized) return null;
  if (isEmergencyDeviceContextId(normalized)) return normalized;
  return DEVICE_CONTEXT_ALIASES[normalized] || null;
}

export function getEmergencyDeviceContextDefinition(
  id: EmergencyDeviceContextId,
): EmergencyDeviceContextDefinition {
  return DEVICE_CONTEXT_BY_ID[id];
}

export function listEmergencyDeviceContexts(): readonly EmergencyDeviceContextDefinition[] {
  return EMERGENCY_DEVICE_CONTEXT_REGISTRY;
}

export function readStoredEmergencyDeviceContext(): EmergencyDeviceContextId | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(EMERGENCY_DEVICE_CONTEXT_STORAGE_KEY);
    return normalizeEmergencyDeviceContextId(raw);
  } catch {
    return null;
  }
}

export function writeStoredEmergencyDeviceContext(id: EmergencyDeviceContextId | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!id) {
      window.localStorage.removeItem(EMERGENCY_DEVICE_CONTEXT_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(EMERGENCY_DEVICE_CONTEXT_STORAGE_KEY, id);
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function parseEmergencyDeviceContextParam(
  value: string | null | undefined,
): EmergencyDeviceContextId | null {
  return normalizeEmergencyDeviceContextId(value);
}

export function resolveDeviceContextScreenMode(
  deviceContextId: EmergencyDeviceContextId | null | undefined,
  settings: EmergencyScreenSettings = {},
): CareDroidScreenMode | null {
  if (!deviceContextId) return null;
  const definition = DEVICE_CONTEXT_BY_ID[deviceContextId];
  if (!definition) return null;
  return coerceEnabledScreenMode(definition.screenMode, settings.enabledScreenModes);
}

export function resolveDeviceContextLandingRoute(
  deviceContextId: EmergencyDeviceContextId | null | undefined,
): string | null {
  if (!deviceContextId) return null;
  return DEVICE_CONTEXT_BY_ID[deviceContextId]?.landingRoute || null;
}

export function isDeviceContextKiosk(
  deviceContextId: EmergencyDeviceContextId | null | undefined,
): boolean {
  if (!deviceContextId) return false;
  return Boolean(DEVICE_CONTEXT_BY_ID[deviceContextId]?.kiosk);
}

export function isDeviceContextReadOnlyWall(
  deviceContextId: EmergencyDeviceContextId | null | undefined,
): boolean {
  if (!deviceContextId) return false;
  return Boolean(DEVICE_CONTEXT_BY_ID[deviceContextId]?.readOnlyWall);
}

export function resolveEffectiveDeviceContextId(input: {
  deviceParam?: string | null;
  storedDeviceContext?: EmergencyDeviceContextId | null;
} = {}): EmergencyDeviceContextId | null {
  return (
    parseEmergencyDeviceContextParam(input.deviceParam) ||
    input.storedDeviceContext ||
    readStoredEmergencyDeviceContext()
  );
}
