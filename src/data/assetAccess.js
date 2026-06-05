/**
 * Client-side asset access projection (single inventory — toolInventory).
 * Merges platform context with canonical tools; does not duplicate registry.
 */

import { FEATURE_FLAGS } from '../config/featureFlags.config';
import {
  getPlatformEntitlementContext,
  isLaunchAllowedForWorkspace,
  isStrictSaasEntitlementsEnabled,
  LEGACY_TOOL_ID_ALIASES,
} from './assetEntitlements';
import { getUserFacingToolRegistryProjection, TOOL_EXECUTOR_STATUS } from './toolInventory';
import { resolveEntitlementDecision } from '../services/entitlementService';
import { ENTITLEMENT_ACCESS_STATES } from '../config/entitlements.config';

export const ASSET_ACCESS_STATES = Object.freeze({
  ALLOWED: 'allowed',
  DISABLED: 'disabled',
  BETA: 'beta',
  EXPERIMENTAL: 'experimental',
  HIDDEN: 'hidden',
  LOCKED: 'locked',
  SUBSCRIPTION_REQUIRED: 'subscription-required',
  ADMIN_ONLY: 'admin-only',
  RESTRICTED: 'restricted',
  REQUIRES_ADMIN: 'requires-admin',
  REQUIRES_REVIEW: 'requires-review',
  UNSUPPORTED: 'unsupported',
  DEMO_ONLY: 'demo-only',
});

export const ASSET_ACCESS_LABELS = Object.freeze({
  [ASSET_ACCESS_STATES.ALLOWED]: 'Available',
  [ASSET_ACCESS_STATES.DISABLED]: 'Disabled',
  [ASSET_ACCESS_STATES.BETA]: 'Beta',
  [ASSET_ACCESS_STATES.EXPERIMENTAL]: 'Experimental',
  [ASSET_ACCESS_STATES.HIDDEN]: 'Hidden',
  [ASSET_ACCESS_STATES.LOCKED]: 'Locked',
  [ASSET_ACCESS_STATES.SUBSCRIPTION_REQUIRED]: 'Subscription required',
  [ASSET_ACCESS_STATES.ADMIN_ONLY]: 'Admin only',
  [ASSET_ACCESS_STATES.RESTRICTED]: 'Restricted',
  [ASSET_ACCESS_STATES.REQUIRES_ADMIN]: 'Admin only',
  [ASSET_ACCESS_STATES.REQUIRES_REVIEW]: 'Review required',
  [ASSET_ACCESS_STATES.UNSUPPORTED]: 'Unsupported backend',
  [ASSET_ACCESS_STATES.DEMO_ONLY]: 'Demo',
});

const ADMIN_ONLY_TOOLS = new Set(['audit-logs', 'system-config', 'team-management']);
const ADMIN_ROLES = new Set(['admin', 'owner']);

function normalizePermission(permission) {
  return String(permission || '').trim();
}

function getEffectivePermissions(context = {}) {
  return new Set(
    [
      ...(context?.workspaceState?.effectivePermissions || []),
      ...(context?.effectivePermissions || []),
      ...(context?.permissions || []),
    ].map(normalizePermission).filter(Boolean)
  );
}

function getRequiredPermissionPolicy(tool = {}) {
  const policy = tool.permissionPolicy || tool.requiredPermissions;
  if (!policy) return { permissions: [], logic: 'all' };
  if (Array.isArray(policy)) {
    return { permissions: policy.map(normalizePermission).filter(Boolean), logic: 'all' };
  }
  return {
    permissions: (policy.permissions || policy.requiredPermissions || [])
      .map(normalizePermission)
      .filter(Boolean),
    logic: String(policy.logic || 'all').toLowerCase(),
  };
}

function hasPermissionPolicyAccess(tool, context) {
  const { permissions, logic } = getRequiredPermissionPolicy(tool);
  if (!permissions.length) return true;
  const effectivePermissions = getEffectivePermissions(context);
  if (!effectivePermissions.size) return false;
  if (logic === 'any') return permissions.some((permission) => effectivePermissions.has(permission));
  return permissions.every((permission) => effectivePermissions.has(permission));
}

export function resolveAssetAccessState(tool, context = getPlatformEntitlementContext(), userRole = 'student') {
  const assetId = tool.id || tool.canonicalInventoryId;
  const hasOrganization = Boolean(context?.organization?.id);
  const strictEntitlements = isStrictSaasEntitlementsEnabled(context);
  const hidden = new Set([
    ...(context?.roleProfile?.hiddenAssetIds || []),
    ...(context?.preferences?.toolPreferences?.hiddenAssetIds || []),
    ...(context?.preferences?.toolPreferences?.hiddenToolIds || []),
  ]);

  if (hidden.has(assetId)) {
    return { accessState: ASSET_ACCESS_STATES.HIDDEN, reasons: ['user-hidden'] };
  }

  const entitlementDecision = resolveEntitlementDecision(tool, context, userRole);
  if (!entitlementDecision.isLaunchable) {
    return {
      accessState: mapEntitlementState(entitlementDecision.accessState || entitlementDecision.state),
      reasons: entitlementDecision.reasons || [entitlementDecision.reason].filter(Boolean),
      decision: entitlementDecision,
    };
  }

  if (tool.lifecycleState === 'admin-only' || ADMIN_ONLY_TOOLS.has(assetId)) {
    if (!ADMIN_ROLES.has(userRole)) {
      return { accessState: ASSET_ACCESS_STATES.ADMIN_ONLY, reasons: ['admin-only'] };
    }
  }

  if (tool.executorStatus === TOOL_EXECUTOR_STATUS.UNSUPPORTED && tool.launchType !== 'calculator') {
    if (hasOrganization) {
      const entitled = new Set(context?.entitledAssetIds || []);
      if ((strictEntitlements || entitled.size) && !entitled.has(assetId)) {
        return { accessState: ASSET_ACCESS_STATES.LOCKED, reasons: ['pack'] };
      }
    }
    return { accessState: ASSET_ACCESS_STATES.DEMO_ONLY, reasons: ['demo'] };
  }

  if (FEATURE_FLAGS.platformEntitlements && hasOrganization) {
    const entitled = new Set(context?.entitledAssetIds || []);
    if ((strictEntitlements || entitled.size) && !entitled.has(assetId)) {
      return { accessState: ASSET_ACCESS_STATES.LOCKED, reasons: ['pack'] };
    }
  }

  const workspaceEnabledToolIds = context?.legacyToolAliases || [];
  if (
    workspaceEnabledToolIds.length &&
    !isLaunchAllowedForWorkspace(assetId, workspaceEnabledToolIds, LEGACY_TOOL_ID_ALIASES)
  ) {
    return { accessState: ASSET_ACCESS_STATES.RESTRICTED, reasons: ['workspace'] };
  }

  if (hasOrganization && !hasPermissionPolicyAccess(tool, context)) {
    return { accessState: ASSET_ACCESS_STATES.RESTRICTED, reasons: ['permission'] };
  }

  if (tool.lifecycleState === 'deprecated') {
    return { accessState: ASSET_ACCESS_STATES.RESTRICTED, reasons: ['deprecated'] };
  }

  return {
    accessState: mapEntitlementState(entitlementDecision.accessState || entitlementDecision.state),
    reasons: entitlementDecision.reasons || [],
    decision: entitlementDecision,
  };
}

export function projectToolsWithAccess(tools, context, userRole) {
  return tools.map((tool) => {
    const access = resolveAssetAccessState(tool, context, userRole);
    return {
      ...tool,
      accessState: access.accessState,
      accessLabel: ASSET_ACCESS_LABELS[access.accessState] || access.accessState,
      accessReasons: access.reasons,
      accessDecision: access.decision,
      isLaunchable: isLaunchableAccessState(access.accessState),
    };
  });
}

export function filterVisibleTools(tools, { includeLocked = false, includeDemo = true } = {}) {
  return tools.filter((tool) => {
    if (tool.accessState === ASSET_ACCESS_STATES.HIDDEN) return false;
    if (tool.accessState === ASSET_ACCESS_STATES.DISABLED) return false;
    if (tool.accessState === ASSET_ACCESS_STATES.REQUIRES_ADMIN) return false;
    if (tool.accessState === ASSET_ACCESS_STATES.ADMIN_ONLY) return false;
    if (!includeLocked && tool.accessState === ASSET_ACCESS_STATES.LOCKED) return false;
    if (!includeLocked && tool.accessState === ASSET_ACCESS_STATES.SUBSCRIPTION_REQUIRED) return false;
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
    organization: tools.filter(
      (t) =>
        ![
          ASSET_ACCESS_STATES.LOCKED,
          ASSET_ACCESS_STATES.SUBSCRIPTION_REQUIRED,
          ASSET_ACCESS_STATES.DISABLED,
        ].includes(t.accessState)
    ),
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

function mapEntitlementState(state) {
  if (state === ENTITLEMENT_ACCESS_STATES.ADMIN_ONLY || state === ASSET_ACCESS_STATES.REQUIRES_ADMIN) {
    return ASSET_ACCESS_STATES.ADMIN_ONLY;
  }
  return Object.values(ASSET_ACCESS_STATES).includes(state) ? state : ASSET_ACCESS_STATES.ALLOWED;
}

function isLaunchableAccessState(state) {
  return [
    ASSET_ACCESS_STATES.ALLOWED,
    ASSET_ACCESS_STATES.BETA,
    ASSET_ACCESS_STATES.EXPERIMENTAL,
    ASSET_ACCESS_STATES.DEMO_ONLY,
  ].includes(state);
}
