import catalogDataRaw from '../../../../src/config/user-profile-catalog.data.json';
import {
  DEFAULT_SAAS_PROFILE,
  normalizeSaasRole,
  ROLE_PERMISSION_PRESETS,
  SAAS_USER_ROLES,
  type SaasUserRole,
} from './saas-profile.constants';

export type UserProfileCatalogEntry = Readonly<{
  saasRole: string;
  label: string;
  domain: string;
  hierarchyLevel: number;
  emergencyRoleId: string | null;
  trackMindRoleId: string | null;
  allowedWorkspaces: string[];
  navigationGroups: string[];
  defaultScreenMode: string | null;
  toolPolicy: { allowedPacks: string[]; restrictedToolIds: string[] };
  requiredToolIds: string[];
  profileBenefits: string;
}>;

const catalogData: any = (catalogDataRaw as any)?.default ?? catalogDataRaw;

const CATALOG_BY_ROLE = new Map<string, UserProfileCatalogEntry>(
  (catalogData as UserProfileCatalogEntry[]).map((entry) => [entry.saasRole, entry]),
);

export const USER_PROFILE_CATALOG: readonly UserProfileCatalogEntry[] = catalogData as UserProfileCatalogEntry[];

export function resolveUserProfileFromSaasRole(role?: string | null) {
  const saasRole = normalizeSaasRole(role);
  const entry = CATALOG_BY_ROLE.get(saasRole) || CATALOG_BY_ROLE.get('student')!;
  const permissionPresets = ROLE_PERMISSION_PRESETS[saasRole] || ROLE_PERMISSION_PRESETS.student;
  return {
    ...entry,
    permissionPresets: [...permissionPresets],
  };
}

export function buildUserProfileAccessSummary(role?: string | null) {
  const resolved = resolveUserProfileFromSaasRole(role);
  return {
    saasRole: resolved.saasRole,
    emergencyRole: resolved.emergencyRoleId,
    trackMindRole: resolved.trackMindRoleId,
    allowedWorkspaces: [...resolved.allowedWorkspaces],
    navigationGroups: [...resolved.navigationGroups],
    permissionPresets: [...resolved.permissionPresets],
    defaultScreenMode: resolved.defaultScreenMode,
    toolPolicy: { ...resolved.toolPolicy },
    profileBenefits: resolved.profileBenefits,
  };
}

export function validateHiddenAssetsWithinProfile(
  role: string | null | undefined,
  hiddenAssetIds: string[] = [],
): string[] {
  const entry = resolveUserProfileFromSaasRole(role);
  const required = new Set(entry.requiredToolIds || []);
  return hiddenAssetIds.filter((id) => !required.has(id));
}

export function isSaasRoleCatalogComplete(): boolean {
  return SAAS_USER_ROLES.every((role) => CATALOG_BY_ROLE.has(role));
}

export { SAAS_USER_ROLES, ROLE_PERMISSION_PRESETS, normalizeSaasRole, DEFAULT_SAAS_PROFILE, SaasUserRole };
