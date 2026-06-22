/**
 * TRIAGE_SCREEN workflow model — maps registry widgets/actions to triage artifacts.
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

export const TRIAGE_SCREEN_WIDGETS = Object.freeze({
  waitingRoomSafetyBoard: 'waiting-room-safety-board',
  triagePendingQueue: 'triage-pending-queue',
  acuityAssignment: 'acuity-assignment',
  initialVitals: 'initial-vitals',
  reassessmentInterval: 'reassessment-interval',
  highRiskComplaintFlags: 'high-risk-complaint-flags',
  emsHandoffIntake: 'ems-handoff-intake',
  fitToWaitClassification: 'fit-to-wait-classification',
  whiteboard: 'whiteboard',
  smartIntake: 'smart-intake',
  queues: 'queues',
  reassessment: 'reassessment',
  alerts: 'alerts',
  triageBreach: 'triage-breach',
  waitingRoomSafetyEscalation: 'waiting-room-safety-escalation',
  aiTriageAssist: 'ai-triage-assist',
  communicationStatus: 'communication-status',
});

export const TRIAGE_SCREEN_ACTIONS = Object.freeze({
  assignAcuity: 'assign-acuity',
  recordVitals: 'record-vitals',
  setReassessmentInterval: 'set-reassessment-interval',
  flagReassessment: 'flag-reassessment',
  completeReassessment: 'complete-reassessment',
  classifyFitToWait: 'classify-fit-to-wait',
  queueMove: 'queue-move',
  acceptEmsHandoff: 'accept-ems-handoff',
  createPatient: 'create-patient',
  openTriageQueue: 'open-triage-queue',
});

const WIDGET_ALIASES: Record<string, string> = {
  pretriage: TRIAGE_SCREEN_WIDGETS.triagePendingQueue,
  'triage-queue': TRIAGE_SCREEN_WIDGETS.triagePendingQueue,
};

export type TriageScreenCapabilitiesInput = {
  screenMode: CareDroidScreenMode;
  can: (action: string) => boolean;
  role?: string;
  roleLabel?: string;
};

export type TriageScreenCapabilities = {
  isTriageScreen: boolean;
  screenMode: CareDroidScreenMode;
  role: string;
  roleLabel: string;
  defaultFocus: string;
  defaultLandingRoute: string;
  triagePendingQueuePath: string;
  showWidget: (widgetId: string) => boolean;
  canPerform: (actionId: string) => boolean;
  canAssignAcuity: boolean;
  canRecordVitals: boolean;
  canSetReassessmentInterval: boolean;
  canFlagReassessment: boolean;
  canCompleteReassessment: boolean;
  canClassifyFitToWait: boolean;
  canMoveQueue: boolean;
  canAcceptEmsHandoff: boolean;
  canOpenTriageQueue: boolean;
  showAiTriageAssist: boolean;
  showClinicalTriageAssist: boolean;
  showWaitingRoomSafetyBoard: boolean;
  showTriageBreach: boolean;
};

export function getTriagePendingQueuePath(patientId?: string | null): string {
  const params = new URLSearchParams({ queue: 'pretriage' });
  if (patientId) params.set('patient', patientId);
  return `${CANONICAL_ROUTES.emergencyReception}?${params.toString()}`;
}

export function getTriageWhiteboardPath(patientId?: string | null, encounterId?: string | null): string {
  const params = new URLSearchParams();
  if (patientId) params.set('patient', patientId);
  if (encounterId) params.set('encounter', encounterId);
  params.set('filter', 'Triage');
  const query = params.toString();
  return query
    ? `${CANONICAL_ROUTES.emergencyWhiteboard}?${query}`
    : `${CANONICAL_ROUTES.emergencyWhiteboard}?filter=Triage`;
}

function normalizeTriageWidgetId(widgetId: string): string {
  return WIDGET_ALIASES[widgetId] || widgetId;
}

export function isTriageScreenMode(screenMode: string | CareDroidScreenMode): boolean {
  return screenMode === CARE_DROID_SCREEN_MODES.triage;
}

export function resolveTriageScreenCapabilities(
  input: TriageScreenCapabilitiesInput,
): TriageScreenCapabilities {
  const isTriageScreen = isTriageScreenMode(input.screenMode);
  const definition = getScreenModeDefinition(CARE_DROID_SCREEN_MODES.triage);

  const showWidget = (widgetId: string) => {
    if (!isTriageScreen) return false;
    const normalized = normalizeTriageWidgetId(widgetId);
    return isScreenWidgetVisible(CARE_DROID_SCREEN_MODES.triage, normalized);
  };

  const canPerform = (actionId: string) => {
    if (!isTriageScreen) return false;
    if (!isScreenActionAvailable(CARE_DROID_SCREEN_MODES.triage, actionId)) return false;
    const permission = getScreenModeActionPermission(CARE_DROID_SCREEN_MODES.triage, actionId);
    if (!permission) return true;
    return input.can(permission);
  };

  const canAssignAcuity = canPerform(TRIAGE_SCREEN_ACTIONS.assignAcuity);
  const canRecordVitals = canPerform(TRIAGE_SCREEN_ACTIONS.recordVitals);
  const canSetReassessmentInterval = canPerform(TRIAGE_SCREEN_ACTIONS.setReassessmentInterval);
  const canFlagReassessment = canPerform(TRIAGE_SCREEN_ACTIONS.flagReassessment);
  const canCompleteReassessment = canPerform(TRIAGE_SCREEN_ACTIONS.completeReassessment);
  const canClassifyFitToWait = canPerform(TRIAGE_SCREEN_ACTIONS.classifyFitToWait);
  const canMoveQueue = canPerform(TRIAGE_SCREEN_ACTIONS.queueMove);
  const canAcceptEmsHandoff = canPerform(TRIAGE_SCREEN_ACTIONS.acceptEmsHandoff);
  const canOpenTriageQueue = canPerform(TRIAGE_SCREEN_ACTIONS.openTriageQueue);

  return {
    isTriageScreen,
    screenMode: input.screenMode,
    role: input.role || '',
    roleLabel: input.roleLabel || 'Triage Nurse',
    defaultFocus: definition?.defaultFocus || 'triage-pending-queue',
    defaultLandingRoute: definition?.defaultLandingRoute || getTriagePendingQueuePath(),
    triagePendingQueuePath: getTriagePendingQueuePath(),
    showWidget,
    canPerform,
    canAssignAcuity,
    canRecordVitals,
    canSetReassessmentInterval,
    canFlagReassessment,
    canCompleteReassessment,
    canClassifyFitToWait,
    canMoveQueue,
    canAcceptEmsHandoff,
    canOpenTriageQueue,
    showAiTriageAssist:
      showWidget(TRIAGE_SCREEN_WIDGETS.aiTriageAssist) && canAssignAcuity,
    showClinicalTriageAssist: isTriageScreen && canAssignAcuity,
    showWaitingRoomSafetyBoard: showWidget(TRIAGE_SCREEN_WIDGETS.waitingRoomSafetyBoard),
    showWaitingRoomSafetyEscalation: showWidget(TRIAGE_SCREEN_WIDGETS.waitingRoomSafetyEscalation),
    showTriageBreach: showWidget(TRIAGE_SCREEN_WIDGETS.triageBreach),
  };
}
