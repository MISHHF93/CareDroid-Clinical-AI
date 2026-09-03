/**
 * READ_ONLY_WHITEBOARD workflow model — hallway / nurse-station operational wall surfaces.
 */
import { CANONICAL_ROUTES } from './routes.config';
import {
  CARE_DROID_SCREEN_MODES,
  getScreenModeDefinition,
  isScreenWidgetVisible,
  type CareDroidScreenMode,
} from './careDroidScreenModes';
import type { DepartmentStatusMetricId } from '../components/whiteboard/departmentStatusScreenModel';

export const READ_ONLY_WHITEBOARD_SCREEN_WIDGETS = Object.freeze({
  waitingCount: 'waiting-count',
  longestWait: 'longest-wait',
  triagePending: 'triage-pending',
  reassessmentsDue: 'reassessments-due',
  emsInbound: 'ems-inbound',
  offloadDelays: 'offload-delays',
  offloadDuration: 'offload-duration',
  handoffPending: 'handoff-pending',
  boarders: 'boarders',
  referralsPending: 'referrals-pending',
  capacityStatus: 'capacity-status',
  departmentStatus: 'department-status',
});

export const READ_ONLY_WHITEBOARD_METRIC_IDS: readonly DepartmentStatusMetricId[] = Object.freeze([
  READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.waitingCount,
  READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.longestWait,
  READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.triagePending,
  READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.reassessmentsDue,
  READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.emsInbound,
  READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.offloadDelays,
  READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.offloadDuration,
  READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.handoffPending,
  READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.boarders,
  READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.referralsPending,
  READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.capacityStatus,
]);

const WIDGET_ALIASES: Record<string, string> = {
  whiteboard: READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.departmentStatus,
  queues: READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.waitingCount,
  capacity: READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.capacityStatus,
  alerts: READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.reassessmentsDue,
  'department-status': READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.departmentStatus,
};

export type ReadOnlyWhiteboardScreenCapabilitiesInput = {
  screenMode: CareDroidScreenMode;
  role?: string;
  roleLabel?: string;
};

export type ReadOnlyWhiteboardScreenCapabilities = {
  isReadOnlyWhiteboardScreen: boolean;
  isKioskMode: boolean;
  screenMode: CareDroidScreenMode;
  role: string;
  roleLabel: string;
  defaultFocus: string;
  defaultLandingRoute: string;
  whiteboardPath: string;
  showWidget: (widgetId: string) => boolean;
  showWaitingCount: boolean;
  showLongestWait: boolean;
  showTriagePending: boolean;
  showReassessmentsDue: boolean;
  showEmsInbound: boolean;
  showOffloadDelays: boolean;
  showBoarders: boolean;
  showReferralsPending: boolean;
  showCapacityStatus: boolean;
  visibleOperationalSurfaces: string[];
  visibleMetricIds: DepartmentStatusMetricId[];
};

export function getReadOnlyWhiteboardPath(): string {
  return `${CANONICAL_ROUTES.emergencyWhiteboard}?display=readonly`;
}

function normalizeReadOnlyWhiteboardWidgetId(widgetId: string): string {
  return WIDGET_ALIASES[widgetId] || widgetId;
}

export function isReadOnlyWhiteboardScreenMode(screenMode: string | CareDroidScreenMode): boolean {
  return screenMode === CARE_DROID_SCREEN_MODES.readOnlyWhiteboard;
}

export function resolveReadOnlyWhiteboardScreenCapabilities(
  input: ReadOnlyWhiteboardScreenCapabilitiesInput,
): ReadOnlyWhiteboardScreenCapabilities {
  const isReadOnlyWhiteboardScreen = isReadOnlyWhiteboardScreenMode(input.screenMode);
  const definition = getScreenModeDefinition(CARE_DROID_SCREEN_MODES.readOnlyWhiteboard);

  const showWidget = (widgetId: string) => {
    if (!isReadOnlyWhiteboardScreen) return false;
    const normalized = normalizeReadOnlyWhiteboardWidgetId(widgetId);
    if (normalized === READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.departmentStatus) {
      return READ_ONLY_WHITEBOARD_METRIC_IDS.some((metricId) =>
        isScreenWidgetVisible(CARE_DROID_SCREEN_MODES.readOnlyWhiteboard, metricId),
      );
    }
    return isScreenWidgetVisible(CARE_DROID_SCREEN_MODES.readOnlyWhiteboard, normalized);
  };

  const showWaitingCount = showWidget(READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.waitingCount);
  const showLongestWait = showWidget(READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.longestWait);
  const showTriagePending = showWidget(READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.triagePending);
  const showReassessmentsDue = showWidget(READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.reassessmentsDue);
  const showEmsInbound = showWidget(READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.emsInbound);
  const showOffloadDelays = showWidget(READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.offloadDelays);
  const showBoarders = showWidget(READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.boarders);
  const showReferralsPending = showWidget(READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.referralsPending);
  const showCapacityStatus = showWidget(READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.capacityStatus);

  const visibleMetricIds = READ_ONLY_WHITEBOARD_METRIC_IDS.filter((metricId) =>
    showWidget(metricId),
  );

  const visibleOperationalSurfaces = [
    showWaitingCount ? READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.waitingCount : null,
    showLongestWait ? READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.longestWait : null,
    showTriagePending ? READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.triagePending : null,
    showReassessmentsDue ? READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.reassessmentsDue : null,
    showEmsInbound ? READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.emsInbound : null,
    showOffloadDelays ? READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.offloadDelays : null,
    showBoarders ? READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.boarders : null,
    showReferralsPending ? READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.referralsPending : null,
    showCapacityStatus ? READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.capacityStatus : null,
  ].filter(Boolean) as string[];

  return {
    isReadOnlyWhiteboardScreen,
    isKioskMode: isReadOnlyWhiteboardScreen,
    screenMode: input.screenMode,
    role: input.role || '',
    roleLabel: input.roleLabel || 'Read-only display',
    defaultFocus: definition?.defaultFocus || READ_ONLY_WHITEBOARD_SCREEN_WIDGETS.waitingCount,
    defaultLandingRoute: definition?.defaultLandingRoute || getReadOnlyWhiteboardPath(),
    whiteboardPath: getReadOnlyWhiteboardPath(),
    showWidget,
    showWaitingCount,
    showLongestWait,
    showTriagePending,
    showReassessmentsDue,
    showEmsInbound,
    showOffloadDelays,
    showBoarders,
    showReferralsPending,
    showCapacityStatus,
    visibleOperationalSurfaces,
    visibleMetricIds,
  };
}

export {
  READ_ONLY_WHITEBOARD_PRIVACY_MODE,
  WALL_DISPLAY_MONITOR_PRIVACY_OPTIONS as READ_ONLY_WHITEBOARD_PRIVACY_OPTIONS,
  resolveReadOnlyWhiteboardPrivacyLabel,
  resolveReadOnlyWhiteboardPrivacyMode,
} from './wallDisplayMonitorPrivacyModel';
