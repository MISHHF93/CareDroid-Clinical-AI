import { describe, expect, it } from 'vitest';
import {
  ASSET_DEPENDENCY_ISSUE_TYPES,
  buildLocalAssetDependencyGraph,
} from './assetDependencyGraph';

describe('assetDependencyGraph', () => {
  it('builds product to pack to asset chains from rollout registry', () => {
    const graph = buildLocalAssetDependencyGraph({ maxChains: 12 });
    expect(graph.chains.length).toBeGreaterThan(0);
    expect(graph.summary.assetPacks).toBeGreaterThan(0);
    expect(graph.chains[0]).toMatchObject({
      product: expect.objectContaining({ id: expect.any(String), name: expect.any(String) }),
      assetPack: expect.objectContaining({ id: expect.any(String), name: expect.any(String) }),
      asset: expect.objectContaining({ id: expect.any(String), title: expect.any(String) }),
    });
  });

  it('detects missing and orphan asset dependency issues', () => {
    const graph = buildLocalAssetDependencyGraph({
      flags: [
        {
          id: 'demo-pack',
          name: 'Demo Pack',
          category: 'Tools',
          assetIds: ['missing-asset-id'],
        },
      ],
      inventoryRecords: [{ id: 'orphan-tool', label: 'Orphan Tool', route: '/tools/orphan' }],
      maxChains: 8,
    });

    expect(graph.issueCounts[ASSET_DEPENDENCY_ISSUE_TYPES.MISSING_DEPENDENCY]).toBeGreaterThan(0);
    expect(graph.issueCounts[ASSET_DEPENDENCY_ISSUE_TYPES.ORPHAN_ASSET]).toBeGreaterThan(0);
  });
});