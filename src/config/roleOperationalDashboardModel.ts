/**
 * Role-based ED operating system dashboard matrix.
 * Maps emergency roles to information hierarchy (L1–L5) and primary surfaces.
 */
import { EMERGENCY_ROLE_IDS, normalizeEmergencyRole } from './emergencyRolePermissions';
import { ROLE_DASHBOARD_CONFIG, type DashboardWidgets } from '../lib/users/roleAccess';
import type { HospitalRole } from '../lib/users/userTypes';

export const INFORMATION_HIERARCHY_LEVELS = Object.freeze({
  L1: 'life-critical',
  L2: 'my-work',
  L3: 'department-awareness',
  L4: 'operations',
  L5: 'historical',
} as const);

export type InformationHierarchyLevel =
  (typeof INFORMATION_HIERARCHY_LEVELS)[keyof typeof INFORMATION_HIERARCHY_LEVELS];

export type RoleOperationalFocus = {
  roleId: string;
  roleLabel: string;
  hierarchyLevels: readonly InformationHierarchyLevel[];
  primaryQuestion: string;
  primarySurfaces: readonly string[];
  secondarySurfaces: readonly string[];
  suppressSurfaces: readonly string[];
  showRoleSummaryCards: readonly string[];
  dashboardWidgets: DashboardWidgets;
};

const ROLE_FOCUS: Readonly<Record<string, Omit<RoleOperationalFocus, 'roleId' | 'dashboardWidgets'>>> =
  Object.freeze({
    [EMERGENCY_ROLE_IDS.registrationClerk]: Object.freeze({
      roleLabel: 'Reception',
      hierarchyLevels: [
        INFORMATION_HIERARCHY_LEVELS.L1,
        INFORMATION_HIERARCHY_LEVELS.L2,
        INFORMATION_HIERARCHY_LEVELS.L3,
      ],
      primaryQuestion: 'Who arrived and what intake is incomplete?',
      primarySurfaces: [
        'reception-queue',
        'critical-arrivals',
        'identity-verification',
        'missing-critical-info',
        'ai-intake-assistance',
      ],
      secondarySurfaces: ['waiting-patients', 'insurance-status', 'pending-consent'],
      suppressSurfaces: ['analytics', 'mission-control', 'staff-workload-detail'],
      showRoleSummaryCards: ['reception'],
    }),
    [EMERGENCY_ROLE_IDS.chargeNurse]: Object.freeze({
      roleLabel: 'Charge Nurse',
      hierarchyLevels: [
        INFORMATION_HIERARCHY_LEVELS.L1,
        INFORMATION_HIERARCHY_LEVELS.L2,
        INFORMATION_HIERARCHY_LEVELS.L3,
      ],
      primaryQuestion: 'What threatens flow and who owns the next escalation?',
      primarySurfaces: [
        'critical-queue',
        'escalations',
        'department-flow',
        'staff-workload',
        'capacity',
        'bottlenecks',
      ],
      secondarySurfaces: ['reassessment-strip', 'ems-attention', 'referral-attention'],
      suppressSurfaces: ['analytics-charts', 'audit-trails', 'historical-reports'],
      showRoleSummaryCards: ['charge', 'nurse'],
    }),
    [EMERGENCY_ROLE_IDS.physician]: Object.freeze({
      roleLabel: 'Emergency Physician',
      hierarchyLevels: [
        INFORMATION_HIERARCHY_LEVELS.L1,
        INFORMATION_HIERARCHY_LEVELS.L2,
      ],
      primaryQuestion: 'Which patients need a decision now?',
      primarySurfaces: [
        'critical-patients',
        'assigned-patients',
        'pending-decisions',
        'ai-summaries',
        'diagnostics',
      ],
      secondarySurfaces: ['reassessment-timers', 'referrals-pending'],
      suppressSurfaces: [
        'department-kpis',
        'staff-cards',
        'service-health-detail',
        'ems-offload-aggregate',
      ],
      showRoleSummaryCards: ['physician'],
    }),
    [EMERGENCY_ROLE_IDS.triageNurse]: Object.freeze({
      roleLabel: 'Triage Nurse',
      hierarchyLevels: [
        INFORMATION_HIERARCHY_LEVELS.L1,
        INFORMATION_HIERARCHY_LEVELS.L2,
        INFORMATION_HIERARCHY_LEVELS.L3,
      ],
      primaryQuestion: 'Who is untriaged and what acuity signals are active?',
      primarySurfaces: ['triage-queue', 'new-arrivals', 'red-flags', 'ems-handoffs'],
      secondarySurfaces: ['rapid-review', 'vitals'],
      suppressSurfaces: ['analytics', 'boarding-metrics', 'referral-backlog'],
      showRoleSummaryCards: ['nurse'],
    }),
    [EMERGENCY_ROLE_IDS.edManager]: Object.freeze({
      roleLabel: 'Patient Flow / ED Leadership',
      hierarchyLevels: [
        INFORMATION_HIERARCHY_LEVELS.L1,
        INFORMATION_HIERARCHY_LEVELS.L3,
        INFORMATION_HIERARCHY_LEVELS.L4,
      ],
      primaryQuestion: 'What is the state of the department in five seconds?',
      primarySurfaces: [
        'command-center-throughput',
        'beds',
        'capacity',
        'bottlenecks',
        'critical-alerts',
      ],
      secondarySurfaces: ['analytics', 'staff-load', 'service-health'],
      suppressSurfaces: ['patient-card-tool-chips', 'copilot-multimodal'],
      showRoleSummaryCards: ['charge', 'physician', 'nurse', 'flow'],
    }),
    [EMERGENCY_ROLE_IDS.emsUser]: Object.freeze({
      roleLabel: 'EMS',
      hierarchyLevels: [
        INFORMATION_HIERARCHY_LEVELS.L1,
        INFORMATION_HIERARCHY_LEVELS.L2,
        INFORMATION_HIERARCHY_LEVELS.L3,
      ],
      primaryQuestion: 'What units are inbound and where is offload blocked?',
      primarySurfaces: ['ems-queue', 'inbound-critical', 'offload-tracker', 'bay-status'],
      secondarySurfaces: ['handoff-checklist'],
      suppressSurfaces: ['patient-grid', 'referral-workflow'],
      showRoleSummaryCards: ['ems'],
    }),
    [EMERGENCY_ROLE_IDS.admin]: Object.freeze({
      roleLabel: 'Hospital Administrator',
      hierarchyLevels: [
        INFORMATION_HIERARCHY_LEVELS.L4,
        INFORMATION_HIERARCHY_LEVELS.L5,
      ],
      primaryQuestion: 'Are operations healthy and compliant?',
      primarySurfaces: ['operational-kpis', 'analytics', 'service-health', 'staffing'],
      secondarySurfaces: ['audit', 'reports'],
      suppressSurfaces: ['patient-mission-control', 'reassessment-drawer'],
      showRoleSummaryCards: ['charge', 'physician', 'nurse', 'flow'],
    }),
    [EMERGENCY_ROLE_IDS.readOnlyViewer]: Object.freeze({
      roleLabel: 'Demo Observer',
      hierarchyLevels: [
        INFORMATION_HIERARCHY_LEVELS.L3,
        INFORMATION_HIERARCHY_LEVELS.L4,
      ],
      primaryQuestion: 'What is happening across the department?',
      primarySurfaces: ['whiteboard-overview', 'queue', 'alerts', 'capacity'],
      secondarySurfaces: ['analytics'],
      suppressSurfaces: ['workflow-actions', 'copilot-input'],
      showRoleSummaryCards: ['charge', 'physician', 'nurse'],
    }),
    [EMERGENCY_ROLE_IDS.dispatcher]: Object.freeze({
      roleLabel: 'Dispatcher',
      hierarchyLevels: [
        INFORMATION_HIERARCHY_LEVELS.L1,
        INFORMATION_HIERARCHY_LEVELS.L2,
        INFORMATION_HIERARCHY_LEVELS.L3,
      ],
      primaryQuestion: 'Which Echo/Delta calls need unit assignment and ED pre-alert?',
      primarySurfaces: ['dispatch-queue', 'inbound-critical', 'unit-assignment', 'hospital-pre-alert'],
      secondarySurfaces: ['ems-status'],
      suppressSurfaces: ['patient-grid', 'referral-workflow', 'analytics-charts'],
      showRoleSummaryCards: ['ems'],
    }),
    [EMERGENCY_ROLE_IDS.emsCoordinator]: Object.freeze({
      roleLabel: 'EMS Coordinator',
      hierarchyLevels: [
        INFORMATION_HIERARCHY_LEVELS.L1,
        INFORMATION_HIERARCHY_LEVELS.L2,
        INFORMATION_HIERARCHY_LEVELS.L3,
      ],
      primaryQuestion: 'Which inbound units need offload coordination and ED readiness?',
      primarySurfaces: ['ems-queue', 'ed-readiness', 'offload-tracker', 'pre-arrival-packets'],
      secondarySurfaces: ['capacity', 'analytics'],
      suppressSurfaces: ['referral-workflow', 'patient-mission-control'],
      showRoleSummaryCards: ['ems', 'charge'],
    }),
  });

const HOSPITAL_TO_EMERGENCY: Partial<Record<HospitalRole, string>> = Object.freeze({
  registration_clerk: EMERGENCY_ROLE_IDS.registrationClerk,
  charge_nurse: EMERGENCY_ROLE_IDS.chargeNurse,
  emergency_physician: EMERGENCY_ROLE_IDS.physician,
  attending_physician: EMERGENCY_ROLE_IDS.physician,
  resident_physician: EMERGENCY_ROLE_IDS.physician,
  triage_nurse: EMERGENCY_ROLE_IDS.triageNurse,
  registered_nurse: EMERGENCY_ROLE_IDS.triageNurse,
  patient_flow_coordinator: EMERGENCY_ROLE_IDS.edManager,
  hospital_admin: EMERGENCY_ROLE_IDS.admin,
  ed_director: EMERGENCY_ROLE_IDS.edManager,
  it_admin: EMERGENCY_ROLE_IDS.admin,
  paramedic: EMERGENCY_ROLE_IDS.emsUser,
  ems_coordinator: EMERGENCY_ROLE_IDS.emsCoordinator,
  dispatcher: EMERGENCY_ROLE_IDS.dispatcher,
  demo_observer: EMERGENCY_ROLE_IDS.readOnlyViewer,
  pharmacist: EMERGENCY_ROLE_IDS.readOnlyViewer,
  lab_technician: EMERGENCY_ROLE_IDS.readOnlyViewer,
  radiology_technician: EMERGENCY_ROLE_IDS.readOnlyViewer,
  specialist: EMERGENCY_ROLE_IDS.physician,
});

export function resolveRoleOperationalFocus(
  roleId?: string | null,
  hospitalRole?: HospitalRole | null,
): RoleOperationalFocus {
  const hospitalEmergencyRole =
    hospitalRole && HOSPITAL_TO_EMERGENCY[hospitalRole]
      ? HOSPITAL_TO_EMERGENCY[hospitalRole]
      : null;
  const normalized = normalizeEmergencyRole(roleId || hospitalEmergencyRole || '');
  const mapped = ROLE_FOCUS[normalized] || ROLE_FOCUS[EMERGENCY_ROLE_IDS.physician];

  const widgets =
    hospitalRole && ROLE_DASHBOARD_CONFIG[hospitalRole]
      ? ROLE_DASHBOARD_CONFIG[hospitalRole]
      : { primary: mapped.primarySurfaces };

  return Object.freeze({
    roleId: normalized,
    dashboardWidgets: widgets,
    ...mapped,
  });
}

export function shouldShowRoleSummaryCard(
  cardId: string,
  roleId?: string | null,
  hospitalRole?: HospitalRole | null,
): boolean {
  return resolveRoleOperationalFocus(roleId, hospitalRole).showRoleSummaryCards.includes(cardId);
}

export function shouldSuppressOperationalSurface(
  surfaceId: string,
  roleId?: string | null,
  hospitalRole?: HospitalRole | null,
): boolean {
  return resolveRoleOperationalFocus(roleId, hospitalRole).suppressSurfaces.includes(surfaceId);
}