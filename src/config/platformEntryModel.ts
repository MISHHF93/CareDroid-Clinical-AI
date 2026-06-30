/**
 * Platform entry and landing — separates demo entry, clinical home, and admin console.
 */
import { CANONICAL_ROUTES } from './routes.config';
import { getEmergencyRoleHomeRoute } from './emergencyRolePermissions';
import { getPlatformHomeRoute } from './receptionFirstUx.config';
import { resolveUserProfileFromSaasRole } from './userProfileCatalog';
import { getHomeRouteForRole } from './roleClusterNav.config';

export const ADMIN_SAAS_ROLES = Object.freeze([
  'hospital-administrator',
  'platform-admin',
  'compliance-officer',
  'executive-leadership',
]);

export const ED_WORKFLOW_LANES = Object.freeze([
  { id: 'reception', label: 'Reception & registration', saasRoles: ['registration-clerk'], emergencyRoles: ['registration_clerk'] },
  { id: 'triage', label: 'Triage & acuity', saasRoles: ['nurse'], emergencyRoles: ['triage_nurse'] },
  { id: 'waiting', label: 'Waiting room & reassessment', saasRoles: ['nurse'], emergencyRoles: ['charge_nurse'] },
  { id: 'provider', label: 'Provider & disposition', saasRoles: ['emergency-physician'], emergencyRoles: ['physician'] },
  { id: 'operations', label: 'ED operations & command', saasRoles: ['hospital-administrator'], emergencyRoles: ['ed_manager', 'charge_nurse'] },
  { id: 'ems', label: 'EMS handoff', saasRoles: ['nurse'], emergencyRoles: ['ems_user'] },
]);

export function isAdminSaasRole(role: string | null | undefined): boolean {
  const normalized = String(role || '').trim().toLowerCase();
  if (!normalized) return false;
  if (ADMIN_SAAS_ROLES.includes(normalized)) return true;
  const profile = resolveUserProfileFromSaasRole(normalized);
  return profile.navigationGroups.includes('admin') || profile.hierarchyLevel >= 5;
}

export function resolveAdminHomeRoute(): string {
  return `${CANONICAL_ROUTES.adminOperations}/tenant`;
}

export function resolveClinicalHomeRoute(role: string | null | undefined): string {
  return (
    getHomeRouteForRole(role) ||
    getEmergencyRoleHomeRoute(role) ||
    getPlatformHomeRoute() ||
    CANONICAL_ROUTES.emergencyReception
  );
}

export type PlatformLandingInput = {
  authMode?: 'open-access' | 'authenticated';
  saasRole?: string | null;
  onboardingStatus?: string | null;
  returnUrl?: string | null;
};

export function resolvePlatformLanding({
  saasRole,
  returnUrl,
}: PlatformLandingInput = {}): string {
  const safeReturn = String(returnUrl || '').trim();
  if (
    safeReturn &&
    safeReturn.startsWith('/') &&
    !safeReturn.startsWith('//') &&
    safeReturn !== '/' &&
    !safeReturn.startsWith('/auth')
  ) {
    return safeReturn;
  }

  if (isAdminSaasRole(saasRole)) {
    return CANONICAL_ROUTES.adminOperations;
  }

  return resolveClinicalHomeRoute(saasRole);
}

export function listEdAssignableCatalogRoles() {
  return ED_WORKFLOW_LANES.flatMap((lane) =>
    lane.saasRoles.map((saasRole) => {
      const profile = resolveUserProfileFromSaasRole(saasRole);
      return {
        laneId: lane.id,
        laneLabel: lane.label,
        saasRole: profile.saasRole,
        label: profile.label,
        emergencyRoleId: profile.emergencyRoleId,
        defaultScreenMode: profile.defaultScreenMode,
        profileBenefits: profile.profileBenefits,
      };
    }),
  );
}
