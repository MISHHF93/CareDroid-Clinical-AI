import { describe, expect, it } from 'vitest';
import {
  ASSET_PACKS,
  buildMountedCapabilityGraph,
  CANONICAL_WORKSPACE_IDS,
  getMountedCapabilityById,
  normalizeAssetPackIds,
  SAAS_PRODUCTS,
  SUPPORT_STATUSES,
} from './mountedCapabilityGraph';

describe('mounted capability graph', () => {
  const graph = buildMountedCapabilityGraph();

  it('projects every visible capability with complete SaaS mounting metadata', () => {
    expect(graph.capabilities.length).toBeGreaterThan(0);
    expect(new Set(graph.capabilities.map((capability) => capability.capabilityId)).size).toBe(
      graph.capabilities.length
    );

    for (const capability of graph.capabilities) {
      expect(capability.assetId, capability.capabilityId).toBe(capability.capabilityId);
      expect(capability.productIds.length, `${capability.capabilityId} productIds`).toBeGreaterThan(0);
      expect(capability.packIds.length, `${capability.capabilityId} packIds`).toBeGreaterThan(0);
      expect(capability.workspaceIds.length, `${capability.capabilityId} workspaceIds`).toBeGreaterThan(0);
      expect(capability.roleIds.length, `${capability.capabilityId} roleIds`).toBeGreaterThan(0);
      expect(capability.route || capability.commandVisible, `${capability.capabilityId} route/command`).toBeTruthy();
      expect(capability.aiAliases.length, `${capability.capabilityId} aiAliases`).toBeGreaterThan(0);
      expect(Object.values(SUPPORT_STATUSES), capability.capabilityId).toContain(
        capability.demoStatus
      );
    }
  });

  it('normalizes stale frontend workspace pack aliases to backend pack ids', () => {
    expect(
      normalizeAssetPackIds([
        'clinical-core',
        'critical-care',
        'medical-iot',
        'education-simulation',
        'research-intelligence',
        'governance-risk',
        'ai-evaluation-lab',
      ])
    ).toEqual([
      'core-platform',
      'icu-pack',
      'medical-iot-pack',
      'simulation-training-pack',
      'research-education',
      'governance-compliance-pack',
    ]);
  });

  it('keeps representative product, pack, route, and AI alias ownership explicit', () => {
    expect(SAAS_PRODUCTS.map((product) => product.id)).toContain('product-hospital-operations');
    expect(ASSET_PACKS.map((pack) => pack.id)).toContain('medical-iot-pack');
    expect(CANONICAL_WORKSPACE_IDS).toEqual(expect.arrayContaining(['operations', 'medical-iot']));

    expect(getMountedCapabilityById('hospital-map')).toMatchObject({
      packIds: expect.arrayContaining(['hospital-operations', 'digital-twin-pack']),
      productIds: expect.arrayContaining(['product-hospital-operations']),
      operationsVisible: true,
      commandVisible: true,
    });
    expect(getMountedCapabilityById('lab-interp')).toMatchObject({
      packIds: expect.arrayContaining(['laboratory-intelligence']),
      productIds: expect.arrayContaining(['product-laboratory']),
    });
  });
});
