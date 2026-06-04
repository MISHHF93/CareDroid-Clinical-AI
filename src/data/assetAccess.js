/**
 * Client-side asset access projection (single inventory — toolInventory).
 * Merges platform context with canonical tools; does not duplicate registry.
 */

import { FEATURE_FLAGS } from '../config/featureFlags.config';
import { getPlatformEntitlementContext } from './assetEntitlements';
import { getUserFacingToolRegistryProjection, TOOL_EXECUTOR_STATUS } from './toolInventory';

export const ASSET_ACCESS_STATES = Object.freeze({
  ALLOWED: 'allowed',
  HIDDEN: 'hidden',
  LOCKED: 'locked',
  RESTRICTED: 'restricted',
  REQUIRES_ADMIN: 'requires-admin',
  REQUIRES_REVIEW: 'requires-review',
  UNSUPPORTED: 'unsupported',
  DEMO_ONLY: 'demo-only',
});

export const ASSET_ACCESS_LABELS = Object.freeze({
  [ASSET_ACCESS_STATES.ALLOWED]: 'Available',
  [ASSET_ACCESS_STATES.HIDDEN]: 'Hidden',
  [ASSET_ACCESS_STATES.LOCKED]: 'Locked',
  [ASSET_ACCESS_STATES.RESTRICTED]: 'Restricted',
  [ASSET_ACCESS_STATES.REQUIRES_ADMIN]: 'Admin only',
  [ASSET_ACCESS_STATES.REQUIRES_REVIEW]: 'Review required',
  [ASSET_ACCESS_STATES.UNSUPPORTED]: 'Unsupported backend',
  [ASSET_ACCESS_STATES.DEMO_ONLY]: 'Demo',
});

const ADMIN_ONLY_TOOLS = new Set(['audit-logs', 'system-config', 'team-management']);

export function resolveAssetAccessState(tool, context = getPlatformEntitlementContext(), userRole = 'student') {
  const assetId = tool.id || tool.canonicalInventoryId;
  const hidden = new Set([
    ...(context?.roleProfile?.hiddenAssetIds || []),
    ...(context?.preferences?.toolPreferences?.hiddenAssetIds || []),
    ...(context?.preferences?.toolPreferences?.hiddenToolIds || []),
  ]);

  if (hidden.has(assetId)) {
    return { accessState: ASSET_ACCESS_STATES.HIDDEN, reasons: ['user-hidden'] };
  }

  if (tool.lifecycleState === 'admin-only' || ADMIN_ONLY_TOOLS.has(assetId)) {
    if (userRole !== 'admin') {
      return { accessState: ASSET_ACCESS_STATES.REQUIRES_ADMIN, reasons: ['admin-only'] };
    }
  }

  if (tool.executorStatus === TOOL_EXECUTOR_STATUS.UNSUPPORTED && tool.launchType !== 'calculator') {
    if (context?.organization?.id) {
      const entitled = new Set(context?.entitledAssetIds || []);
      if (entitled.size && !entitled.has(assetId)) {
        return { accessState: ASSET_ACCESS_STATES.LOCKED, reasons: ['pack'] };
      }
    }
    return { accessState: ASSET_ACCESS_STATES.DEMO_ONLY, reasons: ['demo'] };
  }

  if (FEATURE_FLAGS.platformEntitlements && context?.organization?.id) {
    const entitled = new Set(context?.entitledAssetIds || []);
    if (entitled.size && !entitled.has(assetId)) {
      return { accessState: ASSET_ACCESS_STATES.LOCKED, reasons: ['pack'] };
    }
  }

  if (tool.lifecycleState === 'deprecated') {
    return { accessState: ASSET_ACCESS_STATES.RESTRICTED, reasons: ['deprecated'] };
  }

  return { accessState: ASSET_ACCESS_STATES.ALLOWED, reasons: [] };
}

export function projectToolsWithAccess(tools, context, userRole) {
  return tools.map((tool) => {
    const access = resolveAssetAccessState(tool, context, userRole);
    return {
      ...tool,
      accessState: access.accessState,
      accessLabel: ASSET_ACCESS_LABELS[access.accessState] || access.accessState,
      accessReasons: access.reasons,
      isLaunchable: [ASSET_ACCESS_STATES.ALLOWED, ASSET_ACCESS_STATES.DEMO_ONLY].includes(
        access.accessState
      ),
    };
  });
}

export function filterVisibleTools(tools, { includeLocked = false, includeDemo = true } = {}) {
  return tools.filter((tool) => {
    if (tool.accessState === ASSET_ACCESS_STATES.HIDDEN) return false;
    if (tool.accessState === ASSET_ACCESS_STATES.REQUIRES_ADMIN) return false;
    if (!includeLocked && tool.accessState === ASSET_ACCESS_STATES.LOCKED) return false;
    if (!includeDemo && tool.accessState === ASSET_ACCESS_STATES.DEMO_ONLY) return false;
    return true;
  });
}

export function getAssetAwareToolProjection(context, userRole) {
  const tools = getUserFacingToolRegistryProjection();
  return projectToolsWithAccess(tools, context, userRole);
}

export function groupToolsByAccessView(tools, { favorites = [], recent = [], recommendedIds = [] } = {}) {
  const recSet = new Set(recommendedIds);
  const favSet = new Set(favorites);
  const recentSet = new Set(recent);

  return {
    recommended: tools.filter((t) => recSet.has(t.id) && t.accessState !== ASSET_ACCESS_STATES.HIDDEN),
    workspace: tools.filter((t) => t.workspaceFilterable !== false),
    organization: tools.filter((t) => t.accessState !== ASSET_ACCESS_STATES.LOCKED),
    packs: tools,
    permitted: tools.filter((t) =>
      [ASSET_ACCESS_STATES.ALLOWED, ASSET_ACCESS_STATES.DEMO_ONLY, ASSET_ACCESS_STATES.RESTRICTED].includes(
        t.accessState
      )
    ),
    favorites: tools.filter((t) => favSet.has(t.id)),
    recent: tools.filter((t) => recentSet.has(t.id)),
  };
}
