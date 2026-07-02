import { CARE_DROID_PAGE_ARCHITECTURE } from './caredroidPageArchitecture.config';
import { CANONICAL_ROUTES } from './routes.config';
import { RECEPTION_FIRST_UX } from './receptionFirstUx.config';
import { resolvePlatformLanding, type PlatformLandingInput } from './platformEntryModel';

/**
 * Canonical ED journey page order (pre-arrival → disposition).
 * Platform entry (/start) is optional orientation — not the runtime startup landing.
 */
export const APP_PAGE_JOURNEY_ORDER = Object.freeze(
  CARE_DROID_PAGE_ARCHITECTURE.map((page) =>
    Object.freeze({
      id: page.id,
      label: page.label,
      path: page.path,
      journeyPhase: page.journeyPhase,
      priority: page.priority,
    }),
  ),
);

export const APP_OPTIONAL_ENTRY_PATH = CANONICAL_ROUTES.platformStart;

/** Where the app lands on `/`, `npm start`, and fresh open-access sessions. */
export function resolveAppStartupRoute(input: PlatformLandingInput = {}): string {
  const safeReturn = String(input.returnUrl || '').trim();
  if (
    safeReturn &&
    safeReturn.startsWith('/') &&
    !safeReturn.startsWith('//') &&
    safeReturn !== '/' &&
    !safeReturn.startsWith('/auth') &&
    safeReturn !== APP_OPTIONAL_ENTRY_PATH
  ) {
    return safeReturn;
  }

  if (RECEPTION_FIRST_UX.enabled) {
    return CANONICAL_ROUTES.emergencyReception;
  }

  return resolvePlatformLanding(input);
}