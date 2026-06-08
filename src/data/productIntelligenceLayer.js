export const PRODUCT_HEALTH_BANDS = Object.freeze([
  { id: 'excellent', label: 'Excellent', minScore: 85 },
  { id: 'healthy', label: 'Healthy', minScore: 70 },
  { id: 'watch', label: 'Watch', minScore: 50 },
  { id: 'at_risk', label: 'At risk', minScore: 0 },
]);

export const PRODUCT_INTELLIGENCE_PRODUCTS = Object.freeze([
  {
    id: 'emergency-department-solution',
    name: 'Emergency Department Solution',
    packs: ['Emergency Pack', 'Simulation Pack'],
    assets: [
      { id: 'qsofa', name: 'qSOFA calculator', type: 'calculator' },
      { id: 'sepsis-protocol', name: 'Sepsis escalation protocol', type: 'protocol' },
      { id: 'ed-workflow', name: 'ED triage workflow', type: 'workflow' },
      { id: 'patient-summary-ai', name: 'Patient summary AI', type: 'ai_tool' },
    ],
    usage: {
      launches: 1240,
      activeDepartments: 5,
      repeatUsageRate: 78,
      workflowCompletions: 312,
      aiAssistedActions: 448,
    },
    outcomes: [
      { id: 'triage-standardization', label: 'Triage standardization', valueScore: 86 },
      { id: 'workflow-completion', label: 'Workflow completion lift', valueScore: 80 },
    ],
    implementationCost: 140000,
    estimatedValue: 382000,
  },
  {
    id: 'hospital-operations-command-center',
    name: 'Hospital Operations Command Center',
    packs: ['Medical IoT Pack', 'Operations Pack', 'Fleet Pack'],
    assets: [
      { id: 'medical-iot-dashboard', name: 'Medical IoT dashboard', type: 'dashboard' },
      { id: 'device-fleet', name: 'Device fleet management', type: 'dashboard' },
      { id: 'fleet-map', name: 'Fleet live map', type: 'map' },
      { id: 'maintenance-workload', name: 'Maintenance workload view', type: 'workflow' },
    ],
    usage: {
      launches: 890,
      activeDepartments: 4,
      repeatUsageRate: 69,
      workflowCompletions: 188,
      aiAssistedActions: 104,
    },
    outcomes: [
      { id: 'asset-uptime', label: 'Asset uptime visibility', valueScore: 76 },
      { id: 'maintenance-throughput', label: 'Maintenance workload reduction', valueScore: 71 },
    ],
    implementationCost: 180000,
    estimatedValue: 336000,
  },
  {
    id: 'ai-governance-suite',
    name: 'AI Governance Suite',
    packs: ['Governance Compliance Pack', 'AI Evaluation Pack'],
    assets: [
      { id: 'ai-evaluation-lab', name: 'AI Evaluation Lab', type: 'dashboard' },
      { id: 'human-review-queue', name: 'Human Review Queue', type: 'workflow' },
      { id: 'audit-trail-spine', name: 'Audit Trail Spine', type: 'governance' },
      { id: 'llm-security-dashboard', name: 'LLM Security Dashboard', type: 'dashboard' },
    ],
    usage: {
      launches: 520,
      activeDepartments: 3,
      repeatUsageRate: 62,
      workflowCompletions: 142,
      aiAssistedActions: 228,
    },
    outcomes: [
      { id: 'review-readiness', label: 'AI review readiness', valueScore: 78 },
      { id: 'governance-evidence', label: 'Governance evidence coverage', valueScore: 82 },
    ],
    implementationCost: 125000,
    estimatedValue: 244000,
  },
]);

function clampScore(score) {
  const value = Math.round(Number(score) || 0);
  return Math.max(0, Math.min(100, value));
}

export function getProductHealthBand(score) {
  const normalized = clampScore(score);
  return (
    PRODUCT_HEALTH_BANDS.find((band) => normalized >= band.minScore) ||
    PRODUCT_HEALTH_BANDS[PRODUCT_HEALTH_BANDS.length - 1]
  );
}

function average(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function calculateAdoptionScore(product) {
  const packScore = Math.min(product.packs.length * 18, 36);
  const assetScore = Math.min(product.assets.length * 9, 36);
  const departmentScore = Math.min(product.usage.activeDepartments * 7, 28);
  return clampScore(packScore + assetScore + departmentScore);
}

function calculateEngagementScore(product) {
  const launchScore = Math.min(product.usage.launches / 15, 40);
  const repeatScore = product.usage.repeatUsageRate * 0.3;
  const workflowScore = Math.min(product.usage.workflowCompletions / 8, 20);
  const aiScore = Math.min(product.usage.aiAssistedActions / 25, 10);
  return clampScore(launchScore + repeatScore + workflowScore + aiScore);
}

function calculateRoi(product) {
  const netValue = product.estimatedValue - product.implementationCost;
  const roiRatio = product.implementationCost ? product.estimatedValue / product.implementationCost : 0;
  const roiScore = clampScore((netValue / Math.max(product.implementationCost, 1)) * 45 + 50);
  return {
    estimatedValue: product.estimatedValue,
    implementationCost: product.implementationCost,
    netValue,
    roiRatio: Number(roiRatio.toFixed(2)),
    score: roiScore,
  };
}

function buildProductRecord(product) {
  const adoptionScore = calculateAdoptionScore(product);
  const engagementScore = calculateEngagementScore(product);
  const outcomeScore = average(product.outcomes.map((outcome) => outcome.valueScore));
  const roi = calculateRoi(product);
  const healthScore = clampScore(
    adoptionScore * 0.25 + engagementScore * 0.25 + outcomeScore * 0.3 + roi.score * 0.2,
  );

  return {
    ...product,
    valueChain: {
      product: product.name,
      packs: product.packs,
      assets: product.assets,
      usage: product.usage,
      outcomes: product.outcomes,
    },
    adoption: {
      score: adoptionScore,
      enabledPackCount: product.packs.length,
      activatedAssetCount: product.assets.length,
      activeDepartments: product.usage.activeDepartments,
    },
    engagement: {
      score: engagementScore,
      launches: product.usage.launches,
      repeatUsageRate: product.usage.repeatUsageRate,
      workflowCompletions: product.usage.workflowCompletions,
      aiAssistedActions: product.usage.aiAssistedActions,
    },
    roi,
    health: {
      score: healthScore,
      band: getProductHealthBand(healthScore),
      outcomeScore,
    },
  };
}

export function buildProductIntelligenceLayer({ products = PRODUCT_INTELLIGENCE_PRODUCTS } = {}) {
  const productRecords = products.map(buildProductRecord);

  return {
    generatedAt: new Date().toISOString(),
    products: productRecords,
    summary: {
      productCount: productRecords.length,
      averageAdoption: average(productRecords.map((product) => product.adoption.score)),
      averageRoi: average(productRecords.map((product) => product.roi.score)),
      averageHealth: average(productRecords.map((product) => product.health.score)),
      averageEngagement: average(productRecords.map((product) => product.engagement.score)),
      totalEstimatedValue: productRecords.reduce((sum, product) => sum + product.roi.estimatedValue, 0),
      totalImplementationCost: productRecords.reduce((sum, product) => sum + product.roi.implementationCost, 0),
    },
  };
}
