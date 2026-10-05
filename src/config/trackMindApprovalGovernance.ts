/**
 * TrackMind approval governance — who can request, review, approve, reject, escalate, export.
 */
import { TRACKMIND_PERMISSION_KEYS } from './trackMindPermissionRegistry';
import {
  TRACKMIND_ROLE_ID,
  normalizeTrackMindRoleId,
  type TrackMindRoleId,
} from './trackMindRoleCatalog';

const K = TRACKMIND_PERMISSION_KEYS;
const R = TRACKMIND_ROLE_ID;

export type TrackMindApprovalCapability =
  | 'request'
  | 'review'
  | 'approve'
  | 'reject'
  | 'escalate'
  | 'export';

export const TRACKMIND_APPROVAL_CAPABILITY_PERMISSION: Record<TrackMindApprovalCapability, string> =
  Object.freeze({
    request: K.approvalRequest,
    review: K.approvalReview,
    approve: K.approvalDecide,
    reject: K.approvalDecide,
    escalate: K.approvalEscalate,
    export: K.auditExport,
  });

/** Regulated domains that always require approval workflow — no silent override */
export const TRACKMIND_REGULATED_APPROVAL_DOMAINS = Object.freeze([
  'clinical_governance_decision',
  'steward_decision',
  'medical_clearance',
  'veterinary_clearance',
  'clinical_safety_restriction',
  'welfare_restriction',
  'code_dispatch_authorization',
  'race_start_authorization',
  'financial_payout',
  'security_escalation',
  'compliance_control_closure',
  'camera_privacy_override',
  'surveillance_recording_access',
  'iot_device_provisioning',
  'privacy_masked_stream_access',
  'welfare_safe_stream_access',
]);

export const TRACKMIND_APPROVAL_AUTHORITY_BY_DOMAIN: Record<string, readonly TrackMindRoleId[]> =
  Object.freeze({
    clinical_governance_decision: [
      R.steward,
      R.raceDayOperationsManager,
      R.racetrackAdmin,
      R.organizationAdmin,
    ],
    steward_decision: [
      R.steward,
      R.raceDayOperationsManager,
      R.racetrackAdmin,
      R.organizationAdmin,
    ],
    medical_clearance: [R.veterinarian, R.equineWelfareOfficer, R.racetrackAdmin],
    veterinary_clearance: [R.veterinarian, R.equineWelfareOfficer, R.racetrackAdmin],
    clinical_safety_restriction: [
      R.equineWelfareOfficer,
      R.veterinarian,
      R.steward,
      R.racetrackAdmin,
    ],
    welfare_restriction: [R.equineWelfareOfficer, R.veterinarian, R.steward, R.racetrackAdmin],
    code_dispatch_authorization: [R.starterRaceOfficial, R.raceDayOperationsManager, R.steward],
    race_start_authorization: [R.starterRaceOfficial, R.raceDayOperationsManager, R.steward],
    financial_payout: [R.financeManager, R.organizationAdmin, R.executiveLeadership],
    security_escalation: [R.securityManager, R.raceDayOperationsManager, R.racetrackAdmin],
    compliance_control_closure: [R.complianceOfficer, R.organizationAdmin, R.auditorRegulator],
    camera_privacy_override: [R.securityManager, R.complianceOfficer, R.racetrackAdmin],
    surveillance_recording_access: [R.securityManager, R.complianceOfficer, R.auditorRegulator],
    iot_device_provisioning: [R.facilitiesManager, R.securityManager, R.platformSuperAdmin],
    privacy_masked_stream_access: [
      R.equineWelfareOfficer,
      R.veterinarian,
      R.securityManager,
      R.racetrackAdmin,
    ],
    welfare_safe_stream_access: [
      R.equineWelfareOfficer,
      R.veterinarian,
      R.securityManager,
      R.racetrackAdmin,
    ],
  });

export function canPerformTrackMindApprovalCapability(
  role: string,
  capability: TrackMindApprovalCapability,
  hasPermission: (permission: string) => boolean,
): boolean {
  const permission = TRACKMIND_APPROVAL_CAPABILITY_PERMISSION[capability];
  return hasPermission(permission);
}

export function canApproveTrackMindDomain(role: string, domain: string): boolean {
  const roleId = normalizeTrackMindRoleId(role);
  const authorities = TRACKMIND_APPROVAL_AUTHORITY_BY_DOMAIN[domain];
  return Boolean(authorities?.includes(roleId));
}

export function isTrackMindRegulatedApprovalDomain(domain: string): boolean {
  return TRACKMIND_REGULATED_APPROVAL_DOMAINS.includes(domain);
}
