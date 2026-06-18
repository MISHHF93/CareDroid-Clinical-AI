/**
 * Customer Success Platform — onboarding, adoption, utilization, health, support, renewal KPIs.
 * Node-safe; consumes backend customer-success dashboard payloads and org context.
 */

import {
  CLINIC_ONBOARDING_STEPS,
  simulateClinicOnboarding,
} from './clinicOnboardingModel.js';

export const CUSTOMER_SUCCESS_CAPABILITY = Object.freeze({
  ONBOARDING: 'onboarding',
  ADOPTION: 'adoption',
  FEATURE_UTILIZATION: 'feature_utilization',
  HEALTH_SCORE: 'health_score',
  SUPPORT_TRACKING: 'support_tracking',
  RENEWAL_READINESS: 'renewal_readiness',
});

export const CUSTOMER_SUCCESS_HEALTH_STATUS = Object.freeze({
  HEALTHY: 'healthy',
  WATCH: 'watch',
  AT_RISK: 'at-risk',
});

export const CUSTOMER_SUCCESS_KPIS = Object.freeze({
  onboardingCompletePercent: Object.freeze({ target: 80, label: 'Onboarding complete' }),
  adoptionScore: Object.freeze({ target: 70, label: 'Adoption score' }),
  activeUsers: Object.freeze({ target: 5, label: 'Active users' }),
  featureUtilizationRate: Object.freeze({ target: 60, label: 'Feature utilization rate' }),
  healthScore: Object.freeze({ target: 75, label: 'Customer health score' }),
  supportOpenItems: Object.freeze({ target: 3, label: 'Open support items', max: true }),
  renewalReadiness: Object.freeze({ target: 70, label: 'Renewal readiness' }),
});

/** High-value platform features tracked for utilization breadth. */
export const FEATURE_UTILIZATION_REGISTRY = Object.freeze([
  Object.freeze({ id: 'whiteboard', label: 'Emergency whiteboard', category: 'operations', match: ['whiteboard', 'emergency/whiteboard'] }),
  Object.freeze({ id: 'reception', label: 'Reception workspace', category: 'operations', match: ['reception', 'arrival'] }),
  Object.freeze({ id: 'copilot', label: 'ED Copilot', category: 'ai', match: ['copilot', 'assistant', 'chat'] }),
  Object.freeze({ id: 'smart-intake', label: 'Smart intake', category: 'operations', match: ['smart-intake', 'intake'] }),
  Object.freeze({ id: 'queue-intelligence', label: 'Queue intelligence', category: 'operations', match: ['queue'] }),
  Object.freeze({ id: 'shift-handoff', label: 'Shift handoff', category: 'operations', match: ['handoff', 'shift'] }),
  Object.freeze({ id: 'data-quality', label: 'Data quality surfacing', category: 'quality', match: ['data-quality', 'verification'] }),
  Object.freeze({ id: 'reassessment', label: 'Reassessment workflow', category: 'clinical', match: ['reassess'] }),
  Object.freeze({ id: 'ems-panel', label: 'EMS pre-arrival', category: 'operations', match: ['ems'] }),
  Object.freeze({ id: 'command-palette', label: 'Command palette', category: 'productivity', match: ['command-palette', 'palette'] }),
  Object.freeze({ id: 'simulation', label: 'Simulation training', category: 'enablement', match: ['simulation'] }),
  Object.freeze({ id: 'workflow', label: 'Workflow completion', category: 'enablement', match: ['workflow'] }),
]);

function clampScore(score) {
  const value = Math.round(Number(score) || 0);
  return Math.max(0, Math.min(100, value));
}

function metricValue(metric) {
  if (metric && typeof metric === 'object' && 'value' in metric) return Number(metric.value || 0);
  return Number(metric || 0);
}

function healthStatusFromScore(score) {
  if (score >= 75) return CUSTOMER_SUCCESS_HEALTH_STATUS.HEALTHY;
  if (score >= 50) return CUSTOMER_SUCCESS_HEALTH_STATUS.WATCH;
  return CUSTOMER_SUCCESS_HEALTH_STATUS.AT_RISK;
}

function retentionRiskFromScore(score) {
  if (score >= 75) return 'low';
  if (score >= 50) return 'medium';
  return 'high';
}

export function buildCommercialOnboardingSteps(context = {}) {
  const organization = context.organization || {};
  const workspaces = Array.isArray(context.workspaces) ? context.workspaces : [];
  const products = Array.isArray(context.products) ? context.products : [];
  const packs = Array.isArray(context.packs) ? context.packs : [];
  const integrations = Array.isArray(context.integrations) ? context.integrations : [];
  const subscription = context.subscription || {};
  const roleProfile = context.roleProfile || {};

  return Object.freeze([
    Object.freeze({
      id: 'organization-profile',
      label: 'Organization profile',
      complete: Boolean(organization.id || organization.name),
      route: '/onboarding',
    }),
    Object.freeze({
      id: 'workspaces',
      label: 'Workspaces configured',
      complete: workspaces.length > 0,
      route: '/tenant-admin/workspaces',
    }),
    Object.freeze({
      id: 'asset-packs',
      label: 'Asset packs enabled',
      complete: packs.length > 0,
      route: '/settings/organization/packs',
    }),
    Object.freeze({
      id: 'products',
      label: 'Products assigned',
      complete: products.length > 0,
      route: '/products',
    }),
    Object.freeze({
      id: 'integrations',
      label: 'Integrations connected or requested',
      complete: integrations.some((item) => ['enabled', 'requested', 'connected'].includes(item?.status)),
      route: '/integration-readiness',
    }),
    Object.freeze({
      id: 'subscription',
      label: 'Subscription active',
      complete: Boolean(subscription.status || subscription.tier),
      route: '/billing',
    }),
    Object.freeze({
      id: 'role-profile',
      label: 'Role profile selected',
      complete: Boolean(roleProfile.id || roleProfile.label || organization.defaultRoleProfileId),
      route: '/profile',
    }),
  ]);
}

export function buildClinicOnboardingProgress(context = {}) {
  const simulation = simulateClinicOnboarding({
    provisioned: context.provisioned !== false,
    orgScopedThresholdSave: context.orgScopedThresholdSave !== false,
    orgScopedAlertSave: context.orgScopedAlertSave !== false,
    storeHydration: context.storeHydration !== false,
    edRbacWired: Boolean(context.edRbacWired),
    staffUiWired: Boolean(context.staffUiWired),
    organizationName: context.organization?.name,
    emergencyOs: context.emergencyOs,
  });

  const steps = simulation.steps.map((step) =>
    Object.freeze({
      id: step.id,
      label: step.label,
      status: step.status,
      complete: step.status === 'complete',
      automated: step.automated,
      route: step.route,
      blockers: step.blockers,
    }),
  );

  return Object.freeze({
    domain: 'clinical',
    steps,
    completeCount: simulation.summary.completeSteps,
    totalCount: simulation.summary.totalSteps,
    percent: simulation.summary.readinessPercent,
    frictionPoints: simulation.frictionPoints,
    mitigations: simulation.mitigations,
  });
}

export function buildOnboardingProgress(context = {}) {
  const commercial = buildCommercialOnboardingSteps(context);
  const clinical = buildClinicOnboardingProgress(context);

  const commercialComplete = commercial.filter((step) => step.complete).length;
  const commercialPercent =
    commercial.length > 0 ? clampScore((commercialComplete / commercial.length) * 100) : 0;

  const blendedPercent = clampScore(commercialPercent * 0.45 + clinical.percent * 0.55);

  return Object.freeze({
    percent: blendedPercent,
    commercial: Object.freeze({
      steps: commercial,
      completeCount: commercialComplete,
      totalCount: commercial.length,
      percent: commercialPercent,
    }),
    clinical: clinical,
    blockers: Object.freeze([
      ...commercial.filter((step) => !step.complete).map((step) => step.label),
      ...clinical.steps.filter((step) => !step.complete).flatMap((step) => step.blockers),
    ]),
  });
}

export function buildAdoptionMetrics(dashboard = {}, context = {}) {
  const metrics = dashboard.metrics || {};
  const adoptionValue = clampScore(metricValue(metrics.adoption));
  const activeUsers = metricValue(metrics.activeUsers);
  const enabledPackCount = metrics.adoption?.enabledPackCount ?? 0;
  const enabledAssetCount = metrics.adoption?.enabledAssetCount ?? 0;
  const totalAssetCount = metrics.adoption?.totalAssetCount ?? 0;
  const workspaceCount = Array.isArray(context.workspaces) ? context.workspaces.length : 0;
  const workspaceAdopted = Array.isArray(context.workspaces)
    ? context.workspaces.filter((workspace) => {
        const tools = workspace?.settings?.enabledToolIds || workspace?.enabledToolIds || [];
        return tools.length > 0 || workspace.id === context.activeWorkspace?.id;
      }).length
    : 0;
  const workspaceAdoptionRate =
    workspaceCount > 0 ? clampScore((workspaceAdopted / workspaceCount) * 100) : workspaceCount === 0 ? 0 : 100;

  return Object.freeze({
    adoptionScore: adoptionValue,
    activeUsers,
    enabledPackCount,
    enabledAssetCount,
    totalAssetCount,
    workspaceCount,
    workspaceAdopted,
    workspaceAdoptionRate,
    assetUsage: metricValue(metrics.assetUsage),
    aiUsage: metricValue(metrics.aiUsage),
    simulationsCompleted: metricValue(metrics.simulationsCompleted),
    workflowsCompleted: metricValue(metrics.workflowsCompleted),
    underusedProductCount: (metrics.underusedProducts || []).length,
    zeroUsageProducts: (metrics.underusedProducts || []).filter((product) => product.usageCount === 0).length,
  });
}

function matchFeatureUtilization(feature, haystack) {
  return feature.match.some((token) => haystack.includes(token.toLowerCase()));
}

export function buildFeatureUtilization(dashboard = {}) {
  const topAssets = dashboard.metrics?.assetUsage?.topAssets || [];
  const signals = dashboard.signals || [];
  const haystackParts = [
    ...topAssets.map((asset) => `${asset.id} ${asset.label} ${asset.route || ''}`),
    ...signals.map((signal) => `${signal.id} ${signal.label} ${signal.message || ''}`),
  ];
  if (metricValue(dashboard.metrics?.simulationsCompleted) > 0) haystackParts.push('simulation');
  if (metricValue(dashboard.metrics?.workflowsCompleted) > 0) haystackParts.push('workflow');
  if (metricValue(dashboard.metrics?.aiUsage) > 0) haystackParts.push('copilot assistant ai');
  const haystack = haystackParts.join(' ').toLowerCase();

  const features = FEATURE_UTILIZATION_REGISTRY.map((feature) => {
    const utilized = matchFeatureUtilization(feature, haystack);
    const assetHits = topAssets.filter((asset) =>
      matchFeatureUtilization(feature, `${asset.id} ${asset.label} ${asset.route || ''}`.toLowerCase()),
    );
    return Object.freeze({
      ...feature,
      utilized,
      usageCount: assetHits.reduce((sum, asset) => sum + Number(asset.count || 0), 0),
      topAssets: assetHits.slice(0, 3),
    });
  });

  const utilizedCount = features.filter((feature) => feature.utilized).length;
  const utilizationRate = clampScore((utilizedCount / FEATURE_UTILIZATION_REGISTRY.length) * 100);

  return Object.freeze({
    features,
    utilizedCount,
    totalFeatures: FEATURE_UTILIZATION_REGISTRY.length,
    utilizationRate,
    breadthStatus:
      utilizationRate >= 70
        ? CUSTOMER_SUCCESS_HEALTH_STATUS.HEALTHY
        : utilizationRate >= 40
          ? CUSTOMER_SUCCESS_HEALTH_STATUS.WATCH
          : CUSTOMER_SUCCESS_HEALTH_STATUS.AT_RISK,
  });
}

export function buildCustomerHealthScore(dashboard = {}, onboarding = {}, adoption = {}, utilization = {}) {
  const backendScore = clampScore(dashboard.health?.score);
  const hasBackend = backendScore > 0;

  const engagementSignals = [
    adoption.activeUsers > 0 ? 100 : 0,
    adoption.assetUsage > 0 ? 100 : 0,
    adoption.aiUsage > 0 ? 100 : 0,
    adoption.simulationsCompleted > 0 ? 100 : 50,
    adoption.workflowsCompleted > 0 ? 100 : 50,
  ];
  const engagementScore = Math.round(
    engagementSignals.reduce((sum, value) => sum + value, 0) / engagementSignals.length,
  );
  const underusePenalty = Math.min(20, adoption.zeroUsageProducts * 4);

  const computedScore = clampScore(
    adoption.adoptionScore * 0.25 +
      engagementScore * 0.25 +
      onboarding.percent * 0.2 +
      utilization.utilizationRate * 0.2 +
      adoption.workspaceAdoptionRate * 0.1 -
      underusePenalty,
  );

  const score = hasBackend
    ? clampScore(Math.round(backendScore * 0.55 + computedScore * 0.45))
    : computedScore;

  return Object.freeze({
    score,
    status: healthStatusFromScore(score),
    retentionRisk: retentionRiskFromScore(score),
    components: Object.freeze({
      adoption: adoption.adoptionScore,
      engagement: engagementScore,
      onboarding: onboarding.percent,
      featureUtilization: utilization.utilizationRate,
      workspaceAdoption: adoption.workspaceAdoptionRate,
      underusePenalty,
      backendScore: hasBackend ? backendScore : null,
    }),
    signals: dashboard.signals || [],
  });
}

export function buildSupportTracking(dashboard = {}, onboarding = {}, health = {}) {
  const items = [];
  let ticketCounter = 1;

  (dashboard.metrics?.underusedProducts || [])
    .filter((product) => product.usageCount === 0)
    .slice(0, 4)
    .forEach((product) => {
      items.push(
        Object.freeze({
          id: `CS-${String(ticketCounter++).padStart(3, '0')}`,
          type: 'enablement',
          priority: 'medium',
          status: 'open',
          subject: `Enable ${product.name}`,
          summary: `${product.enabledAssetCount} entitled assets with zero usage this period.`,
          owner: 'Customer success',
          route: `/products/${product.slug}`,
        }),
      );
    });

  (dashboard.signals || [])
    .filter((signal) => signal.status !== CUSTOMER_SUCCESS_HEALTH_STATUS.HEALTHY)
    .forEach((signal) => {
      items.push(
        Object.freeze({
          id: `CS-${String(ticketCounter++).padStart(3, '0')}`,
          type: 'health-follow-up',
          priority: signal.status === CUSTOMER_SUCCESS_HEALTH_STATUS.AT_RISK ? 'high' : 'medium',
          status: 'open',
          subject: signal.label,
          summary: signal.message,
          owner: 'Customer success',
        }),
      );
    });

  onboarding.blockers.slice(0, 3).forEach((blocker) => {
    items.push(
      Object.freeze({
        id: `CS-${String(ticketCounter++).padStart(3, '0')}`,
        type: 'implementation',
        priority: 'high',
        status: 'open',
        subject: 'Onboarding blocker',
        summary: blocker,
        owner: 'Implementation',
        route: '/onboarding',
      }),
    );
  });

  if (health.retentionRisk === 'high') {
    items.push(
      Object.freeze({
        id: `CS-${String(ticketCounter++).padStart(3, '0')}`,
        type: 'retention',
        priority: 'critical',
        status: 'escalated',
        subject: 'Retention risk review',
        summary: 'Customer health score indicates high retention risk — schedule executive check-in.',
        owner: 'Account management',
        route: '/customer-success',
      }),
    );
  }

  const openItems = items.filter((item) => item.status === 'open' || item.status === 'escalated');
  const resolvedItems = items.filter((item) => item.status === 'resolved');

  return Object.freeze({
    items,
    openCount: openItems.length,
    escalatedCount: items.filter((item) => item.status === 'escalated').length,
    resolvedCount: resolvedItems.length,
    byType: Object.freeze({
      enablement: items.filter((item) => item.type === 'enablement').length,
      implementation: items.filter((item) => item.type === 'implementation').length,
      healthFollowUp: items.filter((item) => item.type === 'health-follow-up').length,
      retention: items.filter((item) => item.type === 'retention').length,
    }),
    openItems,
  });
}

export function buildRenewalReadiness({ health, adoption, onboarding, utilization, support }) {
  const factors = Object.freeze([
    Object.freeze({
      id: 'health',
      label: 'Customer health',
      score: health.score,
      weight: 30,
      passes: health.score >= CUSTOMER_SUCCESS_KPIS.healthScore.target,
    }),
    Object.freeze({
      id: 'adoption',
      label: 'Product adoption',
      score: adoption.adoptionScore,
      weight: 25,
      passes: adoption.adoptionScore >= CUSTOMER_SUCCESS_KPIS.adoptionScore.target,
    }),
    Object.freeze({
      id: 'onboarding',
      label: 'Onboarding completion',
      score: onboarding.percent,
      weight: 20,
      passes: onboarding.percent >= CUSTOMER_SUCCESS_KPIS.onboardingCompletePercent.target,
    }),
    Object.freeze({
      id: 'utilization',
      label: 'Feature breadth',
      score: utilization.utilizationRate,
      weight: 15,
      passes: utilization.utilizationRate >= CUSTOMER_SUCCESS_KPIS.featureUtilizationRate.target,
    }),
    Object.freeze({
      id: 'support',
      label: 'Support load',
      score: clampScore(100 - support.openCount * 12),
      weight: 10,
      passes: support.openCount <= CUSTOMER_SUCCESS_KPIS.supportOpenItems.target,
    }),
  ]);

  const weighted = factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0);
  const score = clampScore(Math.round(weighted / 100));
  const passingFactors = factors.filter((factor) => factor.passes).length;

  return Object.freeze({
    score,
    status:
      score >= 80 ? 'ready' : score >= 60 ? 'preparing' : score >= 40 ? 'at-risk' : 'critical',
    retentionRisk: health.retentionRisk,
    passingFactors,
    totalFactors: factors.length,
    factors,
    recommendation:
      score >= 80
        ? 'Account is renewal-ready — focus on expansion and referenceability.'
        : score >= 60
          ? 'Close onboarding and enablement gaps before renewal conversation.'
          : 'Schedule intervention — adoption, support, or health signals need immediate attention.',
  });
}

export function evaluateCustomerSuccessKpis({ onboarding, adoption, utilization, health, support, renewal }) {
  const evaluations = Object.freeze([
    Object.freeze({
      id: 'onboardingCompletePercent',
      label: CUSTOMER_SUCCESS_KPIS.onboardingCompletePercent.label,
      value: onboarding.percent,
      target: CUSTOMER_SUCCESS_KPIS.onboardingCompletePercent.target,
      passes: onboarding.percent >= CUSTOMER_SUCCESS_KPIS.onboardingCompletePercent.target,
      unit: '%',
    }),
    Object.freeze({
      id: 'adoptionScore',
      label: CUSTOMER_SUCCESS_KPIS.adoptionScore.label,
      value: adoption.adoptionScore,
      target: CUSTOMER_SUCCESS_KPIS.adoptionScore.target,
      passes: adoption.adoptionScore >= CUSTOMER_SUCCESS_KPIS.adoptionScore.target,
      unit: '%',
    }),
    Object.freeze({
      id: 'activeUsers',
      label: CUSTOMER_SUCCESS_KPIS.activeUsers.label,
      value: adoption.activeUsers,
      target: CUSTOMER_SUCCESS_KPIS.activeUsers.target,
      passes: adoption.activeUsers >= CUSTOMER_SUCCESS_KPIS.activeUsers.target,
      unit: '',
    }),
    Object.freeze({
      id: 'featureUtilizationRate',
      label: CUSTOMER_SUCCESS_KPIS.featureUtilizationRate.label,
      value: utilization.utilizationRate,
      target: CUSTOMER_SUCCESS_KPIS.featureUtilizationRate.target,
      passes: utilization.utilizationRate >= CUSTOMER_SUCCESS_KPIS.featureUtilizationRate.target,
      unit: '%',
    }),
    Object.freeze({
      id: 'healthScore',
      label: CUSTOMER_SUCCESS_KPIS.healthScore.label,
      value: health.score,
      target: CUSTOMER_SUCCESS_KPIS.healthScore.target,
      passes: health.score >= CUSTOMER_SUCCESS_KPIS.healthScore.target,
      unit: '',
    }),
    Object.freeze({
      id: 'supportOpenItems',
      label: CUSTOMER_SUCCESS_KPIS.supportOpenItems.label,
      value: support.openCount,
      target: CUSTOMER_SUCCESS_KPIS.supportOpenItems.target,
      passes: support.openCount <= CUSTOMER_SUCCESS_KPIS.supportOpenItems.target,
      unit: '',
      maxTarget: true,
    }),
    Object.freeze({
      id: 'renewalReadiness',
      label: CUSTOMER_SUCCESS_KPIS.renewalReadiness.label,
      value: renewal.score,
      target: CUSTOMER_SUCCESS_KPIS.renewalReadiness.target,
      passes: renewal.score >= CUSTOMER_SUCCESS_KPIS.renewalReadiness.target,
      unit: '',
    }),
  ]);

  const passedCount = evaluations.filter((kpi) => kpi.passes).length;

  return Object.freeze({
    kpis: evaluations,
    passedCount,
    totalCount: evaluations.length,
    passesAll: passedCount === evaluations.length,
    renewalReady: renewal.score >= CUSTOMER_SUCCESS_KPIS.renewalReadiness.target,
  });
}

export function buildCustomerSuccessPlatformAssessment({
  dashboard = {},
  context = {},
  organizationName = 'Current organization',
} = {}) {
  const onboarding = buildOnboardingProgress(context);
  const adoption = buildAdoptionMetrics(dashboard, context);
  const utilization = buildFeatureUtilization(dashboard);
  const health = buildCustomerHealthScore(dashboard, onboarding, adoption, utilization);
  const support = buildSupportTracking(dashboard, onboarding, health);
  const renewal = buildRenewalReadiness({ health, adoption, onboarding, utilization, support });
  const kpiEvaluation = evaluateCustomerSuccessKpis({
    onboarding,
    adoption,
    utilization,
    health,
    support,
    renewal,
  });

  return Object.freeze({
    generatedAt: new Date().toISOString(),
    organizationName,
    period: dashboard.period || null,
    capabilities: Object.freeze({
      [CUSTOMER_SUCCESS_CAPABILITY.ONBOARDING]: onboarding,
      [CUSTOMER_SUCCESS_CAPABILITY.ADOPTION]: adoption,
      [CUSTOMER_SUCCESS_CAPABILITY.FEATURE_UTILIZATION]: utilization,
      [CUSTOMER_SUCCESS_CAPABILITY.HEALTH_SCORE]: health,
      [CUSTOMER_SUCCESS_CAPABILITY.SUPPORT_TRACKING]: support,
      [CUSTOMER_SUCCESS_CAPABILITY.RENEWAL_READINESS]: renewal,
    }),
    kpiEvaluation,
    summary: Object.freeze({
      healthScore: health.score,
      healthStatus: health.status,
      renewalReadiness: renewal.score,
      renewalStatus: renewal.status,
      onboardingPercent: onboarding.percent,
      adoptionScore: adoption.adoptionScore,
      featureUtilizationRate: utilization.utilizationRate,
      openSupportItems: support.openCount,
      kpisPassed: kpiEvaluation.passedCount,
      kpisTotal: kpiEvaluation.totalCount,
    }),
  });
}

export function auditCustomerSuccessPlatform(options = {}) {
  const sampleDashboard = Object.freeze({
    health: { score: 82, status: 'healthy', retentionRisk: 'low' },
    metrics: Object.freeze({
      adoption: { value: 75, enabledPackCount: 3, enabledAssetCount: 12, totalAssetCount: 16 },
      activeUsers: { value: 42 },
      assetUsage: {
        value: 128,
        topAssets: [
          { id: 'whiteboard', label: 'Emergency Whiteboard', count: 48, route: '/emergency/whiteboard' },
          { id: 'copilot', label: 'ED Copilot', count: 31, route: '/emergency/copilot' },
          { id: 'qsofa', label: 'qSOFA', count: 24, assetType: 'calculator' },
        ],
      },
      aiUsage: { value: 31 },
      simulationsCompleted: { value: 9 },
      workflowsCompleted: { value: 17 },
      underusedProducts: [
        {
          id: 'product-lab',
          slug: 'laboratory',
          name: 'Laboratory Intelligence',
          enabledAssetCount: 4,
          usageCount: 0,
        },
      ],
    }),
    signals: [
      { id: 'adoption', label: 'Adoption', status: 'healthy', message: '75% asset coverage.' },
      { id: 'underused-products', label: 'Underused products', status: 'watch', message: '1 product needs review.' },
    ],
    period: { key: 'month' },
    sources: { usageEvents: 120, auditEvents: 45 },
  });

  const assessment = buildCustomerSuccessPlatformAssessment({
    dashboard: options.dashboard || sampleDashboard,
    context: options.context || {
      provisioned: true,
      workspaces: [{ id: 'ed', name: 'Emergency', settings: { enabledToolIds: ['whiteboard'] } }],
      products: [{ id: 'p1' }],
      packs: [{ id: 'pack1' }],
      integrations: [{ status: 'requested' }],
      subscription: { status: 'active', tier: 'enterprise' },
      roleProfile: { id: 'nurse', label: 'Nurse' },
      organization: { id: 'org-demo', name: 'Demo Hospital' },
    },
    organizationName: options.organizationName || 'Demo Hospital',
  });

  return Object.freeze({
    generatedAt: new Date().toISOString(),
    goal: 'Customer success platform — onboarding, adoption, feature utilization, health, support, renewal KPIs',
    assessment,
    featureRegistryCount: FEATURE_UTILIZATION_REGISTRY.length,
    clinicOnboardingStepCount: CLINIC_ONBOARDING_STEPS.length,
    commercialOnboardingStepCount: buildCommercialOnboardingSteps().length,
    kpiTargets: CUSTOMER_SUCCESS_KPIS,
  });
}
