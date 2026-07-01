import { EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';

export type HospitalCommandMetricId =
  | 'department-occupancy'
  | 'waiting-patients'
  | 'critical-patients'
  | 'avg-wait-time'
  | 'length-of-stay'
  | 'doctors-available'
  | 'nurses-available'
  | 'bed-capacity'
  | 'ems-arrivals'
  | 'ambulance-eta'
  | 'service-bottlenecks'
  | 'ai-recommendations'
  | 'unresolved-alerts'
  | 'three-minute-compliance';

export const HOSPITAL_COMMAND_ACTIONABLE_METRICS: readonly HospitalCommandMetricId[] = Object.freeze([
  'department-occupancy',
  'waiting-patients',
  'critical-patients',
  'avg-wait-time',
  'length-of-stay',
  'doctors-available',
  'nurses-available',
  'bed-capacity',
  'ems-arrivals',
  'ambulance-eta',
  'service-bottlenecks',
  'ai-recommendations',
  'unresolved-alerts',
  'three-minute-compliance',
]);

/** Role-ordered metric ids — first items are highest priority for that role. */
export const HOSPITAL_COMMAND_ROLE_METRICS: Readonly<
  Record<string, readonly HospitalCommandMetricId[]>
> = Object.freeze({
  [EMERGENCY_ROLE_IDS.edManager]: HOSPITAL_COMMAND_ACTIONABLE_METRICS,
  [EMERGENCY_ROLE_IDS.admin]: HOSPITAL_COMMAND_ACTIONABLE_METRICS,
  [EMERGENCY_ROLE_IDS.chargeNurse]: Object.freeze([
    'three-minute-compliance',
    'unresolved-alerts',
    'critical-patients',
    'waiting-patients',
    'service-bottlenecks',
    'bed-capacity',
    'nurses-available',
    'doctors-available',
    'ems-arrivals',
    'ambulance-eta',
    'avg-wait-time',
    'department-occupancy',
    'length-of-stay',
    'ai-recommendations',
  ]),
  [EMERGENCY_ROLE_IDS.physician]: Object.freeze([
    'critical-patients',
    'unresolved-alerts',
    'avg-wait-time',
    'length-of-stay',
    'ai-recommendations',
    'waiting-patients',
    'service-bottlenecks',
    'doctors-available',
    'three-minute-compliance',
    'bed-capacity',
  ]),
  [EMERGENCY_ROLE_IDS.triageNurse]: Object.freeze([
    'three-minute-compliance',
    'waiting-patients',
    'critical-patients',
    'ems-arrivals',
    'ambulance-eta',
    'unresolved-alerts',
    'avg-wait-time',
    'nurses-available',
    'service-bottlenecks',
    'ai-recommendations',
  ]),
  [EMERGENCY_ROLE_IDS.dispatcher]: Object.freeze([
    'ems-arrivals',
    'ambulance-eta',
    'three-minute-compliance',
    'critical-patients',
    'service-bottlenecks',
    'unresolved-alerts',
  ]),
  [EMERGENCY_ROLE_IDS.emsCoordinator]: Object.freeze([
    'ems-arrivals',
    'ambulance-eta',
    'bed-capacity',
    'waiting-patients',
    'service-bottlenecks',
    'three-minute-compliance',
  ]),
  [EMERGENCY_ROLE_IDS.registrationClerk]: Object.freeze([
    'waiting-patients',
    'ems-arrivals',
    'ambulance-eta',
    'department-occupancy',
    'bed-capacity',
  ]),
});

const DEFAULT_ROLE_METRICS = HOSPITAL_COMMAND_ROLE_METRICS[EMERGENCY_ROLE_IDS.chargeNurse];

export function resolveHospitalCommandMetricsForRole(
  role: string | null | undefined,
  limit = 12,
): readonly HospitalCommandMetricId[] {
  const ordered =
    (role && HOSPITAL_COMMAND_ROLE_METRICS[role]) || DEFAULT_ROLE_METRICS;
  return ordered.slice(0, limit);
}

export function resolveHospitalCommandRoleLabel(role: string | null | undefined): string {
  if (!role) return 'Department command';
  return role.replace(/_/g, ' ');
}