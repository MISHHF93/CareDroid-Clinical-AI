const UNKNOWN = 'unknown';

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function uniq(values) {
  return [...new Set(values.flatMap(asArray).filter(Boolean).map(String))];
}

function slug(value) {
  return (
    String(value || UNKNOWN)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || UNKNOWN
  );
}

function titleize(value) {
  return String(value || UNKNOWN)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function metricValue(metric, fallback = 0) {
  const value = metric?.value ?? metric?.count ?? metric?.events ?? fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function safePercent(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizeDepartment(department) {
  if (typeof department === 'string') {
    return {
      id: slug(department),
      name: titleize(department),
      source: 'tenant-administration',
    };
  }
  return {
    id: department?.id || slug(department?.name || department?.departmentId),
    name: department?.name || department?.label || titleize(department?.id || department?.departmentId),
    source: department?.source || 'tenant-administration',
    metadata: department,
  };
}

function normalizeWorkspace(workspace) {
  return {
    id: workspace?.id || workspace?.workspaceKey || slug(workspace?.name),
    name: workspace?.name || workspace?.branding?.displayName || titleize(workspace?.workspaceKey || workspace?.id),
    path: workspace?.path || (workspace?.id ? `/workspace/${workspace.id}` : ''),
    enabledToolIds: workspace?.enabledToolIds || workspace?.toolIds || workspace?.settings?.enabledToolIds || [],
    source: workspace?.source || 'workspace-context',
    metadata: workspace,
  };
}

function normalizePack(pack, enabledPackIds = new Set()) {
  const id = pack?.id || pack?.packId || slug(pack?.name || pack?.label);
  return {
    id,
    name: pack?.name || pack?.label || pack?.packName || titleize(id),
    enabled: enabledPackIds.has(id) || pack?.status === 'enabled',
    assetCount: pack?.assetIds?.length || pack?.assets?.length || pack?.metadata?.assetCount || 0,
    workspaceIds: pack?.workspaceIds || pack?.metadata?.workspaceIds || [],
    organizationTypes: pack?.organizationTypes || pack?.metadata?.organizationTypes || [],
    route: pack?.route || '/asset-packs',
    metadata: pack,
  };
}

function normalizeUsageRows(rows = [] as any[]) {
  return asArray(rows).map((row) => ({
    id: row?.id || row?.assetId || row?.packId || row?.resource || slug(row?.label || row?.name),
    label: row?.label || row?.name || row?.packName || row?.resource || row?.id || row?.packId || 'Unknown',
    count: metricValue(row),
    route: row?.route || row?.metadata?.route || '',
    metadata: row?.metadata || row,
  }));
}

function recommendation(id, category, title, rationale, options = {} as any) {
  return {
    id,
    category,
    title,
    rationale,
    action: options.action || 'Review',
    route: options.route || '',
    priority: options.priority || 'medium',
    confidence: options.confidence ?? 0.72,
    source: options.source || 'organization-intelligence',
    metadata: options.metadata || {},
  };
}

function buildMissingPackRecommendations({ packs, organizationType, workspaces }) {
  const workspaceIds = new Set(workspaces.map((workspace) => slug(workspace.id)));
  return packs
    .filter((pack) => !pack.enabled)
    .map((pack) => {
      const orgFit =
        pack.organizationTypes.length === 0 ||
        pack.organizationTypes.map(slug).includes(slug(organizationType));
      const workspaceFit =
        pack.workspaceIds.length === 0 ||
        pack.workspaceIds.some((workspaceId) => workspaceIds.has(slug(workspaceId)));
      const score = Number((0.45 + (orgFit ? 0.25 : 0) + (workspaceFit ? 0.2 : 0) + Math.min(pack.assetCount, 10) / 100).toFixed(2));
      return recommendation(
        `missing-pack-${pack.id}`,
        'missing-packs',
        `Enable ${pack.name}`,
        `${pack.name} is not enabled and matches ${orgFit ? organizationType : 'adjacent'} organization needs${workspaceFit ? ' and active workspaces' : ''}.`,
        {
          action: 'Review pack',
          route: pack.route,
          priority: score >= 0.8 ? 'high' : 'medium',
          confidence: Math.min(score, 0.95),
          source: 'pack-gap-analysis',
          metadata: { packId: pack.id },
        }
      );
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6);
}

function buildUnderusedAssetRecommendations(underusedAssets) {
  return underusedAssets.slice(0, 6).map((asset) =>
    recommendation(
      `underused-asset-${asset.id}`,
      'underused-assets',
      `Activate ${asset.label}`,
      `${asset.label} is enabled but has only ${asset.count || 0} usage events in the current analytics window.`,
      {
        action: 'Open asset',
        route: asset.route || asset.metadata?.route || '/assets',
        priority: (asset.count || 0) === 0 ? 'high' : 'medium',
        confidence: (asset.count || 0) === 0 ? 0.9 : 0.78,
        source: 'underused-assets',
        metadata: asset,
      }
    )
  );
}

function buildWorkflowRecommendations({ workflowsCompleted, activeWorkspaces, departments }) {
  if (workflowsCompleted > 0) return [];
  const target = activeWorkspaces[0]?.name || departments[0]?.name || 'operations';
  return [
    recommendation(
      'workflow-opportunity-primary',
      'workflow-opportunities',
      `Launch workflow playbooks for ${target}`,
      'Workflow completion is low, so guided playbooks can turn active organization behavior into repeatable care and operations steps.',
      {
        action: 'Open workflows',
        route: '/workflows',
        priority: 'high',
        confidence: 0.84,
        source: 'workflow-completion-gap',
      }
    ),
  ];
}

function buildSimulationRecommendations({ simulationsCompleted, workspaces, departments }) {
  if (simulationsCompleted > 0) return [];
  const hasEducationWorkspace = workspaces.some((workspace) =>
    /education|simulation|training/i.test(`${workspace.id} ${workspace.name}`)
  );
  return [
    recommendation(
      'simulation-opportunity-primary',
      'simulation-opportunities',
      hasEducationWorkspace ? 'Schedule simulation practice' : 'Add simulation training coverage',
      `Simulation completion is low across ${departments.length || workspaces.length || 1} organization area${departments.length === 1 ? '' : 's'}.`,
      {
        action: 'Open simulations',
        route: '/simulation',
        priority: hasEducationWorkspace ? 'medium' : 'high',
        confidence: hasEducationWorkspace ? 0.78 : 0.86,
        source: 'simulation-completion-gap',
      }
    ),
  ];
}

function buildAutomationRecommendations({ dashboardEngagement, topAssets, assetUsage }) {
  const repeatedAsset = topAssets[0] || assetUsage[0];
  if (dashboardEngagement > 0 && !repeatedAsset) return [];
  return [
    recommendation(
      'automation-opportunity-primary',
      'automation-opportunities',
      repeatedAsset ? `Automate follow-up for ${repeatedAsset.label}` : 'Create organization automation',
      repeatedAsset
        ? `${repeatedAsset.label} is a repeated usage signal that can drive automation, task routing, or dashboard follow-up.`
        : 'Dashboard engagement is low, so automation can surface next-best tasks without requiring manual monitoring.',
      {
        action: 'Open automation',
        route: '/automation',
        priority: dashboardEngagement === 0 ? 'high' : 'medium',
        confidence: repeatedAsset ? 0.82 : 0.74,
        source: 'behavior-adaptation',
        metadata: repeatedAsset || {},
      }
    ),
  ];
}

function buildAiRecommendations({ aiUsage, defaultAiAgentId }) {
  if (aiUsage > 0) return [];
  return [
    recommendation(
      'ai-assist-opportunity-primary',
      'ai-assist-opportunities',
      'Introduce AI assistant workflows',
      `${defaultAiAgentId || 'The default AI agent'} is available, but AI usage is low for this organization.`,
      {
        action: 'Open assistant',
        route: '/assistant',
        priority: 'medium',
        confidence: 0.76,
        source: 'ai-usage-gap',
      }
    ),
  ];
}

function buildAdaptationSignals({ adoptionScore, healthScore, recommendations, activeWorkspace, organizationType }) {
  const highPriority = recommendations.filter((item) => item.priority === 'high');
  return [
    {
      id: 'workspace-focus',
      label: 'Workspace focus',
      value: activeWorkspace?.name || 'Organization-wide',
      rationale: `CareDroid should bias navigation, prompts, and recommendations toward ${activeWorkspace?.name || organizationType || 'the active organization context'}.`,
    },
    {
      id: 'adoption-posture',
      label: 'Adoption posture',
      value: `${adoptionScore}% adoption`,
      rationale:
        adoptionScore >= 70
          ? 'The organization has broad pack/asset coverage, so adaptation should emphasize optimization.'
          : 'The organization has adoption room, so adaptation should emphasize missing packs and guided onboarding.',
    },
    {
      id: 'health-posture',
      label: 'Health posture',
      value: `${healthScore} health`,
      rationale:
        healthScore >= 75
          ? 'Healthy behavior supports advanced workflow and automation suggestions.'
          : 'Health signals call for targeted recommendations before adding more complexity.',
    },
    {
      id: 'next-best-actions',
      label: 'Next best actions',
      value: `${highPriority.length || recommendations.length} adaptive recommendations`,
      rationale: 'Recommendations are derived from usage, adoption, pack coverage, workspace, and customer success signals.',
    },
  ];
}

export function buildOrganizationIntelligenceProfile({
  organizationContext = {} as any,
  userIdentity = {} as any,
  workspaceContext = {} as any,
  analytics = null,
  customerSuccess = null,
  tenantAdministration = null,
}: any = {}) {
  const organization =
    organizationContext.organization ||
    userIdentity.organization ||
    tenantAdministration?.profile ||
    {};
  const platformContext = userIdentity.platformContext || {};
  const organizationType =
    organization.organizationType ||
    platformContext.organization?.organizationType ||
    tenantAdministration?.profile?.organizationType ||
    UNKNOWN;
  const enabledPackIds = new Set(
    uniq([
      platformContext.entitledPackIds,
      userIdentity.entitledPackIds,
      analytics?.enabledPackIds,
      analytics?.dashboards?.adoption?.packAdoption?.map((pack) => pack.id || pack.packId),
      customerSuccess?.metrics?.adoption?.enabledPackIds,
    ])
  );
  const availablePacks = [
    ...(platformContext.availablePacks || []),
    ...(platformContext.entitledPacks || []),
  ];
  const packMap = new Map();
  availablePacks.forEach((pack) => {
    const normalized = normalizePack(pack, enabledPackIds);
    packMap.set(normalized.id, { ...(packMap.get(normalized.id) || {}), ...normalized });
  });
  (analytics?.dimensions?.packUsage || analytics?.packAdoption || []).forEach((pack) => {
    const normalized = normalizePack(pack, enabledPackIds);
    packMap.set(normalized.id, { ...(packMap.get(normalized.id) || {}), ...normalized, usage: metricValue(pack) });
  });
  const packs = [...packMap.values()].sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.name.localeCompare(b.name));

  const departments = [
    ...(tenantAdministration?.departments || []),
    ...(platformContext.departments || []),
  ].map(normalizeDepartment);
  const workspaces = [
    ...(tenantAdministration?.workspaces || []),
    ...(workspaceContext.workspaces || []),
    ...(userIdentity.workspaceState?.workspaces || []),
  ].map(normalizeWorkspace);
  const uniqueDepartments = [...new Map(departments.map((department) => [department.id, department])).values()];
  const uniqueWorkspaces = [...new Map(workspaces.map((workspace) => [workspace.id, workspace])).values()];
  const activeWorkspace =
    workspaceContext.activeWorkspace ||
    uniqueWorkspaces.find((workspace) => workspace.id === workspaceContext.activeWorkspaceId) ||
    uniqueWorkspaces[0] ||
    null;

  const dashboards = analytics?.dashboards || {};
  const dimensions = analytics?.dimensions || {};
  const customerMetrics = customerSuccess?.metrics || {};
  const assetUsage = normalizeUsageRows(dimensions.assetUsage || customerMetrics.assetUsage?.topAssets || []);
  const aiUsageRows = normalizeUsageRows(dimensions.aiUsage || []);
  const packUsage = normalizeUsageRows(dimensions.packUsage || analytics?.packAdoption || []);
  const workspaceUsage = normalizeUsageRows(dimensions.workspaceUsage || []);
  const underusedAssets = normalizeUsageRows(dashboards.underusedAssets || []);
  const topAssets = normalizeUsageRows(dashboards.topAssets || customerMetrics.assetUsage?.topAssets || analytics?.topTools || []);

  const adoptionScore = safePercent(
    dashboards.adoption?.adoptionScore ?? customerMetrics.adoption?.value ?? analytics?.adoptionScore
  );
  const healthScore = safePercent(customerSuccess?.health?.score ?? adoptionScore);
  const aiUsage = dashboards.engagement?.aiUsageCount ?? customerMetrics.aiUsage?.value ?? analytics?.aiSessionCount ?? 0;
  const simulationsCompleted =
    dashboards.engagement?.simulationCompletionCount ?? customerMetrics.simulationsCompleted?.value ?? 0;
  const workflowsCompleted = customerMetrics.workflowsCompleted?.value ?? 0;
  const dashboardEngagement = dashboards.engagement?.dashboardEngagementCount ?? 0;

  const recommendationGroups = {
    missingPacks: buildMissingPackRecommendations({
      packs,
      organizationType,
      workspaces: uniqueWorkspaces,
    }),
    underusedAssets: buildUnderusedAssetRecommendations(underusedAssets),
    workflowOpportunities: buildWorkflowRecommendations({
      workflowsCompleted,
      activeWorkspaces: uniqueWorkspaces,
      departments: uniqueDepartments,
    }),
    simulationOpportunities: buildSimulationRecommendations({
      simulationsCompleted,
      workspaces: uniqueWorkspaces,
      departments: uniqueDepartments,
    }),
    automationOpportunities: buildAutomationRecommendations({
      dashboardEngagement,
      topAssets,
      assetUsage,
    }),
    aiAssistOpportunities: buildAiRecommendations({
      aiUsage,
      defaultAiAgentId: platformContext.defaultAiAgentId,
    }),
  };
  const recommendations = Object.values(recommendationGroups).flat();

  return {
    generatedAt: new Date().toISOString(),
    organization: {
      id: organization.id || organization.organizationId || 'organization',
      name: organization.name || organization.displayName || 'Organization',
      organizationType,
      subscriptionTier:
        organizationContext.subscription?.tier ||
        platformContext.subscription?.tier ||
        tenantAdministration?.subscriptions?.current?.tier ||
        'unknown',
      tenantId:
        organizationContext.tenant?.tenantId ||
        tenantAdministration?.profile?.tenantId ||
        organization.slug ||
        UNKNOWN,
      healthStatus: customerSuccess?.health?.status || (healthScore >= 75 ? 'healthy' : healthScore >= 50 ? 'watch' : 'at-risk'),
      retentionRisk: customerSuccess?.health?.retentionRisk || UNKNOWN,
    },
    departments: uniqueDepartments,
    workspaces: uniqueWorkspaces,
    activeWorkspace,
    packs,
    usage: {
      assetUsage,
      aiUsage: aiUsageRows,
      packUsage,
      workspaceUsage,
      topAssets,
      underusedAssets,
      totals: {
        assetUsage: customerMetrics.assetUsage?.value ?? assetUsage.reduce((total, row) => total + row.count, 0),
        aiUsage,
        simulationsCompleted,
        workflowsCompleted,
        dashboardEngagement,
        activeUsers: customerMetrics.activeUsers?.value ?? 0,
      },
    },
    adoption: {
      score: adoptionScore,
      enabledPackCount: dashboards.adoption?.enabledPackCount ?? customerMetrics.adoption?.enabledPackCount ?? enabledPackIds.size,
      enabledAssetCount: dashboards.adoption?.enabledAssetCount ?? customerMetrics.adoption?.enabledAssetCount ?? 0,
      totalAssetCount: dashboards.adoption?.totalAssetCount ?? customerMetrics.adoption?.totalAssetCount ?? 0,
      healthScore,
      healthStatus: customerSuccess?.health?.status || 'needs-data',
      retentionRisk: customerSuccess?.health?.retentionRisk || UNKNOWN,
    },
    recommendations: recommendationGroups,
    allRecommendations: recommendations,
    adaptationSignals: buildAdaptationSignals({
      adoptionScore,
      healthScore,
      recommendations,
      activeWorkspace,
      organizationType,
    }),
    sources: {
      organizationEngine: Boolean(organizationContext.organization),
      platformContext: Boolean(userIdentity.platformContext),
      workspaceContext: Boolean(workspaceContext.workspaces?.length),
      organizationAnalytics: Boolean(analytics),
      customerSuccess: Boolean(customerSuccess),
      tenantAdministration: Boolean(tenantAdministration),
    },
  };
}

export default buildOrganizationIntelligenceProfile;
