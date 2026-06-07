import { describe, expect, it } from 'vitest';
import { buildAssetInventoryProjection } from './assetInventory';
import {
  ARTIFACT_KNOWLEDGE_GRAPH_NODE_TYPES,
  ARTIFACT_KNOWLEDGE_GRAPH_RELATIONSHIPS,
  ArtifactKnowledgeGraphService,
} from './artifactKnowledgeGraph';

describe('ArtifactKnowledgeGraphService', () => {
  const service = new ArtifactKnowledgeGraphService();
  const graph = service.getGraph();

  it('builds requested node and relationship types', () => {
    for (const nodeType of ARTIFACT_KNOWLEDGE_GRAPH_NODE_TYPES) {
      expect(graph.nodes.some((node) => node.type === nodeType)).toBe(true);
    }

    for (const relationshipType of ARTIFACT_KNOWLEDGE_GRAPH_RELATIONSHIPS) {
      expect(graph.edges.some((edge) => edge.type === relationshipType)).toBe(true);
    }
  });

  it('connects every mounted asset to the graph', () => {
    const assets = buildAssetInventoryProjection();
    const nodeIds = new Set(graph.nodes.map((node) => node.id));
    const connectedNodeIds = new Set(graph.edges.flatMap((edge) => [edge.source, edge.target]));

    for (const asset of assets) {
      const nodeId = `asset:${asset.id}`;
      expect(nodeIds.has(nodeId)).toBe(true);
      expect(connectedNodeIds.has(nodeId)).toBe(true);
    }

    expect(graph.coverage.totalAssets).toBe(assets.length);
    expect(graph.coverage.orphanAssetIds).toEqual([]);
    expect(graph.coverage.allAssetsConnected).toBe(true);
  });

  it('supports relationship exploration, quality findings, and recommendations', () => {
    const assetNode = graph.nodes.find((node) => node.type === 'asset');
    const snapshot = service.buildSnapshot({ selectedNodeId: assetNode.id });

    expect(snapshot.relationshipRows.length).toBeGreaterThan(0);
    expect(Array.isArray(snapshot.orphanNodes)).toBe(true);
    expect(Array.isArray(snapshot.duplicateGroups)).toBe(true);
    expect(snapshot.recommendations.length).toBeGreaterThan(0);
  });

  it('detects duplicate nodes by type and label', () => {
    const duplicateService = new ArtifactKnowledgeGraphService({
      artifacts: [
        {
          artifactId: 'duplicate-one',
          name: 'Duplicate Asset',
          type: 'tool',
          category: 'test',
          route: '/duplicate-one',
          assetPack: 'core-platform',
          product: 'product-core-platform',
          workspace: 'clinical',
          roles: 'clinician',
          organizationTypes: 'hospital',
          dependencies: 'unknown',
          tags: 'duplicate',
          description: 'Duplicate test asset.',
        },
        {
          artifactId: 'duplicate-two',
          name: 'Duplicate Asset',
          type: 'tool',
          category: 'test',
          route: '/duplicate-two',
          assetPack: 'core-platform',
          product: 'product-core-platform',
          workspace: 'clinical',
          roles: 'clinician',
          organizationTypes: 'hospital',
          dependencies: 'unknown',
          tags: 'duplicate',
          description: 'Duplicate test asset.',
        },
      ],
      assets: [],
      marketplaceItems: [],
      aiModels: [],
      routes: [],
    });

    expect(duplicateService.detectDuplicateNodes()).toHaveLength(1);
  });
});
