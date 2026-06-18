import { useMemo } from 'react';
import {
  CARE_DROID_SCREEN_MODE_CONFIG,
  CARE_DROID_SCREEN_MODES,
  type CareDroidScreenMode,
} from '../central-node/careDroidCentralNode';
import { EMERGENCY_OS_BRANDING } from '../config/emergencyOsBranding.config';
import useRouteScreenMode from './useRouteScreenMode';

export type ScreenModeCapabilities = {
  screenMode: CareDroidScreenMode;
  label: string;
  visibleWidgets: readonly string[];
  availableActions: readonly string[];
  showCentralNodeBadge: boolean;
  showOperationalStrip: boolean;
  showReassessAction: boolean;
  showEmsCriticalOverlay: boolean;
  showCapacityEngine: boolean;
  showReassessmentEngine: boolean;
  headerDensity: 'comfortable' | 'compact' | 'wall';
  productLabel: string;
  alertVisibility: 'all' | 'critical' | 'operational' | 'redacted';
  isRegistrationScreen: boolean;
};

const CLINICAL_COMMAND_MODES = new Set<CareDroidScreenMode>([
  CARE_DROID_SCREEN_MODES.triage,
  CARE_DROID_SCREEN_MODES.chargeNurse,
  CARE_DROID_SCREEN_MODES.physician,
  CARE_DROID_SCREEN_MODES.ems,
  CARE_DROID_SCREEN_MODES.commandCenter,
  CARE_DROID_SCREEN_MODES.readOnly,
]);

export function resolveScreenModeCapabilities(
  screenMode: CareDroidScreenMode,
): ScreenModeCapabilities {
  const config = CARE_DROID_SCREEN_MODE_CONFIG[screenMode];
  const isRegistrationScreen = screenMode === CARE_DROID_SCREEN_MODES.registration;

  return {
    screenMode,
    label: config.label,
    visibleWidgets: config.visibleWidgets,
    availableActions: config.availableActions,
    showCentralNodeBadge: !isRegistrationScreen,
    showOperationalStrip: !isRegistrationScreen,
    showReassessAction: CLINICAL_COMMAND_MODES.has(screenMode),
    showEmsCriticalOverlay: !isRegistrationScreen,
    showCapacityEngine: !isRegistrationScreen,
    showReassessmentEngine: !isRegistrationScreen,
    headerDensity: config.density,
    productLabel: isRegistrationScreen
      ? EMERGENCY_OS_BRANDING.receptionName
      : EMERGENCY_OS_BRANDING.productName,
    alertVisibility: config.alertVisibility,
    isRegistrationScreen,
  };
}

export function useScreenModeCapabilities(): ScreenModeCapabilities {
  const screenMode = useRouteScreenMode();
  return useMemo(() => resolveScreenModeCapabilities(screenMode), [screenMode]);
}

export default useScreenModeCapabilities;
