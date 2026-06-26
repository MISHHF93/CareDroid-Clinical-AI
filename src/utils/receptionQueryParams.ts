import { CANONICAL_ROUTES } from '../config/routes.config';

/** Canonical patient deep-link keys across reception and whiteboard routes. */
export const PATIENT_ROUTE_PARAM_KEYS = Object.freeze({
  context: 'patientId',
  queue: 'patient',
  handoff: 'arrived',
});

const ALL_PATIENT_ROUTE_KEYS = Object.values(PATIENT_ROUTE_PARAM_KEYS);

/**
 * Read patient context from reception / whiteboard URL search params.
 * Priority for focusPatientId: queue row → one-shot context → handoff banner.
 */
export function readPatientRouteContext(searchParams) {
  const contextPatientId = searchParams.get(PATIENT_ROUTE_PARAM_KEYS.context) || '';
  const queuePatientId = searchParams.get(PATIENT_ROUTE_PARAM_KEYS.queue) || '';
  const arrivedPatientId = searchParams.get(PATIENT_ROUTE_PARAM_KEYS.handoff) || '';

  return {
    contextPatientId,
    queuePatientId,
    arrivedPatientId,
    focusPatientId:
      queuePatientId || contextPatientId || arrivedPatientId || '',
  };
}

export function clearPatientRouteParam(searchParams, key) {
  const next = new URLSearchParams(searchParams);
  next.delete(key);
  return next;
}

/**
 * Apply a patient deep-link intent and clear competing patient params.
 * @param {'handoff' | 'queue' | 'context' | 'whiteboard'} intent
 */
export function applyPatientRouteIntent(searchParams, patientId, intent, extra: any = {}) {
  const next = new URLSearchParams(searchParams);
  ALL_PATIENT_ROUTE_KEYS.forEach((key) => next.delete(key));

  if (!patientId) return next;

  if (intent === 'handoff') {
    next.set(PATIENT_ROUTE_PARAM_KEYS.handoff, patientId);
  } else if (intent === 'queue') {
    next.set('queue', extra.queue || 'pretriage');
    next.set(PATIENT_ROUTE_PARAM_KEYS.queue, patientId);
  } else if (intent === 'context') {
    next.set(PATIENT_ROUTE_PARAM_KEYS.context, patientId);
  } else if (intent === 'whiteboard') {
    next.set(PATIENT_ROUTE_PARAM_KEYS.queue, patientId);
  }

  return next;
}

export function buildWhiteboardPatientHref(patientId, encounterId = null) {
  const params = new URLSearchParams({ [PATIENT_ROUTE_PARAM_KEYS.queue]: patientId });
  if (encounterId) params.set('encounter', encounterId);
  return `${CANONICAL_ROUTES.emergencyWhiteboard}?${params.toString()}`;
}

export function buildPatientsPatientHref(patientId) {
  const params = new URLSearchParams({ [PATIENT_ROUTE_PARAM_KEYS.context]: patientId });
  return `${CANONICAL_ROUTES.emergencyPatients}?${params.toString()}`;
}

/** Build a reception deep link with optional search, queue tab, or patient context. */
export function buildReceptionDeepLink(options: any = {}) {
  let params = new URLSearchParams();

  if (options.query) {
    params.set('q', options.query);
  }

  if (options.patientId && options.queue) {
    params = applyPatientRouteIntent(params, options.patientId, 'queue', { queue: options.queue });
  } else if (options.patientId) {
    params = applyPatientRouteIntent(params, options.patientId, 'context');
  } else if (options.queue) {
    params.set('queue', options.queue);
  }

  const queryString = params.toString();
  return queryString
    ? `${CANONICAL_ROUTES.emergencyReception}?${queryString}`
    : CANONICAL_ROUTES.emergencyReception;
}
