import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { EMERGENCY_ACTIONS, EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import {
  CHARGE_NURSE_SCREEN_ACTIONS,
  CHARGE_NURSE_SCREEN_WIDGETS,
  getChargeNurseWhiteboardPath,
  resolveChargeNurseScreenCapabilities,
} from './chargeNurseScreenModel';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';

describe('chargeNurseScreenModel', () => {
  const chargeCan = (action: string) =>
    action === EMERGENCY_ACTIONS.transitionPatient ||
    action === EMERGENCY_ACTIONS.completeReassessment ||
    action === EMERGENCY_ACTIONS.manageCapacity ||
    action === EMERGENCY_ACTIONS.prepareEmsBay ||
    action === EMERGENCY_ACTIONS.reassignWorkload ||
    action === EMERGENCY_ACTIONS.manageReferral ||
    action === EMERGENCY_ACTIONS.completeEmsHandoff ||
    action === 'queue.move' ||
    action === 'reassessment.complete' ||
    action === 'capacity.manage' ||
    action === 'ems.prepareBay' ||
    action === 'workload.reassign' ||
    action === 'referral.create' ||
    action === 'ems.handoff.complete';

  it('builds charge nurse whiteboard landing path', () => {
    expect(getChargeNurseWhiteboardPath()).toBe(CANONICAL_ROUTES.emergencyWhiteboard);
    expect(getChargeNurseWhiteboardPath('p-1')).toContain('patient=p-1');
  });

  it('enables charge nurse workflow artifacts on CHARGE_NURSE_SCREEN', () => {
    const charge = resolveChargeNurseScreenCapabilities({
      screenMode: CARE_DROID_SCREEN_MODES.chargeNurse,
      role: EMERGENCY_ROLE_IDS.chargeNurse,
      roleLabel: 'Charge Nurse',
      can: chargeCan,
    });

    expect(charge.isChargeNurseScreen).toBe(true);
    expect(charge.showWidget(CHARGE_NURSE_SCREEN_WIDGETS.whiteboard)).toBe(true);
    expect(charge.showWidget(CHARGE_NURSE_SCREEN_WIDGETS.waitingRoomBoard)).toBe(true);
    expect(charge.showWidget(CHARGE_NURSE_SCREEN_WIDGETS.queueHealth)).toBe(true);
    expect(charge.showWidget(CHARGE_NURSE_SCREEN_WIDGETS.reassessmentsDue)).toBe(true);
    expect(charge.showWidget(CHARGE_NURSE_SCREEN_WIDGETS.providerWaitBreaches)).toBe(true);
    expect(charge.showWidget(CHARGE_NURSE_SCREEN_WIDGETS.emsInbound)).toBe(true);
    expect(charge.showWidget(CHARGE_NURSE_SCREEN_WIDGETS.offloadDelays)).toBe(true);
    expect(charge.showWidget(CHARGE_NURSE_SCREEN_WIDGETS.boarders)).toBe(true);
    expect(charge.showWidget(CHARGE_NURSE_SCREEN_WIDGETS.referralsPending)).toBe(true);
    expect(charge.showWidget(CHARGE_NURSE_SCREEN_WIDGETS.capacityStatus)).toBe(true);
    expect(charge.showOperationalStrip).toBe(true);
    expect(charge.visibleOperationalSurfaces).toHaveLength(8);
    expect(charge.canMovePatient).toBe(true);
    expect(charge.canManageCapacity).toBe(true);
    expect(charge.canOpenReferrals).toBe(true);
    expect(charge.canFocusOffload).toBe(true);
    expect(charge.defaultLandingRoute).toBe(CANONICAL_ROUTES.emergencyWhiteboard);
    expect(charge.defaultFocus).toBe(CHARGE_NURSE_SCREEN_WIDGETS.queueHealth);
    expect(charge.canPerform(CHARGE_NURSE_SCREEN_ACTIONS.staffingRequest)).toBe(true);
  });

  it('blocks charge nurse actions outside CHARGE_NURSE_SCREEN', () => {
    const physician = resolveChargeNurseScreenCapabilities({
      screenMode: CARE_DROID_SCREEN_MODES.physician,
      role: EMERGENCY_ROLE_IDS.physician,
      can: chargeCan,
    });

    expect(physician.isChargeNurseScreen).toBe(false);
    expect(physician.showQueueHealth).toBe(false);
    expect(physician.canManageCapacity).toBe(false);
    expect(physician.visibleOperationalSurfaces).toEqual([]);
  });

  it('normalizes legacy widget aliases from the registry', () => {
    const charge = resolveChargeNurseScreenCapabilities({
      screenMode: CARE_DROID_SCREEN_MODES.chargeNurse,
      can: chargeCan,
    });

    expect(charge.showWidget('capacity')).toBe(true);
    expect(charge.showWidget('ems')).toBe(true);
    expect(charge.showWidget('boarding')).toBe(true);
  });
});
