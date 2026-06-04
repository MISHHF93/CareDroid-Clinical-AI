/**
 * Thin projection layer: platform assets from API with tool inventory fallback.
 */

import { getPlatformEntitlementContext } from './assetEntitlements';
import { getUserFacingToolRegistryProjection } from './toolInventory';

export function buildAssetInventoryProjection() {
  const ctx = getPlatformEntitlementContext();
  const tools = getUserFacingToolRegistryProjection();
  const entitledIds = new Set(ctx?.entitledAssetIds || []);

  return tools.map((tool) => ({
    id: tool.id,
    assetType: tool.launchType === 'calculator' ? 'calculator' : 'tool',
    title: tool.name,
    category: tool.category,
    route: tool.path,
    lifecycle: tool.lifecycleState || 'active',
    entitled: entitledIds.size ? entitledIds.has(tool.id) : true,
    packIds: [],
  }));
}
