import { CANONICAL_ROUTES } from './routes.config';

/**
 * Reception-first platform mode — front desk is the default entry experience.
 */
export const RECEPTION_FIRST_UX = Object.freeze({
  enabled: true,
  platformHomeRoute: CANONICAL_ROUTES.emergencyWhiteboard,
  hideCopilotOnReception: false,
  routeAllIntakeThroughReception: true,
  routePatientSearchThroughReception: true,
  demoteCommandCenterInNav: true,
  pipelineShellEnabled: true,
  redirectStandaloneIntake: true,
  redirectStandaloneQueues: false,
  redirectStandalonePatientsForClerk: false,
  deskUiEnabled: true,
});

export function isReceptionFirstUxEnabled() {
  return RECEPTION_FIRST_UX.enabled;
}

export function getPlatformHomeRoute() {
  return isReceptionFirstUxEnabled()
    ? RECEPTION_FIRST_UX.platformHomeRoute
    : CANONICAL_ROUTES.emergencyWhiteboard;
}
