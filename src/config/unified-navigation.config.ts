import { CANONICAL_ROUTES } from './routes.config';
import {
  EMERGENCY_ROLE_IDS,
  getEmergencyRoleDefinition,
  normalizeEmergencyRole,
} from './emergencyRolePermissions';

export const DEFAULT_ROUTE = CANONICAL_ROUTES.emergencyWhiteboard;

export type NavItem = Readonly<{
  id: string;
  label: string;
  icon: string;
  route: string;
  featureGate: string | null;
}>;

export type NavigationItem = Readonly<{
  id: string;
  label: string;
  path: string;
  route: string;
  icon: string;
  featureGate: string | null;
  featureId: string;
  order: number;
  roles: readonly string[];
  isEmergencyCore: boolean;
  activePaths?: readonly string[];
  mobileLabel?: string;
}>;

export const NAV_ITEMS = Object.freeze([
  {
    id: 'whiteboard',
    label: 'Board',
    icon: 'layout-dashboard',
    route: CANONICAL_ROUTES.emergencyWhiteboard,
    featureGate: null,
  },
  {
    id: 'pulse',
    label: 'Pulse',
    icon: 'department-pulse',
    route: '/emergency/pulse',
    featureGate: null,
  },
  {
    id: 'patients',
    label: 'Patients',
    icon: 'emergency-patients',
    route: CANONICAL_ROUTES.emergencyPatients,
    featureGate: null,
  },
  {
    id: 'journey',
    label: 'Journey',
    icon: 'journey',
    route: CANONICAL_ROUTES.emergencyJourney,
    featureGate: null,
  },
  {
    id: 'intake',
    label: 'Intake',
    icon: 'intake',
    route: CANONICAL_ROUTES.emergencyIntake,
    featureGate: null,
  },
  {
    id: 'queues',
    label: 'Queues',
    icon: 'queues',
    route: CANONICAL_ROUTES.emergencyQueues,
    featureGate: null,
  },
  {
    id: 'reassessment',
    label: 'Reassess',
    icon: 'reassessment',
    route: CANONICAL_ROUTES.emergencyReassessment,
    featureGate: null,
  },
  {
    id: 'ems',
    label: 'EMS',
    icon: 'ambulance',
    route: '/emergency/ems',
    featureGate: 'ems_pipeline',
  },
  {
    id: 'referrals',
    label: 'Referrals',
    icon: 'send',
    route: '/emergency/referrals',
    featureGate: 'referral_intel',
  },
  {
    id: 'provincial_health',
    label: 'Provincial',
    icon: 'provincial-health',
    route: CANONICAL_ROUTES.emergencyProvincialHealth,
    featureGate: null,
  },
  {
    id: 'integrations',
    label: 'Integrations',
    icon: 'integrations',
    route: CANONICAL_ROUTES.emergencyIntegrations,
    featureGate: null,
  },
  {
    id: 'capacity',
    label: 'Capacity',
    icon: 'chart-bar',
    route: '/emergency/capacity',
    featureGate: 'capacity_intel',
  },
  {
    id: 'boarding',
    label: 'Boarding',
    icon: 'boarding',
    route: CANONICAL_ROUTES.emergencyBoarding,
    featureGate: null,
  },
  {
    id: 'copilot',
    label: 'Copilot',
    icon: 'ed-copilot',
    route: CANONICAL_ROUTES.emergencyCopilot,
    featureGate: null,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'emergency-analytics',
    route: CANONICAL_ROUTES.emergencyAnalytics,
    featureGate: null,
  },
  {
    id: 'simulation',
    label: 'Sim',
    icon: 'list-check',
    route: CANONICAL_ROUTES.emergencySimulation,
    featureGate: null,
  },
  {
    id: 'tools',
    label: 'Tools',
    icon: 'stethoscope',
    route: '/emergency/tools',
    featureGate: 'clinical_tools',
  },
  {
    id: 'shift',
    label: 'Shift',
    icon: 'report-analytics',
    route: '/emergency/shift',
    featureGate: null,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'settings',
    route: CANONICAL_ROUTES.emergencySettings,
    featureGate: null,
  },
] satisfies readonly NavItem[]);

const ROLES = EMERGENCY_ROLE_IDS as Record<string, string>;
const ALL_ROLES = Object.freeze(Object.values(ROLES));
const NAV_FEATURE_IDS = Object.freeze({
  whiteboard: 'emergency_whiteboard',
  pulse: 'department_pulse',
  patients: 'emergency_patients',
  journey: 'patient_journey',
  intake: 'smart_intake',
  queues: 'queue_intelligence',
  reassessment: 'reassessment_engine',
  ems: 'ems_pipeline',
  referrals: 'referral_intelligence',
  provincial_health: 'provincial_health',
  integrations: 'integration_hub',
  capacity: 'capacity_intelligence',
  boarding: 'boarding_intelligence',
  copilot: 'ed_copilot',
  analytics: 'emergency_analytics',
  simulation: 'real_time_simulation',
  tools: 'clinical_calculator_hub',
  shift: 'shift_summary',
  settings: 'emergency_settings',
} as const);

export const FEATURE_GATE_ALIASES = Object.freeze({
  referral_intel: 'referral_intelligence',
  capacity_intel: 'capacity_intelligence',
  clinical_tools: 'clinical_calculator_hub',
} as const);

export function resolveFeatureGate(featureGate: string | null | undefined): string | null {
  if (!featureGate) return null;
  return FEATURE_GATE_ALIASES[featureGate as keyof typeof FEATURE_GATE_ALIASES] || featureGate;
}

function navigationItem(item: NavigationItem): NavigationItem {
  return Object.freeze({
    ...item,
    roles: Object.freeze([...item.roles]),
    activePaths: Object.freeze(item.activePaths ? [...item.activePaths] : [item.path]),
  });
}

function rolesForRoute(path: string): readonly string[] {
  return Object.freeze(
    ALL_ROLES.filter((role) => getEmergencyRoleDefinition(role).routes.includes(path)),
  );
}

export const NAVIGATION_ITEMS = Object.freeze(
  NAV_ITEMS.map((item, index) =>
    navigationItem({
      ...item,
      path: item.route,
      featureId: NAV_FEATURE_IDS[item.id as keyof typeof NAV_FEATURE_IDS] || item.id,
      order: index + 1,
      roles: item.id === 'settings' ? rolesForRoute(item.route) : ALL_ROLES,
      isEmergencyCore: true,
      mobileLabel:
        item.id === 'provincial_health'
          ? 'Prov'
          : item.id === 'reassessment'
            ? 'Recheck'
            : item.label,
      activePaths:
        item.id === 'whiteboard'
          ? [CANONICAL_ROUTES.emergencyWhiteboard, '/emergency']
          : item.id === 'settings'
            ? [CANONICAL_ROUTES.emergencySettings, '/settings']
            : undefined,
    }),
  ),
) satisfies readonly NavigationItem[];

export function getVisibleNavigation(
  userRole: string | null | undefined,
): readonly NavigationItem[] {
  const normalizedRole = normalizeEmergencyRole(userRole);
  return NAVIGATION_ITEMS.filter((item) => item.roles.includes(normalizedRole)).sort(
    (first, second) => first.order - second.order,
  );
}
