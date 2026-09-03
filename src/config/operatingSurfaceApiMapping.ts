import type { OperatingSurfaceId } from '../services/emergencyOsApi';

/** Maps ED journey surface ids (path-derived) to Nest operating-surface API ids. */
const JOURNEY_TO_API_SURFACE: Readonly<Record<string, OperatingSurfaceId>> = Object.freeze({
  dispatch: 'dispatch',
  pulse: 'department-pulse',
  shift: 'shift-summary',
  diagnostics: 'diagnostics',
  handoffs: 'handoffs',
  reports: 'reports',
  'ed-readiness': 'ed-readiness',
  'command-center': 'command-center',
  alerts: 'alerts',
  whiteboard: 'whiteboard',
});

export function resolveApiOperatingSurfaceId(
  journeySurfaceId: string | null | undefined,
): OperatingSurfaceId | null {
  if (!journeySurfaceId) return null;
  return JOURNEY_TO_API_SURFACE[journeySurfaceId] ?? null;
}

export function listApiBackedJourneySurfaces(): readonly string[] {
  return Object.freeze(Object.keys(JOURNEY_TO_API_SURFACE));
}
