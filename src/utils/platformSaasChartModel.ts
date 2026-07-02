import {
  buildFeatureFlagStateMap,
  FEATURE_FLAG_CATEGORIES,
  FEATURE_FLAG_REGISTRY,
  FEATURE_FLAG_STATE_LABELS,
  FEATURE_FLAG_STATES,
  summarizeFeatureFlags,
} from '../config/featureFlags.config';
import { buildArtifactCatalog } from '../data/artifactIntelligence';
import { buildLocalAssetDependencyGraph } from '../data/assetDependencyGraph';
import { buildCareDroidBusinessBrain } from '../data/caredroidBusinessBrain';
import { buildCapabilityDiscovery } from '../data/capabilityDiscoveryEngine';
import { buildDataLineageExplorer, DATA_LINEAGE_STAGES } from '../data/dataLineageExplorer';
import { COMMAND_CENTER_WORKFLOW_ACTIONS } from '../config/operationalWorkflow.config';
import { buildCustomerExpansionOpportunities } from '../data/customerExpansionEngine';
import { buildHealthcareKnowledgeHub } from '../data/healthcareKnowledgeHub';
import { buildHospitalReadinessAssessment } from '../data/hospitalReadinessAssessment';
import { buildProductIntelligenceLayer } from '../data/productIntelligenceLayer';
import { buildWorkspaceDependencyGraph, WORKSPACE_DEPENDENCY_TYPES } from '../data/crossWorkspaceIntelligence';
import { buildDepartmentPerformanceIntelligence } from '../data/departmentPerformanceIntelligence';
import { buildDependencyMap, DEPENDENCY_ISSUE_TYPES } from '../data/dependencyMap';
import { buildPlatformSelfDiagnostics, SELF_DIAGNOSTIC_STATUS } from '../data/platformSelfDiagnostics';
import { buildWorkflowMiningReport } from '../data/workflowMiningEngine';
import { buildPlatformAnalytics, PLATFORM_ANALYTICS_DECISIONS } from '../data/platformAnalytics';
import { buildPluginMarketplace } from '../data/pluginMarketplace';
import { getUserFacingToolRegistryProjection } from '../data/toolInventory';

export type PlatformChartDatum = Readonly<{ name: string; value: number }>;

type PlatformAnalyticsSnapshot = ReturnType<typeof buildPlatformAnalytics>;
type CapabilityDiscoverySnapshot = ReturnType<typeof buildCapabilityDiscovery>;
type PluginMarketplaceSnapshot = ReturnType<typeof buildPluginMarketplace>;

export type GovernanceRegistrySnapshot = {
  generatedAt: string;
  summary: {
    totalAssets: number;
    complete: number;
    incomplete: number;
    auditRequired: number;
    humanReviewRequired: number;
    byRiskLevel: Record<string, number>;
  };
  requiredFields: string[];
  rows: Array<{
    assetId: string;
    title: string;
    route?: string;
    owner: string;
    steward: string;
    approver: string;
    riskLevel: string;
    evidenceSource: string;
    version: string;
    auditRequirement: string;
    reviewSchedule: string;
    completeness?: string;
    requiresHumanReview?: boolean;
  }>;
};

const DEMO_GOVERNANCE_STEWARDS = Object.freeze({
  owner: 'Clinical Operations Lead',
  steward: 'Platform Steward',
  approver: 'Clinical Governance Lead',
});

function formatEventTypeLabel(eventType: string): string {
  return eventType.replace(/_/g, ' ');
}

function formatDecisionLabel(decision: string): string {
  return decision.replace(/_/g, ' ');
}

export function buildPlatformAdoptionTrendChart(
  analytics: PlatformAnalyticsSnapshot = buildPlatformAnalytics(),
): PlatformChartDatum[] {
  return analytics.adoptionTrend.map((point) => ({
    name: point.day,
    value: point.count,
  }));
}

export function buildPlatformEventTypeChart(
  analytics: PlatformAnalyticsSnapshot = buildPlatformAnalytics(),
): PlatformChartDatum[] {
  return analytics.featureEngagement
    .filter((row) => row.count > 0)
    .map((row) => ({
      name: formatEventTypeLabel(row.eventType),
      value: row.count,
    }));
}

export function buildPlatformDecisionChart(
  analytics: PlatformAnalyticsSnapshot = buildPlatformAnalytics(),
): PlatformChartDatum[] {
  const counts = analytics.decisions.reduce<Record<string, number>>((acc, row) => {
    acc[row.decision] = (acc[row.decision] || 0) + 1;
    return acc;
  }, {});
  return Object.values(PLATFORM_ANALYTICS_DECISIONS).map((decision) => ({
    name: formatDecisionLabel(decision),
    value: counts[decision] || 0,
  }));
}

export function buildDiscoverySectionChart(
  discovery: CapabilityDiscoverySnapshot = buildCapabilityDiscovery(),
): PlatformChartDatum[] {
  return discovery.sections.map((section) => ({
    name: section.title,
    value: section.items.length,
  }));
}

export function buildPluginTypeChart(
  marketplace: PluginMarketplaceSnapshot = buildPluginMarketplace(),
): PlatformChartDatum[] {
  return marketplace.summary.types
    .filter((row) => row.count > 0)
    .map((row) => ({
      name: row.label,
      value: row.count,
    }));
}

export function buildGovernanceRiskChart(
  registry: GovernanceRegistrySnapshot,
): PlatformChartDatum[] {
  return Object.entries(registry.summary.byRiskLevel).map(([name, value]) => ({
    name: name.replace(/-/g, ' '),
    value,
  }));
}

export function buildLocalGovernanceRegistryFallback(
  inventory = getUserFacingToolRegistryProjection().slice(0, 12),
): GovernanceRegistrySnapshot {
  const rows = inventory.map((tool, index) => {
    const riskLevel =
      tool.riskLevel ||
      (tool.category === 'Calculator' ? 'clinical-decision-support' : 'operational');
    const requiresHumanReview = riskLevel.includes('clinical') || riskLevel.includes('high');
    return {
      assetId: tool.id,
      title: tool.name || tool.id,
      route: tool.path || tool.route || '/tools',
      owner: DEMO_GOVERNANCE_STEWARDS.owner,
      steward: DEMO_GOVERNANCE_STEWARDS.steward,
      approver: DEMO_GOVERNANCE_STEWARDS.approver,
      riskLevel,
      evidenceSource: 'validated protocol library',
      version: `1.${index % 3}.0`,
      auditRequirement: requiresHumanReview ? 'required' : 'standard',
      reviewSchedule: requiresHumanReview ? 'quarterly' : 'annual',
      completeness: 'complete',
      requiresHumanReview,
    };
  });

  const byRiskLevel = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.riskLevel] = (acc[row.riskLevel] || 0) + 1;
    return acc;
  }, {});

  return {
    generatedAt: new Date(0).toISOString(),
    summary: {
      totalAssets: rows.length,
      complete: rows.length,
      incomplete: 0,
      auditRequired: rows.filter((row) => row.auditRequirement === 'required').length,
      humanReviewRequired: rows.filter((row) => row.requiresHumanReview).length,
      byRiskLevel,
    },
    requiredFields: [
      'owner',
      'steward',
      'approver',
      'riskLevel',
      'evidenceSource',
      'version',
      'auditRequirement',
      'reviewSchedule',
    ],
    rows,
  };
}

export function decisionTone(
  decision: string,
): 'good' | 'warning' | 'critical' | 'neutral' {
  if (decision === PLATFORM_ANALYTICS_DECISIONS.PROMOTE) return 'good';
  if (decision === PLATFORM_ANALYTICS_DECISIONS.HIDE) return 'critical';
  if (
    decision === PLATFORM_ANALYTICS_DECISIONS.IMPROVE ||
    decision === PLATFORM_ANALYTICS_DECISIONS.MERGE
  ) {
    return 'warning';
  }
  return 'neutral';
}

export function governanceRiskTone(riskLevel: string): 'good' | 'warning' | 'critical' | 'neutral' {
  const normalized = riskLevel.toLowerCase();
  if (normalized.includes('high') || normalized.includes('clinical-decision')) return 'warning';
  if (normalized.includes('governance')) return 'critical';
  return 'neutral';
}

type DependencyMapSnapshot = ReturnType<typeof buildDependencyMap>;

export function buildDependencyIssueChart(
  issueCounts: DependencyMapSnapshot['issueCounts'] = buildDependencyMap().issueCounts,
): PlatformChartDatum[] {
  return Object.values(DEPENDENCY_ISSUE_TYPES).map((type) => ({
    name: type.replace(/-/g, ' '),
    value: issueCounts[type] || 0,
  }));
}

export function buildDependencyExecutorChart(
  dependencies: DependencyMapSnapshot['dependencies'] = buildDependencyMap().dependencies,
): PlatformChartDatum[] {
  const counts = dependencies.reduce<Record<string, number>>((acc, row) => {
    const key = !row.executor || row.executor === 'n/a' || row.executor === '\uFFFD' ? 'unassigned' : row.executor;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));
}

export function buildFeatureFlagCategoryChart(
  categoryCounts: Record<string, number> = summarizeFeatureFlags().categoryCounts,
): PlatformChartDatum[] {
  return Object.values(FEATURE_FLAG_CATEGORIES).map((category) => ({
    name: category,
    value: categoryCounts[category] || 0,
  }));
}

export function buildFeatureFlagStateChart(
  stateCounts: Record<string, number> = summarizeFeatureFlags().stateCounts,
): PlatformChartDatum[] {
  return Object.values(FEATURE_FLAG_STATES).map((state) => ({
    name: FEATURE_FLAG_STATE_LABELS[state] || state,
    value: stateCounts[state] || 0,
  }));
}

export const FEATURE_FLAG_CENTER_STORAGE_KEY = 'caredroid.featureFlagCenter.v1';

export function loadFeatureFlagCenterOverrides(): Record<string, string> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FEATURE_FLAG_CENTER_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveFeatureFlagCenterOverrides(overrides: Record<string, string>) {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(FEATURE_FLAG_CENTER_STORAGE_KEY, JSON.stringify(overrides));
  }
  return overrides;
}

export function buildFeatureFlagCenterView(overrides: Record<string, string> = loadFeatureFlagCenterOverrides()) {
  const stateMap = buildFeatureFlagStateMap(overrides);
  const flags = FEATURE_FLAG_REGISTRY.map((flag) => ({
    ...flag,
    state: stateMap[flag.id],
  }));
  return {
    flags,
    summary: summarizeFeatureFlags(stateMap),
    categories: Object.values(FEATURE_FLAG_CATEGORIES).map((category) => ({
      category,
      flags: flags.filter((flag) => flag.category === category),
    })),
  };
}

export function cycleFeatureFlagState(current: string): string {
  const order = [
    FEATURE_FLAG_STATES.ENABLED,
    FEATURE_FLAG_STATES.BETA,
    FEATURE_FLAG_STATES.EXPERIMENTAL,
    FEATURE_FLAG_STATES.ADMIN_ONLY,
    FEATURE_FLAG_STATES.SUBSCRIPTION_REQUIRED,
    FEATURE_FLAG_STATES.DISABLED,
    FEATURE_FLAG_STATES.LOCKED,
  ];
  const index = order.indexOf(current as (typeof order)[number]);
  return order[(index + 1) % order.length];
}

export function featureFlagStateTone(state: string): 'good' | 'warning' | 'critical' | 'neutral' {
  if (state === FEATURE_FLAG_STATES.ENABLED) return 'good';
  if (state === FEATURE_FLAG_STATES.BETA || state === FEATURE_FLAG_STATES.EXPERIMENTAL) return 'warning';
  if (state === FEATURE_FLAG_STATES.DISABLED || state === FEATURE_FLAG_STATES.LOCKED) return 'critical';
  return 'neutral';
}

export function dependencyIssueTone(severity: string): 'good' | 'warning' | 'critical' | 'neutral' {
  if (severity === 'high') return 'critical';
  if (severity === 'medium') return 'warning';
  return 'neutral';
}

export type AssetDependencyGraphSnapshot = ReturnType<typeof buildLocalAssetDependencyGraph>;

export function buildAssetGraphIssueChart(
  issueCounts: AssetDependencyGraphSnapshot['issueCounts'] = buildLocalAssetDependencyGraph().issueCounts,
): PlatformChartDatum[] {
  return Object.entries(issueCounts).map(([name, value]) => ({
    name: name.replace(/-/g, ' '),
    value,
  }));
}

export function buildAssetGraphProductChart(
  chains: AssetDependencyGraphSnapshot['chains'] = buildLocalAssetDependencyGraph().chains,
): PlatformChartDatum[] {
  const counts = chains.reduce<Record<string, number>>((acc, chain) => {
    const key = chain.product.name;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));
}

type DataLineageSnapshot = ReturnType<typeof buildDataLineageExplorer>;

export function buildLineageCategoryChart(
  flows: DataLineageSnapshot['flows'] = buildDataLineageExplorer().flows,
): PlatformChartDatum[] {
  const counts = flows.reduce<Record<string, number>>((acc, flow) => {
    acc[flow.category] = (acc[flow.category] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

type SelfDiagnosticsSnapshot = ReturnType<typeof buildPlatformSelfDiagnostics>;
type DepartmentIntelligenceSnapshot = ReturnType<typeof buildDepartmentPerformanceIntelligence>;

export function buildDiagnosticsCategoryChart(
  categories: SelfDiagnosticsSnapshot['summary']['categories'] = buildPlatformSelfDiagnostics().summary.categories,
): PlatformChartDatum[] {
  return categories.map((row) => ({
    name: row.category.replace(/-/g, ' '),
    value: row.total,
  }));
}

export function buildDiagnosticsStatusChart(
  summary: SelfDiagnosticsSnapshot['summary'] = buildPlatformSelfDiagnostics().summary,
): PlatformChartDatum[] {
  return [
    { name: 'healthy', value: summary.healthy },
    { name: 'warning', value: summary.warning },
    { name: 'critical', value: summary.critical },
  ].filter((row) => row.value > 0);
}

export function buildDepartmentHealthChart(
  departments: DepartmentIntelligenceSnapshot['departments'] = buildDepartmentPerformanceIntelligence().departments,
): PlatformChartDatum[] {
  return departments.map((department) => ({
    name: department.name,
    value: department.healthScore,
  }));
}

export function buildDepartmentOutcomeSourceChart(
  departments: DepartmentIntelligenceSnapshot['departments'] = buildDepartmentPerformanceIntelligence().departments,
): PlatformChartDatum[] {
  const counts = departments
    .flatMap((department) => department.metrics)
    .reduce<Record<string, number>>((acc, metric) => {
      const key = metric.source || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  return Object.entries(counts).map(([name, value]) => ({
    name: name.replace(/-/g, ' '),
    value,
  }));
}

export function diagnosticStatusTone(status: string): 'good' | 'warning' | 'critical' | 'neutral' {
  if (status === SELF_DIAGNOSTIC_STATUS.HEALTHY) return 'good';
  if (status === SELF_DIAGNOSTIC_STATUS.WARNING) return 'warning';
  if (status === SELF_DIAGNOSTIC_STATUS.CRITICAL) return 'critical';
  return 'neutral';
}

export function departmentHealthTone(bandId: string): 'good' | 'warning' | 'critical' | 'neutral' {
  if (bandId === 'strong' || bandId === 'stable') return 'good';
  if (bandId === 'watch') return 'warning';
  if (bandId === 'attention') return 'critical';
  return 'neutral';
}

type WorkspaceGraphSnapshot = ReturnType<typeof buildWorkspaceDependencyGraph>;
type WorkflowMiningSnapshot = ReturnType<typeof buildWorkflowMiningReport>;

export function buildWorkspaceDependencyTypeChart(
  edges: WorkspaceGraphSnapshot['edges'] = buildWorkspaceDependencyGraph().edges,
): PlatformChartDatum[] {
  const counts = edges.reduce<Record<string, number>>((acc, edge) => {
    acc[edge.type] = (acc[edge.type] || 0) + 1;
    return acc;
  }, {});
  return Object.values(WORKSPACE_DEPENDENCY_TYPES).map((type) => ({
    name: type.replace(/-/g, ' '),
    value: counts[type] || 0,
  }));
}

export function buildWorkspaceDependencyStrengthChart(
  edges: WorkspaceGraphSnapshot['edges'] = buildWorkspaceDependencyGraph().edges,
): PlatformChartDatum[] {
  return edges.map((edge) => ({
    name: `${edge.sourceLabel} → ${edge.targetLabel}`,
    value: edge.strength,
  }));
}

export function buildWorkflowSignalChart(
  signalCounts: WorkflowMiningSnapshot['signalCounts'] = buildWorkflowMiningReport().signalCounts,
): PlatformChartDatum[] {
  return Object.entries(signalCounts).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));
}

export function buildWorkflowJourneyChart(
  journeys: WorkflowMiningSnapshot['mostCommonUserJourneys'] = buildWorkflowMiningReport().mostCommonUserJourneys,
): PlatformChartDatum[] {
  return journeys.map((journey) => ({
    name: journey.title,
    value: journey.frequency,
  }));
}

export function workspaceDependencyStrengthTone(strength: number): 'good' | 'warning' | 'critical' | 'neutral' {
  if (strength >= 90) return 'good';
  if (strength >= 80) return 'warning';
  return 'neutral';
}

type ProductIntelligenceSnapshot = ReturnType<typeof buildProductIntelligenceLayer>;
type ExpansionSnapshot = ReturnType<typeof buildCustomerExpansionOpportunities>;
type ReadinessSnapshot = ReturnType<typeof buildHospitalReadinessAssessment>;
type KnowledgeHubSnapshot = ReturnType<typeof buildHealthcareKnowledgeHub>;

export function buildProductHealthChart(
  products: ProductIntelligenceSnapshot['products'] = buildProductIntelligenceLayer().products,
): PlatformChartDatum[] {
  return products.map((product) => ({
    name: product.name,
    value: product.health.score,
  }));
}

export function buildProductAdoptionChart(
  products: ProductIntelligenceSnapshot['products'] = buildProductIntelligenceLayer().products,
): PlatformChartDatum[] {
  return products.map((product) => ({
    name: product.name,
    value: product.adoption.score,
  }));
}

export function buildExpansionScoreChart(
  segments: ExpansionSnapshot['segments'] = buildCustomerExpansionOpportunities().segments,
): PlatformChartDatum[] {
  return segments.flatMap((segment) =>
    segment.opportunities.map((opportunity) => ({
      name: opportunity.recommendedPack,
      value: opportunity.score,
    })),
  );
}

export function buildReadinessDimensionChart(
  dimensions: ReadinessSnapshot['dimensions'] = buildHospitalReadinessAssessment().dimensions,
): PlatformChartDatum[] {
  return dimensions.map((dimension) => ({
    name: dimension.label,
    value: dimension.score,
  }));
}

export function buildKnowledgeHubTypeChart(
  typeCounts: KnowledgeHubSnapshot['typeCounts'] = buildHealthcareKnowledgeHub().typeCounts,
): PlatformChartDatum[] {
  return Object.entries(typeCounts).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));
}

export function buildWorkflowPriorityChart(): PlatformChartDatum[] {
  return COMMAND_CENTER_WORKFLOW_ACTIONS.map((action) => ({
    name: action.label,
    value: action.priority,
  }));
}

export function expansionBandTone(bandId: string): 'good' | 'warning' | 'critical' | 'neutral' {
  if (bandId === 'high-confidence') return 'good';
  if (bandId === 'qualified') return 'warning';
  if (bandId === 'nurture') return 'neutral';
  return 'neutral';
}

export function productHealthTone(bandId: string): 'good' | 'warning' | 'critical' | 'neutral' {
  if (bandId === 'excellent' || bandId === 'healthy') return 'good';
  if (bandId === 'watch') return 'warning';
  if (bandId === 'at_risk') return 'critical';
  return 'neutral';
}

export function readinessBandTone(bandId: string): 'good' | 'warning' | 'critical' | 'neutral' {
  if (bandId === 'advanced' || bandId === 'ready') return 'good';
  if (bandId === 'developing') return 'warning';
  return 'neutral';
}

export function expansionScoreTone(score: number): 'good' | 'warning' | 'critical' | 'neutral' {
  if (score >= 85) return 'good';
  if (score >= 70) return 'warning';
  return 'neutral';
}

export function readinessScoreTone(score: number): 'good' | 'warning' | 'critical' | 'neutral' {
  if (score >= 85) return 'good';
  if (score >= 70) return 'warning';
  if (score >= 50) return 'neutral';
  return 'critical';
}

type BusinessBrainSnapshot = ReturnType<typeof buildCareDroidBusinessBrain>;
type ArtifactCatalog = ReturnType<typeof buildArtifactCatalog>;

export function buildBusinessBrainDomainChart(
  analytics: BusinessBrainSnapshot['analytics'] = buildCareDroidBusinessBrain().analytics,
): PlatformChartDatum[] {
  return analytics.map((domain) => ({
    name: domain.label,
    value: domain.score,
  }));
}

export function buildBusinessBrainRecommendationChart(
  recommendations: BusinessBrainSnapshot['recommendations'] = buildCareDroidBusinessBrain().recommendations,
): PlatformChartDatum[] {
  return recommendations.map((item) => ({
    name: item.title.length > 28 ? `${item.title.slice(0, 28)}…` : item.title,
    value: item.score,
  }));
}

export function buildArtifactTypeChart(
  artifacts: ArtifactCatalog = buildArtifactCatalog(),
): PlatformChartDatum[] {
  const counts = artifacts.reduce<Record<string, number>>((acc, artifact) => {
    acc[artifact.type] = (acc[artifact.type] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));
}

export function buildArtifactCategoryChart(
  artifacts: ArtifactCatalog = buildArtifactCatalog(),
): PlatformChartDatum[] {
  const counts = artifacts.reduce<Record<string, number>>((acc, artifact) => {
    acc[artifact.category] = (acc[artifact.category] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));
}

export function businessBrainScoreTone(score: number): 'good' | 'warning' | 'critical' | 'neutral' {
  if (score >= 80) return 'good';
  if (score >= 65) return 'warning';
  return 'neutral';
}

export function recommendationPriorityTone(
  priority: string,
): 'good' | 'warning' | 'critical' | 'neutral' {
  if (priority === 'high') return 'good';
  if (priority === 'medium') return 'warning';
  return 'neutral';
}

export function buildLineageStageChart(
  flows: DataLineageSnapshot['flows'] = buildDataLineageExplorer().flows,
): PlatformChartDatum[] {
  const counts = Object.values(DATA_LINEAGE_STAGES).reduce<Record<string, number>>((acc, stage) => {
    acc[stage] = 0;
    return acc;
  }, {});
  for (const flow of flows) {
    for (const stage of flow.stages) {
      counts[stage.stage] = (counts[stage.stage] || 0) + 1;
    }
  }
  return Object.values(DATA_LINEAGE_STAGES).map((stage) => ({
    name: stage,
    value: counts[stage] || 0,
  }));
}

