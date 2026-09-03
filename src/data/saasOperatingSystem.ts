import {
  PLATFORM_DASHBOARDS,
  PLATFORM_TIMELINE_EVENTS,
  PLATFORM_WORKFLOWS,
} from './platformOperatingSystem';
import { MARKETPLACE_ITEMS } from './marketplaceCatalog';
import { buildEnterpriseReadinessModel } from './enterpriseReadiness';

export const SAAS_OPERATING_SYSTEM_CHAIN = Object.freeze([
  'organization',
  'subscription',
  'products',
  'asset-packs',
  'assets',
  'workspaces',
  'users',
  'ai-agents',
  'automations',
]);

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueCount(values) {
  return new Set(asList(values).filter(Boolean)).size;
}

function readableStatus(score) {
  if (score >= 85) return 'Optimized';
  if (score >= 70) return 'Operational';
  return 'Needs Attention';
}

function countFromContext(primary, fallback = 0) {
  if (Array.isArray(primary)) return primary.length || fallback;
  if (typeof primary === 'number') return primary;
  return fallback;
}

export function buildSaasOperatingSystemModel(context: any = {}) {
  const {
    tenantContext: rawTenantContext = {},
    platformContext: rawPlatformContext = {},
    organization: rawOrganization = {},
    subscription: rawSubscription = {},
    products = [] as any[],
    packs = [] as any[],
    assets = [] as any[],
    workspaces = [] as any[],
    users = [] as any[],
    integrations = [] as any[],
  } = context;
  const tenantContext = rawTenantContext || {};
  const platformContext = rawPlatformContext || {};
  const organization = rawOrganization || {};
  const subscription = rawSubscription || {};

  const effectiveOrganization = organization?.id
    ? organization
    : platformContext.organization || {
        id: tenantContext.organizationId,
        name: tenantContext.organizationName,
      };
  const effectiveProducts = asList(products).length
    ? asList(products)
    : asList(platformContext.assignedProducts);
  const effectivePacks = asList(packs).length
    ? asList(packs)
    : asList(platformContext.entitledPacks);
  const assetCount = countFromContext(
    assets,
    uniqueCount(platformContext.entitledAssetIds || platformContext.enabledAssetIds),
  );
  const workspaceCount = countFromContext(workspaces, platformContext.activeWorkspace?.id ? 1 : 0);
  const userCount = countFromContext(users, tenantContext.userId ? 1 : 0);
  const aiAgentCount =
    countFromContext(platformContext.aiAgents || platformContext.enabledAiAgents, 0) ||
    MARKETPLACE_ITEMS.filter((item) => item.category === 'ai-agents').length;
  const automationCount =
    countFromContext(platformContext.automations, 0) || PLATFORM_WORKFLOWS.length;
  const effectiveSubscription = subscription?.tier
    ? subscription
    : platformContext.subscription || platformContext.currentSubscription || {};
  const enterpriseReadiness = buildEnterpriseReadinessModel({
    tenantContext,
    platformContext,
    organization: effectiveOrganization,
    integrations,
  });
  const tenantCompleteness = [
    Boolean(effectiveOrganization?.id || tenantContext.organizationId),
    Boolean(tenantContext.workspaceId || platformContext.activeWorkspace?.id),
    Boolean(tenantContext.role || platformContext.roleProfile),
    Boolean(effectiveSubscription?.tier || effectiveSubscription?.plan),
  ].filter(Boolean).length;
  const healthScore = Math.round(
    (enterpriseReadiness.readinessScore + tenantCompleteness * 25) / 2,
  );

  const chain = SAAS_OPERATING_SYSTEM_CHAIN.map((id) => {
    const conceptMap = {
      organization: {
        label: 'Organization',
        value:
          effectiveOrganization?.name || tenantContext.organizationName || 'Current organization',
        route: '/organization',
      },
      subscription: {
        label: 'Subscription',
        value: effectiveSubscription?.tier || effectiveSubscription?.plan || 'Plan pending',
        route: '/billing',
      },
      products: {
        label: 'Products',
        value: `${effectiveProducts.length} enabled`,
        route: '/products',
      },
      'asset-packs': {
        label: 'Asset Packs',
        value: `${effectivePacks.length} enabled`,
        route: '/asset-packs',
      },
      assets: {
        label: 'Assets',
        value: `${assetCount} entitled`,
        route: '/assets',
      },
      workspaces: {
        label: 'Workspaces',
        value: `${workspaceCount} configured`,
        route: '/tenant-admin',
      },
      users: {
        label: 'Users',
        value: `${userCount} known`,
        route: '/tenant-admin',
      },
      'ai-agents': {
        label: 'AI Agents',
        value: `${aiAgentCount} available`,
        route: '/agents',
      },
      automations: {
        label: 'Automations',
        value: `${automationCount} workflows`,
        route: '/workflows',
      },
    };
    return { id, ...conceptMap[id] };
  });

  const overviews = [
    {
      id: 'organization',
      title: 'Organization Overview',
      metric:
        effectiveOrganization?.name || tenantContext.organizationName || 'Current organization',
      detail: `Tenant ${tenantContext.organizationId || effectiveOrganization?.id || 'pending'} with ${workspaceCount} workspaces and ${userCount} known users.`,
      route: '/customer-portal',
      status:
        tenantContext.organizationId || effectiveOrganization?.id ? 'Configured' : 'Needs setup',
    },
    {
      id: 'products',
      title: 'Product Overview',
      metric: effectiveProducts.length,
      detail: `${effectiveProducts.length} products enabled across ${effectivePacks.length} asset packs.`,
      route: '/products',
      status: effectiveProducts.length ? 'Configured' : 'Needs setup',
    },
    {
      id: 'assets',
      title: 'Asset Overview',
      metric: assetCount,
      detail: `${assetCount} assets or entitlements connected to dashboards, tools, and packs.`,
      route: '/assets',
      status: assetCount ? 'Operational' : 'Needs setup',
    },
    {
      id: 'automations',
      title: 'Automation Overview',
      metric: automationCount,
      detail: `${automationCount} workflows and ${PLATFORM_TIMELINE_EVENTS.filter((event) => event.kind === 'workflow').length} recent workflow events tracked.`,
      route: '/automation',
      status: automationCount ? 'Operational' : 'Needs setup',
    },
    {
      id: 'tenant',
      title: 'Tenant Overview',
      metric: `${tenantCompleteness}/4`,
      detail:
        'Organization, workspace, role, and subscription context are used to configure the tenant.',
      route: '/tenant-admin',
      status: tenantCompleteness >= 3 ? 'Configured' : 'Needs setup',
    },
    {
      id: 'health',
      title: 'Health Overview',
      metric: healthScore,
      detail: `${enterpriseReadiness.status} enterprise posture with ${PLATFORM_DASHBOARDS.length} SaaS operating surfaces.`,
      route: '/saas-health',
      status: readableStatus(healthScore),
    },
  ];

  return {
    organizationName:
      effectiveOrganization?.name || tenantContext.organizationName || 'Current organization',
    healthScore,
    healthStatus: readableStatus(healthScore),
    chain,
    overviews,
    metrics: {
      products: effectiveProducts.length,
      assetPacks: effectivePacks.length,
      assets: assetCount,
      workspaces: workspaceCount,
      users: userCount,
      aiAgents: aiAgentCount,
      automations: automationCount,
      enterpriseReadiness: enterpriseReadiness.readinessScore,
    },
  };
}
