/**
 * Error recovery copy and helpers — preserve workflow context on failures.
 */

export const ERROR_RECOVERY_COPY = Object.freeze({
  intakeForm:
    'Your intake form is preserved. Fix the issue below or retry when connectivity returns.',
  validation: 'Correct the highlighted fields — nothing was submitted.',
  syncStale: 'Showing last known data. Refresh to sync with the server.',
  syncFailed: 'Local workflow saved. Backend sync is pending — retry when ready.',
  handoffPending: 'Patient handoff saved locally. Server sync may still be in progress.',
  matchFailed: 'Could not reach duplicate-check service. Local matches still shown.',
});

export function isLikelyNetworkError(error) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const message = error instanceof Error ? error.message : String(error || '');
  return /network|fetch|failed to fetch|timeout|aborted|offline/i.test(message);
}

const INTERNAL_JAVASCRIPT_ERROR_PATTERNS = [
  /cannot read propert/i,
  /cannot set propert/i,
  /undefined is not/i,
  /null is not/i,
  /is not a function/i,
  /is not iterable/i,
];

export function isInternalJavaScriptErrorMessage(message = '') {
  const normalized = String(message || '').trim();
  if (!normalized) return false;
  return INTERNAL_JAVASCRIPT_ERROR_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function toUserFacingApiErrorMessage(
  error,
  fallback = 'Unable to reach the API. Check backend availability and try again.',
) {
  const detail = error instanceof Error ? error.message : String(error || '');
  if (!detail || isInternalJavaScriptErrorMessage(detail)) {
    return fallback;
  }
  return detail;
}

export function formatApiRecoveryMessage(error, subject = 'changes') {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return `You appear offline. Your ${subject} stay in this workflow — reconnect and try again.`;
  }
  const detail = toUserFacingApiErrorMessage(error, 'Request failed');
  return `Server unavailable. Your ${subject} are preserved here. ${detail}`;
}

export function formatValidationRecoveryMessage(fieldLabel) {
  return fieldLabel
    ? `${fieldLabel} needs attention before continuing. ${ERROR_RECOVERY_COPY.validation}`
    : ERROR_RECOVERY_COPY.validation;
}

export function formatSyncRecoveryMessage(error) {
  const detail = error instanceof Error ? error.message : String(error || 'Sync failed');
  return `${ERROR_RECOVERY_COPY.syncFailed} ${detail}`;
}

export const ERROR_RECOVERY_SURFACE_REGISTRY = Object.freeze([
  { id: 'quick-intake-api', preservesContext: true, hasRetry: true, category: 'api' },
  { id: 'express-register-api', preservesContext: true, hasRetry: true, category: 'api' },
  { id: 'new-patient-intake-api', preservesContext: true, hasRetry: true, category: 'api' },
  { id: 'smart-intake-match', preservesContext: true, hasRetry: true, category: 'api' },
  { id: 'smart-intake-finalize', preservesContext: true, hasRetry: true, category: 'api' },
  { id: 'reception-handoff-sync', preservesContext: true, hasRetry: true, category: 'sync' },
  { id: 'reception-snapshot', preservesContext: true, hasRetry: true, category: 'network' },
  { id: 'whiteboard-refresh', preservesContext: true, hasRetry: true, category: 'sync' },
  { id: 'ems-prearrival', preservesContext: true, hasRetry: true, category: 'network' },
  { id: 'store-init-backend', preservesContext: true, hasRetry: true, category: 'sync' },
]);

export function auditErrorRecoverySurfaces(surfaces = ERROR_RECOVERY_SURFACE_REGISTRY) {
  const incomplete = surfaces.filter((surface) => !surface.preservesContext || !surface.hasRetry);
  return {
    surfaceCount: surfaces.length,
    completeCount: surfaces.length - incomplete.length,
    incompleteIds: incomplete.map((surface) => surface.id),
    passesAudit: incomplete.length === 0,
  };
}
