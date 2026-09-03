/**
 * Unified security contract — session policy, PHI actions, and permission vocabularies.
 * Import from `security.ts` barrel; services resolve checks through securityPermissionBridge.
 */

import { AUTH_CONFIG } from './auth.config';
import { EMERGENCY_PERMISSION_KEYS } from './emergencyPermissionRegistry';
import { CAREDROID_PERMISSIONS } from '../lib/users/permissions';

export type SecurityPermissionVocabulary = 'emergency-dot' | 'caredroid-colon' | 'backend-rbac';

export type SecuritySessionMode = 'open-access' | 'dev-demo' | 'authenticated';

export type PhiAccessAction =
  | 'view'
  | 'create'
  | 'update'
  | 'export'
  | 'delete'
  | 'assign'
  | 'discharge';

export const SECURITY_ENGINE_ID = 'caredroid-security' as const;

export const BACKEND_PERMISSION_KEYS = Object.freeze({
  READ_PHI: 'READ_PHI',
  WRITE_PHI: 'WRITE_PHI',
  EXPORT_PHI: 'EXPORT_PHI',
  DELETE_PHI: 'DELETE_PHI',
  VIEW_AUDIT_LOGS: 'VIEW_AUDIT_LOGS',
  VIEW_PHI_AUDIT: 'VIEW_PHI_AUDIT',
  VIEW_PHI_ACCESS_LOGS: 'VIEW_PHI_ACCESS_LOGS',
  VIEW_ANALYTICS: 'VIEW_ANALYTICS',
  CONFIGURE_SYSTEM: 'CONFIGURE_SYSTEM',
  USE_AI_CHAT: 'USE_AI_CHAT',
  IMPORT_PATIENT_DATA: 'IMPORT_PATIENT_DATA',
  BREAK_GLASS_ACCESS: 'BREAK_GLASS_ACCESS',
  MANAGE_USERS: 'MANAGE_USERS',
  VIEW_USERS: 'VIEW_USERS',
  REVIEW_CLINICAL_AI: 'REVIEW_CLINICAL_AI',
  OVERRIDE_SAFETY_CHECKS: 'OVERRIDE_SAFETY_CHECKS',
} as const);

export type BackendPermissionKey =
  (typeof BACKEND_PERMISSION_KEYS)[keyof typeof BACKEND_PERMISSION_KEYS];

export const PHI_ACCESS_ACTIONS: readonly PhiAccessAction[] = Object.freeze([
  'view',
  'create',
  'update',
  'export',
  'delete',
  'assign',
  'discharge',
]);

export const PHI_ACTION_BACKEND_PERMISSION: Readonly<
  Record<PhiAccessAction, BackendPermissionKey>
> = Object.freeze({
  view: BACKEND_PERMISSION_KEYS.READ_PHI,
  create: BACKEND_PERMISSION_KEYS.WRITE_PHI,
  update: BACKEND_PERMISSION_KEYS.WRITE_PHI,
  export: BACKEND_PERMISSION_KEYS.EXPORT_PHI,
  delete: BACKEND_PERMISSION_KEYS.DELETE_PHI,
  assign: BACKEND_PERMISSION_KEYS.WRITE_PHI,
  discharge: BACKEND_PERMISSION_KEYS.WRITE_PHI,
});

export const SECURITY_CONTRACT = Object.freeze({
  engineId: SECURITY_ENGINE_ID,
  vocabularies: Object.freeze([
    'emergency-dot',
    'caredroid-colon',
    'backend-rbac',
  ] as const satisfies readonly SecurityPermissionVocabulary[]),
  canonicalSources: Object.freeze({
    emergencyPermissions: 'emergencyPermissionRegistry',
    caredroidPermissions: 'lib/users/permissions',
    backendPermissions: 'backend/modules/auth/enums/permission.enum',
    accessCompilation: 'lib/users/canonicalAccess',
    authConfig: 'auth.config',
    auditSync: '/api/audit/sync',
    phiAudit: 'backend/modules/emergency-os/emergency-patient-audit.service',
  }),
  session: Object.freeze({
    tokenStorageKey: AUTH_CONFIG.tokenStorageKey,
    legacyTokenStorageKey: AUTH_CONFIG.legacyTokenStorageKey,
    devSessionEndpoint: AUTH_CONFIG.devSessionEndpoint,
    openAccessPreservedInDemo: true,
  }),
  phi: Object.freeze({
    viewRequires: BACKEND_PERMISSION_KEYS.READ_PHI,
    mutateRequires: BACKEND_PERMISSION_KEYS.WRITE_PHI,
    auditedActions: PHI_ACCESS_ACTIONS,
    emergencyReadKeys: Object.freeze([
      EMERGENCY_PERMISSION_KEYS.displayWhiteboardReadonly,
      EMERGENCY_PERMISSION_KEYS.displayPublicWaitboard,
      EMERGENCY_PERMISSION_KEYS.analyticsView,
    ]),
  }),
  protectedApiPrefixes: Object.freeze(['/api/emergency', '/api/audit', '/api/profile']),
  publicApiPrefixes: Object.freeze([
    '/api/auth',
    '/api/config/system',
    '/api/native-ai',
    '/api/governance',
  ]),
});

export const CAREDROID_PHI_READ_PERMISSIONS = Object.freeze([
  CAREDROID_PERMISSIONS.PATIENT_READ,
  CAREDROID_PERMISSIONS.TRIAGE_READ,
  CAREDROID_PERMISSIONS.ORDERS_READ,
  CAREDROID_PERMISSIONS.LABS_READ,
  CAREDROID_PERMISSIONS.IMAGING_READ,
  CAREDROID_PERMISSIONS.MEDICATION_READ,
]);
