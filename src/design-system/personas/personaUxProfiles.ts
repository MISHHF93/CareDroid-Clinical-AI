/**
 * Human Profile & Experience Framework (HPEF) — UX-adaptation layer.
 *
 * Deliberately does NOT redefine roles or permissions: HospitalRole and
 * CareDroidUserProfile already exist in src/lib/users/userTypes.ts (23 roles,
 * permissions, dashboardProfile, routeAccess, notification channels, access
 * scopes — built as the RBAC/user-profiles layer). A second, parallel
 * "personas" role system would fork that source of truth. This module adds
 * only the fields HPEF needs that CareDroidUserProfile doesn't have yet:
 * cognitive priority, information density, and AI interaction style.
 *
 * Only roles with a real, live UI surface today have a profile below — see
 * HUMAN_PROFILES.md for the full persona coverage gap (executive, researcher,
 * patient, and family-member personas have no corresponding UI in this app
 * yet, so they're listed as roadmap, not stubbed here with fabricated data).
 */
import type { HospitalRole } from '../../lib/users/userTypes';

export type InformationDensity = 'compact' | 'standard' | 'spacious';

export type CognitivePriority =
  | 'time-critical-triage'
  | 'patient-safety-verification'
  | 'throughput-and-flow'
  | 'operational-oversight'
  | 'documentation-accuracy';

export type AiInteractionStyle =
  /** Short, actionable, defers to clinical judgment; no chit-chat under load. */
  | 'concise-clinical'
  /** Step-by-step workflow guidance, confirms before acting. */
  | 'guided-workflow'
  /** Aggregate summaries, trend framing, less per-patient detail. */
  | 'operational-summary';

export type PersonaUxProfile = Readonly<{
  role: HospitalRole;
  label: string;
  cognitivePriority: CognitivePriority;
  informationDensity: InformationDensity;
  aiInteractionStyle: AiInteractionStyle;
  /** Matches CareDroidUserProfile.dashboardProfile.primaryWidgets intent — kept here as guidance, not a duplicate field. */
  primaryConcerns: readonly string[];
}>;

export const PERSONA_UX_PROFILES: Readonly<Partial<Record<HospitalRole, PersonaUxProfile>>> =
  Object.freeze({
    emergency_physician: {
      role: 'emergency_physician',
      label: 'Emergency Physician',
      cognitivePriority: 'time-critical-triage',
      informationDensity: 'compact',
      aiInteractionStyle: 'concise-clinical',
      primaryConcerns: [
        'acuity/breach status across assigned patients',
        'orders pending action',
        'diagnostic results ready for review',
      ],
    },
    attending_physician: {
      role: 'attending_physician',
      label: 'Attending Physician',
      cognitivePriority: 'time-critical-triage',
      informationDensity: 'compact',
      aiInteractionStyle: 'concise-clinical',
      primaryConcerns: [
        'department-wide acuity',
        'resident/consult handoffs',
        'disposition-pending patients',
      ],
    },
    resident_physician: {
      role: 'resident_physician',
      label: 'Resident Physician',
      cognitivePriority: 'patient-safety-verification',
      informationDensity: 'standard',
      aiInteractionStyle: 'guided-workflow',
      primaryConcerns: [
        'assigned patient list',
        'orders requiring co-sign',
        'evidence/citation support for differentials',
      ],
    },
    charge_nurse: {
      role: 'charge_nurse',
      label: 'Charge Nurse',
      cognitivePriority: 'operational-oversight',
      informationDensity: 'standard',
      aiInteractionStyle: 'operational-summary',
      primaryConcerns: [
        'bed/room availability',
        'staffing load balance',
        'escalations and breach timers department-wide',
      ],
    },
    triage_nurse: {
      role: 'triage_nurse',
      label: 'Triage Nurse',
      cognitivePriority: 'time-critical-triage',
      informationDensity: 'compact',
      aiInteractionStyle: 'guided-workflow',
      primaryConcerns: [
        'incoming/waiting queue by acuity',
        'reassessment timers',
        'high-risk complaint flags',
      ],
    },
    registered_nurse: {
      role: 'registered_nurse',
      label: 'Registered Nurse',
      cognitivePriority: 'patient-safety-verification',
      informationDensity: 'standard',
      aiInteractionStyle: 'guided-workflow',
      primaryConcerns: [
        'assigned patient vitals/tasks',
        'medication administration windows',
        'reassessment due',
      ],
    },
    paramedic: {
      role: 'paramedic',
      label: 'EMS / Paramedic',
      cognitivePriority: 'time-critical-triage',
      informationDensity: 'compact',
      aiInteractionStyle: 'guided-workflow',
      primaryConcerns: [
        'pre-arrival notification status',
        'handoff checklist',
        'receiving bay readiness',
      ],
    },
    dispatcher: {
      role: 'dispatcher',
      label: 'EMS Dispatcher',
      cognitivePriority: 'operational-oversight',
      informationDensity: 'standard',
      aiInteractionStyle: 'operational-summary',
      primaryConcerns: [
        'unit availability and ETA',
        'diversion status',
        'offload pressure across sites',
      ],
    },
    registration_clerk: {
      role: 'registration_clerk',
      label: 'Registration Clerk',
      // ED desk under load is interruption-driven speed + safety signaling, not form completeness.
      cognitivePriority: 'time-critical-triage',
      informationDensity: 'compact',
      aiInteractionStyle: 'guided-workflow',
      primaryConcerns: [
        'find existing patient before create',
        'door-to-nurse handoff speed',
        'crash/unknown pathway',
        'identity verification without blocking care',
        'escalation when red flags present',
      ],
    },
    hospital_admin: {
      role: 'hospital_admin',
      label: 'Hospital Administrator',
      cognitivePriority: 'operational-oversight',
      informationDensity: 'spacious',
      aiInteractionStyle: 'operational-summary',
      primaryConcerns: [
        'department throughput trends',
        'staffing and capacity forecasts',
        'compliance/audit posture',
      ],
    },
    it_admin: {
      role: 'it_admin',
      label: 'IT Administrator',
      cognitivePriority: 'operational-oversight',
      informationDensity: 'standard',
      aiInteractionStyle: 'operational-summary',
      primaryConcerns: ['system health/observability', 'integration status', 'access/audit logs'],
    },
  });

export function getPersonaUxProfile(role: HospitalRole): PersonaUxProfile | undefined {
  return PERSONA_UX_PROFILES[role];
}
