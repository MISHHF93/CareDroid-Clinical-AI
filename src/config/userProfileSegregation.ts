/**
 * Organization-type and entitlement-pack gating for SaaS profile assignment.
 */
import { SAAS_ORGANIZATION_TYPES } from './saasProfileConstants';

export const HOSPITAL_ED_ORGANIZATION_TYPES = Object.freeze([
  'hospital',
  'clinic',
  'EMS',
  'university',
  'research-center',
  'long-term-care',
  'telehealth',
  'government',
] as const);

export const SAAS_ENTITLEMENT_PACKS = Object.freeze({
  CORE: 'core-platform',
  RECEPTION_DESK: 'reception-desk',
  EMERGENCY_CLINICAL: 'emergency-clinical',
  HOSPITAL_OPERATIONS: 'hospital-operations',
  TRACKMIND: 'trackmind',
  PLATFORM_ADMIN: 'platform-admin',
} as const);

export type ProfileSegregationContext = Readonly<{
  organizationType?: string | null;
  entitledPackIds?: readonly string[];
}>;

export type ProfileSegregationFields = Readonly<{
  assignableOrganizationTypes?: readonly string[];
  requiredEntitlementPacks?: readonly string[];
}>;

const TRACKMIND_SAAS_ROLES = new Set([
  'racetrack-admin',
  'race-day-operations-manager',
  'steward',
  'equine-welfare-officer',
  'veterinarian',
]);

const HOSPITAL_OPS_SAAS_ROLES = new Set([
  'lab-technician',
  'biomedical-engineer',
  'fleet-operator',
]);

export function resolveProfileSegregationDefaults(saasRole: string): ProfileSegregationFields {
  if (saasRole === 'platform-admin') {
    return {
      assignableOrganizationTypes: [...SAAS_ORGANIZATION_TYPES],
      requiredEntitlementPacks: [SAAS_ENTITLEMENT_PACKS.PLATFORM_ADMIN],
    };
  }
  if (TRACKMIND_SAAS_ROLES.has(saasRole)) {
    return {
      assignableOrganizationTypes: ['racetrack'],
      requiredEntitlementPacks: [SAAS_ENTITLEMENT_PACKS.TRACKMIND],
    };
  }
  if (HOSPITAL_OPS_SAAS_ROLES.has(saasRole)) {
    return {
      assignableOrganizationTypes: [...HOSPITAL_ED_ORGANIZATION_TYPES],
      requiredEntitlementPacks: [SAAS_ENTITLEMENT_PACKS.HOSPITAL_OPERATIONS],
    };
  }
  return {
    assignableOrganizationTypes: [...HOSPITAL_ED_ORGANIZATION_TYPES],
    requiredEntitlementPacks: [],
  };
}

export function isProfileAssignableForOrganization(
  entry: ProfileSegregationFields & { saasRole?: string },
  context: ProfileSegregationContext = {},
): boolean {
  const defaults = resolveProfileSegregationDefaults(entry.saasRole || '');
  const orgTypes = entry.assignableOrganizationTypes?.length
    ? entry.assignableOrganizationTypes
    : defaults.assignableOrganizationTypes;
  const requiredPacks = entry.requiredEntitlementPacks?.length
    ? entry.requiredEntitlementPacks
    : defaults.requiredEntitlementPacks;

  const organizationType = String(context.organizationType || 'hospital').trim();
  if (orgTypes?.length && !orgTypes.includes(organizationType)) {
    return false;
  }

  if (requiredPacks?.length) {
    const entitled = new Set(context.entitledPackIds || []);
    if (!requiredPacks.every((pack) => entitled.has(pack))) {
      return false;
    }
  }

  return true;
}

export function intersectProfileAllowedPacks(
  allowedPacks: string[] = [],
  entitledPackIds: string[] = [],
  strictEntitlements = false,
): string[] {
  if (!allowedPacks.length) return entitledPackIds;
  if (!strictEntitlements || !entitledPackIds.length) return allowedPacks;
  const entitled = new Set(entitledPackIds);
  const intersection = allowedPacks.filter((pack) => entitled.has(pack));
  return intersection.length ? intersection : allowedPacks.filter((pack) => pack === SAAS_ENTITLEMENT_PACKS.CORE);
}
