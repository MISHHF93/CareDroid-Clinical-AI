/**
 * TrackMind audit visibility and export permissions by role.
 */
import { TRACKMIND_PERMISSION_KEYS } from './trackMindPermissionRegistry';
import {
  TRACKMIND_ROLE_ID,
  normalizeTrackMindRoleId,
  type TrackMindRoleId,
} from './trackMindRoleCatalog';

const K = TRACKMIND_PERMISSION_KEYS;
const R = TRACKMIND_ROLE_ID;

export const TRACKMIND_AUDIT_ARTIFACT = Object.freeze({
  operational: 'operational',
  stewarding: 'stewarding',
  veterinary: 'veterinary',
  welfare: 'welfare',
  security: 'security',
  compliance: 'compliance',
  financial: 'financial',
  approval: 'approval',
  support: 'support',
  platform: 'platform',
} as const);

export type TrackMindAuditArtifact =
  (typeof TRACKMIND_AUDIT_ARTIFACT)[keyof typeof TRACKMIND_AUDIT_ARTIFACT];

export const TRACKMIND_AUDIT_VISIBILITY: Record<TrackMindAuditArtifact, readonly TrackMindRoleId[]> =
  Object.freeze({
    [TRACKMIND_AUDIT_ARTIFACT.operational]: [
      R.raceDayOperationsManager,
      R.racetrackAdmin,
      R.organizationAdmin,
      R.platformSuperAdmin,
      R.auditorRegulator,
      R.executiveLeadership,
    ],
    [TRACKMIND_AUDIT_ARTIFACT.stewarding]: [
      R.steward,
      R.raceDayOperationsManager,
      R.racetrackAdmin,
      R.complianceOfficer,
      R.auditorRegulator,
      R.executiveLeadership,
    ],
    [TRACKMIND_AUDIT_ARTIFACT.veterinary]: [
      R.veterinarian,
      R.equineWelfareOfficer,
      R.racetrackAdmin,
      R.auditorRegulator,
    ],
    [TRACKMIND_AUDIT_ARTIFACT.welfare]: [
      R.equineWelfareOfficer,
      R.veterinarian,
      R.steward,
      R.racetrackAdmin,
      R.auditorRegulator,
    ],
    [TRACKMIND_AUDIT_ARTIFACT.security]: [
      R.securityManager,
      R.raceDayOperationsManager,
      R.racetrackAdmin,
      R.auditorRegulator,
    ],
    [TRACKMIND_AUDIT_ARTIFACT.compliance]: [
      R.complianceOfficer,
      R.organizationAdmin,
      R.auditorRegulator,
      R.platformSuperAdmin,
    ],
    [TRACKMIND_AUDIT_ARTIFACT.financial]: [
      R.financeManager,
      R.organizationAdmin,
      R.auditorRegulator,
      R.executiveLeadership,
    ],
    [TRACKMIND_AUDIT_ARTIFACT.approval]: [
      R.raceDayOperationsManager,
      R.steward,
      R.complianceOfficer,
      R.financeManager,
      R.organizationAdmin,
      R.auditorRegulator,
    ],
    [TRACKMIND_AUDIT_ARTIFACT.support]: [
      R.supportInternalOperator,
      R.platformSuperAdmin,
      R.auditorRegulator,
    ],
    [TRACKMIND_AUDIT_ARTIFACT.platform]: [
      R.platformSuperAdmin,
      R.supportInternalOperator,
      R.auditorRegulator,
    ],
  });

export const TRACKMIND_AUDIT_EXPORT_ROLES: readonly TrackMindRoleId[] = Object.freeze([
  R.platformSuperAdmin,
  R.organizationAdmin,
  R.racetrackAdmin,
  R.complianceOfficer,
  R.securityManager,
  R.auditorRegulator,
]);

export function canViewTrackMindAuditArtifact(
  role: string,
  artifact: TrackMindAuditArtifact,
): boolean {
  const roleId = normalizeTrackMindRoleId(role);
  return (TRACKMIND_AUDIT_VISIBILITY[artifact] || []).includes(roleId);
}

export function canExportTrackMindAudit(
  role: string,
  hasPermission: (permission: string) => boolean,
): boolean {
  const roleId = normalizeTrackMindRoleId(role);
  if (!TRACKMIND_AUDIT_EXPORT_ROLES.includes(roleId)) return false;
  return hasPermission(K.auditExport) || hasPermission(K.complianceReportExport) || hasPermission(K.securityAuditExport);
}
