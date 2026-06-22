import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { EMERGENCY_ACTIONS, EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import {
  EMS_SCREEN_ACTIONS,
  EMS_SCREEN_WIDGETS,
  getEmsScreenPath,
  resolveEmsScreenCapabilities,
} from './emsScreenModel';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';

describe('emsScreenModel', () => {
  const emsCan = (action: string) =>
    action === EMERGENCY_ACTIONS.prepareEmsBay ||
    action === EMERGENCY_ACTIONS.convertEmsArrival ||
    action === EMERGENCY_ACTIONS.completeEmsHandoff ||
    action === EMERGENCY_ACTIONS.createPatient ||
    action === 'ems.prepareBay' ||
    action === 'ems.convertArrival' ||
    action === 'ems.handoff.complete' ||
    action === 'patient.create';

  it('builds EMS landing path', () => {
    expect(getEmsScreenPath()).toBe(CANONICAL_ROUTES.emergencyEms);
  });

  it('enables EMS workflow artifacts on EMS_SCREEN', () => {
    const ems = resolveEmsScreenCapabilities({
      screenMode: CARE_DROID_SCREEN_MODES.ems,
      role: EMERGENCY_ROLE_IDS.emsUser,
      roleLabel: 'EMS',
      can: emsCan,
    });

    expect(ems.isEmsScreen).toBe(true);
    expect(ems.showInboundAmbulances).toBe(true);
    expect(ems.showEtaDisplay).toBe(true);
    expect(ems.showHandoffChecklist).toBe(true);
    expect(ems.showOffloadTimers).toBe(true);
    expect(ems.showReceivingArea).toBe(true);
    expect(ems.showEncounterConversion).toBe(true);
    expect(ems.showEmsPressure).toBe(true);
    expect(ems.showOperationalStrip).toBe(true);
    expect(ems.visibleOperationalSurfaces).toHaveLength(5);
    expect(ems.canPrepareEmsBay).toBe(true);
    expect(ems.canConvertArrival).toBe(true);
    expect(ems.canCompleteHandoff).toBe(true);
    expect(ems.defaultLandingRoute).toBe(CANONICAL_ROUTES.emergencyEms);
    expect(ems.defaultFocus).toBe(EMS_SCREEN_WIDGETS.inboundAmbulances);
    expect(ems.canPerform(EMS_SCREEN_ACTIONS.openOffloadTracker)).toBe(true);
  });

  it('blocks EMS actions outside EMS_SCREEN', () => {
    const charge = resolveEmsScreenCapabilities({
      screenMode: CARE_DROID_SCREEN_MODES.chargeNurse,
      role: EMERGENCY_ROLE_IDS.chargeNurse,
      can: emsCan,
    });

    expect(charge.isEmsScreen).toBe(false);
    expect(charge.showInboundAmbulances).toBe(false);
    expect(charge.canConvertArrival).toBe(false);
    expect(charge.visibleOperationalSurfaces).toEqual([]);
  });

  it('normalizes legacy widget aliases from the registry', () => {
    const ems = resolveEmsScreenCapabilities({
      screenMode: CARE_DROID_SCREEN_MODES.ems,
      can: emsCan,
    });

    expect(ems.showWidget('ems')).toBe(true);
    expect(ems.showWidget('offload-tracker')).toBe(true);
  });
});
