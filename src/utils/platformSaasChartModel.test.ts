import { describe, expect, it } from 'vitest';
import { buildCapabilityDiscovery } from '../data/capabilityDiscoveryEngine';
import { buildPlatformAnalytics } from '../data/platformAnalytics';
import { buildPluginMarketplace } from '../data/pluginMarketplace';
import { buildLocalAssetDependencyGraph } from '../data/assetDependencyGraph';
import { buildDataLineageExplorer } from '../data/dataLineageExplorer';
import { buildWorkspaceDependencyGraph } from '../data/crossWorkspaceIntelligence';
import { buildDepartmentPerformanceIntelligence } from '../data/departmentPerformanceIntelligence';
import { buildDependencyMap } from '../data/dependencyMap';
import { buildPlatformSelfDiagnostics } from '../data/platformSelfDiagnostics';
import { buildWorkflowMiningReport } from '../data/workflowMiningEngine';
import { buildCustomerExpansionOpportunities } from '../data/customerExpansionEngine';
import { buildHealthcareKnowledgeHub } from '../data/healthcareKnowledgeHub';
import { buildHospitalReadinessAssessment } from '../data/hospitalReadinessAssessment';
import { buildArtifactCatalog } from '../data/artifactIntelligence';
import { buildCareDroidBusinessBrain } from '../data/caredroidBusinessBrain';
import { buildProductIntelligenceLayer } from '../data/productIntelligenceLayer';
import {
  buildAssetGraphIssueChart,
  buildDepartmentHealthChart,
  buildDiagnosticsCategoryChart,
  buildWorkflowJourneyChart,
  buildWorkflowSignalChart,
  buildWorkspaceDependencyStrengthChart,
  buildWorkspaceDependencyTypeChart,
  buildExpansionScoreChart,
  buildKnowledgeHubTypeChart,
  buildArtifactCategoryChart,
  buildArtifactTypeChart,
  buildBusinessBrainDomainChart,
  buildBusinessBrainRecommendationChart,
  buildProductAdoptionChart,
  buildProductHealthChart,
  buildReadinessDimensionChart,
  buildWorkflowPriorityChart,
  buildDependencyIssueChart,
  buildDiscoverySectionChart,
  buildFeatureFlagCenterView,
  buildFeatureFlagCategoryChart,
  buildGovernanceRiskChart,
  buildLineageCategoryChart,
  buildLineageStageChart,
  buildLocalGovernanceRegistryFallback,
  buildPlatformAdoptionTrendChart,
  buildPlatformDecisionChart,
  buildPlatformEventTypeChart,
  buildPluginTypeChart,
  cycleFeatureFlagState,
  decisionTone,
} from './platformSaasChartModel';

describe('platformSaasChartModel', () => {
  it('builds platform analytics charts from demo telemetry', () => {
    const analytics = buildPlatformAnalytics();
    expect(buildPlatformAdoptionTrendChart(analytics).length).toBeGreaterThan(0);
    expect(buildPlatformEventTypeChart(analytics).some((row) => row.value > 0)).toBe(true);
    expect(buildPlatformDecisionChart(analytics).length).toBeGreaterThan(0);
  });

  it('builds discovery and plugin marketplace charts', () => {
    const discovery = buildCapabilityDiscovery();
    const marketplace = buildPluginMarketplace();

    expect(buildDiscoverySectionChart(discovery)).toHaveLength(discovery.sections.length);
    expect(buildPluginTypeChart(marketplace).length).toBeGreaterThan(0);
  });

  it('builds governance fallback registry and risk chart', () => {
    const registry = buildLocalGovernanceRegistryFallback([
      { id: 'qsofa', name: 'qSOFA', category: 'Calculator', path: '/tools/calculators/qsofa' },
    ]);

    expect(registry.rows).toHaveLength(1);
    expect(registry.summary.totalAssets).toBe(1);
    expect(buildGovernanceRiskChart(registry)).toEqual([
      { name: 'clinical decision support', value: 1 },
    ]);
  });

  it('maps analytics decision tones', () => {
    expect(decisionTone('promote')).toBe('good');
    expect(decisionTone('hide')).toBe('critical');
    expect(decisionTone('improve')).toBe('warning');
    expect(decisionTone('monitor')).toBe('neutral');
  });

  it('builds dependency and feature flag center views', () => {
    const map = buildDependencyMap();
    expect(buildDependencyIssueChart(map.issueCounts).length).toBeGreaterThan(0);

    const center = buildFeatureFlagCenterView();
    expect(center.flags.length).toBeGreaterThan(0);
    expect(buildFeatureFlagCategoryChart(center.summary.categoryCounts).length).toBeGreaterThan(0);
    expect(cycleFeatureFlagState('enabled')).toBe('beta');
  });

  it('builds asset dependency graph and lineage charts', () => {
    const graph = buildLocalAssetDependencyGraph({ maxChains: 8 });
    const lineage = buildDataLineageExplorer();

    expect(buildAssetGraphIssueChart(graph.issueCounts).length).toBeGreaterThan(0);
    expect(buildLineageCategoryChart(lineage.flows).length).toBeGreaterThan(0);
    expect(buildLineageStageChart(lineage.flows).length).toBe(5);
  });

  it('builds self-diagnostics and department intelligence charts', () => {
    const diagnostics = buildPlatformSelfDiagnostics();
    const departments = buildDepartmentPerformanceIntelligence();

    expect(buildDiagnosticsCategoryChart(diagnostics.summary.categories).length).toBeGreaterThan(0);
    expect(buildDepartmentHealthChart(departments.departments).length).toBe(3);
  });

  it('builds workspace graph and workflow mining charts', () => {
    const graph = buildWorkspaceDependencyGraph();
    const mining = buildWorkflowMiningReport();

    expect(buildWorkspaceDependencyTypeChart(graph.edges).some((row) => row.value > 0)).toBe(true);
    expect(buildWorkspaceDependencyStrengthChart(graph.edges).length).toBeGreaterThan(0);
    expect(buildWorkflowSignalChart(mining.signalCounts).length).toBeGreaterThan(0);
    expect(buildWorkflowJourneyChart(mining.mostCommonUserJourneys).length).toBe(3);
  });

  it('builds business brain and artifact catalog charts', () => {
    const brain = buildCareDroidBusinessBrain();
    const catalog = buildArtifactCatalog();

    expect(buildBusinessBrainDomainChart(brain.analytics).length).toBe(7);
    expect(buildBusinessBrainRecommendationChart(brain.recommendations).length).toBe(5);
    expect(buildArtifactTypeChart(catalog).length).toBeGreaterThan(0);
    expect(buildArtifactCategoryChart(catalog).length).toBeGreaterThan(0);
  });

  it('builds commercial intelligence and workflow builder charts', () => {
    const products = buildProductIntelligenceLayer();
    const expansion = buildCustomerExpansionOpportunities();
    const readiness = buildHospitalReadinessAssessment();
    const hub = buildHealthcareKnowledgeHub();

    expect(buildProductHealthChart(products.products).length).toBeGreaterThan(0);
    expect(buildProductAdoptionChart(products.products).length).toBeGreaterThan(0);
    expect(buildExpansionScoreChart(expansion.segments).length).toBeGreaterThan(0);
    expect(buildReadinessDimensionChart(readiness.dimensions).length).toBe(6);
    expect(buildKnowledgeHubTypeChart(hub.typeCounts).length).toBeGreaterThan(0);
    expect(buildWorkflowPriorityChart().length).toBe(6);
  });
});
