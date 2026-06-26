/**
 * Maps catalog specialty packs to org entitlement packs and tool pack matching.
 */
import { normalizeSaasRole } from './saasProfileConstants';
import { resolveUserProfileFromSaasRole } from './userProfileCatalog';
import { SAAS_ENTITLEMENT_PACKS } from './userProfileSegregation';
import { PILOT_CUSTOMER_MODE, PROFILE_SCOPED_PILOT_NAV_IDS } from './unified-navigation.config';

/** Catalog toolPolicy pack → substrings that match tool.packId / category / assetPackId */
export const CATALOG_PACK_MATCHERS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  'core-platform': Object.freeze(['core-platform', 'clinical-core', 'platform']),
  'reception-desk': Object.freeze(['reception-desk', 'reception', 'front-desk']),
  'emergency-clinical': Object.freeze([
    'emergency-clinical',
    'emergency',
    'emergency-medicine',
    'emergency-department',
    'clinical',
  ]),
  'icu-critical': Object.freeze(['icu-critical', 'icu', 'icu-pack', 'critical-care', 'critical']),
  cardiology: Object.freeze(['cardiology', 'cardiology-pack', 'cardiac']),
  pharmacy: Object.freeze(['pharmacy', 'medication']),
  laboratory: Object.freeze(['laboratory', 'laboratory-intelligence', 'lab']),
  'medical-iot': Object.freeze(['medical-iot', 'medical-iot-pack', 'iot', 'device']),
  fleet: Object.freeze(['fleet', 'fleet-logistics', 'dispatch', 'ems']),
  operations: Object.freeze(['operations', 'hospital-operations', 'digital-twin']),
  analytics: Object.freeze(['analytics', 'executive', 'intelligence']),
  research: Object.freeze(['research', 'research-education', 'evidence']),
  education: Object.freeze(['education', 'research-education', 'simulation-training', 'training']),
  governance: Object.freeze(['governance', 'governance-compliance', 'compliance', 'audit']),
  'platform-admin': Object.freeze(['platform-admin', 'platform', 'admin']),
  trackmind: Object.freeze(['trackmind', 'racetrack', 'steward', 'welfare']),
});

/** Specialty catalog packs implied by org entitlement packs */
export const ENTITLEMENT_TO_CATALOG_PACKS: Readonly<Record<string, readonly string[]>> = Object.freeze({
  [SAAS_ENTITLEMENT_PACKS.CORE]: ['core-platform'],
  [SAAS_ENTITLEMENT_PACKS.RECEPTION_DESK]: ['core-platform', 'reception-desk'],
  [SAAS_ENTITLEMENT_PACKS.EMERGENCY_CLINICAL]: ['core-platform', 'emergency-clinical'],
  [SAAS_ENTITLEMENT_PACKS.HOSPITAL_OPERATIONS]: [
    'core-platform',
    'operations',
    'medical-iot',
    'fleet',
    'laboratory',
  ],
  [SAAS_ENTITLEMENT_PACKS.TRACKMIND]: ['core-platform', 'trackmind'],
  [SAAS_ENTITLEMENT_PACKS.PLATFORM_ADMIN]: ['core-platform', 'platform-admin'],
});

const STRICT_PACK_ENFORCEMENT_ROLES = new Set([
  'registration-clerk',
  'student',
  'steward',
  'racetrack-admin',
  'race-day-operations-manager',
  'equine-welfare-officer',
  'veterinarian',
]);

export type ToolPackCarrier = Readonly<{
  id?: string;
  packId?: string;
  assetPackId?: string;
  category?: string;
}>;

export function resolveToolPackId(tool: ToolPackCarrier = {}): string {
  return String(tool.packId || tool.assetPackId || tool.category || '').trim();
}

export function resolveEffectivePacksForProfile(saasRole: string | null | undefined): string[] {
  const profile = resolveUserProfileFromSaasRole(saasRole);
  const catalogPacks = profile.toolPolicy?.allowedPacks || ['core-platform'];
  const expanded = new Set<string>(catalogPacks);
  for (const pack of catalogPacks) {
    const matchers = CATALOG_PACK_MATCHERS[pack];
    if (matchers) matchers.forEach((m) => expanded.add(m));
  }
  return [...expanded];
}

export function packMatchesAllowedSet(packId: string, allowedPacks: readonly string[]): boolean {
  if (!allowedPacks.length) return true;
  const normalized = packId.toLowerCase();
  if (!normalized) return false;
  return allowedPacks.some((pack) => {
    const key = pack.toLowerCase();
    if (key === 'core-platform') return true;
    if (normalized === key || normalized.includes(key) || key.includes(normalized)) return true;
    const matchers = CATALOG_PACK_MATCHERS[pack] || [pack];
    return matchers.some(
      (matcher) =>
        normalized === matcher.toLowerCase() ||
        normalized.includes(matcher.toLowerCase()) ||
        matcher.toLowerCase().includes(normalized),
    );
  });
}

export function isStrictPackEnforcementForRole(
  saasRole: string | null | undefined,
  options: { pilotModeEnabled?: boolean } = {},
): boolean {
  const normalized = normalizeSaasRole(saasRole);
  if (STRICT_PACK_ENFORCEMENT_ROLES.has(normalized)) return true;
  const pilotOn = options.pilotModeEnabled ?? PILOT_CUSTOMER_MODE.enabled;
  if (pilotOn && PROFILE_SCOPED_PILOT_NAV_IDS[normalized]) return true;
  return false;
}

export function toolMatchesProfilePackPolicy(
  tool: ToolPackCarrier,
  saasRole: string | null | undefined,
  options: { strict?: boolean } = {},
): boolean {
  const profile = resolveUserProfileFromSaasRole(saasRole);
  const restricted = new Set(profile.toolPolicy?.restrictedToolIds || []);
  const assetId = tool.id || '';
  if (restricted.has(assetId)) return false;

  const allowedPacks = resolveEffectivePacksForProfile(saasRole);
  const packId = resolveToolPackId(tool);
  const strict =
    options.strict ?? isStrictPackEnforcementForRole(saasRole);

  if (!packId) {
    return !strict;
  }

  return packMatchesAllowedSet(packId, allowedPacks);
}

export function expandEntitlementPacksToCatalogPacks(entitledPackIds: readonly string[] = []): string[] {
  const expanded = new Set<string>();
  for (const packId of entitledPackIds) {
    expanded.add(packId);
    const mapped = ENTITLEMENT_TO_CATALOG_PACKS[packId];
    if (mapped) mapped.forEach((p) => expanded.add(p));
  }
  return [...expanded];
}
