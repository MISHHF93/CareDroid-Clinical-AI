import { CANONICAL_ROUTES } from '../../../src/config/routes.config';
import { EMERGENCY_ROLE_IDS, normalizeEmergencyRole } from '../../../src/config/emergencyRolePermissions';

export const DEFAULT_ROUTE = '/';

export type NavigationItem = Readonly<{
  id: string;
  label: string;
  path: string;
  icon: string;
  order: number;
  roles: readonly string[];
  isEmergencyCore: boolean;
  activePaths?: readonly string[];
  featureId?: string;
  mobileLabel?: string;
}>;

const ROLES = EMERGENCY_ROLE_IDS as Record<string, string>;

const ADMIN = ROLES.admin;
const ED_MANAGER = ROLES.edManager;
const CHARGE_NURSE = ROLES.chargeNurse;
const TRIAGE_NURSE = ROLES.triageNurse;
const PHYSICIAN = ROLES.physician;
const REGISTRATION_CLERK = ROLES.registrationClerk;
const READ_ONLY_VIEWER = ROLES.readOnlyViewer;

const ALL_ROLES = Object.freeze(Object.values(ROLES));
const READ_ONLY_SAFE_ROLES = Object.freeze([
  ADMIN,
  ED_MANAGER,
  CHARGE_NURSE,
  TRIAGE_NURSE,
  PHYSICIAN,
  READ_ONLY_VIEWER,
]);
const OPERATIONS_ROLES = Object.freeze([ADMIN, ED_MANAGER, CHARGE_NURSE, PHYSICIAN, READ_ONLY_VIEWER]);

function navigationItem(item: NavigationItem): NavigationItem {
  return Object.freeze({
    ...item,
    roles: Object.freeze([...item.roles]),
    activePaths: Object.freeze(item.activePaths ? [...item.activePaths] : [item.path]),
  });
}

export const NAVIGATION_ITEMS = Object.freeze([
  navigationItem({
    id: 'emergency_whiteboard',
    label: 'Emergency Whiteboard',
    path: CANONICAL_ROUTES.emergencyWhiteboard,
    icon: 'emergency-whiteboard',
    order: 1,
    roles: ALL_ROLES,
    isEmergencyCore: true,
    featureId: 'emergency_whiteboard',
    mobileLabel: 'Board',
    activePaths: [CANONICAL_ROUTES.emergencyWhiteboard, '/emergency'],
  }),
  navigationItem({
    id: 'ems_intake',
    label: 'EMS Intake',
    path: CANONICAL_ROUTES.emergencyIntake,
    icon: 'intake',
    order: 2,
    roles: [ADMIN, CHARGE_NURSE, TRIAGE_NURSE, REGISTRATION_CLERK],
    isEmergencyCore: true,
    featureId: 'smart_intake',
    mobileLabel: 'Intake',
  }),
  navigationItem({
    id: 'queues',
    label: 'Queues',
    path: CANONICAL_ROUTES.emergencyQueues,
    icon: 'queues',
    order: 3,
    roles: READ_ONLY_SAFE_ROLES,
    isEmergencyCore: true,
    featureId: 'queue_intelligence',
    mobileLabel: 'Queues',
  }),
  navigationItem({
    id: 'reassessment',
    label: 'Reassessment',
    path: CANONICAL_ROUTES.emergencyReassessment,
    icon: 'reassessment',
    order: 4,
    roles: READ_ONLY_SAFE_ROLES,
    isEmergencyCore: true,
    featureId: 'reassessment_engine',
    mobileLabel: 'Review',
  }),
  navigationItem({
    id: 'capacity',
    label: 'Capacity',
    path: CANONICAL_ROUTES.emergencyCapacity,
    icon: 'capacity',
    order: 5,
    roles: [...READ_ONLY_SAFE_ROLES, ROLES.emsUser],
    isEmergencyCore: true,
    featureId: 'capacity_intelligence',
    mobileLabel: 'Capacity',
  }),
  navigationItem({
    id: 'surge_management',
    label: 'Surge Management',
    path: CANONICAL_ROUTES.emergencySimulation,
    icon: 'surge-management',
    order: 6,
    roles: [ADMIN, ED_MANAGER],
    isEmergencyCore: true,
    featureId: 'real_time_simulation',
    mobileLabel: 'Surge',
  }),
  navigationItem({
    id: 'safety_dashboard',
    label: 'Safety Dashboard',
    path: CANONICAL_ROUTES.emergencyAnalytics,
    icon: 'safety-dashboard',
    order: 7,
    roles: OPERATIONS_ROLES,
    isEmergencyCore: true,
    featureId: 'emergency_analytics',
    mobileLabel: 'Safety',
  }),
  navigationItem({
    id: 'virtual_care',
    label: 'Virtual Care',
    path: CANONICAL_ROUTES.emergencyDigitalTwin,
    icon: 'virtual-care',
    order: 8,
    roles: [ADMIN, ED_MANAGER],
    isEmergencyCore: false,
    featureId: 'hybrid_digital_twin',
    mobileLabel: 'Virtual',
  }),
  navigationItem({
    id: 'wearable_monitor',
    label: 'Wearable Monitor',
    path: CANONICAL_ROUTES.emergencyIntegrations,
    icon: 'wearable-monitor',
    order: 9,
    roles: [ADMIN, ED_MANAGER, CHARGE_NURSE],
    isEmergencyCore: false,
    featureId: 'integration_hub',
    mobileLabel: 'Wearables',
  }),
  navigationItem({
    id: 'patients',
    label: 'Patients',
    path: CANONICAL_ROUTES.emergencyPatients,
    icon: 'emergency-patients',
    order: 10,
    roles: ALL_ROLES,
    isEmergencyCore: true,
    featureId: 'emergency_patients',
    mobileLabel: 'Patients',
  }),
  navigationItem({
    id: 'ed_copilot',
    label: 'ED Copilot',
    path: CANONICAL_ROUTES.emergencyCopilot,
    icon: 'ed-copilot',
    order: 11,
    roles: [ADMIN, ED_MANAGER, CHARGE_NURSE, TRIAGE_NURSE, PHYSICIAN],
    isEmergencyCore: true,
    featureId: 'ed_copilot',
    mobileLabel: 'Copilot',
  }),
  navigationItem({
    id: 'ai_governance',
    label: 'AI Governance',
    path: CANONICAL_ROUTES.emergencyAiGovernance,
    icon: 'ai-governance',
    order: 12,
    roles: [ADMIN, PHYSICIAN],
    isEmergencyCore: false,
    featureId: 'ai_governance',
    mobileLabel: 'AI Gov',
    activePaths: [CANONICAL_ROUTES.emergencyAiGovernance, CANONICAL_ROUTES.aiGovernance],
  }),
  navigationItem({
    id: 'settings',
    label: 'Settings',
    path: CANONICAL_ROUTES.emergencySettings,
    icon: 'emergency-settings',
    order: 13,
    roles: [ADMIN],
    isEmergencyCore: false,
    featureId: 'emergency_settings',
    mobileLabel: 'Settings',
  }),
] satisfies readonly NavigationItem[]);

export function getVisibleNavigation(userRole: string | null | undefined): readonly NavigationItem[] {
  const normalizedRole = normalizeEmergencyRole(userRole);
  return NAVIGATION_ITEMS
    .filter((item) => item.roles.includes(normalizedRole))
    .sort((first, second) => first.order - second.order);
}
