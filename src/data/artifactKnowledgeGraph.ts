import { ROUTE_RECORDS } from '../config/routes.config';
import {
  ASSET_PACKS,
  SAAS_PRODUCTS,
  buildAssetInventoryProjection,
} from './assetInventory';
import { buildArtifactCatalog } from './artifactIntelligence';
import { getAiModelRegistry } from './aiModelRegistry';
import { MARKETPLACE_ITEMS } from './marketplaceCatalog';

const UNKNOWN = 'unknown';
const SIMILARITY_THRESHOLD = 0.34;

export const ARTIFACT_KNOWLEDGE_GRAPH_NODE_TYPES = Object.freeze([
  'asset',
  'pack',
  'product',
  'workspace',
  'organization',
  'role',
  'route',
  'simulation',
  'workflow',
  'ai-agent',
  'integration',
]);

export const ARTIFACT_KNOWLEDGE_GRAPH_RELATIONSHIPS = Object.freeze([
  'USES',
  'DEPENDS_ON',
  'BELONGS_TO',
  'RECOMMENDED_FOR',
  'SIMILAR_TO',
  'LAUNCHED_FROM',
  'PART_OF',
]);

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (value === undefined || value === null || value === '' || value === UNKNOWN) return [];
  return [String(value)];
}

function splitValues(value) {
  return asArray(value).flatMap((entry) =>
    String(entry)
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean)
      .filter((part) => part !== UNKNOWN)
  );
}

function uniq(values) {
  return [...new Set(values.flatMap(asArray).filter(Boolean))];
}

function slug(value) {
  return (
    String(value || UNKNOWN)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9/]+/g, '-')
      .replace(/^-+|-+$/g, '') || UNKNOWN
  );
}

function titleize(value) {
  return String(value || UNKNOWN)
    .split(/[-_/\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  return new Set(normalizeText(value).split(' ').filter((token) => token.length > 2));
}

function jaccardSimilarity(left, right) {
  const leftTokens = tokenize(left);
  const rightTokens = tokenize(right);
  if (!leftTokens.size || !rightTokens.size) return 0;
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return overlap / (leftTokens.size + rightTokens.size - overlap);
}

function safeTags(...values) {
  return uniq(values.flatMap(splitValues)).slice(0, 12);
}

function firstKnown(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '' && value !== UNKNOWN);
}

function marketplaceType(category) {
  return {
    'asset-packs': 'pack',
    workflows: 'workflow',
    simulations: 'simulation',
    'ai-agents': 'ai-agent',
    integrations: 'integration',
  }[category];
}

function artifactType(artifact) {
  if (artifact.type === 'asset-pack') return 'pack';
  if (artifact.type === 'product') return 'product';
  if (artifact.type === 'route') return 'route';
  if (artifact.type === 'workflow') return 'workflow';
  if (artifact.type === 'simulation' || artifact.type === 'laboratory') return 'simulation';
  if (artifact.type === 'ai-model') return 'ai-agent';
  if (artifact.type === 'api-endpoint') return 'integration';
  return 'asset';
}

function nodeKey(type, id) {
  return `${type}:${String(id || UNKNOWN).trim() || UNKNOWN}`;
}

function routeLabel(path) {
  return path === '/' ? 'Home' : titleize(String(path || '').replace(/^\//, ''));
}

function routeNode(path) {
  return nodeKey('route', path || UNKNOWN);
}

function assetNode(assetId) {
  return nodeKey('asset', assetId);
}

function packNode(packId) {
  return nodeKey('pack', packId);
}

function productNode(productId) {
  return nodeKey('product', productId);
}

function workspaceNode(workspaceId) {
  return nodeKey('workspace', workspaceId);
}

function roleNode(roleId) {
  return nodeKey('role', roleId);
}

function organizationNode(organizationType) {
  return nodeKey('organization', organizationType);
}

function integrationNode(integrationId) {
  return nodeKey('integration', integrationId);
}

function workflowNode(workflowId) {
  return nodeKey('workflow', workflowId);
}

function simulationNode(simulationId) {
  return nodeKey('simulation', simulationId);
}

function aiAgentNode(agentId) {
  return nodeKey('ai-agent', agentId);
}

function nodeIdForArtifact(artifact) {
  const type = artifactType(artifact);
  if (type === 'pack') return packNode(firstKnown(splitValues(artifact.assetPack)[0], artifact.artifactId.replace(/^pack-/, '')));
  if (type === 'product') return productNode(firstKnown(splitValues(artifact.product)[0], artifact.artifactId.replace(/^product-/, '')));
  if (type === 'route') return routeNode(firstKnown(artifact.route, artifact.artifactId));
  if (type === 'workflow') return workflowNode(artifact.artifactId);
  if (type === 'simulation') return simulationNode(artifact.artifactId);
  if (type === 'ai-agent') return aiAgentNode(artifact.artifactId);
  if (type === 'integration') return integrationNode(artifact.artifactId);
  return assetNode(artifact.artifactId);
}

function searchableNodeText(node) {
  return [
    node.id,
    node.label,
    node.type,
    node.summary,
    node.path,
    node.sourceId,
    ...(node.tags || []),
  ].join(' ');
}

export class ArtifactKnowledgeGraphService {
  artifacts: any[];
  assets: any[];
  routes: any[];
  packs: any[];
  products: any[];
  marketplaceItems: any[];
  aiModels: any[];
  graph: any = null;

  constructor({
    artifacts = buildArtifactCatalog(),
    assets = buildAssetInventoryProjection(),
    routes = ROUTE_RECORDS,
    packs = ASSET_PACKS,
    products = SAAS_PRODUCTS,
    marketplaceItems = MARKETPLACE_ITEMS,
    aiModels = getAiModelRegistry(),
  }: any = {}) {
    this.artifacts = artifacts;
    this.assets = assets;
    this.routes = routes;
    this.packs = packs;
    this.products = products;
    this.marketplaceItems = marketplaceItems;
    this.aiModels = aiModels;
    this.graph = null;
  }

  getGraph() {
    if (!this.graph) {
      this.graph = this.buildGraph();
    }
    return this.graph;
  }

  buildGraph() {
    const nodes = new Map();
    const edges = new Map();
    const assetIds = new Set(this.assets.map((asset) => asset.id));
    const routePaths = new Set(this.routes.map((route) => route.path));
    const artifactById = new Map(this.artifacts.map((artifact) => [artifact.artifactId, artifact]));

    const addNode = (node) => {
      if (!node?.id || !ARTIFACT_KNOWLEDGE_GRAPH_NODE_TYPES.includes(node.type)) return null;
      const existing = nodes.get(node.id);
      const nextNode = {
        id: node.id,
        type: node.type,
        label: node.label || titleize(node.sourceId || node.id),
        summary: node.summary || '',
        path: node.path || '',
        sourceId: node.sourceId || node.id,
        tags: safeTags(node.tags || []),
        metadata: { ...(node.metadata || {}) },
      };
      if (existing) {
        nodes.set(node.id, {
          ...existing,
          ...nextNode,
          summary: existing.summary || nextNode.summary,
          path: existing.path || nextNode.path,
          tags: safeTags(existing.tags, nextNode.tags),
          metadata: { ...existing.metadata, ...nextNode.metadata },
        });
      } else {
        nodes.set(node.id, nextNode);
      }
      return node.id;
    };

    const addEdge = (source, target, type, rationale, metadata: any = {}) => {
      if (!source || !target || source === target || !nodes.has(source) || !nodes.has(target)) return null;
      if (!ARTIFACT_KNOWLEDGE_GRAPH_RELATIONSHIPS.includes(type)) return null;
      const id = `${source}|${type}|${target}`;
      if (!edges.has(id)) {
        edges.set(id, {
          id,
          source,
          target,
          type,
          label: type.replace(/_/g, ' '),
          rationale,
          metadata,
        });
      }
      return id;
    };

    const mapDependencyToNode = (dependency) => {
      const value = String(dependency || '').trim();
      if (!value || value === UNKNOWN) return null;
      if (artifactById.has(value)) return nodeIdForArtifact(artifactById.get(value));
      if (assetIds.has(value)) return assetNode(value);
      if (routePaths.has(value) || value.startsWith('/')) {
        return addNode({
          id: routeNode(value),
          type: 'route',
          label: routeLabel(value),
          path: value,
          sourceId: value,
          summary: `Launch route ${value}.`,
          tags: ['route'],
        });
      }
      if (/api|endpoint|integration|fhir|sso|oidc|saml/i.test(value) && !/^src\//i.test(value)) {
        return addNode({
          id: integrationNode(value),
          type: 'integration',
          label: titleize(value),
          sourceId: value,
          summary: `Integration or service dependency captured as ${value}.`,
          tags: ['dependency', 'integration'],
        });
      }
      return null;
    };

    for (const route of this.routes) {
      addNode({
        id: routeNode(route.path),
        type: 'route',
        label: routeLabel(route.path),
        path: route.path,
        sourceId: route.id,
        summary: `${route.componentKey || route.id} route in the ${route.navGroup || 'app'} navigation group.`,
        tags: ['route', route.navGroup, route.status],
        metadata: route,
      });
    }

    for (const product of this.products) {
      addNode({
        id: productNode(product.id),
        type: 'product',
        label: product.name,
        path: '/products',
        sourceId: product.id,
        summary: `${product.name} is a CareDroid SaaS product composed from asset packs.`,
        tags: ['product', product.layer, ...(product.packIds || [])],
        metadata: product,
      });
    }

    for (const pack of this.packs) {
      addNode({
        id: packNode(pack.id),
        type: 'pack',
        label: pack.name,
        path: '/asset-packs',
        sourceId: pack.id,
        summary: `${pack.name} groups assets for entitlement, packaging, and workspace discovery.`,
        tags: ['pack', ...(pack.workspaceIds || [])],
        metadata: pack,
      });
      for (const workspaceId of pack.workspaceIds || []) {
        addNode({
          id: workspaceNode(workspaceId),
          type: 'workspace',
          label: titleize(workspaceId),
          sourceId: workspaceId,
          summary: `${titleize(workspaceId)} workspace coverage from asset pack metadata.`,
          tags: ['workspace'],
        });
        addEdge(packNode(pack.id), workspaceNode(workspaceId), 'RECOMMENDED_FOR', `${pack.name} is available in the ${titleize(workspaceId)} workspace.`);
      }
    }

    for (const product of this.products) {
      for (const packId of product.packIds || []) {
        addEdge(packNode(packId), productNode(product.id), 'PART_OF', `${titleize(packId)} composes ${product.name}.`);
      }
    }

    for (const asset of this.assets) {
      const currentAssetNode = assetNode(asset.id);
      addNode({
        id: currentAssetNode,
        type: 'asset',
        label: asset.title || asset.name || asset.id,
        path: asset.route,
        sourceId: asset.id,
        summary: asset.description || `${asset.title || asset.id} is a mounted CareDroid asset.`,
        tags: safeTags(asset.assetType, asset.category, asset.packIds, asset.productIds, asset.workspaceIds, asset.roleIds),
        metadata: asset,
      });

      for (const packId of asset.packIds || []) {
        addNode({
          id: packNode(packId),
          type: 'pack',
          label: this.packs.find((pack) => pack.id === packId)?.name || titleize(packId),
          path: '/asset-packs',
          sourceId: packId,
          summary: `${titleize(packId)} asset pack.`,
          tags: ['pack'],
        });
        addEdge(currentAssetNode, packNode(packId), 'BELONGS_TO', `${asset.title || asset.id} belongs to ${titleize(packId)}.`);
      }

      for (const productId of asset.productIds || []) {
        addNode({
          id: productNode(productId),
          type: 'product',
          label: this.products.find((product) => product.id === productId)?.name || titleize(productId),
          path: '/products',
          sourceId: productId,
          summary: `${titleize(productId)} product.`,
          tags: ['product'],
        });
        addEdge(currentAssetNode, productNode(productId), 'PART_OF', `${asset.title || asset.id} is packaged into ${titleize(productId)}.`);
      }

      for (const workspaceId of asset.workspaceIds || asset.access?.workspaceIds || []) {
        addNode({
          id: workspaceNode(workspaceId),
          type: 'workspace',
          label: titleize(workspaceId),
          sourceId: workspaceId,
          summary: `${titleize(workspaceId)} workspace.`,
          tags: ['workspace'],
        });
        addEdge(currentAssetNode, workspaceNode(workspaceId), 'RECOMMENDED_FOR', `${asset.title || asset.id} is recommended for the ${titleize(workspaceId)} workspace.`);
      }

      for (const roleId of asset.roleIds || asset.access?.roleIds || []) {
        addNode({
          id: roleNode(roleId),
          type: 'role',
          label: titleize(roleId),
          sourceId: roleId,
          summary: `${titleize(roleId)} role profile.`,
          tags: ['role'],
        });
        addEdge(currentAssetNode, roleNode(roleId), 'RECOMMENDED_FOR', `${asset.title || asset.id} is recommended for ${titleize(roleId)} users.`);
      }

      for (const organizationType of asset.access?.organizationTypes || []) {
        addNode({
          id: organizationNode(organizationType),
          type: 'organization',
          label: titleize(organizationType),
          sourceId: organizationType,
          summary: `${titleize(organizationType)} organization context.`,
          tags: ['organization'],
        });
        addEdge(currentAssetNode, organizationNode(organizationType), 'RECOMMENDED_FOR', `${asset.title || asset.id} is available to ${titleize(organizationType)} organizations.`);
      }

      if (asset.route) {
        addNode({
          id: routeNode(asset.route),
          type: 'route',
          label: routeLabel(asset.route),
          path: asset.route,
          sourceId: asset.route,
          summary: `Launch route for ${asset.title || asset.id}.`,
          tags: ['route'],
        });
        addEdge(currentAssetNode, routeNode(asset.route), 'LAUNCHED_FROM', `${asset.title || asset.id} launches from ${asset.route}.`);
      }

      for (const dependency of [
        asset.execution?.endpoint,
        ...(asset.evidence?.sourceFiles || []),
        ...(asset.evidence?.tests || []),
      ]) {
        const target = mapDependencyToNode(dependency);
        addEdge(currentAssetNode, target, 'DEPENDS_ON', `${asset.title || asset.id} depends on ${dependency}.`);
      }
    }

    for (const artifact of this.artifacts) {
      const currentNodeId = nodeIdForArtifact(artifact);
      const currentType = artifactType(artifact);
      addNode({
        id: currentNodeId,
        type: currentType,
        label: artifact.name,
        path: artifact.route !== UNKNOWN ? artifact.route : '',
        sourceId: artifact.artifactId,
        summary: artifact.description,
        tags: safeTags(artifact.type, artifact.category, artifact.tags, artifact.workspace, artifact.assetPack, artifact.product),
        metadata: artifact,
      });

      for (const packId of splitValues(artifact.assetPack)) {
        addNode({
          id: packNode(packId),
          type: 'pack',
          label: this.packs.find((pack) => pack.id === packId)?.name || titleize(packId),
          path: '/asset-packs',
          sourceId: packId,
          summary: `${titleize(packId)} asset pack.`,
          tags: ['pack'],
        });
        addEdge(currentNodeId, packNode(packId), currentType === 'pack' ? 'PART_OF' : 'BELONGS_TO', `${artifact.name} is mapped to ${titleize(packId)}.`);
      }

      for (const productId of splitValues(artifact.product)) {
        addNode({
          id: productNode(productId),
          type: 'product',
          label: this.products.find((product) => product.id === productId)?.name || titleize(productId),
          path: '/products',
          sourceId: productId,
          summary: `${titleize(productId)} product.`,
          tags: ['product'],
        });
        addEdge(currentNodeId, productNode(productId), currentType === 'product' ? 'PART_OF' : 'PART_OF', `${artifact.name} is part of ${titleize(productId)}.`);
      }

      for (const workspaceId of splitValues(artifact.workspace)) {
        addNode({
          id: workspaceNode(workspaceId),
          type: 'workspace',
          label: titleize(workspaceId),
          sourceId: workspaceId,
          summary: `${titleize(workspaceId)} workspace.`,
          tags: ['workspace'],
        });
        addEdge(currentNodeId, workspaceNode(workspaceId), 'RECOMMENDED_FOR', `${artifact.name} is recommended for ${titleize(workspaceId)}.`);
      }

      for (const roleId of splitValues(artifact.roles)) {
        addNode({
          id: roleNode(roleId),
          type: 'role',
          label: titleize(roleId),
          sourceId: roleId,
          summary: `${titleize(roleId)} role profile.`,
          tags: ['role'],
        });
        addEdge(currentNodeId, roleNode(roleId), 'RECOMMENDED_FOR', `${artifact.name} is recommended for ${titleize(roleId)}.`);
      }

      for (const organizationType of splitValues(artifact.organizationTypes)) {
        addNode({
          id: organizationNode(organizationType),
          type: 'organization',
          label: titleize(organizationType),
          sourceId: organizationType,
          summary: `${titleize(organizationType)} organization context.`,
          tags: ['organization'],
        });
        addEdge(currentNodeId, organizationNode(organizationType), 'RECOMMENDED_FOR', `${artifact.name} is available to ${titleize(organizationType)} organizations.`);
      }

      if (artifact.route && artifact.route !== UNKNOWN) {
        addNode({
          id: routeNode(artifact.route),
          type: 'route',
          label: routeLabel(artifact.route),
          path: artifact.route,
          sourceId: artifact.route,
          summary: `Launch route ${artifact.route}.`,
          tags: ['route'],
        });
        addEdge(currentNodeId, routeNode(artifact.route), 'LAUNCHED_FROM', `${artifact.name} launches from ${artifact.route}.`);
      }

      for (const dependency of splitValues(artifact.dependencies)) {
        const target = mapDependencyToNode(dependency);
        addEdge(currentNodeId, target, currentType === 'ai-agent' ? 'USES' : 'DEPENDS_ON', `${artifact.name} depends on ${dependency}.`);
      }
    }

    for (const item of this.marketplaceItems) {
      const type = marketplaceType(item.category);
      if (!type) continue;
      const id =
        type === 'pack'
          ? packNode(item.id)
          : type === 'workflow'
            ? workflowNode(item.id)
            : type === 'simulation'
              ? simulationNode(item.id)
              : type === 'ai-agent'
                ? aiAgentNode(item.id)
                : integrationNode(item.id);
      addNode({
        id,
        type,
        label: item.title,
        path: item.route,
        sourceId: item.id,
        summary: item.summary,
        tags: safeTags(item.category, item.entitlement, item.tags),
        metadata: item,
      });
      if (item.route) {
        addNode({
          id: routeNode(item.route),
          type: 'route',
          label: routeLabel(item.route),
          path: item.route,
          sourceId: item.route,
          summary: `Marketplace launch route ${item.route}.`,
          tags: ['route'],
        });
        addEdge(id, routeNode(item.route), 'LAUNCHED_FROM', `${item.title} launches from ${item.route}.`);
      }
      for (const tag of item.tags || []) {
        const matchingWorkspace = [...nodes.values()].find(
          (node) => node.type === 'workspace' && normalizeText(node.label) === normalizeText(tag)
        );
        if (matchingWorkspace) {
          addEdge(id, matchingWorkspace.id, 'RECOMMENDED_FOR', `${item.title} is recommended for ${matchingWorkspace.label}.`);
        }
      }
    }

    for (const model of this.aiModels) {
      const id = aiAgentNode(`model-${model.modelId}`);
      addNode({
        id,
        type: 'ai-agent',
        label: model.name,
        path: model.route || '/ai-models',
        sourceId: model.modelId,
        summary: model.purpose,
        tags: safeTags('ai-model', model.owner, model.status, model.costProfile),
        metadata: model,
      });
      if (model.route) {
        addNode({
          id: routeNode(model.route),
          type: 'route',
          label: routeLabel(model.route),
          path: model.route,
          sourceId: model.route,
          summary: `AI model route ${model.route}.`,
          tags: ['route'],
        });
        addEdge(id, routeNode(model.route), 'LAUNCHED_FROM', `${model.name} launches from ${model.route}.`);
      }
      for (const dependency of model.artifactDependencies || []) {
        const target = mapDependencyToNode(dependency);
        addEdge(id, target, 'USES', `${model.name} uses ${dependency}.`);
      }
    }

    this.addSimilarityEdges(nodes, addEdge);

    const graphNodes = [...nodes.values()].sort((a, b) => a.type.localeCompare(b.type) || a.label.localeCompare(b.label));
    const graphEdges = [...edges.values()].sort((a, b) => a.type.localeCompare(b.type) || a.source.localeCompare(b.source));
    const connectedNodeIds = new Set(graphEdges.flatMap((edge) => [edge.source, edge.target]));
    const assetNodeIds = this.assets.map((asset) => assetNode(asset.id));
    const orphanAssetIds = assetNodeIds.filter((id) => !connectedNodeIds.has(id));

    return {
      nodes: graphNodes,
      edges: graphEdges,
      generatedAt: new Date().toISOString(),
      summary: {
        nodes: graphNodes.length,
        edges: graphEdges.length,
        connectedAssets: assetNodeIds.length - orphanAssetIds.length,
        totalAssets: assetNodeIds.length,
        orphanAssets: orphanAssetIds.length,
      },
      coverage: {
        totalAssets: assetNodeIds.length,
        connectedAssetIds: assetNodeIds.filter((id) => connectedNodeIds.has(id)),
        orphanAssetIds,
        allAssetsConnected: orphanAssetIds.length === 0,
      },
    };
  }

  addSimilarityEdges(nodes, addEdge) {
    const candidates = [...nodes.values()].filter((node) =>
      ['asset', 'workflow', 'simulation', 'ai-agent', 'integration'].includes(node.type)
    );

    for (const source of candidates) {
      const sourceText = searchableNodeText(source);
      candidates
        .filter((target) => target.id !== source.id)
        .map((target) => ({
          target,
          score: jaccardSimilarity(sourceText, searchableNodeText(target)),
        }))
        .filter(({ score }) => score >= SIMILARITY_THRESHOLD)
        .sort((a, b) => b.score - a.score || a.target.label.localeCompare(b.target.label))
        .slice(0, 2)
        .forEach(({ target, score }) => {
          addEdge(
            source.id,
            target.id,
            'SIMILAR_TO',
            `${source.label} is similar to ${target.label} based on shared metadata.`,
            { score: Number(score.toFixed(3)) }
          );
        });
    }
  }

  getNode(nodeId) {
    return this.getGraph().nodes.find((node) => node.id === nodeId) || null;
  }

  getNeighbors(nodeId) {
    const graph = this.getGraph();
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    return graph.edges
      .filter((edge) => edge.source === nodeId || edge.target === nodeId)
      .map((edge) => {
        const relatedId = edge.source === nodeId ? edge.target : edge.source;
        return { edge, node: nodeById.get(relatedId) };
      })
      .filter((entry) => entry.node);
  }

  getRelationshipRows({ relationship = 'all', limit = 160 }: any = {}) {
    const graph = this.getGraph();
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    return graph.edges
      .filter((edge) => relationship === 'all' || edge.type === relationship)
      .slice(0, limit)
      .map((edge) => ({
        ...edge,
        sourceLabel: (nodeById.get(edge.source) as any)?.label || edge.source,
        targetLabel: (nodeById.get(edge.target) as any)?.label || edge.target,
        sourceType: (nodeById.get(edge.source) as any)?.type || UNKNOWN,
        targetType: (nodeById.get(edge.target) as any)?.type || UNKNOWN,
      }));
  }

  detectOrphanNodes() {
    const graph = this.getGraph();
    const connected = new Set(graph.edges.flatMap((edge) => [edge.source, edge.target]));
    return graph.nodes.filter((node) => !connected.has(node.id));
  }

  detectDuplicateNodes() {
    const groups = new Map();
    for (const node of this.getGraph().nodes) {
      const key = `${node.type}:${slug(node.label)}`;
      groups.set(key, [...(groups.get(key) || []), node]);
    }
    return [...groups.values()].filter((group) => group.length > 1);
  }

  recommendGraphNodes(nodeId, { limit = 8 }: any = {}) {
    const selected = this.getNode(nodeId);
    if (!selected) return [];
    const neighborRecommendations = this.getNeighbors(nodeId)
      .slice(0, 24)
      .map(({ edge, node }) => ({
        node,
        relationship: edge.type,
        reason: edge.rationale,
        score: edge.type === 'SIMILAR_TO' ? 0.82 : 0.92,
      }));
    const graph = this.getGraph();
    const selectedTags = new Set((selected.tags || []).map(normalizeText));
    const tagRecommendations = graph.nodes
      .filter((node) => node.id !== selected.id)
      .map((node) => {
        const overlap = (node.tags || []).filter((tag) => selectedTags.has(normalizeText(tag))).length;
        return {
          node,
          relationship: 'RECOMMENDED_FOR',
          reason: `${node.label} shares ${overlap} metadata tag${overlap === 1 ? '' : 's'} with ${selected.label}.`,
          score: overlap / Math.max(selectedTags.size, 1),
        };
      })
      .filter((entry) => entry.score > 0);

    const byId = new Map();
    for (const entry of [...neighborRecommendations, ...tagRecommendations]) {
      const current = byId.get(entry.node.id);
      if (!current || entry.score > current.score) byId.set(entry.node.id, entry);
    }

    return [...byId.values()]
      .sort((a, b) => b.score - a.score || a.node.label.localeCompare(b.node.label))
      .slice(0, limit);
  }

  buildSnapshot({ query = '', type = 'all', relationship = 'all', selectedNodeId, nodeLimit = 48 }: any = {}) {
    const graph = this.getGraph();
    const normalizedQuery = normalizeText(query);
    const nodes = graph.nodes.filter((node) => {
      const matchesType = type === 'all' || node.type === type;
      const matchesQuery = !normalizedQuery || normalizeText(searchableNodeText(node)).includes(normalizedQuery);
      return matchesType && matchesQuery;
    });
    const visibleNodes = nodes.slice(0, nodeLimit);
    const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
    const edges = graph.edges.filter(
      (edge) =>
        visibleNodeIds.has(edge.source) &&
        visibleNodeIds.has(edge.target) &&
        (relationship === 'all' || edge.type === relationship)
    );
    const selectedNode =
      graph.nodes.find((node) => node.id === selectedNodeId) || visibleNodes[0] || graph.nodes[0] || null;

    return {
      ...graph,
      nodes: visibleNodes,
      visibleNodeCount: visibleNodes.length,
      matchingNodeCount: nodes.length,
      edges,
      selectedNode,
      neighbors: selectedNode ? this.getNeighbors(selectedNode.id).slice(0, 16) : [],
      relationshipRows: this.getRelationshipRows({ relationship }),
      orphanNodes: this.detectOrphanNodes(),
      duplicateGroups: this.detectDuplicateNodes(),
      recommendations: selectedNode ? this.recommendGraphNodes(selectedNode.id) : [],
      counts: ARTIFACT_KNOWLEDGE_GRAPH_NODE_TYPES.reduce(
        (counts, nodeType) => ({
          ...counts,
          [nodeType]: graph.nodes.filter((node) => node.type === nodeType).length,
        }),
        {}
      ),
      relationshipCounts: ARTIFACT_KNOWLEDGE_GRAPH_RELATIONSHIPS.reduce(
        (counts, relationshipType) => ({
          ...counts,
          [relationshipType]: graph.edges.filter((edge) => edge.type === relationshipType).length,
        }),
        {}
      ),
    };
  }
}

export function createArtifactKnowledgeGraphService(options = undefined) {
  return new ArtifactKnowledgeGraphService(options);
}

export function buildArtifactKnowledgeGraph(options = undefined) {
  return createArtifactKnowledgeGraphService(options).getGraph();
}

export function buildArtifactKnowledgeGraphSnapshot(options) {
  return createArtifactKnowledgeGraphService().buildSnapshot(options);
}

export function buildKnowledgeGraphAiPrompt(node, neighbors = [] as any[]) {
  const selectedNode = node || buildArtifactKnowledgeGraph().nodes[0];
  const neighborText = neighbors
    .slice(0, 8)
    .map(({ edge, node: relatedNode }) => `${edge.type} ${relatedNode.label}`)
    .join('; ');
  return [
    `Open the Clinical Knowledge Graph and explain the selected node: ${selectedNode.label}.`,
    `Type: ${selectedNode.type}.`,
    `Summary: ${selectedNode.summary}`,
    `Relationships: ${neighborText || 'No direct relationships'}.`,
    'Explain how assets, packs, products, workspaces, roles, routes, simulations, workflows, AI agents, and integrations connect. Keep the explanation operational and concise.',
  ].join('\n');
}
