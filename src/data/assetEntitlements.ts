/**
 * Platform entitlement projection for tool/asset visibility.
 */

import { FEATURE_FLAGS } from '../config/featureFlags.config';
import { intersectProfileAllowedPacks } from '../config/userProfileSegregation';

/** Mirrors backend LEGACY_TOOL_ID_ALIASES for workspace launch checks */
export const LEGACY_TOOL_ID_ALIASES = Object.freeze({
  calculators: ['calculators', 'calculators-hub'],
  'drug-check': ['drug-check'],
  'lab-interp': ['lab-interp'],
  protocols: ['protocols'],
  'diagnosis-assistant': ['diagnosis'],
  'hospital-map': ['hospital-map'],
  'medical-iot': ['telemetry-monitoring', 'medical-iot'],
  'emergency-protocols': ['protocols', 'acls-protocol', 'atls-protocol'],
  'trauma-score': ['revised-trauma-score', 'gcs-calculator'],
  'sofa-score': ['sofa-score', 'sofa-calculator'],
  'fleet-live-map': ['fleet-live-map', 'live-map'],
  'fleet-dashboard': ['fleet-dashboard'],
  'route-optimizer': ['route-optimizer'],
  'predictive-maintenance': ['predictive-maintenance'],
  'guideline-rag': ['guideline-rag'],
  'ai-explainability': ['ai-explainability'],
  'clinical-audit': ['clinical-audit'],
  'differential-ai': ['differential-ai'],
  'audit-logs': ['audit-logs'],
  analytics: ['analytics'],
  'team-management': ['team-management'],
  'system-config': ['system-config'],
});

let cachedEntitlementContext: any = null;

export function setPlatformEntitlementContext(context) {
  cachedEntitlementContext = context || null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('caredroid:entitlements-changed'));
  }
}

export function getPlatformEntitlementContext() {
  return cachedEntitlementContext;
}

export function isPlatformEntitlementsEnabled() {
  if (typeof window !== 'undefined' && (window as any).__CAREDROID_PLATFORM_ENTITLEMENTS__ === false) {
    return false;
  }
  return FEATURE_FLAGS.platformEntitlements !== false;
}

export function isStrictSaasEntitlementsEnabled(context = cachedEntitlementContext) {
  if (context?.strictSaasEntitlements !== undefined) {
    return Boolean(context.strictSaasEntitlements);
  }
  return FEATURE_FLAGS.strictSaasEntitlements === true;
}

export function shouldFilterByEntitlements() {
  if (!isPlatformEntitlementsEnabled()) return false;
  const ctx = cachedEntitlementContext;
  if (!ctx) return false;
  return Boolean(ctx.organization?.id && Array.isArray(ctx.entitledAssetIds));
}

export function isAssetEntitled(assetId, context = cachedEntitlementContext) {
  if (!shouldFilterByEntitlements()) return true;
  const entitled = new Set(context?.entitledAssetIds || []);
  if (!entitled.size) return !isStrictSaasEntitlementsEnabled(context);
  return entitled.has(assetId);
}

export function filterToolsByEntitlements(tools, context = cachedEntitlementContext) {
  if (!shouldFilterByEntitlements()) return tools;
  const entitled = new Set(context?.entitledAssetIds || []);
  const hidden = new Set(context?.roleProfile?.hiddenAssetIds || []);
  const strict = isStrictSaasEntitlementsEnabled(context);
  const saasRole = context?.roleProfile?.id || context?.membership?.roleProfileId || context?.saasRole;
  const profilePacks = context?.roleProfile?.allowedPacks || context?.resolvedProfilePacks;
  const effectivePacks = profilePacks?.length
    ? intersectProfileAllowedPacks(profilePacks, context?.entitledPackIds || [], strict)
    : null;

  return tools.filter((tool) => {
    const id = tool.id || tool.canonicalInventoryId;
    if (hidden.has(id)) return false;
    if (!entitled.size) return !strict;
    if (!entitled.has(id)) return false;
    if (effectivePacks?.length) {
      const packId = tool.packId || tool.assetPackId || tool.category;
      if (packId && !effectivePacks.some((pack) => String(packId).includes(pack) || pack === packId)) {
        return false;
      }
    }
    return true;
  });
}

export function resolveWorkspaceEnabledAssetIds(enabledToolIds = [] as any[], legacyAliases: any = {}) {
  const resolved = new Set();
  for (const legacyId of enabledToolIds) {
    const aliases = legacyAliases[legacyId] || [legacyId];
    aliases.forEach((id) => resolved.add(id));
  }
  return [...resolved];
}

export function isLaunchAllowedForWorkspace(toolId, enabledToolIds = [] as any[], legacyAliases: any = {}) {
  if (!enabledToolIds?.length) return true;
  const resolved = resolveWorkspaceEnabledAssetIds(enabledToolIds, legacyAliases);
  return resolved.includes(toolId);
}
