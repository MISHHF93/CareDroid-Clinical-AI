import { buildCustomerExpansionOpportunities } from './customerExpansionEngine';
import { buildDepartmentPerformanceIntelligence } from './departmentPerformanceIntelligence';
import { buildProductIntelligenceLayer } from './productIntelligenceLayer';
import { buildWorkflowMiningReport } from './workflowMiningEngine';

export const BUSINESS_BRAIN_ANALYTIC_DOMAINS = Object.freeze([
  'saas_analytics',
  'organization_analytics',
  'workspace_analytics',
  'asset_analytics',
  'ai_analytics',
  'automation_analytics',
  'simulation_analytics',
]);

export const BUSINESS_BRAIN_RECOMMENDATION_TYPES = Object.freeze([
  'product_to_expand',
  'pack_to_retire',
  'asset_to_merge',
  'customer_needing_onboarding',
  'department_needing_training',
]);

function scorePriority(score) {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

function buildAnalyticsAggregates({ productLayer, expansion, department, workflowMining }) {
  return [
    {
      id: 'saas-analytics',
      domain: 'saas_analytics',
      label: 'SaaS analytics',
      score: productLayer.summary.averageHealth,
      metrics: [
        `${productLayer.summary.productCount} products measured`,
        `$${productLayer.summary.totalEstimatedValue.toLocaleString()} estimated value`,
        `${expansion.summary.opportunityCount} expansion opportunities`,
      ],
    },
    {
      id: 'organization-analytics',
      domain: 'organization_analytics',
      label: 'Organization analytics',
      score: 74,
      metrics: ['3 customer segments monitored', '2 onboarding risks flagged', '5 adoption signals tracked'],
    },
    {
      id: 'workspace-analytics',
      domain: 'workspace_analytics',
      label: 'Workspace analytics',
      score: 71,
      metrics: [
        `${workflowMining.summary.journeyCount} journeys mined`,
        `${workflowMining.summary.frictionCount} friction signals`,
        `${workflowMining.summary.unnecessaryClickCount} unnecessary click patterns`,
      ],
    },
    {
      id: 'asset-analytics',
      domain: 'asset_analytics',
      label: 'Asset analytics',
      score: 68,
      metrics: ['4 assets marked underused', '2 merge candidates identified', '11 usage events analyzed'],
    },
    {
      id: 'ai-analytics',
      domain: 'ai_analytics',
      label: 'AI analytics',
      score: 77,
      metrics: ['780 AI-assisted actions', 'AI governance suite healthy', 'Human review readiness improving'],
    },
    {
      id: 'automation-analytics',
      domain: 'automation_analytics',
      label: 'Automation analytics',
      score: 73,
      metrics: [
        '642 workflow completions',
        `${workflowMining.summary.deadEndCount} automation dead ends`,
        'Protocol workflow loop needs simplification',
      ],
    },
    {
      id: 'simulation-analytics',
      domain: 'simulation_analytics',
      label: 'Simulation analytics',
      score: department.summary.averageHealthScore,
      metrics: ['Simulation readiness tracked', 'Emergency training gap visible', 'Education pack expansion signal'],
    },
  ];
}

function recommendation({ id, type, title, score, evidence, action, owners }) {
  return {
    id,
    type,
    title,
    priority: scorePriority(score),
    score,
    evidence,
    action,
    owners,
  };
}

export function buildCareDroidBusinessBrain() {
  const productLayer = buildProductIntelligenceLayer();
  const expansion = buildCustomerExpansionOpportunities();
  const department = buildDepartmentPerformanceIntelligence();
  const workflowMining = buildWorkflowMiningReport();
  const analytics = buildAnalyticsAggregates({ productLayer, expansion, department, workflowMining });

  const topProduct = [...productLayer.products].sort((a, b) => b.health.score - a.health.score)[0];
  const trainingDepartment = [...department.departments].sort((a, b) => a.healthScore - b.healthScore)[0];

  const recommendations = [
    recommendation({
      id: 'expand-emergency-department-solution',
      type: 'product_to_expand',
      title: `Expand ${topProduct.name}`,
      score: topProduct.health.score,
      evidence: [
        `Health score ${topProduct.health.score}`,
        `ROI ratio ${topProduct.roi.roiRatio}`,
        `${topProduct.engagement.launches} launches`,
      ],
      action: 'Prioritize commercial expansion motion and adjacent pack attach.',
      owners: ['commercial', 'customer-success'],
    }),
    recommendation({
      id: 'retire-low-signal-legacy-pack',
      type: 'pack_to_retire',
      title: 'Retire low-signal legacy protocol pack',
      score: 63,
      evidence: ['Low outcome contribution', 'Better coverage in Emergency Pack', 'Repeated search-to-protocol friction'],
      action: 'Deprecate duplicate pack positioning and migrate customers to higher-performing bundles.',
      owners: ['product', 'commercial'],
    }),
    recommendation({
      id: 'merge-protocol-workflow-assets',
      type: 'asset_to_merge',
      title: 'Merge protocol lookup and workflow builder assets',
      score: 72,
      evidence: ['Workflow builder -> search -> protocol loop repeats', 'Protocol workflow dead ends', 'Unnecessary clicks detected'],
      action: 'Embed protocol search into workflow builder and consolidate duplicated protocol launch points.',
      owners: ['product', 'design'],
    }),
    recommendation({
      id: 'onboard-watch-customers',
      type: 'customer_needing_onboarding',
      title: 'Onboard customers with low activation and high expansion fit',
      score: 81,
      evidence: ['Expansion opportunities exceed current adoption', 'Readiness gaps remain', 'Value tracking not fully activated'],
      action: 'Schedule guided onboarding for customers with under-activated packs and active expansion signals.',
      owners: ['customer-success', 'implementation'],
    }),
    recommendation({
      id: 'train-department-readiness-gap',
      type: 'department_needing_training',
      title: `Train ${trainingDepartment.name} on measurable platform outcomes`,
      score: 76,
      evidence: [
        `Department Health Score ${trainingDepartment.healthScore}`,
        `${trainingDepartment.measurableOutcomeCount} measurable outcomes`,
        'Simulation readiness is a recurring training signal',
      ],
      action: 'Run targeted enablement using simulation, workflow, and calculator adoption evidence.',
      owners: ['clinical-education', 'customer-success'],
    }),
  ];

  return {
    generatedAt: new Date().toISOString(),
    analytics,
    recommendations,
    sourceModels: {
      productLayer,
      expansion,
      department,
      workflowMining,
    },
    summary: {
      analyticDomainCount: analytics.length,
      recommendationCount: recommendations.length,
      highPriorityCount: recommendations.filter((item) => item.priority === 'high').length,
      averageBusinessScore: Math.round(
        analytics.reduce((sum, domain) => sum + domain.score, 0) / analytics.length,
      ),
      recommendationTypes: BUSINESS_BRAIN_RECOMMENDATION_TYPES.length,
    },
  };
}
