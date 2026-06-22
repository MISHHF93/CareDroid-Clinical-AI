/**
 * EMS_SCREEN workflow model — maps registry widgets/actions to EMS pipeline artifacts.
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

export const EMS_SCREEN_WIDGETS = Object.freeze({
  inboundAmbulances: 'inbound-ambulances',
  etaDisplay: 'eta-display',
  handoffChecklist: 'handoff-checklist',
  offloadTimers: 'offload-timers',
  receivingArea: 'receiving-area',
  encounterConversion: 'encounter-conversion',
  emsPressure: 'ems-pressure',
  operationalStrip: 'operational-strip',
  alerts: 'alerts',
});

export const EMS_SCREEN_ACTIONS = Object.freeze({
  prepareEmsBay: 'prepare-ems-bay',
  convertArrival: 'convert-arrival',
  completeHandoff: 'complete-handoff',
  createPatient: 'create-patient',
  focusReceivingArea: 'focus-receiving-area',
  openOffloadTracker: 'open-offload-tracker',
});

const WIDGET_ALIASES: Record<string, string> = {
  ems: EMS_SCREEN_WIDGETS.inboundAmbulances,
  'offload-tracker': EMS_SCREEN_WIDGETS.offloadTimers,
  capacity: EMS_SCREEN_WIDGETS.emsPressure,
  whiteboard: EMS_SCREEN_WIDGETS.receivingArea,
};

export type EmsScreenCapabilitiesInput = {
  screenMode: CareDroidScreenMode;
  can: (action: string) => boolean;
  role?: string;
  roleLabel?: string;
};

export type EmsScreenCapabilities = {
  isEmsScreen: boolean;
  screenMode: CareDroidScreenMode;
  role: string;
  roleLabel: string;
  defaultFocus: string;
  defaultLandingRoute: string;
  emsPath: string;
  showWidget: (widgetId: string) => boolean;
  canPerform: (actionId: string) => boolean;
  showInboundAmbulances: boolean;
  showEtaDisplay: boolean;
  showHandoffChecklist: boolean;
  showOffloadTimers: boolean;
  showReceivingArea: boolean;
  showEncounterConversion: boolean;
  showEmsPressure: boolean;
  showOperationalStrip: boolean;
  canPrepareEmsBay: boolean;
  canConvertArrival: boolean;
  canCompleteHandoff: boolean;
  canCreatePatient: boolean;
  canFocusReceivingArea: boolean;
  canOpenOffloadTracker: boolean;
  visibleOperationalSurfaces: string[];
};

export function getEmsScreenPath(): string {
  return CANONICAL_ROUTES.emergencyEms;
}

function normalizeEmsWidgetId(widgetId: string): string {
  return WIDGET_ALIASES[widgetId] || widgetId;
}

export function isEmsScreenMode(screenMode: string | CareDroidScreenMode): boolean {
  return screenMode === CARE_DROID_SCREEN_MODES.ems;
}

export function resolveEmsScreenCapabilities(
  input: EmsScreenCapabilitiesInput,
): EmsScreenCapabilities {
  const isEmsScreen = isEmsScreenMode(input.screenMode);
  const definition = getScreenModeDefinition(CARE_DROID_SCREEN_MODES.ems);

  const showWidget = (widgetId: string) => {
    if (!isEmsScreen) return false;
    const normalized = normalizeEmsWidgetId(widgetId);
    return isScreenWidgetVisible(CARE_DROID_SCREEN_MODES.ems, normalized);
  };

  const canPerform = (actionId: string) => {
    if (!isEmsScreen) return false;
    if (!isScreenActionAvailable(CARE_DROID_SCREEN_MODES.ems, actionId)) return false;
    const permission = getScreenModeActionPermission(CARE_DROID_SCREEN_MODES.ems, actionId);
    if (!permission) return true;
    return input.can(permission);
  };

  const showInboundAmbulances = showWidget(EMS_SCREEN_WIDGETS.inboundAmbulances);
  const showEtaDisplay = showWidget(EMS_SCREEN_WIDGETS.etaDisplay);
  const showHandoffChecklist = showWidget(EMS_SCREEN_WIDGETS.handoffChecklist);
  const showOffloadTimers = showWidget(EMS_SCREEN_WIDGETS.offloadTimers);
  const showReceivingArea = showWidget(EMS_SCREEN_WIDGETS.receivingArea);
  const showEncounterConversion = showWidget(EMS_SCREEN_WIDGETS.encounterConversion);
  const showEmsPressure = showWidget(EMS_SCREEN_WIDGETS.emsPressure);
  const showOperationalStrip = showWidget(EMS_SCREEN_WIDGETS.operationalStrip);

  const visibleOperationalSurfaces = [
    showInboundAmbulances ? EMS_SCREEN_WIDGETS.inboundAmbulances : null,
    showEtaDisplay ? EMS_SCREEN_WIDGETS.etaDisplay : null,
    showReceivingArea ? EMS_SCREEN_WIDGETS.receivingArea : null,
    showOffloadTimers ? EMS_SCREEN_WIDGETS.offloadTimers : null,
    showEmsPressure ? EMS_SCREEN_WIDGETS.emsPressure : null,
  ].filter((surface): surface is string => Boolean(surface));

  return {
    isEmsScreen,
    screenMode: input.screenMode,
    role: input.role || '',
    roleLabel: input.roleLabel || 'EMS',
    defaultFocus: definition?.defaultFocus || EMS_SCREEN_WIDGETS.inboundAmbulances,
    defaultLandingRoute: definition?.defaultLandingRoute || getEmsScreenPath(),
    emsPath: getEmsScreenPath(),
    showWidget,
    canPerform,
    showInboundAmbulances,
    showEtaDisplay,
    showHandoffChecklist,
    showOffloadTimers,
    showReceivingArea,
    showEncounterConversion,
    showEmsPressure,
    showOperationalStrip,
    canPrepareEmsBay: canPerform(EMS_SCREEN_ACTIONS.prepareEmsBay),
    canConvertArrival: canPerform(EMS_SCREEN_ACTIONS.convertArrival),
    canCompleteHandoff: canPerform(EMS_SCREEN_ACTIONS.completeHandoff),
    canCreatePatient: canPerform(EMS_SCREEN_ACTIONS.createPatient),
    canFocusReceivingArea: canPerform(EMS_SCREEN_ACTIONS.focusReceivingArea),
    canOpenOffloadTracker: canPerform(EMS_SCREEN_ACTIONS.openOffloadTracker),
    visibleOperationalSurfaces,
  };
}
