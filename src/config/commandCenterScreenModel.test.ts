import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { EMERGENCY_ACTIONS, EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import {
  COMMAND_CENTER_PRIMARY_WIDGETS,
  COMMAND_CENTER_SCREEN_WIDGETS,
  getCommandCenterAuthorityPath,
  getCommandCenterWhiteboardPath,
  resolveCommandCenterScreenCapabilities,
} from './commandCenterScreenModel';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';
import { isPractitionerCleanupEnabled } from './practitionerCleanup.config';

describe('commandCenterScreenModel', () => {
  const commandCan = (action: string) =>
    action === EMERGENCY_ACTIONS.viewAnalytics ||
    action === EMERGENCY_ACTIONS.useCopilot ||
    action === EMERGENCY_ACTIONS.manageCapacity ||
    action === EMERGENCY_ACTIONS.queueMove ||
    action === 'analytics.view' ||
    action === 'copilot.use' ||
    action === 'capacity.manage' ||
    action === 'queue.move';

  it('routes command authority to Hospital Command Center', () => {
    expect(getCommandCenterAuthorityPath()).toBe(CANONICAL_ROUTES.emergencyCommandCenter);
  });

  it('keeps whiteboard path for patient-flow drill-down', () => {
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

    if (isPractitionerCleanupEnabled()) {
      expect(command.showTriageBreached).toBe(true);
      expect(command.showWaitingCount).toBe(true);
      expect(command.showCapacityScore).toBe(true);
      expect(command.showEmsInbound).toBe(true);
      expect(command.showProviderBreached).toBe(true);
      expect(command.showReferralsBacklog).toBe(true);
      expect(command.showSystemHealth).toBe(true);
      expect(command.showTriageAwaiting).toBe(false);
      expect(command.showArrivalsByHour).toBe(false);
      expect(command.visibleOperationalSurfaces).toHaveLength(
        COMMAND_CENTER_PRIMARY_WIDGETS.length,
      );
    } else {
      expect(command.showTriageAwaiting).toBe(true);
      expect(command.showLongestUntriagedWait).toBe(true);
      expect(command.showTriageApproachingBreach).toBe(true);
      expect(command.showTriageBreached).toBe(true);
      expect(command.showRapidReviewFlags).toBe(true);
      expect(command.showProviderAwaiting).toBe(true);
      expect(command.showLongestProviderWait).toBe(true);
      expect(command.showProviderApproachingBreach).toBe(true);
      expect(command.showProviderBreached).toBe(true);
      expect(command.showArrivalsByHour).toBe(true);
      expect(command.showWaitingCount).toBe(true);
      expect(command.showLongestWait).toBe(true);
      expect(command.showAvgWaitTriage).toBe(true);
      expect(command.showAvgWaitProvider).toBe(true);
      expect(command.showEmsInbound).toBe(true);
      expect(command.showEmsOffloadDelays).toBe(true);
      expect(command.showOffloadDuration).toBe(true);
      expect(command.showHandoffPending).toBe(true);
      expect(command.showBoardingDuration).toBe(true);
      expect(command.showReferralsBacklog).toBe(true);
      expect(command.showCapacityScore).toBe(true);
      expect(command.showCrowdLevel).toBe(true);
      expect(command.showTrendIndicators).toBe(true);
      expect(command.showLwbsRisk).toBe(true);
      expect(command.showCrowdingForecast).toBe(true);
      expect(command.showSystemHealth).toBe(true);
      expect(command.visibleOperationalSurfaces).toHaveLength(26);
    }

    expect(command.hidePatientGrid).toBe(true);
    expect(command.hideCommandLayer).toBe(true);
    expect(command.defaultFocus).toBe(COMMAND_CENTER_SCREEN_WIDGETS.arrivalsByHour);
    expect(command.commandCenterPath).toBe(CANONICAL_ROUTES.emergencyCommandCenter);
    expect(command.defaultLandingRoute).toBe(CANONICAL_ROUTES.emergencyCommandCenter);
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