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

  // Document intake / OCR
  DOCUMENT_READ: 'document:read',
  DOCUMENT_CAPTURE: 'document:capture',
  DOCUMENT_REVIEW: 'document:review',

  // Collaboration Hub
  COLLABORATION_READ: 'collaboration:read',
  COLLABORATION_POST: 'collaboration:post',
  COLLABORATION_MANAGE_CHANNELS: 'collaboration:manage_channels',
  COLLABORATION_MODERATE: 'collaboration:moderate',
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
      P.DOCUMENT_READ,
      P.COLLABORATION_READ, P.COLLABORATION_POST, P.COLLABORATION_MANAGE_CHANNELS, P.COLLABORATION_MODERATE,
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
      P.DOCUMENT_READ,
      P.COLLABORATION_READ, P.COLLABORATION_POST, P.COLLABORATION_MANAGE_CHANNELS, P.COLLABORATION_MODERATE,
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
      P.DOCUMENT_READ, P.DOCUMENT_CAPTURE, P.DOCUMENT_REVIEW,
      P.COLLABORATION_READ, P.COLLABORATION_POST, P.COLLABORATION_MANAGE_CHANNELS, P.COLLABORATION_MODERATE,
    ]),

    triage_nurse: Object.freeze([
      P.PATIENT_READ, P.PATIENT_CREATE, P.PATIENT_UPDATE,
      P.TRIAGE_READ, P.TRIAGE_CREATE, P.TRIAGE_UPDATE, P.TRIAGE_OVERRIDE_AI, P.TRIAGE_ESCALATE,
      P.AI_READ, P.AI_REQUEST, P.AI_OVERRIDE,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE, P.ALERT_ESCALATE,
      P.STAFF_READ,
      P.ORDERS_READ, P.LABS_READ, P.IMAGING_READ, P.MEDICATION_READ,
      P.DOCUMENT_READ, P.DOCUMENT_CAPTURE, P.DOCUMENT_REVIEW,
      P.COLLABORATION_READ, P.COLLABORATION_POST,
    ]),

    registered_nurse: Object.freeze([
      P.PATIENT_READ, P.PATIENT_UPDATE,
      P.TRIAGE_READ,
      P.AI_READ, P.AI_REQUEST,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE,
      P.STAFF_READ,
      P.ORDERS_READ, P.LABS_READ, P.IMAGING_READ, P.MEDICATION_READ,
      P.DOCUMENT_READ, P.DOCUMENT_CAPTURE, P.DOCUMENT_REVIEW,
      P.COLLABORATION_READ, P.COLLABORATION_POST,
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
      P.DOCUMENT_READ, P.DOCUMENT_REVIEW,
      P.COLLABORATION_READ, P.COLLABORATION_POST,
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
      P.DOCUMENT_READ, P.DOCUMENT_REVIEW,
      P.COLLABORATION_READ, P.COLLABORATION_POST,
    ]),

    resident_physician: Object.freeze([
      P.PATIENT_READ, P.PATIENT_UPDATE,
      P.TRIAGE_READ,
      P.AI_READ, P.AI_REQUEST,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE,
      P.STAFF_READ,
      P.ORDERS_READ, P.ORDERS_CREATE, P.LABS_READ, P.IMAGING_READ,
      P.MEDICATION_READ,
      P.DOCUMENT_READ, P.DOCUMENT_REVIEW,
      P.COLLABORATION_READ, P.COLLABORATION_POST,
    ]),

    specialist: Object.freeze([
      P.PATIENT_READ, P.PATIENT_UPDATE,
      P.TRIAGE_READ,
      P.AI_READ, P.AI_REQUEST, P.AI_REVIEW,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE,
      P.STAFF_READ,
      P.ORDERS_READ, P.ORDERS_CREATE, P.LABS_READ, P.IMAGING_READ,
      P.MEDICATION_READ, P.MEDICATION_REVIEW,
      P.DOCUMENT_READ, P.DOCUMENT_REVIEW,
      P.COLLABORATION_READ, P.COLLABORATION_POST,
    ]),

    paramedic: Object.freeze([
      P.PATIENT_READ, P.PATIENT_CREATE,
      P.TRIAGE_READ,
      P.AI_READ,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE,
      P.DOCUMENT_READ, P.DOCUMENT_CAPTURE,
      P.COLLABORATION_READ, P.COLLABORATION_POST,
    ]),

    registration_clerk: Object.freeze([
      P.PATIENT_READ, P.PATIENT_CREATE, P.PATIENT_UPDATE,
      P.ALERT_READ,
      P.STAFF_READ,
      P.SETTINGS_READ,
      P.ANALYTICS_READ,
      P.DOCUMENT_READ, P.DOCUMENT_CAPTURE, P.DOCUMENT_REVIEW,
      P.COLLABORATION_READ, P.COLLABORATION_POST,
    ]),

    patient_flow_coordinator: Object.freeze([
      P.PATIENT_READ, P.PATIENT_ASSIGN,
      P.TRIAGE_READ,
      P.AI_READ,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE, P.ALERT_ESCALATE,
      P.STAFF_READ, P.STAFF_ASSIGN,
      P.ANALYTICS_READ, P.REPORTS_READ,
      P.COLLABORATION_READ, P.COLLABORATION_POST,
    ]),

    lab_technician: Object.freeze([
      P.PATIENT_READ,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE,
      P.LABS_READ,
      P.ORDERS_READ,
      P.COLLABORATION_READ, P.COLLABORATION_POST,
    ]),

    radiology_technician: Object.freeze([
      P.PATIENT_READ,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE,
      P.IMAGING_READ,
      P.ORDERS_READ,
      P.COLLABORATION_READ, P.COLLABORATION_POST,
    ]),

    pharmacist: Object.freeze([
      P.PATIENT_READ,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE, P.ALERT_ESCALATE,
      P.MEDICATION_READ, P.MEDICATION_REVIEW,
      P.ORDERS_READ, P.LABS_READ,
      P.COLLABORATION_READ, P.COLLABORATION_POST,
    ]),

    social_worker: Object.freeze([
      P.PATIENT_READ,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE,
      P.STAFF_READ,
      P.COLLABORATION_READ, P.COLLABORATION_POST,
    ]),

    security_officer: Object.freeze([
      P.PATIENT_READ,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE, P.ALERT_ESCALATE,
      P.STAFF_READ,
      P.COLLABORATION_READ, P.COLLABORATION_POST,
    ]),

    it_admin: Object.freeze([
      P.SETTINGS_READ, P.SETTINGS_UPDATE,
      P.USERS_READ, P.USERS_CREATE, P.USERS_UPDATE,
      P.AI_READ, P.AI_CONFIGURE,
      P.ALERT_READ,
      P.AUDIT_READ,
      P.ANALYTICS_READ,
      P.REPORTS_READ,
      P.DOCUMENT_READ,
      P.COLLABORATION_READ, P.COLLABORATION_POST, P.COLLABORATION_MANAGE_CHANNELS,
    ]),

    quality_safety_officer: Object.freeze([
      P.PATIENT_READ,
      P.TRIAGE_READ,
      P.AI_READ, P.AI_REVIEW,
      P.ALERT_READ,
      P.ANALYTICS_READ, P.REPORTS_READ, P.REPORTS_EXPORT,
      P.AUDIT_READ,
      P.STAFF_READ,
      P.DOCUMENT_READ,
      P.COLLABORATION_READ, P.COLLABORATION_POST, P.COLLABORATION_MODERATE,
    ]),

    dispatcher: Object.freeze([
      P.PATIENT_READ, P.PATIENT_CREATE,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE, P.ALERT_ESCALATE,
      P.STAFF_READ,
      P.ANALYTICS_READ,
      P.DOCUMENT_READ, P.DOCUMENT_CAPTURE,
      P.COLLABORATION_READ, P.COLLABORATION_POST,
    ]),

    ems_coordinator: Object.freeze([
      P.PATIENT_READ,
      P.TRIAGE_READ,
      P.AI_READ, P.AI_REQUEST,
      P.ALERT_READ, P.ALERT_ACKNOWLEDGE, P.ALERT_ESCALATE,
      P.STAFF_READ, P.STAFF_ASSIGN,
      P.ANALYTICS_READ,
      P.DOCUMENT_READ, P.DOCUMENT_CAPTURE,
      P.COLLABORATION_READ, P.COLLABORATION_POST,
    ]),

    demo_observer: Object.freeze([
      P.PATIENT_READ,
      P.TRIAGE_READ,
      P.AI_READ,
      P.ALERT_READ,
      P.ANALYTICS_READ,
      P.STAFF_READ,
      P.DOCUMENT_READ,
      P.COLLABORATION_READ,
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
