import { useMemo } from 'react';
import {
  CARE_DROID_SCREEN_MODE_CONFIG,
  CARE_DROID_SCREEN_MODES,
  canEditInScreenMode,
  getScreenModeDefaultLandingRoute,
  getScreenModePhiVisibility,
  isScreenActionAvailable,
  isScreenWidgetVisible,
  type CareDroidScreenMode,
  type ScreenModePhiVisibility,
} from '../config/careDroidScreenModes';
import { EMERGENCY_OS_BRANDING } from '../config/emergencyOsBranding.config';
import useRouteScreenMode from './useRouteScreenMode';
import {
  isPublicDisplayScreenMode,
  shouldUseMinimalAppChrome,
} from '../config/emergencyRoleScreenMatrix';

export type ScreenModeCapabilities = {
  screenMode: CareDroidScreenMode;
  label: string;
  visibleWidgets: readonly string[];
  availableActions: readonly string[];
  canEdit: boolean;
  phiVisibility: ScreenModePhiVisibility;
  defaultLandingRoute: string;
  defaultFocus: string;
  showCentralNodeBadge: boolean;
  showOperationalStrip: boolean;
  showReassessAction: boolean;
  showEmsCriticalOverlay: boolean;
  showCapacityEngine: boolean;
  showReassessmentEngine: boolean;
  showPatientFlowEngine: boolean;
  showOperationalIntelligenceEngine: boolean;
  showAdministrativeAutomationEngine: boolean;
  headerDensity: 'comfortable' | 'compact' | 'wall';
  productLabel: string;
  alertVisibility: 'all' | 'critical' | 'operational' | 'redacted';
  isReceptionScreen: boolean;
  isTriageScreen: boolean;
  /** @deprecated Use isReceptionScreen */
  isRegistrationScreen: boolean;
  isPublicDisplay: boolean;
  isWallKiosk: boolean;
  useMinimalAppChrome: boolean;
  isWidgetVisible: (widgetId: string) => boolean;
  isActionAvailable: (actionId: string) => boolean;
};

const CLINICAL_COMMAND_MODES = new Set<CareDroidScreenMode>([
  CARE_DROID_SCREEN_MODES.triage,
  CARE_DROID_SCREEN_MODES.chargeNurse,
  CARE_DROID_SCREEN_MODES.physician,
  CARE_DROID_SCREEN_MODES.ems,
  CARE_DROID_SCREEN_MODES.commandCenter,
]);

export function resolveScreenModeCapabilities(
  screenMode: CareDroidScreenMode,
): ScreenModeCapabilities {
  const config = CARE_DROID_SCREEN_MODE_CONFIG[screenMode];
  const isReceptionScreen = screenMode === CARE_DROID_SCREEN_MODES.reception;
  const isTriageScreen = screenMode === CARE_DROID_SCREEN_MODES.triage;
  const isPublicDisplay = isPublicDisplayScreenMode(screenMode);
  const isWallKiosk = shouldUseMinimalAppChrome(screenMode);

  return {
    screenMode,
    label: config.label,
    visibleWidgets: config.visibleWidgets,
    availableActions: config.availableActions,
    canEdit: canEditInScreenMode(screenMode),
    phiVisibility: getScreenModePhiVisibility(screenMode),
    defaultLandingRoute: getScreenModeDefaultLandingRoute(screenMode),
    defaultFocus: config.defaultFocus,
    showCentralNodeBadge: !isReceptionScreen && !isWallKiosk,
    // Reception itself is flagged useMinimalAppChrome (kiosk-style front-desk
    // displays), which would otherwise suppress this via !isWallKiosk too --
    // but Reception should show its OWN kpi pair here, not go pill-less, so
    // it's forced on regardless of that flag.
    showOperationalStrip: isReceptionScreen || !isWallKiosk,
    showReassessAction: (CLINICAL_COMMAND_MODES.has(screenMode) || isTriageScreen) && !isWallKiosk,
    showEmsCriticalOverlay: !isReceptionScreen && !isWallKiosk,
    showCapacityEngine: !isReceptionScreen && !isWallKiosk,
    showReassessmentEngine: !isReceptionScreen && !isWallKiosk,
    showPatientFlowEngine: !isReceptionScreen && !isWallKiosk,
    showOperationalIntelligenceEngine: !isReceptionScreen && !isWallKiosk,
    showAdministrativeAutomationEngine: !isReceptionScreen && !isWallKiosk,
    headerDensity: config.density,
    productLabel: isReceptionScreen
      ? EMERGENCY_OS_BRANDING.receptionName
      : EMERGENCY_OS_BRANDING.productName,
    alertVisibility: config.alertVisibility,
    isReceptionScreen,
    isTriageScreen,
    isRegistrationScreen: isReceptionScreen,
    isPublicDisplay,
    isWallKiosk,
    useMinimalAppChrome: isWallKiosk,
    isWidgetVisible: (widgetId) => isScreenWidgetVisible(screenMode, widgetId),
    isActionAvailable: (actionId) => isScreenActionAvailable(screenMode, actionId),
  };
}

export function useScreenModeCapabilities(): ScreenModeCapabilities {
  const screenMode = useRouteScreenMode();
  return useMemo(() => resolveScreenModeCapabilities(screenMode), [screenMode]);
}

export default useScreenModeCapabilities;
