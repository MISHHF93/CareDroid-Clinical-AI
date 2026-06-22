import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { EMERGENCY_ACTIONS, EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import {
  TRIAGE_SCREEN_ACTIONS,
  TRIAGE_SCREEN_WIDGETS,
  getTriagePendingQueuePath,
  getTriageWhiteboardPath,
  resolveTriageScreenCapabilities,
} from './triageScreenModel';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';

describe('triageScreenModel', () => {
  const triageCan = (action: string) =>
    action === EMERGENCY_ACTIONS.triage ||
    action === EMERGENCY_ACTIONS.writeVitals ||
    action === EMERGENCY_ACTIONS.manageFlags ||
    action === EMERGENCY_ACTIONS.completeReassessment ||
    action === EMERGENCY_ACTIONS.transitionPatient ||
    action === EMERGENCY_ACTIONS.completeEmsHandoff ||
    action === 'triage.assign_acuity' ||
    action === 'vitals.write' ||
    action === 'flags.manage' ||
    action === 'reassessment.complete' ||
    action === 'queue.move' ||
    action === 'ems.handoff.complete';

  it('builds reception pretriage paths for fast handoff', () => {
    expect(getTriagePendingQueuePath()).toContain('queue=pretriage');
    expect(getTriagePendingQueuePath('p-1')).toContain('patient=p-1');
    expect(getTriageWhiteboardPath('p-1', 'e-1')).toContain('filter=Triage');
  });

  it('enables triage workflow artifacts on TRIAGE_SCREEN', () => {
    const triage = resolveTriageScreenCapabilities({
      screenMode: CARE_DROID_SCREEN_MODES.triage,
      role: EMERGENCY_ROLE_IDS.triageNurse,
      roleLabel: 'Triage Nurse',
      can: triageCan,
    });

    expect(triage.isTriageScreen).toBe(true);
    expect(triage.showWidget(TRIAGE_SCREEN_WIDGETS.triagePendingQueue)).toBe(true);
    expect(triage.showWidget(TRIAGE_SCREEN_WIDGETS.acuityAssignment)).toBe(true);
    expect(triage.showWidget(TRIAGE_SCREEN_WIDGETS.fitToWaitClassification)).toBe(true);
    expect(triage.showWidget(TRIAGE_SCREEN_WIDGETS.waitingRoomSafetyBoard)).toBe(true);
    expect(triage.showWaitingRoomSafetyBoard).toBe(true);
    expect(triage.canAssignAcuity).toBe(true);
    expect(triage.canRecordVitals).toBe(true);
    expect(triage.canClassifyFitToWait).toBe(true);
    expect(triage.canAcceptEmsHandoff).toBe(true);
    expect(triage.showAiTriageAssist).toBe(true);
    expect(triage.defaultLandingRoute).toContain('queue=pretriage');
    expect(triage.canPerform(TRIAGE_SCREEN_ACTIONS.openTriageQueue)).toBe(true);
  });

  it('blocks triage actions outside TRIAGE_SCREEN', () => {
    const reception = resolveTriageScreenCapabilities({
      screenMode: CARE_DROID_SCREEN_MODES.reception,
      role: EMERGENCY_ROLE_IDS.registrationClerk,
      can: () => false,
    });

    expect(reception.isTriageScreen).toBe(false);
    expect(reception.canAssignAcuity).toBe(false);
    expect(reception.showAiTriageAssist).toBe(false);
  });
});
