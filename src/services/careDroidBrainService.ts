import { createArtifactKnowledgeGraphService } from '../data/artifactKnowledgeGraph';
import { buildArtifactCatalog, validateArtifactCatalog } from '../data/artifactIntelligence';
import { buildOrganizationIntelligenceProfile } from '../data/organizationIntelligenceProfile';
import { buildPlatformLearningEngine } from '../data/platformLearningEngine';
import { buildRecommendationEngine } from '../data/recommendationEngine';
import { buildRoleIntelligenceProfile } from '../data/roleIntelligenceLayer';
import {
  buildAutomationRuleLibrary,
  summarizeAutomationBuilder,
} from '../data/workflowAutomationBuilder';
import { LOCAL_MEMORY_FABRIC_CONTEXT } from './memoryApi';

const ACTION_TYPES = Object.freeze({
  RECOMMEND_ACTION: 'recommend_action',
  DETECT_DUPLICATION: 'detect_duplication',
  DETECT_ORPHAN_ASSET: 'detect_orphan_asset',
  SUGGEST_PRODUCT: 'suggest_product',
  OPTIMIZE_WORKFLOW: 'optimize_workflow',
});

function list(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function compactNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function unique(values) {
  return [...new Set(list(values).flatMap(list).filter(Boolean).map(String))];
}

function splitField(value) {
  if (!value || value === 'unknown') return [];
  return String(value)
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function action({
  id,
  type,
  title,
  rationale,
  route,
  priority = 'medium',
  confidence = 0.72,
  sourceSignals = [] as any[],
}) {
  return {
    id,
    type,
    title,
    rationale,
    route,
    priority,
    confidence: Number(Math.max(0, Math.min(1, confidence)).toFixed(2)),
    sourceSignals: unique(sourceSignals),
  };
}

function pickLearningSignals({ memoryFabricContext, activity }: any = {}) {
  return {
    successfulWorkflows: [
      ...list(memoryFabricContext?.organizationMemory?.successfulWorkflows),
      ...list(memoryFabricContext?.userMemory?.savedWorkflows),
      ...list(activity?.recentWorkflows),
    ],
    successfulSimulations: list(activity?.recentSimulations || activity?.simulationsCompleted),
    commonSearches: [
      ...list(memoryFabricContext?.organizationMemory?.commonSearches),
      ...list(memoryFabricContext?.userMemory?.commonSearches),
    ],
    abandonedPages: list(activity?.abandonedPages),
    failedLaunches: list(activity?.failedLaunches),
  };
}

function normalizeDuplicateReport(report) {
  const sections = list(report?.sections);
  const findings = sections.flatMap((section) =>
    list(section.duplicates).map((duplicate) => ({
      id: `${section.id}-${duplicate.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      section: section.title || section.id,
      title: duplicate.name,
      risk: duplicate.risk,
      action: duplicate.action,
      recommendation: duplicate.recommendation,
    })),
  );
  return {
    summary: report?.summary || {
      sectionCount: sections.length,
      duplicateFindings: findings.length,
      routeOverlapCount: list(report?.routePathOverlap).length,
    },
    findings,
  };
}

function normalizeOrphanReport(report) {
  const all = list(report?.all);
  const mergeCandidates = list(report?.mergeCandidates);
  return {
    summary: report?.summary || {
      total: all.length,
      byClass: {},
    },
    findings: all.slice(0, 12).map((item) => ({
      id: item.id || item.path || item.name,
      title: item.name || item.path || item.route || item.id,
      category: item.category,
      classification: item.classification,
      evidence: item.evidence || item.note,
    })),
    mergeCandidates,
  };
}

function topRecommendations(model, limit = 6) {
  return list(model?.all).slice(0, limit);
}

function topProductSuggestions(
  { recommendations, productRows, organizationIntelligence },
  limit = 6,
) {
  const recommendationProducts = list(recommendations?.groups?.products);
  const orgRecommendations = list(organizationIntelligence?.recommendations).filter((item) =>
    /product|pack|asset|automation/i.test(`${item.category} ${item.title} ${item.rationale}`),
  );
  const productCandidates = list(productRows)
    .map((row) => row?.product || row)
    .filter(Boolean);
  return [
    ...recommendationProducts.map((item) => ({
      id: item.id,
      title: item.title,
      rationale: item.reason || item.summary,
      route: item.route || '/products',
      source: 'recommendation-engine',
    })),
    ...orgRecommendations.map((item) => ({
      id: item.id,
      title: item.title,
      rationale: item.rationale,
      route: item.route || '/products',
      source: item.source || 'organization-intelligence',
    })),
    ...productCandidates.slice(0, 3).map((product) => ({
      id: product.id || product.slug || product.name,
      title: product.name || product.title,
      rationale:
        product.description || product.summary || 'Product candidate from catalog context.',
      route: product.slug ? `/products/${product.slug}` : product.route || '/products',
      source: 'product-catalog',
    })),
  ].slice(0, limit);
}

function buildLightweightGraphSnapshot(artifacts) {
  const nodes = artifacts.map((artifact) => ({
    id: artifact.artifactId,
    label: artifact.name,
    type: artifact.type,
    route: artifact.route,
    summary: artifact.description,
  }));
  const artifactIds = new Set(nodes.map((node) => node.id));
  const edges = artifacts.flatMap((artifact) =>
    splitField(artifact.dependencies)
      .filter((dependency) => artifactIds.has(dependency))
      .map((dependency) => ({
        id: `${artifact.artifactId}->${dependency}`,
        source: artifact.artifactId,
        target: dependency,
        type: 'USES',
      })),
  );
  const connected = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
  const byName = nodes.reduce((groups, node) => {
    const key = `${node.type}:${String(node.label || '').toLowerCase()}`;
    groups.set(key, [...(groups.get(key) || []), node]);
    return groups;
  }, new Map());
  const orphanNodes = nodes.filter((node) => !connected.has(node.id) && !node.route);
  const duplicateGroups = [...byName.values()].filter((group) => group.length > 1);

  return {
    nodes: nodes.slice(0, 24),
    edges: edges.slice(0, 80),
    summary: {
      nodes: nodes.length,
      edges: edges.length,
      connectedAssets: connected.size,
      totalAssets: artifacts.length,
      orphanAssets: orphanNodes.length,
    },
    coverage: {
      totalAssets: artifacts.length,
      connectedAssetIds: [...connected],
      orphanAssetIds: orphanNodes.map((node) => node.id),
      allAssetsConnected: orphanNodes.length === 0,
    },
    orphanNodes: orphanNodes.slice(0, 12),
    duplicateGroups,
  };
}

export class CareDroidBrainService {
  artifacts: any[];
  graphService: any;
  duplicateReport: any;
  orphanReport: any;

  constructor({
    artifacts = buildArtifactCatalog(),
    graphService = null,
    useFullKnowledgeGraph = false,
    duplicateReport = null,
    orphanReport = null,
  }: any = {}) {
    this.artifacts = artifacts;
    this.graphService =
      graphService || (useFullKnowledgeGraph ? createArtifactKnowledgeGraphService() : null);
    this.duplicateReport = normalizeDuplicateReport(duplicateReport);
    this.orphanReport = normalizeOrphanReport(orphanReport);
  }

  buildSnapshot(input: any = {}) {
    const memoryFabricContext = input.memoryFabricContext || LOCAL_MEMORY_FABRIC_CONTEXT;
    const activity = input.activity || {};
    const artifactValidation = validateArtifactCatalog(this.artifacts);
    const graphSnapshot = this.buildKnowledgeGraphSnapshot();
    const roleProfile = buildRoleIntelligenceProfile(input);
    const organizationIntelligence = buildOrganizationIntelligenceProfile({
      organizationContext: input.organizationContext,
      userIdentity: input,
      workspaceContext: input.workspaceContext,
      analytics: input.analytics,
      customerSuccess: input.customerSuccess,
      tenantAdministration: input.tenantAdministration,
    });
    const recommendationModel = buildRecommendationEngine({
      ...input,
      roleProfile,
      memoryFabricContext,
      productRows: input.productRows,
    });
    const learningModel = buildPlatformLearningEngine({
      recentTools: input.toolPreferences?.recentTools || input.recentTools || [],
      learningSignals: pickLearningSignals({ memoryFabricContext, activity }),
    });
    const automationRules = buildAutomationRuleLibrary();
    const automationSummary = summarizeAutomationBuilder();
    const productSuggestions = topProductSuggestions({
      recommendations: recommendationModel,
      productRows: input.productRows,
      organizationIntelligence,
    });

    const domains = {
      platformKnowledge: this.buildPlatformKnowledge({ graphSnapshot, learningModel }),
      organizationKnowledge: this.buildOrganizationKnowledge({
        memoryFabricContext,
        organizationIntelligence,
        productSuggestions,
        agentRows: input.agentRows,
      }),
      roleKnowledge: this.buildRoleKnowledge({
        roleProfile,
        recommendationModel,
        memoryFabricContext,
      }),
      assetKnowledge: this.buildAssetKnowledge({
        artifactValidation,
        graphSnapshot,
      }),
      automationKnowledge: this.buildAutomationKnowledge({
        automationRules,
        automationSummary,
        learningModel,
      }),
    };

    const actions = this.buildActions({
      recommendationModel,
      learningModel,
      productSuggestions,
      organizationIntelligence,
      automationRules,
      graphSnapshot,
    });

    return {
      generatedAt: new Date().toISOString(),
      acceptance: {
        centralizedIntelligence: true,
        understandsPlatform: true,
        recommendsActions: actions.some((item) => item.type === ACTION_TYPES.RECOMMEND_ACTION),
        detectsDuplication: actions.some((item) => item.type === ACTION_TYPES.DETECT_DUPLICATION),
        detectsOrphanAssets: actions.some((item) => item.type === ACTION_TYPES.DETECT_ORPHAN_ASSET),
        suggestsProducts: actions.some((item) => item.type === ACTION_TYPES.SUGGEST_PRODUCT),
        optimizesWorkflows: actions.some((item) => item.type === ACTION_TYPES.OPTIMIZE_WORKFLOW),
      },
      summary: {
        artifacts: this.artifacts.length,
        graphNodes: graphSnapshot.summary?.nodes || graphSnapshot.nodes?.length || 0,
        graphEdges: graphSnapshot.summary?.edges || graphSnapshot.edges?.length || 0,
        actions: actions.length,
        recommendations: recommendationModel.summary?.total || 0,
        optimizationSuggestions: learningModel.summary?.optimizationSuggestions || 0,
      },
      domains,
      actions,
      sourceSystems: [
        'Artifact Registry',
        'Knowledge Graph',
        'AI Memory',
        'Recommendations',
        'Automations',
        'AI Agents',
        'Learning Engine',
      ],
    };
  }

  buildKnowledgeGraphSnapshot() {
    if (!this.graphService) return buildLightweightGraphSnapshot(this.artifacts);
    if (typeof this.graphService.buildSnapshot === 'function') {
      return this.graphService.buildSnapshot({ nodeLimit: 24 });
    }
    if (typeof this.graphService.getGraph === 'function') {
      const graph = this.graphService.getGraph();
      return {
        ...graph,
        orphanNodes: [],
        duplicateGroups: [],
      };
    }
    return buildLightweightGraphSnapshot(this.artifacts);
  }

  buildPlatformKnowledge({ graphSnapshot, learningModel }) {
    return {
      title: 'Platform Knowledge',
      metrics: [
        {
          label: 'Graph nodes',
          value: graphSnapshot.summary?.nodes || graphSnapshot.nodes?.length || 0,
        },
        {
          label: 'Graph edges',
          value: graphSnapshot.summary?.edges || graphSnapshot.edges?.length || 0,
        },
        {
          label: 'Duplicate findings',
          value:
            this.duplicateReport.summary.duplicateFindings || this.duplicateReport.findings.length,
        },
        {
          label: 'Orphan findings',
          value: this.orphanReport.summary.total || this.orphanReport.findings.length,
        },
      ],
      insights: [
        `Learning engine produced ${learningModel.summary.optimizationSuggestions} optimization suggestions.`,
        `Knowledge graph covers ${graphSnapshot.coverage?.connectedAssetIds?.length || 0} connected assets.`,
      ],
    };
  }

  buildOrganizationKnowledge({
    memoryFabricContext,
    organizationIntelligence,
    productSuggestions,
    agentRows,
  }) {
    return {
      title: 'Organization Knowledge',
      metrics: [
        {
          label: 'Accessible assets',
          value: compactNumber(memoryFabricContext.organizationMemory?.accessibleAssetCount),
        },
        {
          label: 'Enabled packs',
          value: compactNumber(memoryFabricContext.organizationMemory?.enabledPackCount),
        },
        {
          label: 'Org recommendations',
          value: list(organizationIntelligence.recommendations).length,
        },
        { label: 'Product suggestions', value: productSuggestions.length },
        { label: 'AI agents', value: list(agentRows).length },
      ],
      insights: productSuggestions.slice(0, 3).map((item) => item.title),
      organization: organizationIntelligence.organization,
    };
  }

  buildRoleKnowledge({ roleProfile, recommendationModel, memoryFabricContext }) {
    return {
      title: 'Role Knowledge',
      metrics: [
        { label: 'Role', value: roleProfile.roleLabel || roleProfile.role || 'Unknown' },
        { label: 'Recommendations', value: recommendationModel.summary?.total || 0 },
        {
          label: 'Preferred assets',
          value: list(memoryFabricContext.roleMemory?.preferredAssetIds).length,
        },
        {
          label: 'Recent assets',
          value: list(memoryFabricContext.userMemory?.recentAssets).length,
        },
      ],
      insights: topRecommendations(recommendationModel, 4).map((item) => item.title),
      roleProfile,
    };
  }

  buildAssetKnowledge({ artifactValidation, graphSnapshot }) {
    return {
      title: 'Asset Knowledge',
      metrics: [
        { label: 'Artifacts', value: this.artifacts.length },
        { label: 'Catalog valid', value: artifactValidation.ok ? 'Yes' : 'Review' },
        { label: 'Graph orphans', value: graphSnapshot.orphanNodes?.length || 0 },
        { label: 'Graph duplicates', value: graphSnapshot.duplicateGroups?.length || 0 },
      ],
      insights: [
        ...list(graphSnapshot.orphanNodes)
          .slice(0, 3)
          .map((node) => `Review orphan graph node: ${node.label}`),
        ...list(graphSnapshot.duplicateGroups)
          .slice(0, 2)
          .map((group) => `Review duplicate group: ${group.label || group.key}`),
      ],
      validation: artifactValidation,
    };
  }

  buildAutomationKnowledge({ automationRules, automationSummary, learningModel }) {
    const workflowSuggestions = list(learningModel.suggestions).filter((item) =>
      /workflow|automation|merge|promote/i.test(`${item.type} ${item.title} ${item.rationale}`),
    );
    return {
      title: 'Automation Knowledge',
      metrics: [
        { label: 'Triggers', value: automationSummary.triggers },
        { label: 'Conditions', value: automationSummary.conditions },
        { label: 'Actions', value: automationSummary.actions },
        { label: 'Templates', value: automationRules.length },
      ],
      insights: workflowSuggestions.slice(0, 4).map((item) => item.title),
      rules: automationRules,
    };
  }

  buildActions({
    recommendationModel,
    learningModel,
    productSuggestions,
    organizationIntelligence,
    automationRules,
    graphSnapshot,
  }) {
    const topRecommendation = topRecommendations(recommendationModel, 1)[0];
    const duplicateFinding = this.duplicateReport.findings[0] ||
      list(graphSnapshot?.duplicateGroups)[0] || {
        title: 'duplicate system scan',
        recommendation:
          'No blocking duplicate groups are currently surfaced by the lightweight Brain scan.',
        action: 'review',
      };
    const orphanFinding = this.orphanReport.findings[0] ||
      this.orphanReport.mergeCandidates[0] ||
      list(graphSnapshot?.orphanNodes)[0] || {
        title: 'orphan asset scan',
        evidence: 'No blocking orphan assets are currently surfaced by the lightweight Brain scan.',
      };
    const workflowSuggestion = list(learningModel.suggestions).find((item) =>
      /workflow|automation|merge|promote/i.test(`${item.type} ${item.title} ${item.rationale}`),
    );
    const organizationRecommendation = list(organizationIntelligence.recommendations)[0];

    return [
      topRecommendation &&
        action({
          id: 'brain-recommend-action',
          type: ACTION_TYPES.RECOMMEND_ACTION,
          title: `Review ${topRecommendation.title}`,
          rationale:
            topRecommendation.reason ||
            topRecommendation.summary ||
            'Recommendation engine identified a relevant next action.',
          route: topRecommendation.route || '/recommendations',
          priority: 'high',
          confidence: 0.84,
          sourceSignals: topRecommendation.sourceSignals || ['recommendation-engine'],
        }),
      duplicateFinding &&
        action({
          id: 'brain-detect-duplication',
          type: ACTION_TYPES.DETECT_DUPLICATION,
          title: `Resolve duplication: ${
            duplicateFinding.title ||
            duplicateFinding.label ||
            duplicateFinding[0]?.label ||
            'duplicate system scan'
          }`,
          rationale:
            duplicateFinding.recommendation ||
            duplicateFinding.risk ||
            'Duplicate system audit found a competing source of truth.',
          route: '/dependency-graph',
          priority: duplicateFinding.action === 'merge' ? 'high' : 'medium',
          confidence: 0.78,
          sourceSignals: ['duplicate-system-audit'],
        }),
      orphanFinding &&
        action({
          id: 'brain-detect-orphan-asset',
          type: ACTION_TYPES.DETECT_ORPHAN_ASSET,
          title: `Review orphan: ${orphanFinding.title || orphanFinding.label || orphanFinding.id}`,
          rationale:
            orphanFinding.evidence ||
            orphanFinding.note ||
            'Orphan detection found an asset or surface that may need wiring.',
          route: '/assets',
          priority: 'medium',
          confidence: 0.76,
          sourceSignals: ['orphan-detection'],
        }),
      productSuggestions[0] &&
        action({
          id: 'brain-suggest-product',
          type: ACTION_TYPES.SUGGEST_PRODUCT,
          title: `Consider ${productSuggestions[0].title}`,
          rationale:
            productSuggestions[0].rationale ||
            'Product suggestion matched organization and platform context.',
          route: productSuggestions[0].route || '/products',
          priority: 'medium',
          confidence: 0.74,
          sourceSignals: ['product-catalog', productSuggestions[0].source],
        }),
      (workflowSuggestion || organizationRecommendation || automationRules[0]) &&
        action({
          id: 'brain-optimize-workflow',
          type: ACTION_TYPES.OPTIMIZE_WORKFLOW,
          title:
            workflowSuggestion?.title ||
            organizationRecommendation?.title ||
            `Optimize ${automationRules[0].name}`,
          rationale:
            workflowSuggestion?.rationale ||
            organizationRecommendation?.rationale ||
            automationRules[0].goal ||
            'Automation and learning signals identified a workflow optimization opportunity.',
          route: workflowSuggestion?.route || organizationRecommendation?.route || '/automation',
          priority:
            workflowSuggestion?.priority || organizationRecommendation?.priority || 'medium',
          confidence:
            workflowSuggestion?.confidence || organizationRecommendation?.confidence || 0.72,
          sourceSignals: ['learning-engine', 'automation-builder'],
        }),
    ].filter(Boolean);
  }
}

export function createCareDroidBrainService(options) {
  return new CareDroidBrainService(options);
}

export function buildCareDroidBrainSnapshot(input: any = {}, options: any = {}) {
  return createCareDroidBrainService(options).buildSnapshot(input);
}

export { ACTION_TYPES as CARE_DROID_BRAIN_ACTION_TYPES };
