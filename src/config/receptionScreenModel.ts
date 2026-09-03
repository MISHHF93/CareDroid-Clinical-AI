/**
 * RECEPTION_SCREEN workflow model — maps registry widgets/actions to reception artifacts.
 */
import {
  CARE_DROID_SCREEN_MODES,
  getScreenModeActionPermission,
  getScreenModeDefinition,
  isScreenActionAvailable,
  isScreenWidgetVisible,
  type CareDroidScreenMode,
} from './careDroidScreenModes';
import { EMERGENCY_ACTIONS } from './emergencyRolePermissions';
import {
  EMERGENCY_ROLE_ACTIONS,
  gateRoleAction,
  type EmergencyRoleActionPresentation,
} from './emergencyRoleActionMatrix';

export const RECEPTION_SCREEN_WIDGETS = Object.freeze({
  patientSearch: 'patient-search',
  patientLookup: 'patient-lookup',
  patientCreation: 'patient-creation',
  smartIntake: 'smart-intake',
  identityVerification: 'identity-verification',
  encounterCreation: 'encounter-creation',
  queues: 'queues',
  queueAssignment: 'queue-assignment',
  arrivalReasonCapture: 'arrival-reason-capture',
  urgentTriageEscalation: 'urgent-triage-escalation',
  emsPreArrival: 'ems-pre-arrival',
  arrivalBanner: 'arrival-banner',
  prepareChooser: 'prepare-chooser',
  operationalStrip: 'operational-strip',
  triageBreach: 'triage-breach',
  waitingRoomSafetyEscalation: 'waiting-room-safety-escalation',
  processEducation: 'process-education',
  communicationStatus: 'communication-status',
  patientAnswers: 'patient-answers',
});

export const RECEPTION_SCREEN_ACTIONS = Object.freeze({
  searchPatients: 'search-patients',
  createPatient: 'create-patient',
  editDemographics: 'edit-demographics',
  smartIntake: 'smart-intake',
  verifyIdentity: 'verify-identity',
  createEncounter: 'create-encounter',
  assignQueue: 'assign-queue',
  captureArrivalReason: 'capture-arrival-reason',
  receptionEscalate: 'reception-escalate',
  convertEmsArrival: 'convert-ems-arrival',
});

const WIDGET_ALIASES: Record<string, string> = {
  [RECEPTION_SCREEN_WIDGETS.patientSearch]: RECEPTION_SCREEN_WIDGETS.patientLookup,
};

export type ReceptionScreenCapabilitiesInput = {
  screenMode: CareDroidScreenMode;
  can: (action: string) => boolean;
  presentAction?: (actionOrPermission: string) => EmergencyRoleActionPresentation;
  role?: string;
  roleLabel?: string;
};

export type ReceptionScreenCapabilities = {
  isReceptionScreen: boolean;
  screenMode: CareDroidScreenMode;
  role: string;
  roleLabel: string;
  defaultFocus: string;
  defaultLandingRoute: string;
  slimDesk: boolean;
  showWidget: (widgetId: string) => boolean;
  canPerform: (actionId: string) => boolean;
  presentActionFor: (actionId: string) => EmergencyRoleActionPresentation;
  canSearchPatients: boolean;
  canCreatePatient: boolean;
  canVerifyIdentity: boolean;
  canCreateEncounter: boolean;
  canAssignQueue: boolean;
  canCaptureArrivalReason: boolean;
  canEscalateToNurse: boolean;
  canConvertEmsArrival: boolean;
  canOpenSmartIntake: boolean;
  showClinicalTriageAssist: boolean;
};

function normalizeReceptionWidgetId(widgetId: string): string {
  return WIDGET_ALIASES[widgetId] || widgetId;
}

const RECEPTION_ACTION_MATRIX: Partial<Record<string, keyof typeof EMERGENCY_ROLE_ACTIONS>> = {
  [RECEPTION_SCREEN_ACTIONS.createPatient]: 'patientCreate',
  [RECEPTION_SCREEN_ACTIONS.editDemographics]: 'demographicsEdit',
  [RECEPTION_SCREEN_ACTIONS.createEncounter]: 'encounterCreate',
  [RECEPTION_SCREEN_ACTIONS.assignQueue]: 'moveQueue',
};

function resolveReceptionMatrixAction(actionId: string) {
  const key = RECEPTION_ACTION_MATRIX[actionId];
  return key ? EMERGENCY_ROLE_ACTIONS[key] : null;
}

export function isReceptionScreenMode(screenMode: string | CareDroidScreenMode): boolean {
  return screenMode === CARE_DROID_SCREEN_MODES.reception;
}

export function resolveReceptionScreenCapabilities(
  input: ReceptionScreenCapabilitiesInput,
): ReceptionScreenCapabilities {
  const isReceptionScreen = isReceptionScreenMode(input.screenMode);
  const definition = getScreenModeDefinition(CARE_DROID_SCREEN_MODES.reception);

  const showWidget = (widgetId: string) => {
    if (!isReceptionScreen) return false;
    const normalized = normalizeReceptionWidgetId(widgetId);
    return isScreenWidgetVisible(CARE_DROID_SCREEN_MODES.reception, normalized);
  };

  const canPerform = (actionId: string) => {
    if (!isReceptionScreen) return false;
    if (!isScreenActionAvailable(CARE_DROID_SCREEN_MODES.reception, actionId)) return false;
    const permission = getScreenModeActionPermission(CARE_DROID_SCREEN_MODES.reception, actionId);
    if (!permission) return true;
    const matrixAction = resolveReceptionMatrixAction(actionId);
    if (matrixAction) {
      return gateRoleAction(input.presentAction, matrixAction, permission, input.can).enabled;
    }
    return input.can(permission);
  };

  const presentActionFor = (actionId: string) => {
    const permission = getScreenModeActionPermission(CARE_DROID_SCREEN_MODES.reception, actionId);
    const matrixAction = resolveReceptionMatrixAction(actionId);
    if (!matrixAction || !permission) {
      return gateRoleAction(
        undefined,
        EMERGENCY_ROLE_ACTIONS.patientCreate,
        permission || '',
        input.can,
      );
    }
    return gateRoleAction(input.presentAction, matrixAction, permission, input.can);
  };

  const canSearchPatients =
    showWidget(RECEPTION_SCREEN_WIDGETS.patientSearch) &&
    canPerform(RECEPTION_SCREEN_ACTIONS.searchPatients);
  const canCreatePatient = canPerform(RECEPTION_SCREEN_ACTIONS.createPatient);
  const canVerifyIdentity = canPerform(RECEPTION_SCREEN_ACTIONS.verifyIdentity);
  const canCreateEncounter = canPerform(RECEPTION_SCREEN_ACTIONS.createEncounter);
  const canAssignQueue = canPerform(RECEPTION_SCREEN_ACTIONS.assignQueue);
  const canCaptureArrivalReason = canPerform(RECEPTION_SCREEN_ACTIONS.captureArrivalReason);
  const canEscalateToNurse = canPerform(RECEPTION_SCREEN_ACTIONS.receptionEscalate);
  const canConvertEmsArrival = canPerform(RECEPTION_SCREEN_ACTIONS.convertEmsArrival);
  const canOpenSmartIntake =
    showWidget(RECEPTION_SCREEN_WIDGETS.smartIntake) &&
    (canPerform(RECEPTION_SCREEN_ACTIONS.smartIntake) || canVerifyIdentity);

  return {
    isReceptionScreen,
    screenMode: input.screenMode,
    role: input.role || '',
    roleLabel: input.roleLabel || 'Reception',
    defaultFocus: definition?.defaultFocus || 'patient-lookup',
    defaultLandingRoute: definition?.defaultLandingRoute || '/emergency/reception',
    slimDesk: isReceptionScreen,
    showWidget,
    canPerform,
    presentActionFor,
    canSearchPatients,
    canCreatePatient,
    canVerifyIdentity,
    canCreateEncounter,
    canAssignQueue,
    canCaptureArrivalReason,
    canEscalateToNurse,
    canConvertEmsArrival,
    canOpenSmartIntake,
    showClinicalTriageAssist: !isReceptionScreen && input.can(EMERGENCY_ACTIONS.triage),
  };
}
