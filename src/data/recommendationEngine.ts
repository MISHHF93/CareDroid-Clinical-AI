import {
  buildRoleIntelligenceProfile,
  getRoleDisplayName,
  normalizeRole,
} from './roleIntelligenceLayer';
import { getUserFacingToolRegistryProjection } from './toolInventory';
import { MARKETPLACE_ITEMS } from './marketplaceCatalog';
import { SIMULATION_SCENARIOS } from './medicalSimulationCatalog';
import { PROTOCOL_PATHWAYS } from './protocolPathwayLibrary';

export const RECOMMENDATION_GROUPS = Object.freeze([
  { id: 'tools', label: 'Tools' },
  { id: 'packs', label: 'Packs' },
  { id: 'products', label: 'Products' },
  { id: 'aiAgents', label: 'AI Agents' },
  { id: 'simulations', label: 'Simulations' },
  { id: 'protocols', label: 'Protocols' },
]);

const CATEGORY_TO_GROUP = Object.freeze({
  'asset-packs': 'packs',
  workflows: 'packs',
  'ai-agents': 'aiAgents',
  simulations: 'simulations',
  protocols: 'protocols',
});

function list(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

function unique(values) {
  return [...new Set(list(values).flatMap(list).filter(Boolean).map(String))];
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function textIncludesAny(text, terms) {
  const haystack = normalizeText(text);
  return unique(terms).some((term) => term && haystack.includes(normalizeText(term)));
}

function itemText(item: any = {}) {
  return [
    item.id,
    item.title,
    item.name,
    item.label,
    item.summary,
    item.description,
    item.category,
    item.type,
    item.specialty,
    item.entitlement,
    ...(item.tags || []),
    ...(item.roles || []),
    ...(item.targetRoles || []),
    ...(item.targetUsers || []),
    ...(item.targetBuyers || []),
    ...(item.workspaces || []),
    ...(item.objectives || []),
    ...(item.tools || []),
    ...(item.indications || []),
    ...(item.redFlags || []),
  ].join(' ');
}

function signalTerms({ profile, workspace, organization, searchSignals, memoryFabricContext }: any = {}) {
  const commonSearches = [
    ...(memoryFabricContext?.organizationMemory?.commonSearches || []),
    ...(memoryFabricContext?.userMemory?.commonSearches || []),
    ...list(searchSignals),
  ];
  return unique([
    profile?.role,
    profile?.roleLabel,
    profile?.specialty,
    profile?.department,
    profile?.workspace,
    profile?.workspaceLabel,
    workspace?.id,
    workspace?.name,
    workspace?.type,
    organization?.id,
    organization?.name,
    organization?.type,
    organization?.organizationType,
    ...commonSearches.map((entry) => entry?.filter || entry?.category || entry?.tag || entry?.title),
  ]);
}

function scoreItem(item, { profile, terms, recentAssetIds, pinnedAssetIds, completedSimulationIds, workflowIds }) {
  const text = itemText(item);
  const reasons = [] as any[];
  let score = 20;
  const role = normalizeRole(profile?.role);
  const roleLabel = profile?.roleLabel || getRoleDisplayName(role);

  if (textIncludesAny(text, [role, roleLabel])) {
    score += 28;
    reasons.push(`${roleLabel} role fit`);
  }
  if (profile?.specialty && textIncludesAny(text, [profile.specialty])) {
    score += 18;
    reasons.push(`${profile.specialty} specialty fit`);
  }
  if (profile?.workspaceLabel && textIncludesAny(text, [profile.workspaceLabel, profile.workspace])) {
    score += 14;
    reasons.push('Active workspace fit');
  }
  if (textIncludesAny(text, terms)) {
    score += 12;
    reasons.push('Matches organization and search signals');
  }
  if (recentAssetIds.includes(item.id) || recentAssetIds.includes(item.assetId)) {
    score += 10;
    reasons.push('Recent activity');
  }
  if (pinnedAssetIds.includes(item.id) || pinnedAssetIds.includes(item.assetId)) {
    score += 14;
    reasons.push('Pinned preference');
  }
  if (completedSimulationIds.includes(item.id)) {
    score -= 16;
    reasons.push('Recently completed');
  }
  if (workflowIds.includes(item.id) || workflowIds.includes(item.workflowId)) {
    score += 10;
    reasons.push('Workflow activity');
  }

  return {
    score,
    reasons: reasons.length ? unique(reasons) : ['General capability discovery fit'],
  };
}

function buildRecommendation(type, item, scoring, sourceSignals = [] as any[]) {
  return {
    id: `${type}-${item.id || item.slug || item.title}`,
    type,
    title: item.title || item.name || item.label || item.id,
    summary: item.summary || item.description || item.subtitle || item.caseStem || '',
    route: item.route || item.path || (item.slug ? `/products/${item.slug}` : ''),
    score: scoring.score,
    reason: scoring.reasons[0],
    reasons: scoring.reasons,
    sourceSignals: unique(sourceSignals),
    item,
  };
}

function sortAndLimit(items, limit) {
  return items
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

function normalizeProductRows(productRows = [] as any[]) {
  return list(productRows)
    .map((row) => row?.product || row)
    .filter(Boolean)
    .map((product) => ({
      ...product,
      id: product.id || product.slug || product.name,
      title: product.name || product.title,
      summary: product.description || product.summary,
      route: product.slug ? `/products/${product.slug}` : product.route || '/products',
      tags: unique([
        ...(product.roles || []),
        ...(product.workspaces || []),
        ...(product.outcomes || []),
        ...(product.targetUsers || []),
        ...(product.targetBuyers || []),
      ]),
    }));
}

function resolveVisibleTools({ tools, visibleAssetIds, hiddenAssetIds }) {
  const visible = new Set(visibleAssetIds);
  const hidden = new Set(hiddenAssetIds);
  return list(tools)
    .filter((tool) => tool?.id)
    .filter((tool) => !hidden.has(tool.id))
    .filter((tool) => visible.size === 0 || visible.has(tool.id));
}

export function buildRecommendationEngineContext({
  account,
  user,
  preferences,
  activeWorkspace,
  workspaceState,
  workspaceContext,
  organization,
  platformContext,
  roleProfile,
  toolPreferences,
  activity,
  memoryFabricContext,
  searchSignals,
}: any = {}) {
  const profile = buildRoleIntelligenceProfile({
    account,
    user,
    preferences,
    activeWorkspace,
    workspaceState,
    toolPreferences,
    roleProfile,
    platformContext,
    activity,
  });
  const behavior = profile.behaviorSignals || {};
  const recentAssetIds = unique([
    ...(behavior.recentAssetIds || []),
    ...(toolPreferences?.recentTools || []),
    ...(memoryFabricContext?.workspaceMemory?.recentAssets || []),
    ...(memoryFabricContext?.userMemory?.recentAssets || []),
  ]);
  const pinnedAssetIds = unique([
    ...(toolPreferences?.pinned || []),
    ...(toolPreferences?.pinnedTools || []),
    ...(toolPreferences?.pinnedToolIds || []),
    ...(memoryFabricContext?.userMemory?.pinnedAssets || []),
  ]);
  const hiddenAssetIds = unique([
    ...(toolPreferences?.hiddenTools || []),
    ...(toolPreferences?.hiddenToolIds || []),
    ...(platformContext?.hiddenAssetIds || []),
  ]);
  const visibleAssetIds = unique([
    ...(workspaceContext?.visibleAssetIds || []),
    ...(memoryFabricContext?.workspaceMemory?.visibleAssetIds || []),
    ...(platformContext?.entitledAssetIds || []),
  ]);

  return {
    profile,
    workspace: activeWorkspace || workspaceContext?.activeWorkspace || platformContext?.workspace || {},
    organization: organization || platformContext?.organization || {},
    terms: signalTerms({
      profile,
      workspace: activeWorkspace || workspaceContext?.activeWorkspace,
      organization: organization || platformContext?.organization,
      searchSignals,
      memoryFabricContext,
    }),
    recentAssetIds,
    pinnedAssetIds,
    hiddenAssetIds,
    visibleAssetIds,
    completedSimulationIds: unique([
      ...(behavior.completedSimulationIds || []),
      ...(memoryFabricContext?.userMemory?.completedSimulationIds || []),
    ]),
    workflowIds: unique([
      ...(behavior.workflowIds || []),
      ...(memoryFabricContext?.userMemory?.savedWorkflows || []).map((workflow) => workflow.workflowId || workflow.id),
    ]),
  };
}

export function buildRecommendations({
  context,
  tools = getUserFacingToolRegistryProjection(),
  marketplaceItems = MARKETPLACE_ITEMS,
  productRows = [] as any[],
  simulations = SIMULATION_SCENARIOS,
  protocols = PROTOCOL_PATHWAYS,
  limitPerGroup = 6,
}: any = {}) {
  const ctx = context || buildRecommendationEngineContext({});
  const baseScoringInput = {
    profile: ctx.profile,
    terms: ctx.terms,
    recentAssetIds: ctx.recentAssetIds,
    pinnedAssetIds: ctx.pinnedAssetIds,
    completedSimulationIds: ctx.completedSimulationIds,
    workflowIds: ctx.workflowIds,
  };
  const visibleTools = resolveVisibleTools({
    tools,
    visibleAssetIds: ctx.visibleAssetIds,
    hiddenAssetIds: ctx.hiddenAssetIds,
  });

  const grouped: any = {
    tools: sortAndLimit(
      visibleTools.map((tool) =>
        buildRecommendation('tools', tool, scoreItem(tool, baseScoringInput), ['role', 'workspace', 'asset-usage']),
      ),
      limitPerGroup,
    ),
    packs: [],
    products: [],
    aiAgents: [],
    simulations: [],
    protocols: [],
  };

  for (const item of marketplaceItems) {
    const group = CATEGORY_TO_GROUP[item.category];
    if (!group) continue;
    const scoring = scoreItem(item, baseScoringInput);
    const type = group === 'packs' ? 'packs' : group;
    grouped[group].push(
      buildRecommendation(type, item, scoring, ['marketplace', item.category, 'organization']),
    );
  }

  grouped.products = normalizeProductRows(productRows).map((product) =>
    buildRecommendation('products', product, scoreItem(product, baseScoringInput), [
      'organization',
      'workspace',
      'product',
    ]),
  );

  for (const scenario of simulations) {
    grouped.simulations.push(
      buildRecommendation(
        'simulations',
        { ...scenario, route: `/simulation/${scenario.id}` },
        scoreItem(scenario, baseScoringInput),
        ['role', 'simulation', 'training'],
      ),
    );
  }

  for (const protocol of protocols) {
    grouped.protocols.push(
      buildRecommendation(
        'protocols',
        { ...protocol, route: `/protocols?protocol=${encodeURIComponent(protocol.id)}` },
        scoreItem(protocol, baseScoringInput),
        ['role', 'protocol', 'simulation'],
      ),
    );
  }

  grouped.packs = sortAndLimit(grouped.packs, limitPerGroup);
  grouped.products = sortAndLimit(grouped.products, limitPerGroup);
  grouped.aiAgents = sortAndLimit(grouped.aiAgents, limitPerGroup);
  grouped.simulations = sortAndLimit(grouped.simulations, limitPerGroup);
  grouped.protocols = sortAndLimit(grouped.protocols, limitPerGroup);

  const all = Object.values(grouped).flat();
  return {
    generatedAt: new Date().toISOString(),
    profile: ctx.profile,
    summary: {
      total: all.length,
      groups: Object.fromEntries(RECOMMENDATION_GROUPS.map((group) => [group.id, grouped[group.id].length])),
      topScore: (all[0] as any)?.score || 0,
    },
    groups: grouped,
    all,
  };
}

export function buildRecommendationEngine(input: any = {}) {
  const context = buildRecommendationEngineContext(input);
  return buildRecommendations({ ...input, context });
}
