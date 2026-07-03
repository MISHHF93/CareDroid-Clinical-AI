/**
 * Canonical security barrel — models, bridge, and contract exports.
 */
export {
  SECURITY_CONTRACT,
  SECURITY_ENGINE_ID,
  BACKEND_PERMISSION_KEYS,
  PHI_ACCESS_ACTIONS,
  PHI_ACTION_BACKEND_PERMISSION,
  CAREDROID_PHI_READ_PERMISSIONS,
  type BackendPermissionKey,
  type PhiAccessAction,
  type SecurityPermissionVocabulary,
  type SecuritySessionMode,
} from './securityModel';

export {
  normalizePermission,
  expandPermissionAliases,
  permissionRequiresPhiRead,
  listBridgeCoverage,
  type NormalizedPermissionSet,
} from './securityPermissionBridge';

export { Permission, type BackendPermission } from './backendPermissionCatalog';

export {
  buildEmergencySecurityContext,
  buildSecurityContextFromUser,
  canAccessPhi,
  canAccessRoute,
  canMutateEmergency,
  checkAllPermissions,
  checkAnyPermission,
  checkEmergencyMutation,
  checkEmergencyPermission,
  checkPermission,
  isProtectedApiPath,
  isPublicApiPath,
  phiBackendPermissionForAction,
  requiresPhiAudit,
  type SecurityAccessContext,
} from '../services/securityAccessService';

export {
  assertPhiAccess,
  canMutatePatientPhi,
  canViewPatientPhi,
  recordPhiAccess,
  type PhiAccessRequest,
  type PhiAccessResult,
} from '../services/phiAccessService';

export {
  flushPendingSecurityAudits,
  getPendingSecurityAuditCount,
  ingestEmergencyAuditEntries,
  recordSecurityAuditEvent,
} from '../services/securityAuditService';

export {
  sanitizePatientIdForRequest,
  validatePatientIdentifier,
  validatePermissionForApiPath,
  validatePhiAccessAction,
  validatePhiMutationRequest,
  type ApiBoundaryValidation,
} from '../services/securityApiBoundary';