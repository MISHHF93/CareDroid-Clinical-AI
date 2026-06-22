/**
 * COMMAND_CENTER_SCREEN workflow model — manager / director throughput surfaces.
 */
import { CANONICAL_ROUTES } from './routes.config';
import {
  CARE_DROID_SCREEN_MODES,
  getScreenModeActionPermission,
  getScreenModeDefinition,
  isScreenActionAvailable,
  isScreenWidgetVisible,
  type CareDroidScreenMode,
} from './careDroidScreenModes';

export const COMMAND_CENTER_SCREEN_WIDGETS = Object.freeze({
  arrivalsByHour: 'arrivals-by-hour',
  waitingRoomOccupancy: 'waiting-room-occupancy',
  avgWaitTriage: 'avg-wait-triage',
  avgWaitProvider: 'avg-wait-provider',
  emsOffloadDelays: 'ems-offload-delays',
  boardingDuration: 'boarding-duration',
  referralsBacklog: 'referrals-backlog',
  lwbsRisk: 'lwbs-risk',
  crowdingForecast: 'crowding-forecast',
  systemHealth: 'system-health',
});

export const COMMAND_CENTER_HIDDEN_CONTROLS = Object.freeze({
  patientGrid: 'patient-grid',
  missionControl: 'mission-control',
  commandLayer: 'command-layer',
  queueIntelligence: 'queue-intelligence',
  opsDetail: 'ops-detail',
  chargeNurseStrip: 'charge-nurse-strip',
  waitingRoomSafety: 'waiting-room-safety',
});

const WIDGET_ALIASES: Record<string, string> = {
  whiteboard: COMMAND_CENTER_SCREEN_WIDGETS.waitingRoomOccupancy,
  queues: COMMAND_CENTER_SCREEN_WIDGETS.waitingRoomOccupancy,
  ems: COMMAND_CENTER_SCREEN_WIDGETS.emsOffloadDelays,
  capacity: COMMAND_CENTER_SCREEN_WIDGETS.crowdingForecast,
  boarding: COMMAND_CENTER_SCREEN_WIDGETS.boardingDuration,
  analytics: COMMAND_CENTER_SCREEN_WIDGETS.arrivalsByHour,
  alerts: COMMAND_CENTER_SCREEN_WIDGETS.systemHealth,
  'department-status': COMMAND_CENTER_SCREEN_WIDGETS.systemHealth,
};

export type CommandCenterScreenCapabilitiesInput = {
  screenMode: CareDroidScreenMode;
  can: (action: string) => boolean;
  role?: string;
  roleLabel?: string;
};

export type CommandCenterScreenCapabilities = {
  isCommandCenterScreen: boolean;
  screenMode: CareDroidScreenMode;
  role: string;
  roleLabel: string;
  defaultFocus: string;
  defaultLandingRoute: string;
  whiteboardPath: string;
  analyticsPath: string;
  showWidget: (widgetId: string) => boolean;
  canPerform: (actionId: string) => boolean;
  showArrivalsByHour: boolean;
  showWaitingRoomOccupancy: boolean;
  showAvgWaitTriage: boolean;
  showAvgWaitProvider: boolean;
  showEmsOffloadDelays: boolean;
  showBoardingDuration: boolean;
  showReferralsBacklog: boolean;
  showLwbsRisk: boolean;
  showCrowdingForecast: boolean;
  showSystemHealth: boolean;
  hidePatientGrid: boolean;
  hideMissionControl: boolean;
  hideCommandLayer: boolean;
  hideQueueIntelligence: boolean;
  hideOpsDetail: boolean;
  hideChargeNurseStrip: boolean;
  hideWaitingRoomSafety: boolean;
  visibleOperationalSurfaces: string[];
};

export function getCommandCenterWhiteboardPath(): string {
  return CANONICAL_ROUTES.emergencyWhiteboard;
}

function normalizeCommandCenterWidgetId(widgetId: string): string {
  return WIDGET_ALIASES[widgetId] || widgetId;
}

export function isCommandCenterScreenMode(screenMode: string | CareDroidScreenMode): boolean {
  return screenMode === CARE_DROID_SCREEN_MODES.commandCenter;
}

export function resolveCommandCenterScreenCapabilities(
  input: CommandCenterScreenCapabilitiesInput,
): CommandCenterScreenCapabilities {
  const isCommandCenterScreen = isCommandCenterScreenMode(input.screenMode);
  const definition = getScreenModeDefinition(CARE_DROID_SCREEN_MODES.commandCenter);

  const showWidget = (widgetId: string) => {
    if (!isCommandCenterScreen) return false;
    const normalized = normalizeCommandCenterWidgetId(widgetId);
    return isScreenWidgetVisible(CARE_DROID_SCREEN_MODES.commandCenter, normalized);
  };

  const canPerform = (actionId: string) => {
    if (!isCommandCenterScreen) return false;
    if (!isScreenActionAvailable(CARE_DROID_SCREEN_MODES.commandCenter, actionId)) return false;
    const permission = getScreenModeActionPermission(CARE_DROID_SCREEN_MODES.commandCenter, actionId);
    if (!permission) return true;
    return input.can(permission);
  };

  const showArrivalsByHour = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.arrivalsByHour);
  const showWaitingRoomOccupancy = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.waitingRoomOccupancy);
  const showAvgWaitTriage = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.avgWaitTriage);
  const showAvgWaitProvider = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.avgWaitProvider);
  const showEmsOffloadDelays = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.emsOffloadDelays);
  const showBoardingDuration = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.boardingDuration);
  const showReferralsBacklog = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.referralsBacklog);
  const showLwbsRisk = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.lwbsRisk);
  const showCrowdingForecast = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.crowdingForecast);
  const showSystemHealth = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.systemHealth);

  const visibleOperationalSurfaces = [
    showArrivalsByHour ? COMMAND_CENTER_SCREEN_WIDGETS.arrivalsByHour : null,
    showWaitingRoomOccupancy ? COMMAND_CENTER_SCREEN_WIDGETS.waitingRoomOccupancy : null,
    showAvgWaitTriage ? COMMAND_CENTER_SCREEN_WIDGETS.avgWaitTriage : null,
    showAvgWaitProvider ? COMMAND_CENTER_SCREEN_WIDGETS.avgWaitProvider : null,
    showEmsOffloadDelays ? COMMAND_CENTER_SCREEN_WIDGETS.emsOffloadDelays : null,
    showBoardingDuration ? COMMAND_CENTER_SCREEN_WIDGETS.boardingDuration : null,
    showReferralsBacklog ? COMMAND_CENTER_SCREEN_WIDGETS.referralsBacklog : null,
    showLwbsRisk ? COMMAND_CENTER_SCREEN_WIDGETS.lwbsRisk : null,
    showCrowdingForecast ? COMMAND_CENTER_SCREEN_WIDGETS.crowdingForecast : null,
    showSystemHealth ? COMMAND_CENTER_SCREEN_WIDGETS.systemHealth : null,
  ].filter((surface): surface is string => Boolean(surface));

  return {
    isCommandCenterScreen,
    screenMode: input.screenMode,
    role: input.role || '',
    roleLabel: input.roleLabel || 'Command center',
    defaultFocus: definition?.defaultFocus || COMMAND_CENTER_SCREEN_WIDGETS.arrivalsByHour,
    defaultLandingRoute: definition?.defaultLandingRoute || getCommandCenterWhiteboardPath(),
    whiteboardPath: getCommandCenterWhiteboardPath(),
    analyticsPath: CANONICAL_ROUTES.emergencyAnalytics,
    showWidget,
    canPerform,
    showArrivalsByHour,
    showWaitingRoomOccupancy,
    showAvgWaitTriage,
    showAvgWaitProvider,
    showEmsOffloadDelays,
    showBoardingDuration,
    showReferralsBacklog,
    showLwbsRisk,
    showCrowdingForecast,
    showSystemHealth,
    hidePatientGrid: isCommandCenterScreen,
    hideMissionControl: isCommandCenterScreen,
    hideCommandLayer: isCommandCenterScreen,
    hideQueueIntelligence: isCommandCenterScreen,
    hideOpsDetail: isCommandCenterScreen,
    hideChargeNurseStrip: isCommandCenterScreen,
    hideWaitingRoomSafety: isCommandCenterScreen,
    visibleOperationalSurfaces,
  };
}
