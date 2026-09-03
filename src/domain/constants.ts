import { CANONICAL_ROUTES } from '../config/routes.config';
import { ED_APPLICATION } from '../config/edApplication.config';

/** Clinical safety label — required on all Copilot / decision-support surfaces. */
export const CLINICAL_SAFETY_DISCLAIMER = 'Decision support only — requires clinician review.';

/**
 * Unified public route paths for the single CareDroid ED application.
 * Long-form `/emergency/*` paths remain canonical; these are ergonomic aliases.
 */
export const ED_UNIFIED_PUBLIC_ROUTES = Object.freeze({
  login: '/login',
  dashboard: '/dashboard',
  whiteboard: '/whiteboard',
  reception: '/reception',
  triage: '/triage',
  charge: '/charge',
  physician: '/physician',
  patients: '/patients',
  calculators: '/calculators',
  copilot: '/copilot',
  ems: '/ems',
  analytics: '/analytics',
  admin: '/admin',
  displayWhiteboard: '/display/whiteboard',
});

export const ED_APPLICATION_MANIFEST = ED_APPLICATION;

export const ED_DEFAULT_HOME_ROUTE = CANONICAL_ROUTES.emergencyWhiteboard;
