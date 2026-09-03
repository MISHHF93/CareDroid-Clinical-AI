import { EMERGENCY_ACTIONS } from '../config/emergencyRolePermissions';
import { RECEPTION_FIRST_UX } from '../config/receptionFirstUx.config';
import { usePractitionerSurfaceVisibility } from '../contexts/PractitionerVisibilityContext';
import useEmergencyRolePermissions from './useEmergencyRolePermissions';
import useScreenModeCapabilities from './useScreenModeCapabilities';

/**
 * Access flags for CareDroid Copilot (single Unified AI node).
 *
 * Session chrome no longer hosts a second open control — the sidebar nav item
 * `copilot` is the sole entry. `showSessionCopilot` remains false for API
 * compatibility with older callers.
 */
export function useCopilotChromeAccess() {
  const emergencyRole = useEmergencyRolePermissions();
  const screenCapabilities = useScreenModeCapabilities();
  const surfaces = usePractitionerSurfaceVisibility();

  const copilotPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.useCopilot);
  const canUseCopilot = copilotPresentation.visible && copilotPresentation.enabled;
  const hiddenOnReception =
    RECEPTION_FIRST_UX.hideCopilotOnReception && screenCapabilities.isRegistrationScreen;

  return {
    canUseCopilot,
    /** @deprecated Always false — use sidebar nav `copilot` / toggleCopilot only. */
    showSessionCopilot: false as const,
    hiddenOnReception,
    copilotPresentation,
    copilotSurfaces: surfaces.copilot,
  };
}
