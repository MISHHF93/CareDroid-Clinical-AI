/**
 * Reception User Profile — registration clerks, admissions, front-desk
 * coordinators, volunteers, and patient-access staff.
 *
 * Complements (does not replace) emergencyRolePermissions + persona UX.
 */

import { CANONICAL_ROUTES } from './routes.config';
import { EMERGENCY_ACTIONS, EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import {
  RECEPTION_ARCHETYPE_SKILLS,
  type ReceptionSkillId,
} from './receptionSkillModel';

export type ReceptionStaffArchetype =
  | 'registration_clerk'
  | 'admissions_officer'
  | 'front_desk_coordinator'
  | 'patient_access_staff'
  | 'volunteer_greeter';

export type ReceptionAiAssistanceLevel = 'minimal' | 'guided' | 'standard';

export type ReceptionUserProfileDefinition = Readonly<{
  id: ReceptionStaffArchetype;
  label: string;
  description: string;
  mapsToEmergencyRole: string;
  responsibilities: readonly string[];
  dailyWorkflow: readonly string[];
  allowedActions: readonly string[];
  deniedActions: readonly string[];
  defaultRoute: string;
  dashboardWidgets: readonly string[];
  keyboardShortcuts: ReadonlyArray<{ keys: string; action: string }>;
  notificationPreferences: Readonly<{
    criticalArrivals: boolean;
    queueBreaches: boolean;
    emsInbound: boolean;
    escalationAck: boolean;
    sound: boolean;
  }>;
  aiAssistanceLevel: ReceptionAiAssistanceLevel;
  accessibilityDefaults: Readonly<{
    keyboardFirst: boolean;
    highContrastFriendly: boolean;
    reducedMotionPreferred: boolean;
    largeTargets: boolean;
  }>;
  /** Manager KPIs — not shown as primary desk pressure. */
  operationalMetrics: readonly string[];
  /** Executable job skills for this archetype (see receptionSkillModel). */
  skillIds: readonly ReceptionSkillId[];
  personalization: Readonly<{
    density: 'compact' | 'standard';
    pinDefaultQueueTab: boolean;
    showInlineCopilot: boolean;
    barcodeScanEnabled: boolean;
    lookupBeforeCreateDefault: boolean;
    labelAssistAsDeskNotAi: boolean;
  }>;
}>;

const SHARED_ALLOWED = [
  EMERGENCY_ACTIONS.createPatient,
  EMERGENCY_ACTIONS.editPatientDemographics,
  EMERGENCY_ACTIONS.createEncounter,
  EMERGENCY_ACTIONS.verifyIntake,
  EMERGENCY_ACTIONS.convertEmsArrival,
  EMERGENCY_ACTIONS.receptionEscalate,
] as const;

const SHARED_DENIED = [
  EMERGENCY_ACTIONS.triage,
  EMERGENCY_ACTIONS.writeVitals,
  EMERGENCY_ACTIONS.writeNote,
  EMERGENCY_ACTIONS.manageFlags,
  EMERGENCY_ACTIONS.dischargePatient,
  EMERGENCY_ACTIONS.manageCapacity,
  EMERGENCY_ACTIONS.reassignWorkload,
] as const;

const SHARED_SHORTCUTS = [
  { keys: 'Ctrl/Cmd+N', action: 'New walk-in registration' },
  { keys: 'Ctrl/Cmd+S', action: 'Save intake draft' },
  { keys: '1 / 2 / 3', action: 'EMS / Verification / Pre-triage queue tabs' },
  { keys: 'Esc', action: 'Close overlay / chooser / sheet' },
] as const;

export const RECEPTION_USER_PROFILES: Readonly<
  Record<ReceptionStaffArchetype, ReceptionUserProfileDefinition>
> = Object.freeze({
  registration_clerk: {
    id: 'registration_clerk',
    label: 'Registration Clerk',
    description:
      'Primary ED front-desk role: walk-in registration, identity verification, queue handoff, critical escalation.',
    mapsToEmergencyRole: EMERGENCY_ROLE_IDS.registrationClerk,
    responsibilities: [
      'Register walk-in and ambulance arrivals within target door-to-registration time',
      'Capture life-critical fields and chief complaint accurately',
      'Verify identity via OCR or manual entry with human review',
      'Hand off to pre-triage / triage queue without assigning acuity',
      'Escalate red-flag presentations immediately',
    ],
    dailyWorkflow: [
      'Open Reception workspace and review EMS / verification / pre-triage queues',
      'Register walk-in → complete Unified Intake → create & route',
      'Complete identity checks for provisional patients',
      'Convert EMS arrivals when units land',
      'Clear escalations and hand off incomplete registrations at shift end',
    ],
    allowedActions: SHARED_ALLOWED,
    deniedActions: SHARED_DENIED,
    defaultRoute: CANONICAL_ROUTES.emergencyReception,
    dashboardWidgets: [
      'patient-creation',
      'smart-intake',
      'identity-verification',
      'queues',
      'urgent-triage-escalation',
      'ems-pre-arrival',
    ],
    keyboardShortcuts: SHARED_SHORTCUTS,
    notificationPreferences: {
      criticalArrivals: true,
      queueBreaches: true,
      emsInbound: true,
      escalationAck: true,
      sound: false,
    },
    aiAssistanceLevel: 'guided',
    accessibilityDefaults: {
      keyboardFirst: true,
      highContrastFriendly: true,
      reducedMotionPreferred: false,
      largeTargets: true,
    },
    operationalMetrics: [
      'door_to_registration_minutes',
      'registration_completeness_rate',
      'identity_verification_pending',
      'critical_escalations_open',
      'ocr_apply_success_rate',
    ],
    skillIds: RECEPTION_ARCHETYPE_SKILLS.registration_clerk,
    personalization: {
      density: 'compact',
      pinDefaultQueueTab: true,
      showInlineCopilot: false,
      barcodeScanEnabled: true,
      lookupBeforeCreateDefault: true,
      labelAssistAsDeskNotAi: true,
    },
  },
  admissions_officer: {
    id: 'admissions_officer',
    label: 'Admissions Officer',
    description: 'Handles insurance, consent, coverage capture, and administrative completion after initial intake.',
    mapsToEmergencyRole: EMERGENCY_ROLE_IDS.registrationClerk,
    responsibilities: [
      'Complete insurance and consent after critical intake',
      'Reconcile health-card and coverage documents',
      'Support registration clerk during surge',
    ],
    dailyWorkflow: [
      'Work verification queue for incomplete admin fields',
      'Scan insurance cards via OCR and accept fields after review',
      'Update registration status to complete when identity + admin ready',
    ],
    allowedActions: SHARED_ALLOWED,
    deniedActions: SHARED_DENIED,
    defaultRoute: CANONICAL_ROUTES.emergencyReception,
    dashboardWidgets: ['identity-verification', 'queues', 'patient-creation'],
    keyboardShortcuts: SHARED_SHORTCUTS,
    notificationPreferences: {
      criticalArrivals: false,
      queueBreaches: true,
      emsInbound: false,
      escalationAck: false,
      sound: false,
    },
    aiAssistanceLevel: 'standard',
    accessibilityDefaults: {
      keyboardFirst: true,
      highContrastFriendly: true,
      reducedMotionPreferred: false,
      largeTargets: true,
    },
    operationalMetrics: ['admin_completion_rate', 'insurance_capture_rate', 'consent_capture_rate'],
    skillIds: RECEPTION_ARCHETYPE_SKILLS.admissions_officer,
    personalization: {
      density: 'standard',
      pinDefaultQueueTab: true,
      showInlineCopilot: true,
      barcodeScanEnabled: true,
      lookupBeforeCreateDefault: true,
      labelAssistAsDeskNotAi: true,
    },
  },
  front_desk_coordinator: {
    id: 'front_desk_coordinator',
    label: 'Front Desk Coordinator',
    description: 'Supervises front-desk throughput, escalations, and shift handoff quality.',
    mapsToEmergencyRole: EMERGENCY_ROLE_IDS.registrationClerk,
    responsibilities: [
      'Monitor reception queue aging and completeness',
      'Coordinate escalations with charge/triage nursing',
      'Coach clerks on registration quality',
    ],
    dailyWorkflow: [
      'Review attention strip and breach timers',
      'Rebalance verification vs pre-triage backlog',
      'Publish shift notes for incomplete registrations',
    ],
    allowedActions: SHARED_ALLOWED,
    deniedActions: SHARED_DENIED,
    defaultRoute: CANONICAL_ROUTES.emergencyReception,
    dashboardWidgets: [
      'queues',
      'urgent-triage-escalation',
      'operational-strip',
      'ems-pre-arrival',
      'patient-creation',
    ],
    keyboardShortcuts: SHARED_SHORTCUTS,
    notificationPreferences: {
      criticalArrivals: true,
      queueBreaches: true,
      emsInbound: true,
      escalationAck: true,
      sound: true,
    },
    aiAssistanceLevel: 'standard',
    accessibilityDefaults: {
      keyboardFirst: true,
      highContrastFriendly: true,
      reducedMotionPreferred: false,
      largeTargets: false,
    },
    operationalMetrics: [
      'queue_age_p95',
      'escalation_response_minutes',
      'shift_handoff_incomplete_count',
    ],
    skillIds: RECEPTION_ARCHETYPE_SKILLS.front_desk_coordinator,
    personalization: {
      density: 'standard',
      pinDefaultQueueTab: false,
      showInlineCopilot: true,
      barcodeScanEnabled: true,
      lookupBeforeCreateDefault: true,
      labelAssistAsDeskNotAi: true,
    },
  },
  patient_access_staff: {
    id: 'patient_access_staff',
    label: 'Patient Access Staff',
    description: 'Enterprise patient-access role focused on identity matching and chart linkage.',
    mapsToEmergencyRole: EMERGENCY_ROLE_IDS.registrationClerk,
    responsibilities: [
      'Resolve duplicate candidates before new chart creation',
      'Link returning patients with staff confirmation',
      'Maintain MRN/health-card accuracy',
    ],
    dailyWorkflow: [
      'Search existing patients before walk-in create',
      'Review OCR identity fields at high confidence threshold',
      'Complete provisional identities from EMS / unknown pathways',
    ],
    allowedActions: SHARED_ALLOWED,
    deniedActions: SHARED_DENIED,
    defaultRoute: CANONICAL_ROUTES.emergencyReception,
    dashboardWidgets: ['patient-lookup', 'identity-verification', 'smart-intake', 'queues'],
    keyboardShortcuts: SHARED_SHORTCUTS,
    notificationPreferences: {
      criticalArrivals: false,
      queueBreaches: false,
      emsInbound: false,
      escalationAck: false,
      sound: false,
    },
    aiAssistanceLevel: 'guided',
    accessibilityDefaults: {
      keyboardFirst: true,
      highContrastFriendly: true,
      reducedMotionPreferred: false,
      largeTargets: true,
    },
    operationalMetrics: ['duplicate_review_rate', 'identity_link_rate', 'provisional_clearance_rate'],
    skillIds: RECEPTION_ARCHETYPE_SKILLS.patient_access_staff,
    personalization: {
      density: 'compact',
      pinDefaultQueueTab: true,
      showInlineCopilot: false,
      barcodeScanEnabled: true,
      lookupBeforeCreateDefault: true,
      labelAssistAsDeskNotAi: true,
    },
  },
  volunteer_greeter: {
    id: 'volunteer_greeter',
    label: 'Volunteer Greeter',
    description: 'Limited reception assist role — wayfinding and non-PHI queue awareness only.',
    mapsToEmergencyRole: EMERGENCY_ROLE_IDS.registrationClerk,
    responsibilities: [
      'Greet and direct patients to registration or self-check-in',
      'Flag visible distress to clinical staff without charting',
    ],
    dailyWorkflow: [
      'Open reception help / wayfinding guidance',
      'Escalate visible emergencies verbally to clerk/nurse',
    ],
    allowedActions: [],
    deniedActions: [...SHARED_ALLOWED, ...SHARED_DENIED],
    defaultRoute: CANONICAL_ROUTES.emergencyReception,
    dashboardWidgets: ['process-education'],
    keyboardShortcuts: [{ keys: 'Esc', action: 'Close help' }],
    notificationPreferences: {
      criticalArrivals: false,
      queueBreaches: false,
      emsInbound: false,
      escalationAck: false,
      sound: false,
    },
    aiAssistanceLevel: 'minimal',
    accessibilityDefaults: {
      keyboardFirst: true,
      highContrastFriendly: true,
      reducedMotionPreferred: true,
      largeTargets: true,
    },
    operationalMetrics: [],
    skillIds: RECEPTION_ARCHETYPE_SKILLS.volunteer_greeter,
    personalization: {
      density: 'standard',
      pinDefaultQueueTab: false,
      showInlineCopilot: false,
      barcodeScanEnabled: false,
      lookupBeforeCreateDefault: false,
      labelAssistAsDeskNotAi: true,
    },
  },
});

export function getReceptionUserProfile(
  archetype: ReceptionStaffArchetype = 'registration_clerk',
): ReceptionUserProfileDefinition {
  return RECEPTION_USER_PROFILES[archetype] || RECEPTION_USER_PROFILES.registration_clerk;
}

export function listReceptionUserProfiles(): ReceptionUserProfileDefinition[] {
  return Object.values(RECEPTION_USER_PROFILES);
}

/**
 * Resolve reception staff archetype from emergency / SaaS role strings.
 * Uses the same normalization conventions as `normalizeEmergencyRole` (- → _).
 * Archetypes refine UX skills; **enforcement** remains `emergencyRolePermissions`.
 */
export function resolveReceptionArchetypeFromRole(
  role: string | null | undefined,
): ReceptionStaffArchetype {
  const normalized = String(role || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  const spaced = normalized.replace(/_/g, ' ');

  if (
    normalized.includes('volunteer') ||
    spaced.includes('greeter') ||
    normalized === 'demo_observer'
  ) {
    return 'volunteer_greeter';
  }
  if (normalized.includes('admission') || spaced.includes('admissions')) {
    return 'admissions_officer';
  }
  if (
    normalized.includes('coordinator') ||
    normalized.includes('front_desk') ||
    normalized === 'ed_manager'
  ) {
    return 'front_desk_coordinator';
  }
  // Charge nurse is clinical lead — not a registration archetype for desk skills.
  // Keep patient_access for MPI / access clerical strings only.
  if (
    normalized.includes('patient_access') ||
    normalized.includes('access_staff') ||
    spaced.includes('mpi') ||
    normalized.includes('registration_support')
  ) {
    return 'patient_access_staff';
  }
  if (
    normalized.includes('registration') ||
    normalized.includes('receptionist') ||
    normalized === 'emergency_receptionist' ||
    normalized === 'registration_clerk' ||
    spaced.includes('front desk')
  ) {
    return 'registration_clerk';
  }
  // Default front-desk landing profile for unknown ED roles that open reception
  return 'registration_clerk';
}

/** Resolve reception profile from emergency role (skill pack for the desk). */
export function resolveReceptionProfileForRole(
  role: string | null | undefined,
): ReceptionUserProfileDefinition {
  return getReceptionUserProfile(resolveReceptionArchetypeFromRole(role));
}

/** True when this role should see reception job skills on Profile / desk. */
export function isReceptionFacingRole(role: string | null | undefined): boolean {
  const archetype = resolveReceptionArchetypeFromRole(role);
  const normalized = String(role || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  if (archetype === 'volunteer_greeter') return true;
  return (
    normalized.includes('registration') ||
    normalized.includes('receptionist') ||
    normalized.includes('admission') ||
    normalized.includes('front_desk') ||
    normalized.includes('patient_access') ||
    normalized.includes('access_staff')
  );
}
