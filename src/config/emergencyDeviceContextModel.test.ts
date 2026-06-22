import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';
import { CANONICAL_ROUTES } from './routes.config';
import {
  EMERGENCY_DEVICE_CONTEXT_IDS,
  EMERGENCY_DEVICE_CONTEXT_STORAGE_KEY,
  normalizeEmergencyDeviceContextId,
  parseEmergencyDeviceContextParam,
  readStoredEmergencyDeviceContext,
  resolveDeviceContextLandingRoute,
  resolveDeviceContextScreenMode,
  writeStoredEmergencyDeviceContext,
} from './emergencyDeviceContextModel';
import { resolveEmergencyScreenMode } from './emergencyRoleScreenMatrix';
import { resolveRoleLandingRoute } from './emergencyRoleNavigationModel';
import { EMERGENCY_ROLE_ID } from './emergencyRoleScreenMatrix';

describe('emergencyDeviceContextModel', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('normalizes device context aliases', () => {
    expect(normalizeEmergencyDeviceContextId('reception')).toBe(
      EMERGENCY_DEVICE_CONTEXT_IDS.receptionDesk,
    );
    expect(normalizeEmergencyDeviceContextId('waiting-room')).toBe(
      EMERGENCY_DEVICE_CONTEXT_IDS.publicWaitingDisplay,
    );
    expect(normalizeEmergencyDeviceContextId('kiosk')).toBe(
      EMERGENCY_DEVICE_CONTEXT_IDS.wallDisplay,
    );
    expect(normalizeEmergencyDeviceContextId('manager-laptop')).toBe(
      EMERGENCY_DEVICE_CONTEXT_IDS.managerLaptop,
    );
  });

  it('persists device context per browser', () => {
    writeStoredEmergencyDeviceContext(EMERGENCY_DEVICE_CONTEXT_IDS.triageStation);
    expect(readStoredEmergencyDeviceContext()).toBe(EMERGENCY_DEVICE_CONTEXT_IDS.triageStation);
    writeStoredEmergencyDeviceContext(null);
    expect(readStoredEmergencyDeviceContext()).toBeNull();
  });

  it('maps device contexts to existing screen modes and landing routes', () => {
    expect(resolveDeviceContextScreenMode(EMERGENCY_DEVICE_CONTEXT_IDS.receptionDesk)).toBe(
      CARE_DROID_SCREEN_MODES.reception,
    );
    expect(resolveDeviceContextScreenMode(EMERGENCY_DEVICE_CONTEXT_IDS.wallDisplay)).toBe(
      CARE_DROID_SCREEN_MODES.readOnlyWhiteboard,
    );
    expect(resolveDeviceContextLandingRoute(EMERGENCY_DEVICE_CONTEXT_IDS.publicWaitingDisplay)).toContain(
      'display=waiting-room',
    );
    expect(resolveDeviceContextLandingRoute(EMERGENCY_DEVICE_CONTEXT_IDS.managerLaptop)).toBe(
      CANONICAL_ROUTES.emergencyWhiteboard,
    );
  });

  it('overrides role landing route without changing the app shell', () => {
    const route = resolveRoleLandingRoute({
      role: EMERGENCY_ROLE_ID.registrationClerk,
      deviceContextId: EMERGENCY_DEVICE_CONTEXT_IDS.managerLaptop,
    });
    expect(route).toBe(CANONICAL_ROUTES.emergencyWhiteboard);
  });

  it('overrides screen mode resolution ahead of role defaults', () => {
    const mode = resolveEmergencyScreenMode({
      role: EMERGENCY_ROLE_ID.registrationClerk,
      pathname: CANONICAL_ROUTES.emergencyReception,
      deviceContextId: parseEmergencyDeviceContextParam('triage-station'),
    });
    expect(mode).toBe(CARE_DROID_SCREEN_MODES.triage);
  });

  it('stores device param values in local storage key namespace', () => {
    writeStoredEmergencyDeviceContext(EMERGENCY_DEVICE_CONTEXT_IDS.chargeNurseWorkstation);
    expect(window.localStorage.getItem(EMERGENCY_DEVICE_CONTEXT_STORAGE_KEY)).toBe(
      EMERGENCY_DEVICE_CONTEXT_IDS.chargeNurseWorkstation,
    );
  });
});
