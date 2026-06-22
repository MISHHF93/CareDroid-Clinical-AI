import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import {
  CARE_DROID_SCREEN_MODES,
  canEditInScreenMode,
  getScreenModeDefaultLandingRoute,
  getScreenModeDefinition,
  isScreenActionAvailable,
  isScreenWidgetVisible,
  isValidCareDroidScreenMode,
  normalizeCareDroidScreenMode,
} from './careDroidScreenModeRegistry';

describe('careDroidScreenModeRegistry', () => {
  it('defines the requested canonical screen mode ids', () => {
    expect(CARE_DROID_SCREEN_MODES.reception).toBe('RECEPTION_SCREEN');
    expect(CARE_DROID_SCREEN_MODES.triage).toBe('TRIAGE_SCREEN');
    expect(CARE_DROID_SCREEN_MODES.ems).toBe('EMS_SCREEN');
    expect(CARE_DROID_SCREEN_MODES.chargeNurse).toBe('CHARGE_NURSE_SCREEN');
    expect(CARE_DROID_SCREEN_MODES.physician).toBe('PHYSICIAN_SCREEN');
    expect(CARE_DROID_SCREEN_MODES.commandCenter).toBe('COMMAND_CENTER_SCREEN');
    expect(CARE_DROID_SCREEN_MODES.readOnlyWhiteboard).toBe('READ_ONLY_WHITEBOARD');
    expect(CARE_DROID_SCREEN_MODES.publicWaiting).toBe('PUBLIC_WAITING_DISPLAY');
    expect(CARE_DROID_SCREEN_MODES.admin).toBe('ADMIN_SCREEN');
  });

  it('normalizes legacy screen mode aliases', () => {
    expect(normalizeCareDroidScreenMode('REGISTRATION_SCREEN')).toBe('RECEPTION_SCREEN');
    expect(normalizeCareDroidScreenMode('WAITING_ROOM_DISPLAY')).toBe('PUBLIC_WAITING_DISPLAY');
    expect(normalizeCareDroidScreenMode('READ_ONLY_DISPLAY')).toBe('READ_ONLY_WHITEBOARD');
    expect(normalizeCareDroidScreenMode('COMMAND_CENTER_DISPLAY')).toBe('COMMAND_CENTER_SCREEN');
    expect(isValidCareDroidScreenMode('REGISTRATION_SCREEN')).toBe(true);
  });

  it('controls widgets, actions, density, and landing routes per mode', () => {
    const reception = getScreenModeDefinition(CARE_DROID_SCREEN_MODES.reception)!;
    expect(reception.density).toBe('comfortable');
    expect(reception.defaultLandingRoute).toBe(CANONICAL_ROUTES.emergencyReception);
    expect(isScreenWidgetVisible(reception.id, 'patient-search')).toBe(true);
    expect(isScreenWidgetVisible(reception.id, 'urgent-triage-escalation')).toBe(true);
    expect(isScreenActionAvailable(reception.id, 'capture-arrival-reason')).toBe(true);
    expect(canEditInScreenMode(reception.id)).toBe(true);

    const publicWaiting = getScreenModeDefinition(CARE_DROID_SCREEN_MODES.publicWaiting)!;
    expect(publicWaiting.readOnly).toBe(true);
    expect(publicWaiting.publicDisplay).toBe(true);
    expect(publicWaiting.phiVisibility).toBe('public_redacted');
    expect(publicWaiting.useMinimalAppChrome).toBe(true);
    expect(getScreenModeDefaultLandingRoute(publicWaiting.id)).toContain('display=waiting-room');
    expect(isScreenActionAvailable(publicWaiting.id, 'create-patient')).toBe(false);
    expect(isScreenWidgetVisible(publicWaiting.id, 'wait-range')).toBe(true);
    expect(isScreenWidgetVisible(publicWaiting.id, 'crowd-level')).toBe(true);
    expect(isScreenWidgetVisible(publicWaiting.id, 'triage-wait')).toBe(true);
    expect(isScreenWidgetVisible(publicWaiting.id, 'care-process-stages')).toBe(true);
    expect(isScreenWidgetVisible(publicWaiting.id, 'patient-guidance')).toBe(true);
    expect(isScreenWidgetVisible(publicWaiting.id, 'symptom-escalation')).toBe(true);

    const chargeNurse = getScreenModeDefinition(CARE_DROID_SCREEN_MODES.chargeNurse)!;
    expect(chargeNurse.defaultFocus).toBe('queue-health');
    expect(isScreenWidgetVisible(chargeNurse.id, 'waiting-room-board')).toBe(true);
    expect(isScreenWidgetVisible(chargeNurse.id, 'provider-wait-breaches')).toBe(true);
    expect(isScreenWidgetVisible(chargeNurse.id, 'offload-delays')).toBe(true);
    expect(isScreenActionAvailable(chargeNurse.id, 'open-referrals')).toBe(true);

    const physician = getScreenModeDefinition(CARE_DROID_SCREEN_MODES.physician)!;
    expect(physician.defaultFocus).toBe('assigned-patients');
    expect(isScreenWidgetVisible(physician.id, 'provider-waiting-queue')).toBe(true);
    expect(isScreenWidgetVisible(physician.id, 'complaint-workflow-launchers')).toBe(true);
    expect(isScreenActionAvailable(physician.id, 'open-copilot')).toBe(true);

    const ems = getScreenModeDefinition(CARE_DROID_SCREEN_MODES.ems)!;
    expect(ems.defaultFocus).toBe('inbound-ambulances');
    expect(isScreenWidgetVisible(ems.id, 'handoff-checklist')).toBe(true);
    expect(isScreenWidgetVisible(ems.id, 'receiving-area')).toBe(true);
    expect(isScreenActionAvailable(ems.id, 'open-offload-tracker')).toBe(true);

    const commandCenter = getScreenModeDefinition(CARE_DROID_SCREEN_MODES.commandCenter)!;
    expect(commandCenter.defaultFocus).toBe('arrivals-by-hour');
    expect(isScreenWidgetVisible(commandCenter.id, 'arrivals-by-hour')).toBe(true);
    expect(isScreenWidgetVisible(commandCenter.id, 'waiting-count')).toBe(true);
    expect(isScreenWidgetVisible(commandCenter.id, 'longest-wait')).toBe(true);
    expect(isScreenWidgetVisible(commandCenter.id, 'avg-wait-triage')).toBe(true);
    expect(isScreenWidgetVisible(commandCenter.id, 'avg-wait-provider')).toBe(true);
    expect(isScreenWidgetVisible(commandCenter.id, 'ems-offload-delays')).toBe(true);
    expect(isScreenWidgetVisible(commandCenter.id, 'boarding-duration')).toBe(true);
    expect(isScreenWidgetVisible(commandCenter.id, 'referrals-backlog')).toBe(true);
    expect(isScreenWidgetVisible(commandCenter.id, 'lwbs-risk')).toBe(true);
    expect(isScreenWidgetVisible(commandCenter.id, 'crowding-forecast')).toBe(true);
    expect(isScreenWidgetVisible(commandCenter.id, 'system-health')).toBe(true);
    expect(isScreenActionAvailable(commandCenter.id, 'central-review')).toBe(true);

    const readOnly = getScreenModeDefinition(CARE_DROID_SCREEN_MODES.readOnlyWhiteboard)!;
    expect(readOnly.readOnly).toBe(true);
    expect(readOnly.publicDisplay).toBe(false);
    expect(readOnly.phiVisibility).toBe('operational');
    expect(canEditInScreenMode(readOnly.id)).toBe(false);
    expect(isScreenWidgetVisible(readOnly.id, 'waiting-count')).toBe(true);
    expect(isScreenWidgetVisible(readOnly.id, 'longest-wait')).toBe(true);
    expect(isScreenWidgetVisible(readOnly.id, 'triage-pending')).toBe(true);
    expect(isScreenWidgetVisible(readOnly.id, 'reassessments-due')).toBe(true);
    expect(isScreenWidgetVisible(readOnly.id, 'ems-inbound')).toBe(true);
    expect(isScreenWidgetVisible(readOnly.id, 'offload-delays')).toBe(true);
    expect(isScreenWidgetVisible(readOnly.id, 'boarders')).toBe(true);
    expect(isScreenWidgetVisible(readOnly.id, 'referrals-pending')).toBe(true);
    expect(isScreenWidgetVisible(readOnly.id, 'capacity-status')).toBe(true);
  });
});
