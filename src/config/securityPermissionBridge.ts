/**
 * Permission vocabulary bridge — maps emergency dot, CareDroid colon, and backend RBAC keys.
 */

import {
  EMERGENCY_PERMISSION_KEYS,
  resolveEmergencyPermissionKey,
} from './emergencyPermissionRegistry';
import { CAREDROID_PERMISSIONS, type CareDroidPermission } from '../lib/users/permissions';
import {
  BACKEND_PERMISSION_KEYS,
  type BackendPermissionKey,
  type SecurityPermissionVocabulary,
} from './securityModel';

const K = EMERGENCY_PERMISSION_KEYS;
const P = CAREDROID_PERMISSIONS;
const B = BACKEND_PERMISSION_KEYS;

export type NormalizedPermissionSet = Readonly<{
  emergency: string | null;
  caredroid: readonly CareDroidPermission[];
  backend: readonly BackendPermissionKey[];
}>;

const EMERGENCY_TO_CAREDROID: Readonly<Record<string, readonly CareDroidPermission[]>> =
  Object.freeze({
    [K.patientCreate]: [P.PATIENT_CREATE],
    [K.patientDemographicsEdit]: [P.PATIENT_UPDATE],
    [K.patientTransition]: [P.PATIENT_UPDATE],
    [K.patientAssignStaff]: [P.PATIENT_ASSIGN, P.STAFF_ASSIGN],
    [K.patientAssignRoom]: [P.PATIENT_ASSIGN],
    [K.patientEscalate]: [P.TRIAGE_ESCALATE, P.ALERT_ESCALATE],
    [K.patientDischarge]: [P.PATIENT_DISCHARGE],
    [K.encounterCreate]: [P.PATIENT_CREATE],
    [K.intakeVerify]: [P.PATIENT_UPDATE],
    [K.triageAssignAcuity]: [P.TRIAGE_CREATE, P.TRIAGE_UPDATE],
    [K.queueMove]: [P.PATIENT_UPDATE],
    [K.vitalsWrite]: [P.PATIENT_UPDATE],
    [K.notesWrite]: [P.PATIENT_UPDATE],
    [K.flagsManage]: [P.PATIENT_UPDATE, P.ALERT_ACKNOWLEDGE],
    [K.reassessmentComplete]: [P.TRIAGE_UPDATE],
    [K.emsPrepareBay]: [P.PATIENT_UPDATE],
    [K.emsConvertArrival]: [P.PATIENT_CREATE],
    [K.emsHandoffComplete]: [P.PATIENT_UPDATE],
    [K.referralCreate]: [P.ORDERS_CREATE],
    [K.transferManage]: [P.PATIENT_ASSIGN],
    [K.capacityManage]: [P.ANALYTICS_READ, P.SETTINGS_READ],
    [K.boardingManage]: [P.PATIENT_ASSIGN],
    [K.workloadReassign]: [P.STAFF_ASSIGN],
    [K.receptionEscalate]: [P.ALERT_ESCALATE],
    [K.copilotUse]: [P.AI_REQUEST, P.AI_READ],
    [K.analyticsView]: [P.ANALYTICS_READ, P.REPORTS_READ],
    [K.simulationRun]: [P.AI_CONFIGURE],
    [K.settingsManage]: [P.SETTINGS_UPDATE],
    [K.displayPublicWaitboard]: [P.ANALYTICS_READ],
    [K.displayPublicPublish]: [P.SETTINGS_UPDATE],
    [K.displayWhiteboardReadonly]: [P.PATIENT_READ, P.TRIAGE_READ],
    [K.screenTriage]: [P.TRIAGE_READ, P.TRIAGE_CREATE],
    [K.screenRegistration]: [P.PATIENT_CREATE, P.PATIENT_READ],
    [K.screenChargeNurse]: [P.PATIENT_READ, P.STAFF_ASSIGN],
    [K.screenPhysician]: [P.PATIENT_READ, P.ORDERS_CREATE],
    [K.screenEms]: [P.PATIENT_READ, P.PATIENT_CREATE],
    [K.screenCommandCenter]: [P.ANALYTICS_READ, P.PATIENT_READ],
    [K.screenAdmin]: [P.SETTINGS_UPDATE, P.USERS_READ],
  });

const CAREDROID_TO_BACKEND: Readonly<Record<CareDroidPermission, readonly BackendPermissionKey[]>> =
  Object.freeze({
    [P.PATIENT_READ]: [B.READ_PHI],
    [P.PATIENT_CREATE]: [B.WRITE_PHI, B.IMPORT_PATIENT_DATA],
    [P.PATIENT_UPDATE]: [B.WRITE_PHI],
    [P.PATIENT_ASSIGN]: [B.WRITE_PHI],
    [P.PATIENT_DISCHARGE]: [B.WRITE_PHI],
    [P.TRIAGE_READ]: [B.READ_PHI],
    [P.TRIAGE_CREATE]: [B.WRITE_PHI],
    [P.TRIAGE_UPDATE]: [B.WRITE_PHI],
    [P.TRIAGE_OVERRIDE_AI]: [B.WRITE_PHI, B.OVERRIDE_SAFETY_CHECKS],
    [P.TRIAGE_ESCALATE]: [B.WRITE_PHI],
    [P.AI_READ]: [B.USE_AI_CHAT],
    [P.AI_REQUEST]: [B.USE_AI_CHAT],
    [P.AI_REVIEW]: [B.REVIEW_CLINICAL_AI, B.USE_AI_CHAT],
    [P.AI_OVERRIDE]: [B.OVERRIDE_SAFETY_CHECKS, B.USE_AI_CHAT],
    [P.AI_CONFIGURE]: [B.CONFIGURE_SYSTEM],
    [P.ALERT_READ]: [B.READ_PHI],
    [P.ALERT_ACKNOWLEDGE]: [B.WRITE_PHI],
    [P.ALERT_ESCALATE]: [B.WRITE_PHI],
    [P.ALERT_RESOLVE]: [B.WRITE_PHI],
    [P.ALERT_CONFIGURE]: [B.CONFIGURE_SYSTEM],
    [P.STAFF_READ]: [B.VIEW_USERS],
    [P.STAFF_UPDATE]: [B.MANAGE_USERS],
    [P.STAFF_ASSIGN]: [B.WRITE_PHI],
    [P.STAFF_SCHEDULE]: [B.MANAGE_USERS],
    [P.ANALYTICS_READ]: [B.VIEW_ANALYTICS],
    [P.REPORTS_READ]: [B.VIEW_ANALYTICS],
    [P.REPORTS_EXPORT]: [B.EXPORT_PHI],
    [P.SETTINGS_READ]: [B.CONFIGURE_SYSTEM],
    [P.SETTINGS_UPDATE]: [B.CONFIGURE_SYSTEM],
    [P.USERS_READ]: [B.VIEW_USERS],
    [P.USERS_CREATE]: [B.MANAGE_USERS],
    [P.USERS_UPDATE]: [B.MANAGE_USERS],
    [P.AUDIT_READ]: [B.VIEW_AUDIT_LOGS, B.VIEW_PHI_AUDIT],
    [P.ORDERS_READ]: [B.READ_PHI],
    [P.ORDERS_CREATE]: [B.WRITE_PHI],
    [P.LABS_READ]: [B.READ_PHI],
    [P.IMAGING_READ]: [B.READ_PHI],
    [P.MEDICATION_READ]: [B.READ_PHI],
    [P.MEDICATION_REVIEW]: [B.WRITE_PHI],
    [P.DOCUMENT_READ]: [B.READ_PHI],
    [P.DOCUMENT_CAPTURE]: [B.WRITE_PHI],
    [P.DOCUMENT_REVIEW]: [B.WRITE_PHI],
    [P.COLLABORATION_READ]: [B.READ_PHI],
    [P.COLLABORATION_POST]: [B.WRITE_PHI],
    [P.COLLABORATION_MANAGE_CHANNELS]: [B.CONFIGURE_SYSTEM],
    [P.COLLABORATION_MODERATE]: [B.WRITE_PHI, B.CONFIGURE_SYSTEM],
  });

const BACKEND_ALIASES = new Map<string, BackendPermissionKey>(
  Object.values(B).map((key) => [key, key]),
);

const CAREDROID_ALIASES = new Map<string, CareDroidPermission>(
  Object.values(P).map((key) => [key, key]),
);

function detectVocabulary(permission: string): SecurityPermissionVocabulary {
  if (BACKEND_ALIASES.has(permission)) return 'backend-rbac';
  if (permission.includes(':')) return 'caredroid-colon';
  return 'emergency-dot';
}

function caredroidFromEmergency(emergencyKey: string): readonly CareDroidPermission[] {
  return EMERGENCY_TO_CAREDROID[emergencyKey] || [];
}

function backendFromCaredroid(keys: readonly CareDroidPermission[]): BackendPermissionKey[] {
  const merged = new Set<BackendPermissionKey>();
  for (const key of keys) {
    for (const backend of CAREDROID_TO_BACKEND[key] || []) {
      merged.add(backend);
    }
  }
  return [...merged];
}

export function normalizePermission(
  permission: string | null | undefined,
): NormalizedPermissionSet {
  const raw = String(permission || '').trim();
  if (!raw) {
    return { emergency: null, caredroid: [], backend: [] };
  }

  const vocabulary = detectVocabulary(raw);

  if (vocabulary === 'backend-rbac') {
    const backendKey = BACKEND_ALIASES.get(raw)!;
    return { emergency: null, caredroid: [], backend: [backendKey] };
  }

  if (vocabulary === 'caredroid-colon') {
    const caredroidKey = CAREDROID_ALIASES.get(raw as CareDroidPermission);
    const caredroid = caredroidKey ? [caredroidKey] : [];
    return {
      emergency: null,
      caredroid,
      backend: backendFromCaredroid(caredroid),
    };
  }

  const emergency = resolveEmergencyPermissionKey(raw);
  const caredroid = emergency ? caredroidFromEmergency(emergency) : [];
  return {
    emergency,
    caredroid,
    backend: backendFromCaredroid(caredroid),
  };
}

export function expandPermissionAliases(permission: string): readonly string[] {
  const normalized = normalizePermission(permission);
  const aliases = new Set<string>([String(permission).trim()]);
  if (normalized.emergency) aliases.add(normalized.emergency);
  for (const key of normalized.caredroid) aliases.add(key);
  for (const key of normalized.backend) aliases.add(key);
  return [...aliases];
}

export function permissionRequiresPhiRead(permission: string): boolean {
  const normalized = normalizePermission(permission);
  if (normalized.backend.includes(B.READ_PHI)) return true;
  return normalized.caredroid.some((key) => CAREDROID_TO_BACKEND[key]?.includes(B.READ_PHI));
}

export function listBridgeCoverage(): Readonly<{
  emergencyKeys: number;
  caredroidKeys: number;
  backendKeys: number;
}> {
  return {
    emergencyKeys: Object.keys(EMERGENCY_TO_CAREDROID).length,
    caredroidKeys: Object.keys(CAREDROID_TO_BACKEND).length,
    backendKeys: Object.values(B).length,
  };
}
