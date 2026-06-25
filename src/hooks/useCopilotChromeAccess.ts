import { EMERGENCY_ACTIONS } from '../config/emergencyRolePermissions';
import { RECEPTION_FIRST_UX } from '../config/receptionFirstUx.config';
import { usePractitionerSurfaceVisibility } from '../contexts/PractitionerVisibilityContext';
import useEmergencyRolePermissions from './useEmergencyRolePermissions';
import useScreenModeCapabilities from './useScreenModeCapabilities';

export function useCopilotChromeAccess() {
  const emergencyRole = useEmergencyRolePermissions();
  const screenCapabilities = useScreenModeCapabilities();
  const surfaces = usePractitionerSurfaceVisibility();

  const copilotPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.useCopilot);
  const canUseCopilot = copilotPresentation.visible && copilotPresentation.enabled;
  const hiddenOnReception =
    RECEPTION_FIRST_UX.hideCopilotOnReception && screenCapabilities.isRegistrationScreen;
  const showSessionCopilot =
    surfaces.chrome.showSessionCopilot && canUseCopilot && !hiddenOnReception;

  return {
    canUseCopilot,
    showSessionCopilot,
    hiddenOnReception,
    copilotPresentation,
    copilotSurfaces: surfaces.copilot,
  };
}