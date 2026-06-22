/**
 * PUBLIC_WAITING_DISPLAY workflow model — PHI-safe waiting-room wall surfaces.
 */
import { CANONICAL_ROUTES } from './routes.config';
import {
  CARE_DROID_SCREEN_MODES,
  getScreenModeDefinition,
  isScreenWidgetVisible,
  type CareDroidScreenMode,
} from './careDroidScreenModes';

export const PUBLIC_WAITING_SCREEN_WIDGETS = Object.freeze({
  waitRange: 'wait-range',
  crowdLevel: 'crowd-level',
  triageWait: 'triage-wait',
  careProcessStages: 'care-process-stages',
  patientGuidance: 'patient-guidance',
  symptomEscalation: 'symptom-escalation',
});

const WIDGET_ALIASES: Record<string, string> = {
  'queue-health': PUBLIC_WAITING_SCREEN_WIDGETS.crowdLevel,
  'capacity-status': PUBLIC_WAITING_SCREEN_WIDGETS.crowdLevel,
  'wait-estimates': PUBLIC_WAITING_SCREEN_WIDGETS.waitRange,
};

export type PublicWaitingScreenCapabilitiesInput = {
  screenMode: CareDroidScreenMode;
  role?: string;
  roleLabel?: string;
};

export type PublicWaitingScreenCapabilities = {
  isPublicWaitingScreen: boolean;
  screenMode: CareDroidScreenMode;
  role: string;
  roleLabel: string;
  defaultFocus: string;
  defaultLandingRoute: string;
  whiteboardPath: string;
  showWidget: (widgetId: string) => boolean;
  showWaitRange: boolean;
  showCrowdLevel: boolean;
  showTriageWait: boolean;
  showCareProcessStages: boolean;
  showPatientGuidance: boolean;
  showSymptomEscalation: boolean;
  visibleOperationalSurfaces: string[];
};

export function getPublicWaitingDisplayPath(): string {
  return `${CANONICAL_ROUTES.emergencyWhiteboard}?display=waiting-room`;
}

function normalizePublicWaitingWidgetId(widgetId: string): string {
  return WIDGET_ALIASES[widgetId] || widgetId;
}

export function isPublicWaitingScreenMode(screenMode: string | CareDroidScreenMode): boolean {
  return screenMode === CARE_DROID_SCREEN_MODES.publicWaiting;
}

export function resolvePublicWaitingScreenCapabilities(
  input: PublicWaitingScreenCapabilitiesInput,
): PublicWaitingScreenCapabilities {
  const isPublicWaitingScreen = isPublicWaitingScreenMode(input.screenMode);
  const definition = getScreenModeDefinition(CARE_DROID_SCREEN_MODES.publicWaiting);

  const showWidget = (widgetId: string) => {
    if (!isPublicWaitingScreen) return false;
    const normalized = normalizePublicWaitingWidgetId(widgetId);
    return isScreenWidgetVisible(CARE_DROID_SCREEN_MODES.publicWaiting, normalized);
  };

  const showWaitRange = showWidget(PUBLIC_WAITING_SCREEN_WIDGETS.waitRange);
  const showCrowdLevel = showWidget(PUBLIC_WAITING_SCREEN_WIDGETS.crowdLevel);
  const showTriageWait = showWidget(PUBLIC_WAITING_SCREEN_WIDGETS.triageWait);
  const showCareProcessStages = showWidget(PUBLIC_WAITING_SCREEN_WIDGETS.careProcessStages);
  const showPatientGuidance = showWidget(PUBLIC_WAITING_SCREEN_WIDGETS.patientGuidance);
  const showSymptomEscalation = showWidget(PUBLIC_WAITING_SCREEN_WIDGETS.symptomEscalation);

  const visibleOperationalSurfaces = [
    showWaitRange ? PUBLIC_WAITING_SCREEN_WIDGETS.waitRange : null,
    showCrowdLevel ? PUBLIC_WAITING_SCREEN_WIDGETS.crowdLevel : null,
    showTriageWait ? PUBLIC_WAITING_SCREEN_WIDGETS.triageWait : null,
    showCareProcessStages ? PUBLIC_WAITING_SCREEN_WIDGETS.careProcessStages : null,
    showPatientGuidance ? PUBLIC_WAITING_SCREEN_WIDGETS.patientGuidance : null,
    showSymptomEscalation ? PUBLIC_WAITING_SCREEN_WIDGETS.symptomEscalation : null,
  ].filter((surface): surface is string => Boolean(surface));

  return {
    isPublicWaitingScreen,
    screenMode: input.screenMode,
    role: input.role || '',
    roleLabel: input.roleLabel || 'Public display',
    defaultFocus: definition?.defaultFocus || PUBLIC_WAITING_SCREEN_WIDGETS.waitRange,
    defaultLandingRoute: definition?.defaultLandingRoute || getPublicWaitingDisplayPath(),
    whiteboardPath: getPublicWaitingDisplayPath(),
    showWidget,
    showWaitRange,
    showCrowdLevel,
    showTriageWait,
    showCareProcessStages,
    showPatientGuidance,
    showSymptomEscalation,
    visibleOperationalSurfaces,
  };
}
