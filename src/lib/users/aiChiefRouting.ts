import type { HospitalRole } from './userTypes';
import {
  compileCareDroidAccessProfile,
  type CompiledCareDroidAccessProfile,
} from './canonicalAccess';
import type { CareDroidUserProfile } from './userTypes';

/**
 * AI-specific severity for recommendation routing.
 * This is distinct from the clinical AlertSeverity in types/emergency.ts
 * which uses 'Info' | 'Warning' | 'Critical'.
 */
export type AiRoutingSeverity = 'critical' | 'high' | 'medium' | 'low';

export type AiRecommendationRoute = {
  visibleToRoles: readonly HospitalRole[];
  suggestedOwnerRole: HospitalRole;
  ownerRole?: HospitalRole;
  ownerUserId?: string | null;
  owningDepartment?: string | null;
  owningSite?: string | null;
  escalationRole: HospitalRole;
  escalationUserId?: string | null;
  visibleToUsers?: readonly string[];
  requiresClinicianReview: boolean;
  clinicianOverrideAvailable: boolean;
  fallbackOwnerRole?: HospitalRole;
};

export type AlertScenario =
  | 'critical_chest_pain'
  | 'stroke_alert'
  | 'sepsis_alert'
  | 'pediatric_emergency'
  | 'trauma_activation'
  | 'mental_health_crisis'
  | 'medication_interaction'
  | 'lab_critical_value'
  | 'bed_capacity_breach'
  | 'triage_breach'
  | 'ems_incoming'
  | 'security_incident';

export const AI_CHIEF_ROUTING: Readonly<Record<AlertScenario, AiRecommendationRoute>> =
  Object.freeze({
    critical_chest_pain: {
      visibleToRoles: [
        'triage_nurse',
        'charge_nurse',
        'emergency_physician',
        'attending_physician',
        'specialist',
        'registered_nurse',
      ],
      suggestedOwnerRole: 'triage_nurse',
      fallbackOwnerRole: 'charge_nurse',
      escalationRole: 'emergency_physician',
      requiresClinicianReview: true,
      clinicianOverrideAvailable: true,
    },

    stroke_alert: {
      visibleToRoles: [
        'triage_nurse',
        'charge_nurse',
        'emergency_physician',
        'attending_physician',
        'specialist',
      ],
      suggestedOwnerRole: 'charge_nurse',
      fallbackOwnerRole: 'triage_nurse',
      escalationRole: 'emergency_physician',
      requiresClinicianReview: true,
      clinicianOverrideAvailable: true,
    },

    sepsis_alert: {
      visibleToRoles: [
        'triage_nurse',
        'charge_nurse',
        'emergency_physician',
        'attending_physician',
        'registered_nurse',
      ],
      suggestedOwnerRole: 'triage_nurse',
      fallbackOwnerRole: 'charge_nurse',
      escalationRole: 'emergency_physician',
      requiresClinicianReview: true,
      clinicianOverrideAvailable: true,
    },

    pediatric_emergency: {
      visibleToRoles: [
        'triage_nurse',
        'charge_nurse',
        'emergency_physician',
        'attending_physician',
        'specialist',
      ],
      suggestedOwnerRole: 'triage_nurse',
      fallbackOwnerRole: 'charge_nurse',
      escalationRole: 'attending_physician',
      requiresClinicianReview: true,
      clinicianOverrideAvailable: true,
    },

    trauma_activation: {
      visibleToRoles: [
        'triage_nurse',
        'charge_nurse',
        'emergency_physician',
        'attending_physician',
        'paramedic',
        'registered_nurse',
      ],
      suggestedOwnerRole: 'charge_nurse',
      fallbackOwnerRole: 'emergency_physician',
      escalationRole: 'attending_physician',
      requiresClinicianReview: true,
      clinicianOverrideAvailable: true,
    },

    mental_health_crisis: {
      visibleToRoles: [
        'triage_nurse',
        'charge_nurse',
        'emergency_physician',
        'social_worker',
        'registered_nurse',
      ],
      suggestedOwnerRole: 'triage_nurse',
      fallbackOwnerRole: 'social_worker',
      escalationRole: 'emergency_physician',
      requiresClinicianReview: true,
      clinicianOverrideAvailable: true,
    },

    medication_interaction: {
      visibleToRoles: ['emergency_physician', 'attending_physician', 'pharmacist', 'charge_nurse'],
      suggestedOwnerRole: 'pharmacist',
      fallbackOwnerRole: 'charge_nurse',
      escalationRole: 'emergency_physician',
      requiresClinicianReview: true,
      clinicianOverrideAvailable: true,
    },

    lab_critical_value: {
      visibleToRoles: [
        'emergency_physician',
        'attending_physician',
        'charge_nurse',
        'lab_technician',
      ],
      suggestedOwnerRole: 'lab_technician',
      escalationRole: 'patient_flow_coordinator',
      fallbackOwnerRole: 'charge_nurse',
      requiresClinicianReview: true,
      clinicianOverrideAvailable: false,
    },

    bed_capacity_breach: {
      visibleToRoles: ['charge_nurse', 'patient_flow_coordinator', 'ed_director', 'hospital_admin'],
      suggestedOwnerRole: 'patient_flow_coordinator',
      escalationRole: 'charge_nurse',
      fallbackOwnerRole: 'hospital_admin',
      requiresClinicianReview: false,
      clinicianOverrideAvailable: false,
    },

    triage_breach: {
      visibleToRoles: ['triage_nurse', 'charge_nurse', 'ed_director'],
      suggestedOwnerRole: 'triage_nurse',
      fallbackOwnerRole: 'charge_nurse',
      escalationRole: 'charge_nurse',
      requiresClinicianReview: false,
      clinicianOverrideAvailable: false,
    },

    ems_incoming: {
      visibleToRoles: [
        'paramedic',
        'triage_nurse',
        'charge_nurse',
        'emergency_physician',
        'registration_clerk',
      ],
      suggestedOwnerRole: 'paramedic',
      fallbackOwnerRole: 'triage_nurse',
      escalationRole: 'charge_nurse',
      requiresClinicianReview: false,
      clinicianOverrideAvailable: false,
    },

    security_incident: {
      visibleToRoles: ['security_officer', 'charge_nurse', 'ed_director', 'hospital_admin'],
      suggestedOwnerRole: 'security_officer',
      fallbackOwnerRole: 'charge_nurse',
      escalationRole: 'ed_director',
      requiresClinicianReview: false,
      clinicianOverrideAvailable: false,
    },
  });

export function getAiRecommendationRoute(scenario: AlertScenario): AiRecommendationRoute {
  return AI_CHIEF_ROUTING[scenario];
}

function compileInputProfile(
  profile?: CareDroidUserProfile | CompiledCareDroidAccessProfile | null,
): CompiledCareDroidAccessProfile | null {
  if (!profile) return null;
  return 'navigationAccess' in profile ? profile : compileCareDroidAccessProfile(profile);
}

export function getCanonicalAiRecommendationRoute(
  scenario: AlertScenario,
  profile?: CareDroidUserProfile | CompiledCareDroidAccessProfile | null,
): AiRecommendationRoute {
  const base = AI_CHIEF_ROUTING[scenario];
  const compiled = compileInputProfile(profile);
  return Object.freeze({
    ...base,
    ownerRole: base.suggestedOwnerRole,
    ownerUserId:
      compiled && compiled.role.hospitalRole === base.suggestedOwnerRole ? compiled.user.id : null,
    owningDepartment: compiled?.user.departmentId || null,
    owningSite: compiled?.user.hospitalSiteId || null,
    escalationUserId:
      compiled && compiled.role.hospitalRole === base.escalationRole ? compiled.user.id : null,
    visibleToUsers:
      compiled && isAlertVisibleToCompiledProfile(scenario, compiled)
        ? Object.freeze([compiled.user.id])
        : Object.freeze([]),
    fallbackOwnerRole: base.fallbackOwnerRole || base.escalationRole,
  });
}

export function isAlertVisibleToCompiledProfile(
  scenario: AlertScenario,
  profile: CareDroidUserProfile | CompiledCareDroidAccessProfile,
): boolean {
  const compiled = compileInputProfile(profile);
  if (!compiled || compiled.readOnly || !compiled.aiCapabilities.canUseAIChief) return false;
  return (AI_CHIEF_ROUTING[scenario]?.visibleToRoles as HospitalRole[]).includes(
    compiled.role.hospitalRole,
  );
}

export function isAlertVisibleToRole(scenario: AlertScenario, role: HospitalRole): boolean {
  return (AI_CHIEF_ROUTING[scenario]?.visibleToRoles as HospitalRole[]).includes(role);
}

export function getEscalationRoleForScenario(scenario: AlertScenario): HospitalRole {
  return AI_CHIEF_ROUTING[scenario]?.escalationRole;
}

export function getSuggestedOwnerForScenario(scenario: AlertScenario): HospitalRole {
  return AI_CHIEF_ROUTING[scenario]?.suggestedOwnerRole;
}

export function getVisibleScenariosForRole(role: HospitalRole): AlertScenario[] {
  return (Object.keys(AI_CHIEF_ROUTING) as AlertScenario[]).filter((scenario) =>
    isAlertVisibleToRole(scenario, role),
  );
}

export function filterAiRecommendationsByRole<T extends { scenario: AlertScenario }>(
  recommendations: T[],
  role: HospitalRole,
): T[] {
  return recommendations.filter((r) => isAlertVisibleToRole(r.scenario, role));
}

export function filterAiRecommendationsByProfile<T extends { scenario: AlertScenario }>(
  recommendations: T[],
  profile: CareDroidUserProfile | CompiledCareDroidAccessProfile,
): T[] {
  return recommendations.filter((r) => isAlertVisibleToCompiledProfile(r.scenario, profile));
}
