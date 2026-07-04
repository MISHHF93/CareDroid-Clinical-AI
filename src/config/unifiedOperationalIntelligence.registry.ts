/**
 * Unified operational intelligence registry — bridges header/whiteboard metrics
 * (operationalMetricsModel) with command-center role metrics (hospitalCommandCenterRolePolicy).
 * Single drill-down authority for live ED OS surfaces.
 */
import { CANONICAL_ROUTES } from './routes.config';
import {
  HOSPITAL_COMMAND_ACTIONABLE_METRICS,
  type HospitalCommandMetricId,
} from './hospitalCommandCenterRolePolicy';
import {
  OPERATIONAL_METRIC_KEYS,
  OPERATIONAL_METRIC_REGISTRY,
  getOperationalMetricRoute,
} from './operationalMetricsModel';

type OperationalMetricKey = (typeof OPERATIONAL_METRIC_KEYS)[number];

export type UnifiedOperationalMetricSource = 'header' | 'command-center' | 'both';

export type UnifiedOperationalMetricDefinition = Readonly<{
  id: string;
  label: string;
  route: string;
  source: UnifiedOperationalMetricSource;
  /** Maps to operationalMetricsModel key when surfaces share the same signal */
  operationalKey?: OperationalMetricKey;
  commandCenterId?: HospitalCommandMetricId;
  surfaces: readonly ('header' | 'whiteboard' | 'command-center' | 'analytics' | 'alerts')[];
}>;

/** Command-center metric ids → canonical owning workflow routes */
export const COMMAND_CENTER_METRIC_ROUTES: Readonly<
  Record<HospitalCommandMetricId, string>
> = Object.freeze({
  'department-occupancy': CANONICAL_ROUTES.emergencyCapacity,
  'waiting-patients': `${CANONICAL_ROUTES.emergencyQueues}?queue=Waiting`,
  'critical-patients': CANONICAL_ROUTES.emergencyPatients,
  'avg-wait-time': `${CANONICAL_ROUTES.emergencyQueues}?queue=Waiting`,
  'length-of-stay': CANONICAL_ROUTES.emergencyAnalytics,
  'doctors-available': CANONICAL_ROUTES.emergencyWhiteboard,
  'nurses-available': CANONICAL_ROUTES.emergencyWhiteboard,
  'bed-capacity': CANONICAL_ROUTES.emergencyCapacity,
  'ems-arrivals': CANONICAL_ROUTES.emergencyEms,
  'ambulance-eta': CANONICAL_ROUTES.emergencyEms,
  'service-bottlenecks': CANONICAL_ROUTES.emergencyCommandCenter,
  'ai-recommendations': CANONICAL_ROUTES.emergencyCopilot,
  'unresolved-alerts': CANONICAL_ROUTES.emergencyAlerts,
  'three-minute-compliance': CANONICAL_ROUTES.emergencyCommandCenter,
});

const OPERATIONAL_TO_COMMAND: Partial<Record<OperationalMetricKey, HospitalCommandMetricId>> =
  Object.freeze({
  patientsToday: 'department-occupancy',
  waiting: 'waiting-patients',
  averageWait: 'avg-wait-time',
  longestWait: 'avg-wait-time',
  emsInbound: 'ems-arrivals',
  reassessmentsDue: 'service-bottlenecks',
  capacityScore: 'bed-capacity',
  boarders: 'bed-capacity',
  referralsPending: 'service-bottlenecks',
});

function commandCenterLabel(id: HospitalCommandMetricId): string {
  return id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Merged registry — header metrics plus command-center-only signals */
export const UNIFIED_OPERATIONAL_METRICS = Object.freeze([
    ...OPERATIONAL_METRIC_REGISTRY.map((metric) =>
      Object.freeze({
        id: metric.key,
        label: metric.label,
        route: metric.route,
        source: 'header' as const,
        operationalKey: metric.key,
        commandCenterId: OPERATIONAL_TO_COMMAND[metric.key],
        surfaces: Object.freeze([
          ...(metric.surfaces as UnifiedOperationalMetricDefinition['surfaces']),
          'command-center',
        ] as const),
      }),
    ),
    ...HOSPITAL_COMMAND_ACTIONABLE_METRICS.filter(
      (id) => !Object.values(OPERATIONAL_TO_COMMAND).includes(id),
    ).map((id) =>
      Object.freeze({
        id,
        label: commandCenterLabel(id),
        route: COMMAND_CENTER_METRIC_ROUTES[id],
        source: 'command-center' as const,
        commandCenterId: id,
        surfaces: Object.freeze(['command-center', 'analytics'] as const),
      }),
    ),
  ]) as readonly UnifiedOperationalMetricDefinition[];

const UNIFIED_BY_ID = Object.freeze(
  Object.fromEntries(UNIFIED_OPERATIONAL_METRICS.map((entry) => [entry.id, entry])),
);

export function resolveUnifiedMetricRoute(
  metricId: string,
): string | null {
  const unified = UNIFIED_BY_ID[metricId];
  if (unified?.route) return unified.route;
  const operationalRoute = getOperationalMetricRoute(metricId);
  if (operationalRoute) return operationalRoute;
  const commandRoute = COMMAND_CENTER_METRIC_ROUTES[metricId as HospitalCommandMetricId];
  return commandRoute || null;
}

export function listUnifiedMetricsForSurface(
  surface: UnifiedOperationalMetricDefinition['surfaces'][number],
): readonly UnifiedOperationalMetricDefinition[] {
  return UNIFIED_OPERATIONAL_METRICS.filter((entry) => entry.surfaces.includes(surface));
}