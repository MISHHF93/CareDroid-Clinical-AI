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
  triageAwaiting: 'triage-awaiting',
  longestUntriagedWait: 'longest-untriaged-wait',
  triageApproachingBreach: 'triage-approaching-breach',
  triageBreached: 'triage-breached',
  rapidReviewFlags: 'rapid-review-flags',
  providerAwaiting: 'provider-awaiting',
  longestProviderWait: 'longest-provider-wait',
  providerApproachingBreach: 'provider-approaching-breach',
  providerBreached: 'provider-breached',
  arrivalsByHour: 'arrivals-by-hour',
  waitingCount: 'waiting-count',
  waitingRoomOccupancy: 'waiting-room-occupancy',
  longestWait: 'longest-wait',
  avgWaitTriage: 'avg-wait-triage',
  avgWaitProvider: 'avg-wait-provider',
  emsInbound: 'ems-inbound',
  emsOffloadDelays: 'ems-offload-delays',
  offloadDuration: 'offload-duration',
  handoffPending: 'handoff-pending',
  boardingDuration: 'boarding-duration',
  referralsBacklog: 'referrals-backlog',
  capacityScore: 'capacity-score',
  crowdLevel: 'crowd-level',
  trendIndicators: 'trend-indicators',
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
  whiteboard: COMMAND_CENTER_SCREEN_WIDGETS.waitingCount,
  queues: COMMAND_CENTER_SCREEN_WIDGETS.waitingCount,
  ems: COMMAND_CENTER_SCREEN_WIDGETS.emsOffloadDelays,
  capacity: COMMAND_CENTER_SCREEN_WIDGETS.capacityScore,
  boarding: COMMAND_CENTER_SCREEN_WIDGETS.boardingDuration,
  analytics: COMMAND_CENTER_SCREEN_WIDGETS.arrivalsByHour,
  alerts: COMMAND_CENTER_SCREEN_WIDGETS.systemHealth,
  'department-status': COMMAND_CENTER_SCREEN_WIDGETS.systemHealth,
  'waiting-room-occupancy': COMMAND_CENTER_SCREEN_WIDGETS.waitingCount,
  'crowding-forecast': COMMAND_CENTER_SCREEN_WIDGETS.crowdLevel,
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
  showTriageAwaiting: boolean;
  showLongestUntriagedWait: boolean;
  showTriageApproachingBreach: boolean;
  showTriageBreached: boolean;
  showRapidReviewFlags: boolean;
  showProviderAwaiting: boolean;
  showLongestProviderWait: boolean;
  showProviderApproachingBreach: boolean;
  showProviderBreached: boolean;
  showArrivalsByHour: boolean;
  showWaitingCount: boolean;
  showWaitingRoomOccupancy: boolean;
  showLongestWait: boolean;
  showAvgWaitTriage: boolean;
  showAvgWaitProvider: boolean;
  showEmsInbound: boolean;
  showEmsOffloadDelays: boolean;
  showOffloadDuration: boolean;
  showHandoffPending: boolean;
  showBoardingDuration: boolean;
  showReferralsBacklog: boolean;
  showCapacityScore: boolean;
  showCrowdLevel: boolean;
  showTrendIndicators: boolean;
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

  const showTriageAwaiting = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.triageAwaiting);
  const showLongestUntriagedWait = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.longestUntriagedWait);
  const showTriageApproachingBreach = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.triageApproachingBreach);
  const showTriageBreached = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.triageBreached);
  const showRapidReviewFlags = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.rapidReviewFlags);
  const showProviderAwaiting = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.providerAwaiting);
  const showLongestProviderWait = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.longestProviderWait);
  const showProviderApproachingBreach = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.providerApproachingBreach);
  const showProviderBreached = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.providerBreached);
  const showArrivalsByHour = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.arrivalsByHour);
  const showWaitingCount = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.waitingCount);
  const showWaitingRoomOccupancy = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.waitingRoomOccupancy);
  const showLongestWait = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.longestWait);
  const showAvgWaitTriage = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.avgWaitTriage);
  const showAvgWaitProvider = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.avgWaitProvider);
  const showEmsInbound = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.emsInbound);
  const showEmsOffloadDelays = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.emsOffloadDelays);
  const showOffloadDuration = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.offloadDuration);
  const showHandoffPending = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.handoffPending);
  const showBoardingDuration = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.boardingDuration);
  const showReferralsBacklog = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.referralsBacklog);
  const showCapacityScore = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.capacityScore);
  const showCrowdLevel = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.crowdLevel);
  const showTrendIndicators = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.trendIndicators);
  const showLwbsRisk = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.lwbsRisk);
  const showCrowdingForecast = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.crowdingForecast);
  const showSystemHealth = showWidget(COMMAND_CENTER_SCREEN_WIDGETS.systemHealth);

  const visibleOperationalSurfaces = [
    showTriageAwaiting ? COMMAND_CENTER_SCREEN_WIDGETS.triageAwaiting : null,
    showLongestUntriagedWait ? COMMAND_CENTER_SCREEN_WIDGETS.longestUntriagedWait : null,
    showTriageApproachingBreach ? COMMAND_CENTER_SCREEN_WIDGETS.triageApproachingBreach : null,
    showTriageBreached ? COMMAND_CENTER_SCREEN_WIDGETS.triageBreached : null,
    showRapidReviewFlags ? COMMAND_CENTER_SCREEN_WIDGETS.rapidReviewFlags : null,
    showProviderAwaiting ? COMMAND_CENTER_SCREEN_WIDGETS.providerAwaiting : null,
    showLongestProviderWait ? COMMAND_CENTER_SCREEN_WIDGETS.longestProviderWait : null,
    showProviderApproachingBreach ? COMMAND_CENTER_SCREEN_WIDGETS.providerApproachingBreach : null,
    showProviderBreached ? COMMAND_CENTER_SCREEN_WIDGETS.providerBreached : null,
    showArrivalsByHour ? COMMAND_CENTER_SCREEN_WIDGETS.arrivalsByHour : null,
    showWaitingCount ? COMMAND_CENTER_SCREEN_WIDGETS.waitingCount : null,
    showLongestWait ? COMMAND_CENTER_SCREEN_WIDGETS.longestWait : null,
    showAvgWaitTriage ? COMMAND_CENTER_SCREEN_WIDGETS.avgWaitTriage : null,
    showAvgWaitProvider ? COMMAND_CENTER_SCREEN_WIDGETS.avgWaitProvider : null,
    showEmsInbound ? COMMAND_CENTER_SCREEN_WIDGETS.emsInbound : null,
    showEmsOffloadDelays ? COMMAND_CENTER_SCREEN_WIDGETS.emsOffloadDelays : null,
    showOffloadDuration ? COMMAND_CENTER_SCREEN_WIDGETS.offloadDuration : null,
    showHandoffPending ? COMMAND_CENTER_SCREEN_WIDGETS.handoffPending : null,
    showBoardingDuration ? COMMAND_CENTER_SCREEN_WIDGETS.boardingDuration : null,
    showReferralsBacklog ? COMMAND_CENTER_SCREEN_WIDGETS.referralsBacklog : null,
    showCapacityScore ? COMMAND_CENTER_SCREEN_WIDGETS.capacityScore : null,
    showCrowdLevel ? COMMAND_CENTER_SCREEN_WIDGETS.crowdLevel : null,
    showTrendIndicators ? COMMAND_CENTER_SCREEN_WIDGETS.trendIndicators : null,
    showLwbsRisk ? COMMAND_CENTER_SCREEN_WIDGETS.lwbsRisk : null,
    showCrowdingForecast ? COMMAND_CENTER_SCREEN_WIDGETS.crowdingForecast : null,
    showSystemHealth ? COMMAND_CENTER_SCREEN_WIDGETS.systemHealth : null,
  ].filter(Boolean) as string[];

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
    showTriageAwaiting,
    showLongestUntriagedWait,
    showTriageApproachingBreach,
    showTriageBreached,
    showRapidReviewFlags,
    showProviderAwaiting,
    showLongestProviderWait,
    showProviderApproachingBreach,
    showProviderBreached,
    showArrivalsByHour,
    showWaitingCount,
    showWaitingRoomOccupancy,
    showLongestWait,
    showAvgWaitTriage,
    showAvgWaitProvider,
    showEmsInbound,
    showEmsOffloadDelays,
    showOffloadDuration,
    showHandoffPending,
    showBoardingDuration,
    showReferralsBacklog,
    showCapacityScore,
    showCrowdLevel,
    showTrendIndicators,
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
