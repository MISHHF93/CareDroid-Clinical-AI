import type { HospitalRole } from './userTypes';
import { DEPARTMENTS } from './hospitalNetwork';

export const CAREDROID_ROLE_LABELS: Readonly<Record<HospitalRole, string>> = Object.freeze({
  super_admin: 'Super Admin',
  hospital_admin: 'Hospital Admin',
  ed_director: 'ED Director',
  charge_nurse: 'Charge Nurse',
  triage_nurse: 'Triage Nurse',
  registered_nurse: 'Registered Nurse',
  emergency_physician: 'Emergency Physician',
  attending_physician: 'Attending Physician',
  resident_physician: 'Resident Physician',
  specialist: 'Specialist',
  paramedic: 'Paramedic',
  dispatcher: 'Dispatcher',
  ems_coordinator: 'EMS Coordinator',
  registration_clerk: 'Registration Clerk',
  patient_flow_coordinator: 'Patient Flow Coordinator',
  lab_technician: 'Lab Technician',
  radiology_technician: 'Radiology Technician',
  pharmacist: 'Pharmacist',
  social_worker: 'Social Worker',
  security_officer: 'Security Officer',
  it_admin: 'IT Admin',
  quality_safety_officer: 'Quality & Safety Officer',
  demo_observer: 'Demo Observer',
});

export const CAREDROID_ROLE_DESCRIPTIONS: Readonly<Record<HospitalRole, string>> = Object.freeze({
  super_admin: 'System owner with full platform access and configuration.',
  hospital_admin: 'Hospital executive with staffing, analytics, and capacity oversight.',
  ed_director: 'Emergency Department director overseeing clinical and operational flow.',
  charge_nurse: 'Shift command — coordinates ED nursing flow, escalations, and bed management.',
  triage_nurse: 'First-line patient acuity assessment and triage queue management.',
  registered_nurse: 'Patient care, vitals, handoff documentation, and monitoring.',
  emergency_physician: 'ED physician responsible for assessment, treatment, and disposition.',
  attending_physician: 'Senior physician supervising clinical care and resident staff.',
  resident_physician: 'Physician trainee with supervised clinical access.',
  specialist: 'Consulting specialist for referred patients in their clinical domain.',
  paramedic: 'Pre-arrival handoff, ambulance intake, and EMS coordination.',
  dispatcher: '911 call intake, telephone triage, CAD dispatch, and ED pre-notification.',
  ems_coordinator: 'Prehospital operations, EMS unit coordination, and pre-arrival relay to ED.',
  registration_clerk: 'Emergency reception, life-critical intake capture, queue handoff, demographics, insurance, and consent.',
  patient_flow_coordinator: 'Bed management, queue routing, and department coordination.',
  lab_technician: 'Lab order workflow and result documentation.',
  radiology_technician: 'Imaging workflow and result documentation.',
  pharmacist: 'Medication review, dispensing, and drug interaction alerts.',
  social_worker: 'Discharge support, safeguarding, and psychosocial coordination.',
  security_officer: 'Safety alerts, restricted access, and incident support.',
  it_admin: 'Technical configuration, integrations, and user management.',
  quality_safety_officer: 'Audit, compliance, reporting, and safety reviews.',
  demo_observer: 'Read-only demo role for presentations and training.',
});

export const ROLE_DEFAULT_DEPARTMENTS: Readonly<Partial<Record<HospitalRole, string>>> =
  Object.freeze({
    super_admin: DEPARTMENTS.ADMINISTRATION,
    hospital_admin: DEPARTMENTS.ADMINISTRATION,
    ed_director: DEPARTMENTS.EMERGENCY,
    charge_nurse: DEPARTMENTS.EMERGENCY,
    triage_nurse: DEPARTMENTS.TRIAGE,
    registered_nurse: DEPARTMENTS.EMERGENCY,
    emergency_physician: DEPARTMENTS.EMERGENCY,
    attending_physician: DEPARTMENTS.EMERGENCY,
    resident_physician: DEPARTMENTS.EMERGENCY,
    specialist: DEPARTMENTS.CARDIOLOGY,
    paramedic: DEPARTMENTS.EMERGENCY,
    registration_clerk: DEPARTMENTS.REGISTRATION,
    patient_flow_coordinator: DEPARTMENTS.PATIENT_FLOW,
    lab_technician: DEPARTMENTS.LABORATORY,
    radiology_technician: DEPARTMENTS.RADIOLOGY,
    pharmacist: DEPARTMENTS.PHARMACY,
    social_worker: DEPARTMENTS.ADMINISTRATION,
    security_officer: DEPARTMENTS.SECURITY,
    it_admin: DEPARTMENTS.IT,
    quality_safety_officer: DEPARTMENTS.ADMINISTRATION,
    demo_observer: DEPARTMENTS.ADMINISTRATION,
  });

// Maps CareDroid hospital roles to the existing emergency role IDs for nav/route compatibility.
export const ROLE_TO_EMERGENCY_ROLE: Readonly<Record<HospitalRole, string>> = Object.freeze({
  super_admin: 'admin',
  hospital_admin: 'ed_manager',
  ed_director: 'ed_manager',
  charge_nurse: 'charge_nurse',
  triage_nurse: 'triage_nurse',
  registered_nurse: 'triage_nurse',
  emergency_physician: 'physician',
  attending_physician: 'physician',
  resident_physician: 'physician',
  specialist: 'physician',
  paramedic: 'ems_user',
  dispatcher: 'dispatcher',
  ems_coordinator: 'ems_coordinator',
  registration_clerk: 'registration_clerk',
  patient_flow_coordinator: 'ed_manager',
  lab_technician: 'read_only_viewer',
  radiology_technician: 'read_only_viewer',
  pharmacist: 'read_only_viewer',
  social_worker: 'read_only_viewer',
  security_officer: 'read_only_viewer',
  it_admin: 'admin',
  quality_safety_officer: 'read_only_viewer',
  demo_observer: 'read_only_viewer',
});

export type DashboardWidgets = {
  primary: readonly string[];
  secondary?: readonly string[];
};

export const ROLE_DASHBOARD_CONFIG: Readonly<Record<HospitalRole, DashboardWidgets>> =
  Object.freeze({
    super_admin: { primary: ['users', 'settings', 'ai-config', 'audit', 'analytics'] },
    hospital_admin: {
      primary: ['analytics', 'throughput', 'staffing', 'occupancy'],
      secondary: ['response-compliance', 'reports'],
    },
    ed_director: {
      primary: ['ed-overview', 'staff-load', 'critical-alerts', 'capacity'],
      secondary: ['analytics', 'escalations', 'response-compliance'],
    },
    charge_nurse: {
      primary: ['ed-overview', 'staff-load', 'critical-alerts', 'escalations'],
      secondary: ['delayed-triage', 'bed-availability', 'bottlenecks'],
    },
    triage_nurse: {
      primary: ['new-arrivals', 'triage-queue', 'red-flags', 'vitals'],
      secondary: ['ai-triage-cards', 'response-timers'],
    },
    registered_nurse: {
      primary: ['assigned-patients', 'vitals', 'handoff-queue'],
      secondary: ['reassessment-timers', 'alerts'],
    },
    emergency_physician: {
      primary: ['assigned-patients', 'critical-patients', 'ai-summaries'],
      secondary: ['handoff-summaries', 'pending-review', 'analytics'],
    },
    attending_physician: {
      primary: ['assigned-patients', 'critical-patients', 'ai-summaries'],
      secondary: ['resident-oversight', 'handoff-summaries', 'analytics'],
    },
    resident_physician: {
      primary: ['assigned-patients', 'ai-summaries', 'pending-review'],
      secondary: ['handoff-summaries'],
    },
    specialist: {
      primary: ['referred-patients', 'specialty-alerts', 'ai-summaries'],
    },
    paramedic: {
      primary: ['ems-queue', 'bay-status', 'incoming-units'],
      secondary: ['handoff-checklist'],
    },
    dispatcher: {
      primary: ['active-calls', 'unit-status', 'priority-queue'],
      secondary: ['call-log', 'pre-arrival-sent'],
    },
    ems_coordinator: {
      primary: ['ems-units', 'inbound-critical', 'ed-readiness'],
      secondary: ['prehospital-data', 'offload-times'],
    },
    registration_clerk: {
      primary: ['active-reception-queue', 'critical-arrivals', 'missing-critical-info'],
      secondary: ['incomplete-registration', 'insurance-status', 'pending-consent'],
    },
    patient_flow_coordinator: {
      primary: ['queue', 'beds', 'departments', 'bottlenecks'],
      secondary: ['routing-recommendations', 'capacity-map'],
    },
    lab_technician: {
      primary: ['lab-orders', 'pending-results'],
    },
    radiology_technician: {
      primary: ['imaging-orders', 'pending-scans'],
    },
    pharmacist: {
      primary: ['medication-review', 'interaction-alerts', 'pending-orders'],
    },
    social_worker: {
      primary: ['discharge-support', 'safeguarding-flags'],
    },
    security_officer: {
      primary: ['safety-alerts', 'restricted-zones', 'incident-log'],
    },
    it_admin: {
      primary: ['users', 'settings', 'integrations', 'ai-configuration'],
    },
    quality_safety_officer: {
      primary: ['audit-trails', 'alert-response-history'],
      secondary: ['ai-review-compliance', 'reports'],
    },
    demo_observer: {
      primary: ['dashboard', 'queue', 'alerts', 'analytics'],
    },
  });

export function getRoleLabel(role: HospitalRole | string): string {
  return CAREDROID_ROLE_LABELS[role as HospitalRole] ?? role;
}

export function getRoleDescription(role: HospitalRole): string {
  return CAREDROID_ROLE_DESCRIPTIONS[role] ?? '';
}

export function toEmergencyRoleId(role: HospitalRole): string {
  return ROLE_TO_EMERGENCY_ROLE[role] ?? 'read_only_viewer';
}

export function getDashboardWidgets(role: HospitalRole): DashboardWidgets {
  return ROLE_DASHBOARD_CONFIG[role] ?? { primary: [] };
}

export function isReadOnlyRole(role: HospitalRole): boolean {
  const readOnlyRoles: HospitalRole[] = [
    'demo_observer', 'security_officer', 'social_worker', 'lab_technician',
    'radiology_technician', 'quality_safety_officer',
  ];
  return readOnlyRoles.includes(role);
}

export function isClinicalRole(role: HospitalRole): boolean {
  const clinicalRoles: HospitalRole[] = [
    'ed_director', 'charge_nurse', 'triage_nurse', 'registered_nurse',
    'emergency_physician', 'attending_physician', 'resident_physician', 'specialist',
    'paramedic',
  ];
  return clinicalRoles.includes(role);
}

export function isAdminRole(role: HospitalRole): boolean {
  return role === 'super_admin' || role === 'hospital_admin' || role === 'it_admin';
}

export const ALL_CAREDROID_ROLES: readonly HospitalRole[] = Object.freeze([
  'super_admin', 'hospital_admin', 'ed_director', 'charge_nurse', 'triage_nurse',
  'registered_nurse', 'emergency_physician', 'attending_physician', 'resident_physician',
  'specialist', 'paramedic', 'registration_clerk', 'patient_flow_coordinator',
  'lab_technician', 'radiology_technician', 'pharmacist', 'social_worker',
  'security_officer', 'it_admin', 'quality_safety_officer', 'demo_observer',
]);
