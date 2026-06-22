import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { EMERGENCY_ACTIONS, EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import {
  PHYSICIAN_SCREEN_ACTIONS,
  PHYSICIAN_SCREEN_WIDGETS,
  getPhysicianWhiteboardPath,
  resolvePhysicianScreenCapabilities,
} from './physicianScreenModel';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';

describe('physicianScreenModel', () => {
  const physicianCan = (action: string) =>
    action === EMERGENCY_ACTIONS.writeNote ||
    action === EMERGENCY_ACTIONS.manageReferral ||
    action === EMERGENCY_ACTIONS.dischargePatient ||
    action === EMERGENCY_ACTIONS.completeReassessment ||
    action === EMERGENCY_ACTIONS.transitionPatient ||
    action === EMERGENCY_ACTIONS.useCopilot ||
    action === 'notes.write' ||
    action === 'referral.create' ||
    action === 'patient.discharge' ||
    action === 'reassessment.complete' ||
    action === 'queue.move' ||
    action === 'copilot.use';

  it('builds physician whiteboard landing path', () => {
    expect(getPhysicianWhiteboardPath()).toBe(CANONICAL_ROUTES.emergencyWhiteboard);
    expect(getPhysicianWhiteboardPath('p-1')).toContain('patient=p-1');
  });

  it('enables physician workflow artifacts on PHYSICIAN_SCREEN', () => {
    const physician = resolvePhysicianScreenCapabilities({
      screenMode: CARE_DROID_SCREEN_MODES.physician,
      role: EMERGENCY_ROLE_IDS.physician,
      roleLabel: 'Physician',
      can: physicianCan,
    });

    expect(physician.isPhysicianScreen).toBe(true);
    expect(physician.showAssignedPatients).toBe(true);
    expect(physician.showProviderWaitingQueue).toBe(true);
    expect(physician.showResultsPending).toBe(true);
    expect(physician.showReferralsPending).toBe(true);
    expect(physician.showDispositionBoarders).toBe(true);
    expect(physician.showPatientJourneyTimeline).toBe(true);
    expect(physician.showCopilotActions).toBe(true);
    expect(physician.showComplaintWorkflowLaunchers).toBe(true);
    expect(physician.showProviderWaitBreaches).toBe(true);
    expect(physician.hideCentralIntake).toBe(true);
    expect(physician.hideReceptionControls).toBe(true);
    expect(physician.hideChargeNurseStrip).toBe(true);
    expect(physician.visibleOperationalSurfaces).toHaveLength(6);
    expect(physician.canReviewPatient).toBe(true);
    expect(physician.canRefer).toBe(true);
    expect(physician.canOpenCopilot).toBe(true);
    expect(physician.canLaunchComplaintWorkflow).toBe(true);
    expect(physician.defaultFocus).toBe(PHYSICIAN_SCREEN_WIDGETS.assignedPatients);
    expect(physician.canPerform(PHYSICIAN_SCREEN_ACTIONS.dischargeWithReview)).toBe(true);
  });

  it('blocks physician actions outside PHYSICIAN_SCREEN', () => {
    const charge = resolvePhysicianScreenCapabilities({
      screenMode: CARE_DROID_SCREEN_MODES.chargeNurse,
      role: EMERGENCY_ROLE_IDS.chargeNurse,
      can: physicianCan,
    });

    expect(charge.isPhysicianScreen).toBe(false);
    expect(charge.showAssignedPatients).toBe(false);
    expect(charge.hideCentralIntake).toBe(false);
    expect(charge.visibleOperationalSurfaces).toEqual([]);
  });

  it('normalizes legacy widget aliases from the registry', () => {
    const physician = resolvePhysicianScreenCapabilities({
      screenMode: CARE_DROID_SCREEN_MODES.physician,
      can: physicianCan,
    });

    expect(physician.showWidget('copilot')).toBe(true);
    expect(physician.showWidget('journey')).toBe(true);
    expect(physician.showWidget('referrals')).toBe(true);
  });
});
