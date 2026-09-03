/**
 * TrackMind privacy scopes and sensitive-data visibility rules.
 */
import { TRACKMIND_SENSITIVITY } from './trackMindPermissionRegistry';
import {
  TRACKMIND_ROLE_ID,
  normalizeTrackMindRoleId,
  type TrackMindRoleId,
} from './trackMindRoleCatalog';

export const TRACKMIND_PRIVACY_SCOPE = Object.freeze({
  veterinaryMedical: 'veterinary_medical',
  welfareSensitive: 'welfare_sensitive',
  disciplinary: 'disciplinary',
  financial: 'financial',
  securityInternal: 'security_internal',
  federationAggregate: 'federation_aggregate',
  personnel: 'personnel',
  supportTooling: 'support_tooling',
} as const);

export type TrackMindPrivacyScope =
  (typeof TRACKMIND_PRIVACY_SCOPE)[keyof typeof TRACKMIND_PRIVACY_SCOPE];

const R = TRACKMIND_ROLE_ID;

export const TRACKMIND_PRIVACY_SCOPE_VIEWERS: Record<
  TrackMindPrivacyScope,
  readonly TrackMindRoleId[]
> = Object.freeze({
  [TRACKMIND_PRIVACY_SCOPE.veterinaryMedical]: Object.freeze([
    R.veterinarian,
    R.equineWelfareOfficer,
    R.raceDayOperationsManager,
    R.racetrackAdmin,
    R.organizationAdmin,
    R.platformSuperAdmin,
    R.auditorRegulator,
  ]),
  [TRACKMIND_PRIVACY_SCOPE.welfareSensitive]: Object.freeze([
    R.equineWelfareOfficer,
    R.veterinarian,
    R.steward,
    R.raceDayOperationsManager,
    R.racetrackAdmin,
    R.organizationAdmin,
    R.platformSuperAdmin,
    R.auditorRegulator,
    R.dataAnalyticsUser,
  ]),
  [TRACKMIND_PRIVACY_SCOPE.disciplinary]: Object.freeze([
    R.steward,
    R.complianceOfficer,
    R.racetrackAdmin,
    R.organizationAdmin,
    R.platformSuperAdmin,
    R.auditorRegulator,
    R.executiveLeadership,
  ]),
  [TRACKMIND_PRIVACY_SCOPE.financial]: Object.freeze([
    R.financeManager,
    R.executiveLeadership,
    R.organizationAdmin,
    R.platformSuperAdmin,
    R.auditorRegulator,
    R.complianceOfficer,
  ]),
  [TRACKMIND_PRIVACY_SCOPE.securityInternal]: Object.freeze([
    R.securityManager,
    R.raceDayOperationsManager,
    R.racetrackAdmin,
    R.organizationAdmin,
    R.platformSuperAdmin,
    R.auditorRegulator,
  ]),
  [TRACKMIND_PRIVACY_SCOPE.federationAggregate]: Object.freeze([
    R.executiveLeadership,
    R.organizationAdmin,
    R.dataAnalyticsUser,
    R.platformSuperAdmin,
    R.auditorRegulator,
  ]),
  [TRACKMIND_PRIVACY_SCOPE.personnel]: Object.freeze([
    R.organizationAdmin,
    R.racetrackAdmin,
    R.platformSuperAdmin,
    R.supportInternalOperator,
    R.complianceOfficer,
    R.auditorRegulator,
  ]),
  [TRACKMIND_PRIVACY_SCOPE.supportTooling]: Object.freeze([
    R.supportInternalOperator,
    R.platformSuperAdmin,
  ]),
});

export const TRACKMIND_SENSITIVITY_MIN_ROLE: Record<string, readonly TrackMindRoleId[]> =
  Object.freeze({
    [TRACKMIND_SENSITIVITY.medical]:
      TRACKMIND_PRIVACY_SCOPE_VIEWERS[TRACKMIND_PRIVACY_SCOPE.veterinaryMedical],
    [TRACKMIND_SENSITIVITY.welfare]:
      TRACKMIND_PRIVACY_SCOPE_VIEWERS[TRACKMIND_PRIVACY_SCOPE.welfareSensitive],
    [TRACKMIND_SENSITIVITY.financial]:
      TRACKMIND_PRIVACY_SCOPE_VIEWERS[TRACKMIND_PRIVACY_SCOPE.financial],
    [TRACKMIND_SENSITIVITY.security]:
      TRACKMIND_PRIVACY_SCOPE_VIEWERS[TRACKMIND_PRIVACY_SCOPE.securityInternal],
    [TRACKMIND_SENSITIVITY.federation]:
      TRACKMIND_PRIVACY_SCOPE_VIEWERS[TRACKMIND_PRIVACY_SCOPE.federationAggregate],
    [TRACKMIND_SENSITIVITY.personnel]:
      TRACKMIND_PRIVACY_SCOPE_VIEWERS[TRACKMIND_PRIVACY_SCOPE.personnel],
    [TRACKMIND_SENSITIVITY.platform]:
      TRACKMIND_PRIVACY_SCOPE_VIEWERS[TRACKMIND_PRIVACY_SCOPE.supportTooling],
  });

export function canViewTrackMindPrivacyScope(role: string, scope: TrackMindPrivacyScope): boolean {
  const roleId = normalizeTrackMindRoleId(role);
  const allowed = TRACKMIND_PRIVACY_SCOPE_VIEWERS[scope] || [];
  return allowed.includes(roleId);
}

export function canViewTrackMindSensitivity(role: string, sensitivity: string): boolean {
  const allowed = TRACKMIND_SENSITIVITY_MIN_ROLE[sensitivity];
  if (!allowed) return true;
  return allowed.includes(normalizeTrackMindRoleId(role));
}

export function filterEntitiesByPrivacyScope<T extends { privacyScope?: TrackMindPrivacyScope }>(
  role: string,
  entities: readonly T[],
): T[] {
  return entities.filter(
    (entity) => !entity.privacyScope || canViewTrackMindPrivacyScope(role, entity.privacyScope),
  );
}
