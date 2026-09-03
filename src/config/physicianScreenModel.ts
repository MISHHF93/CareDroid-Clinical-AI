/**
 * PHYSICIAN_SCREEN workflow model — maps registry widgets/actions to clinical review artifacts.
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

export const PHYSICIAN_SCREEN_WIDGETS = Object.freeze({
  assignedPatients: 'assigned-patients',
  providerWaitingQueue: 'provider-waiting-queue',
  providerWaitBreaches: 'provider-wait-breaches',
  resultsPending: 'results-pending',
  referralsPending: 'referrals-pending',
  dispositionBoarders: 'disposition-boarders',
  patientJourneyTimeline: 'patient-journey-timeline',
  copilotActions: 'copilot-actions',
  complaintWorkflowLaunchers: 'complaint-workflow-launchers',
  whiteboard: 'whiteboard',
  patientDetail: 'patient-detail',
  reassessment: 'reassessment',
  operationalStrip: 'operational-strip',
});

export const PHYSICIAN_SCREEN_ACTIONS = Object.freeze({
  reviewPatient: 'review-patient',
  writeNote: 'write-note',
  refer: 'refer',
  dischargeWithReview: 'discharge-with-review',
  completeReassessment: 'complete-reassessment',
  queueMove: 'queue-move',
  openCopilot: 'open-copilot',
  launchComplaintWorkflow: 'launch-complaint-workflow',
});

/** Surfaces hidden on PHYSICIAN_SCREEN — reception desk and low-value admin chrome. */
export const PHYSICIAN_HIDDEN_CONTROLS = Object.freeze({
  receptionControls: 'reception-controls',
  centralIntake: 'central-intake',
  emsOperations: 'ems-operations',
  queueIntelligence: 'queue-intelligence',
  opsDetail: 'ops-detail',
  chargeNurseStrip: 'charge-nurse-strip',
  missionControlAdmin: 'mission-control-admin',
  commandLayer: 'command-layer',
  waitingRoomReceptionStrips: 'waiting-room-reception-strips',
});

export const PHYSICIAN_NAV_EXCLUDED_IDS = Object.freeze([
  'reception',
  'ems',
  'intake',
  'queues',
  'reassessment',
  'capacity',
  'boarding',
  'referrals',
  'integrations',
  'cosmos',
  'settings',
  'shift',
  'pulse',
]);

const WIDGET_ALIASES: Record<string, string> = {
  referrals: PHYSICIAN_SCREEN_WIDGETS.referralsPending,
  copilot: PHYSICIAN_SCREEN_WIDGETS.copilotActions,
  journey: PHYSICIAN_SCREEN_WIDGETS.patientJourneyTimeline,
  'patient-detail': PHYSICIAN_SCREEN_WIDGETS.patientDetail,
};

export type PhysicianScreenCapabilitiesInput = {
  screenMode: CareDroidScreenMode;
  can: (action: string) => boolean;
  role?: string;
  roleLabel?: string;
};

export type PhysicianScreenCapabilities = {
  isPhysicianScreen: boolean;
  screenMode: CareDroidScreenMode;
  role: string;
  roleLabel: string;
  defaultFocus: string;
  defaultLandingRoute: string;
  whiteboardPath: string;
  showWidget: (widgetId: string) => boolean;
  canPerform: (actionId: string) => boolean;
  showAssignedPatients: boolean;
  showProviderWaitingQueue: boolean;
  showProviderWaitBreaches: boolean;
  showResultsPending: boolean;
  showReferralsPending: boolean;
  showDispositionBoarders: boolean;
  showPatientJourneyTimeline: boolean;
  showCopilotActions: boolean;
  showComplaintWorkflowLaunchers: boolean;
  showOperationalStrip: boolean;
  showFullWhiteboard: boolean;
  showPatientDetail: boolean;
  showReassessment: boolean;
  hideReceptionControls: boolean;
  hideCentralIntake: boolean;
  hideEmsOperations: boolean;
  hideQueueIntelligence: boolean;
  hideOpsDetail: boolean;
  hideChargeNurseStrip: boolean;
  hideMissionControlAdmin: boolean;
  hideCommandLayer: boolean;
  hideWaitingRoomReceptionStrips: boolean;
  canReviewPatient: boolean;
  canWriteNote: boolean;
  canRefer: boolean;
  canDischargeWithReview: boolean;
  canCompleteReassessment: boolean;
  canMoveQueue: boolean;
  canOpenCopilot: boolean;
  canLaunchComplaintWorkflow: boolean;
  visibleOperationalSurfaces: string[];
  navExcludedIds: readonly string[];
};

export function getPhysicianWhiteboardPath(patientId?: string | null): string {
  const params = new URLSearchParams();
  if (patientId) params.set('patient', patientId);
  const query = params.toString();
  return query
    ? `${CANONICAL_ROUTES.emergencyWhiteboard}?${query}`
    : CANONICAL_ROUTES.emergencyWhiteboard;
}

function normalizePhysicianWidgetId(widgetId: string): string {
  return WIDGET_ALIASES[widgetId] || widgetId;
}

export function isPhysicianScreenMode(screenMode: string | CareDroidScreenMode): boolean {
  return screenMode === CARE_DROID_SCREEN_MODES.physician;
}

export function resolvePhysicianScreenCapabilities(
  input: PhysicianScreenCapabilitiesInput,
): PhysicianScreenCapabilities {
  const isPhysicianScreen = isPhysicianScreenMode(input.screenMode);
  const definition = getScreenModeDefinition(CARE_DROID_SCREEN_MODES.physician);

  const showWidget = (widgetId: string) => {
    if (!isPhysicianScreen) return false;
    const normalized = normalizePhysicianWidgetId(widgetId);
    return isScreenWidgetVisible(CARE_DROID_SCREEN_MODES.physician, normalized);
  };

  const canPerform = (actionId: string) => {
    if (!isPhysicianScreen) return false;
    if (!isScreenActionAvailable(CARE_DROID_SCREEN_MODES.physician, actionId)) return false;
    const permission = getScreenModeActionPermission(CARE_DROID_SCREEN_MODES.physician, actionId);
    if (!permission) return true;
    return input.can(permission);
  };

  const showAssignedPatients = showWidget(PHYSICIAN_SCREEN_WIDGETS.assignedPatients);
  const showProviderWaitingQueue = showWidget(PHYSICIAN_SCREEN_WIDGETS.providerWaitingQueue);
  const showProviderWaitBreaches = showWidget(PHYSICIAN_SCREEN_WIDGETS.providerWaitBreaches);
  const showResultsPending = showWidget(PHYSICIAN_SCREEN_WIDGETS.resultsPending);
  const showReferralsPending = showWidget(PHYSICIAN_SCREEN_WIDGETS.referralsPending);
  const showDispositionBoarders = showWidget(PHYSICIAN_SCREEN_WIDGETS.dispositionBoarders);
  const showPatientJourneyTimeline = showWidget(PHYSICIAN_SCREEN_WIDGETS.patientJourneyTimeline);
  const showCopilotActions = showWidget(PHYSICIAN_SCREEN_WIDGETS.copilotActions);
  const showComplaintWorkflowLaunchers = showWidget(
    PHYSICIAN_SCREEN_WIDGETS.complaintWorkflowLaunchers,
  );
  const showOperationalStrip = showWidget(PHYSICIAN_SCREEN_WIDGETS.operationalStrip);

  const visibleOperationalSurfaces = [
    showProviderWaitBreaches ? PHYSICIAN_SCREEN_WIDGETS.providerWaitBreaches : null,
    showAssignedPatients ? PHYSICIAN_SCREEN_WIDGETS.assignedPatients : null,
    showProviderWaitingQueue ? PHYSICIAN_SCREEN_WIDGETS.providerWaitingQueue : null,
    showResultsPending ? PHYSICIAN_SCREEN_WIDGETS.resultsPending : null,
    showReferralsPending ? PHYSICIAN_SCREEN_WIDGETS.referralsPending : null,
    showDispositionBoarders ? PHYSICIAN_SCREEN_WIDGETS.dispositionBoarders : null,
  ].filter(Boolean) as string[];

  return {
    isPhysicianScreen,
    screenMode: input.screenMode,
    role: input.role || '',
    roleLabel: input.roleLabel || 'Physician',
    defaultFocus: definition?.defaultFocus || PHYSICIAN_SCREEN_WIDGETS.assignedPatients,
    defaultLandingRoute: definition?.defaultLandingRoute || getPhysicianWhiteboardPath(),
    whiteboardPath: getPhysicianWhiteboardPath(),
    showWidget,
    canPerform,
    showAssignedPatients,
    showProviderWaitingQueue,
    showProviderWaitBreaches,
    showResultsPending,
    showReferralsPending,
    showDispositionBoarders,
    showPatientJourneyTimeline,
    showCopilotActions,
    showComplaintWorkflowLaunchers,
    showOperationalStrip,
    showFullWhiteboard: showWidget(PHYSICIAN_SCREEN_WIDGETS.whiteboard),
    showPatientDetail: showWidget(PHYSICIAN_SCREEN_WIDGETS.patientDetail),
    showReassessment: showWidget(PHYSICIAN_SCREEN_WIDGETS.reassessment),
    hideReceptionControls: isPhysicianScreen,
    hideCentralIntake: isPhysicianScreen,
    hideEmsOperations: isPhysicianScreen,
    hideQueueIntelligence: isPhysicianScreen,
    hideOpsDetail: isPhysicianScreen,
    hideChargeNurseStrip: isPhysicianScreen,
    hideMissionControlAdmin: isPhysicianScreen,
    hideCommandLayer: isPhysicianScreen,
    hideWaitingRoomReceptionStrips: isPhysicianScreen,
    canReviewPatient: canPerform(PHYSICIAN_SCREEN_ACTIONS.reviewPatient),
    canWriteNote: canPerform(PHYSICIAN_SCREEN_ACTIONS.writeNote),
    canRefer: canPerform(PHYSICIAN_SCREEN_ACTIONS.refer),
    canDischargeWithReview: canPerform(PHYSICIAN_SCREEN_ACTIONS.dischargeWithReview),
    canCompleteReassessment: canPerform(PHYSICIAN_SCREEN_ACTIONS.completeReassessment),
    canMoveQueue: canPerform(PHYSICIAN_SCREEN_ACTIONS.queueMove),
    canOpenCopilot: canPerform(PHYSICIAN_SCREEN_ACTIONS.openCopilot),
    canLaunchComplaintWorkflow: canPerform(PHYSICIAN_SCREEN_ACTIONS.launchComplaintWorkflow),
    visibleOperationalSurfaces,
    navExcludedIds: PHYSICIAN_NAV_EXCLUDED_IDS,
  };
}
