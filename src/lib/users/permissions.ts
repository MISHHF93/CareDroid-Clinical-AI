import type { HospitalRole } from './userTypes';

export const CAREDROID_PERMISSIONS = Object.freeze({
  // Patient
  PATIENT_READ: 'patient:read',
  PATIENT_CREATE: 'patient:create',
  PATIENT_UPDATE: 'patient:update',
  PATIENT_ASSIGN: 'patient:assign',
  PATIENT_DISCHARGE: 'patient:discharge',

  // Triage
  TRIAGE_READ: 'triage:read',
  TRIAGE_CREATE: 'triage:create',
  TRIAGE_UPDATE: 'triage:update',
  TRIAGE_OVERRIDE_AI: 'triage:override-ai',
  TRIAGE_ESCALATE: 'triage:escalate',

  // AI Chief
  AI_READ: 'ai:read',
  AI_REQUEST: 'ai:request',
  AI_REVIEW: 'ai:review',
  AI_OVERRIDE: 'ai:override',
  AI_CONFIGURE: 'ai:configure',

  // Alerts
  ALERT_READ: 'alert:read',
  ALERT_ACKNOWLEDGE: 'alert:acknowledge',
  ALERT_ESCALATE: 'alert:escalate',
  ALERT_RESOLVE: 'alert:resolve',
  ALERT_CONFIGURE: 'alert:configure',

  // Staff
  STAFF_READ: 'staff:read',
  STAFF_UPDATE: 'staff:update',
  STAFF_ASSIGN: 'staff:assign',
  STAFF_SCHEDULE: 'staff:schedule',

  // Admin / analytics
  ANALYTICS_READ: 'analytics:read',
  REPORTS_READ: 'reports:read',
  REPORTS_EXPORT: 'reports:export',
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  AUDIT_READ: 'audit:read',

  // Clinical
  ORDERS_READ: 'orders:read',
  ORDERS_CREATE: 'orders:create',
  LABS_READ: 'labs:read',
  IMAGING_READ: 'imaging:read',
  MEDICATION_READ: 'medication:read',
  MEDICATION_REVIEW: 'medication:review',
} as const);

export type CareDroidPermission = (typeof CAREDROID_PERMISSIONS)[keyof typeof CAREDROID_PERMISSIONS];

const P = CAREDROID_PERMISSIONS;

export const ROLE_PERMISSIONS: Readonly<Record<HospitalRole, readonly CareDroidPermission[]>> =
  Object.freeze({
    super_admin: Object.freeze(Object.values(P) as CareDroidPermission[]),

    hospital_admin: Object.freeze([
      P.PATIENT_READ,
      P.TRIAGE_READ,
      P.AI_READ, P.AI_REVIEW,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE,
      P.STAFF_READ, P.STAFF_UPDATE, P.STAFF_ASSIGN, P.STAFF_SCHEDULE,
      P.ANALYTICS_READ, P.REPORTS_READ, P.REPORTS_EXPORT,
      P.SETTINGS_READ, P.USERS_READ, P.USERS_CREATE, P.USERS_UPDATE,
      P.AUDIT_READ, P.ORDERS_READ, P.LABS_READ, P.IMAGING_READ,
      P.MEDICATION_READ,
    ]),

    ed_director: Object.freeze([
      P.PATIENT_READ, P.PATIENT_ASSIGN,
      P.TRIAGE_READ, P.TRIAGE_ESCALATE,
      P.AI_READ, P.AI_REVIEW, P.AI_OVERRIDE,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE, P.ALERT_ESCALATE, P.ALERT_RESOLVE,
      P.STAFF_READ, P.STAFF_UPDATE, P.STAFF_ASSIGN, P.STAFF_SCHEDULE,
      P.ANALYTICS_READ, P.REPORTS_READ, P.REPORTS_EXPORT,
      P.SETTINGS_READ, P.USERS_READ,
      P.AUDIT_READ, P.ORDERS_READ,
    ]),

    charge_nurse: Object.freeze([
      P.PATIENT_READ, P.PATIENT_CREATE, P.PATIENT_ASSIGN, P.PATIENT_UPDATE,
      P.TRIAGE_READ, P.TRIAGE_CREATE, P.TRIAGE_UPDATE, P.TRIAGE_OVERRIDE_AI, P.TRIAGE_ESCALATE,
      P.AI_READ, P.AI_REQUEST, P.AI_REVIEW, P.AI_OVERRIDE,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE, P.ALERT_ESCALATE, P.ALERT_RESOLVE,
      P.STAFF_READ, P.STAFF_ASSIGN,
      P.ANALYTICS_READ, P.REPORTS_READ,
      P.SETTINGS_READ,
      P.ORDERS_READ, P.LABS_READ, P.IMAGING_READ, P.MEDICATION_READ,
    ]),

    triage_nurse: Object.freeze([
      P.PATIENT_READ, P.PATIENT_CREATE, P.PATIENT_UPDATE,
      P.TRIAGE_READ, P.TRIAGE_CREATE, P.TRIAGE_UPDATE, P.TRIAGE_OVERRIDE_AI, P.TRIAGE_ESCALATE,
      P.AI_READ, P.AI_REQUEST, P.AI_OVERRIDE,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE, P.ALERT_ESCALATE,
      P.STAFF_READ,
      P.ORDERS_READ, P.LABS_READ, P.IMAGING_READ, P.MEDICATION_READ,
    ]),

    registered_nurse: Object.freeze([
      P.PATIENT_READ, P.PATIENT_UPDATE,
      P.TRIAGE_READ,
      P.AI_READ, P.AI_REQUEST,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE,
      P.STAFF_READ,
      P.ORDERS_READ, P.LABS_READ, P.IMAGING_READ, P.MEDICATION_READ,
    ]),

    emergency_physician: Object.freeze([
      P.PATIENT_READ, P.PATIENT_UPDATE, P.PATIENT_ASSIGN, P.PATIENT_DISCHARGE,
      P.TRIAGE_READ, P.TRIAGE_ESCALATE,
      P.AI_READ, P.AI_REQUEST, P.AI_REVIEW, P.AI_OVERRIDE,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE, P.ALERT_ESCALATE, P.ALERT_RESOLVE,
      P.STAFF_READ,
      P.ANALYTICS_READ, P.REPORTS_READ,
      P.ORDERS_READ, P.ORDERS_CREATE, P.LABS_READ, P.IMAGING_READ,
      P.MEDICATION_READ, P.MEDICATION_REVIEW,
    ]),

    attending_physician: Object.freeze([
      P.PATIENT_READ, P.PATIENT_UPDATE, P.PATIENT_ASSIGN, P.PATIENT_DISCHARGE,
      P.TRIAGE_READ,
      P.AI_READ, P.AI_REQUEST, P.AI_REVIEW, P.AI_OVERRIDE,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE, P.ALERT_ESCALATE, P.ALERT_RESOLVE,
      P.STAFF_READ, P.STAFF_ASSIGN,
      P.ANALYTICS_READ, P.REPORTS_READ,
      P.ORDERS_READ, P.ORDERS_CREATE, P.LABS_READ, P.IMAGING_READ,
      P.MEDICATION_READ, P.MEDICATION_REVIEW,
    ]),

    resident_physician: Object.freeze([
      P.PATIENT_READ, P.PATIENT_UPDATE,
      P.TRIAGE_READ,
      P.AI_READ, P.AI_REQUEST,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE,
      P.STAFF_READ,
      P.ORDERS_READ, P.ORDERS_CREATE, P.LABS_READ, P.IMAGING_READ,
      P.MEDICATION_READ,
    ]),

    specialist: Object.freeze([
      P.PATIENT_READ, P.PATIENT_UPDATE,
      P.TRIAGE_READ,
      P.AI_READ, P.AI_REQUEST, P.AI_REVIEW,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE,
      P.STAFF_READ,
      P.ORDERS_READ, P.ORDERS_CREATE, P.LABS_READ, P.IMAGING_READ,
      P.MEDICATION_READ, P.MEDICATION_REVIEW,
    ]),

    paramedic: Object.freeze([
      P.PATIENT_READ, P.PATIENT_CREATE,
      P.TRIAGE_READ,
      P.AI_READ,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE,
    ]),

    registration_clerk: Object.freeze([
      P.PATIENT_READ, P.PATIENT_CREATE, P.PATIENT_UPDATE,
      P.ALERT_READ,
      P.STAFF_READ,
      P.SETTINGS_READ,
      P.ANALYTICS_READ,
    ]),

    patient_flow_coordinator: Object.freeze([
      P.PATIENT_READ, P.PATIENT_ASSIGN,
      P.TRIAGE_READ,
      P.AI_READ,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE, P.ALERT_ESCALATE,
      P.STAFF_READ, P.STAFF_ASSIGN,
      P.ANALYTICS_READ, P.REPORTS_READ,
    ]),

    lab_technician: Object.freeze([
      P.PATIENT_READ,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE,
      P.LABS_READ,
      P.ORDERS_READ,
    ]),

    radiology_technician: Object.freeze([
      P.PATIENT_READ,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE,
      P.IMAGING_READ,
      P.ORDERS_READ,
    ]),

    pharmacist: Object.freeze([
      P.PATIENT_READ,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE, P.ALERT_ESCALATE,
      P.MEDICATION_READ, P.MEDICATION_REVIEW,
      P.ORDERS_READ, P.LABS_READ,
    ]),

    social_worker: Object.freeze([
      P.PATIENT_READ,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE,
      P.STAFF_READ,
    ]),

    security_officer: Object.freeze([
      P.PATIENT_READ,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE, P.ALERT_ESCALATE,
      P.STAFF_READ,
    ]),

    it_admin: Object.freeze([
      P.PATIENT_READ,
      P.SETTINGS_READ, P.SETTINGS_UPDATE,
      P.USERS_READ, P.USERS_CREATE, P.USERS_UPDATE,
      P.AI_READ, P.AI_CONFIGURE,
      P.ALERT_READ,
      P.AUDIT_READ,
      P.ANALYTICS_READ,
      P.REPORTS_READ,
    ]),

    quality_safety_officer: Object.freeze([
      P.PATIENT_READ,
      P.TRIAGE_READ,
      P.AI_READ, P.AI_REVIEW,
      P.ALERT_READ,
      P.ANALYTICS_READ, P.REPORTS_READ, P.REPORTS_EXPORT,
      P.AUDIT_READ,
      P.STAFF_READ,
    ]),

    dispatcher: Object.freeze([
      P.PATIENT_READ, P.PATIENT_CREATE,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE, P.ALERT_ESCALATE,
      P.STAFF_READ,
      P.ANALYTICS_READ,
    ]),

    ems_coordinator: Object.freeze([
      P.PATIENT_READ,
      P.TRIAGE_READ,
      P.AI_READ, P.AI_REQUEST,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE, P.ALERT_ESCALATE,
      P.STAFF_READ, P.STAFF_ASSIGN,
      P.ANALYTICS_READ,
    ]),

    demo_observer: Object.freeze([
      P.PATIENT_READ,
      P.TRIAGE_READ,
      P.AI_READ,
      P.ALERT_READ,
      P.ANALYTICS_READ,
      P.STAFF_READ,
    ]),
  });

export function hasCareDroidPermission(role: HospitalRole, permission: CareDroidPermission): boolean {
  return (ROLE_PERMISSIONS[role] as readonly string[]).includes(permission);
}

export function getPermissionsForRole(role: HospitalRole): readonly CareDroidPermission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function canRoleReceiveCriticalAlerts(role: HospitalRole): boolean {
  const clinicalRoles: HospitalRole[] = [
    'super_admin', 'ed_director', 'charge_nurse', 'triage_nurse', 'registered_nurse',
    'emergency_physician', 'attending_physician', 'resident_physician', 'specialist',
    'paramedic', 'patient_flow_coordinator', 'pharmacist',
  ];
  return clinicalRoles.includes(role);
}

export function canRoleUseAIChief(role: HospitalRole): boolean {
  return hasCareDroidPermission(role, P.AI_REQUEST) || hasCareDroidPermission(role, P.AI_REVIEW);
}
