/**
 * CHARGE_NURSE_SCREEN workflow model — maps registry widgets/actions to flow-command artifacts.
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

export const CHARGE_NURSE_SCREEN_WIDGETS = Object.freeze({
  whiteboard: 'whiteboard',
  waitingRoomBoard: 'waiting-room-board',
  queueHealth: 'queue-health',
  reassessmentsDue: 'reassessments-due',
  providerWaitBreaches: 'provider-wait-breaches',
  emsOffloadAggregate: 'ems-offload-aggregate',
  emsInbound: 'ems-inbound',
  offloadDelays: 'offload-delays',
  boarders: 'boarders',
  referralsPending: 'referrals-pending',
  capacityStatus: 'capacity-status',
  crowdLevel: 'crowd-level',
  triageBreach: 'triage-breach',
  waitingRoomSafetyEscalation: 'waiting-room-safety-escalation',
  operationalStrip: 'operational-strip',
  communicationStatus: 'communication-status',
  alerts: 'alerts',
  shiftHandoff: 'shift-handoff',
});

export const CHARGE_NURSE_SCREEN_ACTIONS = Object.freeze({
  createPatient: 'create-patient',
  prepareEmsBay: 'prepare-ems-bay',
  movePatient: 'move-patient',
  staffingRequest: 'staffing-request',
  completeReassessment: 'complete-reassessment',
  manageCapacity: 'manage-capacity',
  openReferrals: 'open-referrals',
  focusOffload: 'focus-offload',
});

const WIDGET_ALIASES: Record<string, string> = {
  capacity: CHARGE_NURSE_SCREEN_WIDGETS.capacityStatus,
  ems: CHARGE_NURSE_SCREEN_WIDGETS.emsInbound,
  reassessment: CHARGE_NURSE_SCREEN_WIDGETS.reassessmentsDue,
  boarding: CHARGE_NURSE_SCREEN_WIDGETS.boarders,
  queues: CHARGE_NURSE_SCREEN_WIDGETS.queueHealth,
};

export type ChargeNurseScreenCapabilitiesInput = {
  screenMode: CareDroidScreenMode;
  can: (action: string) => boolean;
  role?: string;
  roleLabel?: string;
};

export type ChargeNurseScreenCapabilities = {
  isChargeNurseScreen: boolean;
  screenMode: CareDroidScreenMode;
  role: string;
  roleLabel: string;
  defaultFocus: string;
  defaultLandingRoute: string;
  whiteboardPath: string;
  showWidget: (widgetId: string) => boolean;
  canPerform: (actionId: string) => boolean;
  showFullWhiteboard: boolean;
  showWaitingRoomBoard: boolean;
  showQueueHealth: boolean;
  showReassessmentsDue: boolean;
  showProviderWaitBreaches: boolean;
  showEmsOffloadAggregate: boolean;
  showEmsInbound: boolean;
  showOffloadDelays: boolean;
  showBoarders: boolean;
  showReferralsPending: boolean;
  showCapacityStatus: boolean;
  showTriageBreach: boolean;
  showWaitingRoomSafetyEscalation: boolean;
  showOperationalStrip: boolean;
  canMovePatient: boolean;
  canManageCapacity: boolean;
  canCompleteReassessment: boolean;
  canPrepareEmsBay: boolean;
  canRequestStaffing: boolean;
  canOpenReferrals: boolean;
  canFocusOffload: boolean;
  visibleOperationalSurfaces: string[];
};

export function getChargeNurseWhiteboardPath(patientId?: string | null): string {
  const params = new URLSearchParams();
  if (patientId) params.set('patient', patientId);
  const query = params.toString();
  return query
    ? `${CANONICAL_ROUTES.emergencyWhiteboard}?${query}`
    : CANONICAL_ROUTES.emergencyWhiteboard;
}

function normalizeChargeNurseWidgetId(widgetId: string): string {
  return WIDGET_ALIASES[widgetId] || widgetId;
}

export function isChargeNurseScreenMode(screenMode: string | CareDroidScreenMode): boolean {
  return screenMode === CARE_DROID_SCREEN_MODES.chargeNurse;
}

export function resolveChargeNurseScreenCapabilities(
  input: ChargeNurseScreenCapabilitiesInput,
): ChargeNurseScreenCapabilities {
  const isChargeNurseScreen = isChargeNurseScreenMode(input.screenMode);
  const definition = getScreenModeDefinition(CARE_DROID_SCREEN_MODES.chargeNurse);

  const showWidget = (widgetId: string) => {
    if (!isChargeNurseScreen) return false;
    const normalized = normalizeChargeNurseWidgetId(widgetId);
    return isScreenWidgetVisible(CARE_DROID_SCREEN_MODES.chargeNurse, normalized);
  };

  const canPerform = (actionId: string) => {
    if (!isChargeNurseScreen) return false;
    if (!isScreenActionAvailable(CARE_DROID_SCREEN_MODES.chargeNurse, actionId)) return false;
    const permission = getScreenModeActionPermission(CARE_DROID_SCREEN_MODES.chargeNurse, actionId);
    if (!permission) return true;
    return input.can(permission);
  };

  const showFullWhiteboard = showWidget(CHARGE_NURSE_SCREEN_WIDGETS.whiteboard);
  const showWaitingRoomBoard = showWidget(CHARGE_NURSE_SCREEN_WIDGETS.waitingRoomBoard);
  const showQueueHealth = showWidget(CHARGE_NURSE_SCREEN_WIDGETS.queueHealth);
  const showReassessmentsDue = showWidget(CHARGE_NURSE_SCREEN_WIDGETS.reassessmentsDue);
  const showProviderWaitBreaches = showWidget(CHARGE_NURSE_SCREEN_WIDGETS.providerWaitBreaches);
  const showEmsOffloadAggregate = showWidget(CHARGE_NURSE_SCREEN_WIDGETS.emsOffloadAggregate);
  const showEmsInbound = showWidget(CHARGE_NURSE_SCREEN_WIDGETS.emsInbound);
  const showOffloadDelays = showWidget(CHARGE_NURSE_SCREEN_WIDGETS.offloadDelays);
  const showBoarders = showWidget(CHARGE_NURSE_SCREEN_WIDGETS.boarders);
  const showReferralsPending = showWidget(CHARGE_NURSE_SCREEN_WIDGETS.referralsPending);
  const showCapacityStatus = showWidget(CHARGE_NURSE_SCREEN_WIDGETS.capacityStatus);
  const showTriageBreach = showWidget(CHARGE_NURSE_SCREEN_WIDGETS.triageBreach);
  const showWaitingRoomSafetyEscalation = showWidget(
    CHARGE_NURSE_SCREEN_WIDGETS.waitingRoomSafetyEscalation,
  );
  const showOperationalStrip = showWidget(CHARGE_NURSE_SCREEN_WIDGETS.operationalStrip);

  const visibleOperationalSurfaces = [
    showTriageBreach ? CHARGE_NURSE_SCREEN_WIDGETS.triageBreach : null,
    showQueueHealth ? CHARGE_NURSE_SCREEN_WIDGETS.queueHealth : null,
    showReassessmentsDue ? CHARGE_NURSE_SCREEN_WIDGETS.reassessmentsDue : null,
    showProviderWaitBreaches ? CHARGE_NURSE_SCREEN_WIDGETS.providerWaitBreaches : null,
    showWaitingRoomSafetyEscalation
      ? CHARGE_NURSE_SCREEN_WIDGETS.waitingRoomSafetyEscalation
      : null,
    showEmsOffloadAggregate ? CHARGE_NURSE_SCREEN_WIDGETS.emsOffloadAggregate : null,
    showEmsInbound ? CHARGE_NURSE_SCREEN_WIDGETS.emsInbound : null,
    showOffloadDelays ? CHARGE_NURSE_SCREEN_WIDGETS.offloadDelays : null,
    showBoarders ? CHARGE_NURSE_SCREEN_WIDGETS.boarders : null,
    showReferralsPending ? CHARGE_NURSE_SCREEN_WIDGETS.referralsPending : null,
    showCapacityStatus ? CHARGE_NURSE_SCREEN_WIDGETS.capacityStatus : null,
  ].filter((surface): surface is string => Boolean(surface));

  return {
    isChargeNurseScreen,
    screenMode: input.screenMode,
    role: input.role || '',
    roleLabel: input.roleLabel || 'Charge Nurse',
    defaultFocus: definition?.defaultFocus || CHARGE_NURSE_SCREEN_WIDGETS.queueHealth,
    defaultLandingRoute: definition?.defaultLandingRoute || getChargeNurseWhiteboardPath(),
    whiteboardPath: getChargeNurseWhiteboardPath(),
    showWidget,
    canPerform,
    showFullWhiteboard,
    showWaitingRoomBoard,
    showQueueHealth,
    showReassessmentsDue,
    showProviderWaitBreaches,
    showEmsOffloadAggregate,
    showEmsInbound,
    showOffloadDelays,
    showBoarders,
    showReferralsPending,
    showCapacityStatus,
    showTriageBreach,
    showWaitingRoomSafetyEscalation,
    showOperationalStrip,
    canMovePatient: canPerform(CHARGE_NURSE_SCREEN_ACTIONS.movePatient),
    canManageCapacity: canPerform(CHARGE_NURSE_SCREEN_ACTIONS.manageCapacity),
    canCompleteReassessment: canPerform(CHARGE_NURSE_SCREEN_ACTIONS.completeReassessment),
    canPrepareEmsBay: canPerform(CHARGE_NURSE_SCREEN_ACTIONS.prepareEmsBay),
    canRequestStaffing: canPerform(CHARGE_NURSE_SCREEN_ACTIONS.staffingRequest),
    canOpenReferrals: canPerform(CHARGE_NURSE_SCREEN_ACTIONS.openReferrals),
    canFocusOffload: canPerform(CHARGE_NURSE_SCREEN_ACTIONS.focusOffload),
    visibleOperationalSurfaces,
  };
}
