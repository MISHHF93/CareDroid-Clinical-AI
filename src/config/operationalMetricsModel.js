import { CANONICAL_ROUTES } from './routes.config';

/** Canonical operational metric keys shared across central node + store selectors. */
export const OPERATIONAL_METRIC_KEYS = Object.freeze([
  'patientsToday',
  'waiting',
  'longestWait',
  'averageWait',
  'emsInbound',
  'reassessmentsDue',
  'capacityScore',
  'boarders',
  'referralsPending',
]);

export const OPERATIONAL_METRIC_SURFACES = Object.freeze({
  header: 'header',
  whiteboard: 'whiteboard',
  analytics: 'analytics',
  alerts: 'alerts',
});

/**
 * Single registry for operational command metrics.
 * Values/tones come from centralSnapshot.operationalSummary or selectEmergencyOperationalSummary.
 */
export const OPERATIONAL_METRIC_REGISTRY = Object.freeze([
  Object.freeze({
    key: 'patientsToday',
    label: 'Patients Today',
    route: CANONICAL_ROUTES.emergencyPatients,
    surfaces: Object.freeze(['header', 'whiteboard', 'analytics', 'alerts']),
    alertTypes: Object.freeze(['patient', 'arrival', 'patients_today']),
    whiteboardHandler: 'navigate',
  }),
  Object.freeze({
    key: 'waiting',
    label: 'Waiting',
    route: `${CANONICAL_ROUTES.emergencyQueues}?queue=Waiting`,
    surfaces: Object.freeze(['header', 'analytics', 'alerts']),
    alertTypes: Object.freeze(['waiting', 'queue', 'queue_breach']),
    whiteboardHandler: 'navigate',
  }),
  Object.freeze({
    key: 'longestWait',
    label: 'Longest Wait',
    route: `${CANONICAL_ROUTES.emergencyQueues}?queue=Waiting`,
    surfaces: Object.freeze(['header', 'analytics', 'alerts']),
    alertTypes: Object.freeze(['long_wait', 'wait_time']),
    whiteboardHandler: 'navigate',
  }),
  Object.freeze({
    key: 'averageWait',
    label: 'Average Wait',
    route: `${CANONICAL_ROUTES.emergencyQueues}?queue=Waiting`,
    surfaces: Object.freeze(['header', 'whiteboard', 'analytics', 'alerts']),
    alertTypes: Object.freeze(['average_wait', 'queue']),
    whiteboardHandler: 'navigate',
  }),
  Object.freeze({
    key: 'emsInbound',
    label: 'EMS Inbound',
    route: CANONICAL_ROUTES.emergencyEms,
    surfaces: Object.freeze(['header', 'whiteboard', 'analytics', 'alerts']),
    alertTypes: Object.freeze(['ems', 'eta', 'ems_inbound', 'ems_critical']),
    whiteboardHandler: 'ems-awareness',
  }),
  Object.freeze({
    key: 'reassessmentsDue',
    label: 'Reassessments Due',
    route: CANONICAL_ROUTES.emergencyReassessment,
    surfaces: Object.freeze(['header', 'whiteboard', 'analytics', 'alerts']),
    alertTypes: Object.freeze(['reassessment', 'reassessment_overdue']),
    whiteboardHandler: 'reassessment-board',
  }),
  Object.freeze({
    key: 'capacityScore',
    label: 'Capacity Score',
    route: CANONICAL_ROUTES.emergencyCapacity,
    surfaces: Object.freeze(['header', 'whiteboard', 'analytics', 'alerts']),
    alertTypes: Object.freeze(['capacity', 'capacity_crisis', 'capacity_crunch']),
    whiteboardHandler: 'navigate',
  }),
  Object.freeze({
    key: 'boarders',
    label: 'Boarders',
    route: CANONICAL_ROUTES.emergencyBoarding,
    surfaces: Object.freeze(['header', 'whiteboard', 'analytics', 'alerts']),
    alertTypes: Object.freeze(['boarding', 'boarding_escalation']),
    whiteboardHandler: 'navigate',
  }),
  Object.freeze({
    key: 'referralsPending',
    label: 'Referrals Pending',
    route: CANONICAL_ROUTES.emergencyReferrals,
    surfaces: Object.freeze(['header', 'whiteboard', 'analytics', 'alerts']),
    alertTypes: Object.freeze(['referral', 'referral_delay', 'referrals']),
    whiteboardHandler: 'referral-awareness',
  }),
]);

/** Non-metric operational alert routes (settings, copilot, intelligence). */
export const OPERATIONAL_ALERT_ROUTES = Object.freeze({
  sync: CANONICAL_ROUTES.emergencySettings,
  system: CANONICAL_ROUTES.emergencySettings,
  integration: `${CANONICAL_ROUTES.emergencySettings}#integrations`,
  provincial: `${CANONICAL_ROUTES.emergencySettings}#provincial-health`,
  ai: CANONICAL_ROUTES.emergencyCopilot,
  copilot: CANONICAL_ROUTES.emergencyCopilot,
  operational_intelligence: CANONICAL_ROUTES.emergencyAnalytics,
});

const METRIC_BY_KEY = Object.freeze(
  Object.fromEntries(OPERATIONAL_METRIC_REGISTRY.map((definition) => [definition.key, definition])),
);

const ALERT_TYPE_TO_METRIC_KEY = Object.freeze(
  Object.fromEntries(
    OPERATIONAL_METRIC_REGISTRY.flatMap((definition) =>
      (definition.alertTypes || []).map((alertType) => [alertType, definition.key]),
    ),
  ),
);

export function getOperationalMetricDefinition(key) {
  return METRIC_BY_KEY[key] || null;
}

export function getOperationalMetricRoute(key) {
  return getOperationalMetricDefinition(key)?.route || null;
}

export function getOperationalMetricRoutesMap() {
  return Object.freeze(
    Object.fromEntries(
      OPERATIONAL_METRIC_REGISTRY.map((definition) => [definition.key, definition.route]),
    ),
  );
}

export function filterOperationalMetrics(metrics = [], surface) {
  const allowedKeys = new Set(
    OPERATIONAL_METRIC_REGISTRY.filter((definition) => definition.surfaces.includes(surface)).map(
      (definition) => definition.key,
    ),
  );
  return metrics.filter((metric) => allowedKeys.has(metric.key));
}

export function getWhiteboardMetricHandler(key) {
  return getOperationalMetricDefinition(key)?.whiteboardHandler || 'navigate';
}

export function canOpenOperationalMetricOnWhiteboard(key, { displayMode = false, canAccessRoute = /** @type {((path: string) => boolean) | undefined} */ (undefined) } = {}) {
  if (displayMode) return false;
  const handler = getWhiteboardMetricHandler(key);
  if (handler !== 'navigate') return true;
  const route = getOperationalMetricRoute(key);
  if (!route) return false;
  const permissionPath = route.split(/[?#]/)[0] || route;
  return typeof canAccessRoute === 'function' ? canAccessRoute(permissionPath) : true;
}

function normalizeAlertKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function buildOperationalAlertTypeRoutes() {
  const routes = { ...OPERATIONAL_ALERT_ROUTES };
  OPERATIONAL_METRIC_REGISTRY.forEach((definition) => {
    (definition.alertTypes || []).forEach((alertType) => {
      routes[alertType] = definition.route;
    });
  });
  return Object.freeze(routes);
}

export function resolveOperationalAlertRoute(alert) {
  const routes = buildOperationalAlertTypeRoutes();
  const key = normalizeAlertKey(alert?.actionType || alert?.type);
  if (routes[key]) return routes[key];

  const text = `${alert?.title || ''} ${alert?.message || ''} ${alert?.source || ''}`.toLowerCase();
  if (text.includes('ems')) return getOperationalMetricRoute('emsInbound');
  if (text.includes('board')) return getOperationalMetricRoute('boarders');
  if (text.includes('reassessment') || text.includes('reassess')) {
    return getOperationalMetricRoute('reassessmentsDue');
  }
  if (text.includes('referral') || text.includes('transfer')) {
    return getOperationalMetricRoute('referralsPending');
  }
  if (text.includes('queue') || text.includes('wait')) return getOperationalMetricRoute('waiting');
  if (text.includes('capacity')) return getOperationalMetricRoute('capacityScore');
  if (text.includes('provincial')) return routes.provincial;
  if (text.includes('integration') || text.includes('sync')) return routes.integration;
  if (text.includes('ai') || text.includes('copilot')) return routes.copilot;
  return null;
}

export function resolveOperationalAlertMetricKey(alert) {
  const key = normalizeAlertKey(alert?.actionType || alert?.type);
  if (ALERT_TYPE_TO_METRIC_KEY[key]) return ALERT_TYPE_TO_METRIC_KEY[key];

  const route = resolveOperationalAlertRoute(alert);
  if (!route) return null;
  const match = OPERATIONAL_METRIC_REGISTRY.find((definition) => definition.route === route);
  return match?.key || null;
}

export function groupOperationalAlertsByMetric(alerts = []) {
  const grouped = Object.fromEntries(OPERATIONAL_METRIC_KEYS.map((key) => [key, []]));
  const unmapped = [];

  alerts.forEach((alert) => {
    const metricKey = resolveOperationalAlertMetricKey(alert);
    if (metricKey && grouped[metricKey]) grouped[metricKey].push(alert);
    else unmapped.push(alert);
  });

  return Object.freeze({
    byMetric: Object.freeze(grouped),
    unmapped: Object.freeze([...unmapped]),
  });
}
