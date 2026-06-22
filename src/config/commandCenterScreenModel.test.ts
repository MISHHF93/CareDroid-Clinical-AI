import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { EMERGENCY_ACTIONS, EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import {
  COMMAND_CENTER_SCREEN_WIDGETS,
  getCommandCenterWhiteboardPath,
  resolveCommandCenterScreenCapabilities,
} from './commandCenterScreenModel';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';

describe('commandCenterScreenModel', () => {
  const commandCan = (action: string) =>
    action === EMERGENCY_ACTIONS.analyticsView ||
    action === EMERGENCY_ACTIONS.copilotUse ||
    action === EMERGENCY_ACTIONS.manageCapacity ||
    action === EMERGENCY_ACTIONS.queueMove ||
    action === 'analytics.view' ||
    action === 'copilot.use' ||
    action === 'capacity.manage' ||
    action === 'queue.move';

  it('builds command center whiteboard path', () => {
    expect(getCommandCenterWhiteboardPath()).toBe(CANONICAL_ROUTES.emergencyWhiteboard);
  });

  it('enables throughput widgets on COMMAND_CENTER_SCREEN', () => {
    const command = resolveCommandCenterScreenCapabilities({
      screenMode: CARE_DROID_SCREEN_MODES.commandCenter,
      role: EMERGENCY_ROLE_IDS.edManager,
      roleLabel: 'Department Manager',
      can: commandCan,
    });

    expect(command.isCommandCenterScreen).toBe(true);
    expect(command.showArrivalsByHour).toBe(true);
    expect(command.showWaitingRoomOccupancy).toBe(true);
    expect(command.showAvgWaitTriage).toBe(true);
    expect(command.showAvgWaitProvider).toBe(true);
    expect(command.showEmsOffloadDelays).toBe(true);
    expect(command.showBoardingDuration).toBe(true);
    expect(command.showReferralsBacklog).toBe(true);
    expect(command.showLwbsRisk).toBe(true);
    expect(command.showCrowdingForecast).toBe(true);
    expect(command.showSystemHealth).toBe(true);
    expect(command.hidePatientGrid).toBe(true);
    expect(command.hideCommandLayer).toBe(true);
    expect(command.visibleOperationalSurfaces).toHaveLength(10);
    expect(command.defaultFocus).toBe(COMMAND_CENTER_SCREEN_WIDGETS.arrivalsByHour);
    expect(command.analyticsPath).toBe(CANONICAL_ROUTES.emergencyAnalytics);
    expect(command.canPerform('central-review')).toBe(true);
  });

  it('blocks command center widgets outside COMMAND_CENTER_SCREEN', () => {
    const charge = resolveCommandCenterScreenCapabilities({
      screenMode: CARE_DROID_SCREEN_MODES.chargeNurse,
      role: EMERGENCY_ROLE_IDS.chargeNurse,
      can: commandCan,
    });

    expect(charge.isCommandCenterScreen).toBe(false);
    expect(charge.showArrivalsByHour).toBe(false);
    expect(charge.hidePatientGrid).toBe(false);
    expect(charge.visibleOperationalSurfaces).toHaveLength(0);
  });
});
