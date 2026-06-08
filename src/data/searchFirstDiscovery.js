import { CARE_WORKSPACES } from '../config/workspace.config';
import { QUICK_COMMAND_DESTINATION_ITEMS, canExposeNavigationItem } from '../config/navigation.config';
import { buildAssetInventoryProjection } from './assetInventory';
import { PLATFORM_DASHBOARDS, PLATFORM_NOTIFICATIONS, PLATFORM_WORKFLOWS } from './platformOperatingSystem';
import { SIMULATION_SCENARIOS } from './medicalSimulationCatalog';
import { PROTOCOL_PATHWAYS } from './protocolPathwayLibrary';
import { AI_MODEL_REGISTRY } from './aiModelRegistry';
import { OPERATIONS_CENTER_SURFACES } from './digitalOperationsCenter';
import { buildAutomationRuleLibrary } from './workflowAutomationBuilder';
import { MARKETPLACE_ITEMS } from './marketplaceCatalog';

function unique(values) {
  return [...new Set((values || []).flat().filter(Boolean).map(String))];
}

function searchBlob(entry) {
  return [
    entry.id,
    entry.sourceId,
    entry.title,
    entry.label,
    entry.name,
    entry.description,
    entry.category,
    entry.type,
    entry.path,
    ...(entry.tags || []),
    ...(entry.aliases || []),
    ...(entry.workspaceIds || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function searchDiscoveryText(entry) {
  return entry.searchText || searchBlob(entry);
}

function workspaceEntries() {
  return CARE_WORKSPACES.map((workspace) => ({
    id: `workspace:${workspace.id}`,
    sourceId: workspace.id,
    kind: 'workspace',
    category: 'workspace',
    title: `${workspace.label} Workspace`,
    label: `${workspace.label} Workspace`,
    description: workspace.description,
    path: workspace.path,
    workspaceIds: [workspace.id],
    aliases: [workspace.shortLabel, workspace.aiContext],
    assistantPrompt: `Help me understand what I should do first in the ${workspace.label} workspace.`,
  }));
}

function dashboardEntries() {
  return PLATFORM_DASHBOARDS.map((dashboard) => ({
    ...dashboard,
    id: `destination:${dashboard.id}`,
    sourceId: dashboard.id,
    kind: 'destination',
    title: dashboard.label,
    label: dashboard.label,
    type: dashboard.category,
    assistantPrompt: `Open or explain the ${dashboard.label} destination.`,
  }));
}

const NAVIGATION_DESTINATION_ALIASES = Object.freeze({
  search: ['find feature', 'where is', 'global search', 'search everything'],
  recommendations: ['recommended', 'suggested', 'next best action'],
  billing: ['subscription', 'plan', 'checkout', 'customer portal'],
  usage: ['analytics', 'adoption', 'activity'],
  'workflow-mining': ['journeys', 'bottlenecks', 'workflow analytics'],
  'workspace-dependency-graph': ['workspace graph', 'dependency graph'],
  'digital-twin-intelligence': ['twin ai', 'digital twin insights'],
  agents: ['ai agents', 'copilot agents'],
});

function navigationDestinationEntries({
  destinations = QUICK_COMMAND_DESTINATION_ITEMS,
  navigationPermissions = [],
  includeContextualDestinations = false,
} = {}) {
  return destinations
    .filter((destination) =>
      canExposeNavigationItem(destination, {
        permissions: navigationPermissions,
        includeContextual: includeContextualDestinations,
      })
    )
    .map((destination) => ({
    id: `nav-destination:${destination.id}`,
    sourceId: destination.id,
    kind: 'destination',
    category: 'destination',
    type: 'navigation',
    title: destination.label,
    label: destination.label,
    description: `Open ${destination.label}.`,
    path: destination.path,
    workspaceIds: [],
    tags: unique([
      destination.mobileLabel,
      destination.permission,
      ...(destination.matchPaths || []),
      ...(destination.matchPrefixes || []),
      ...(destination.legacyPaths || []),
    ]),
    aliases: unique([destination.id, destination.mobileLabel, ...(NAVIGATION_DESTINATION_ALIASES[destination.id] || [])]),
    assistantPrompt: `Open or explain where to find ${destination.label}.`,
  }));
}

function assetEntries(assets = buildAssetInventoryProjection()) {
  return assets
    .filter((asset) => asset?.mounting?.searchVisible !== false)
    .map((asset) => ({
      id: `asset:${asset.id}`,
      sourceId: asset.id,
      kind: 'asset',
      category: 'asset',
      type: asset.assetType,
      title: asset.title,
      label: asset.title,
      description: asset.description,
      path: asset.route || asset.mounting?.navigationPath || '/assets',
      workspaceIds: unique(asset.workspaceIds || asset.access?.workspaceIds),
      tags: unique([asset.category, asset.assetType, ...(asset.packIds || []), ...(asset.productIds || [])]),
      aliases: unique([asset.canonicalInventoryId, asset.capabilityId, ...(asset.mounting?.aiAliases || [])]),
      tool: asset.route ? { id: asset.id } : null,
      assistantPrompt: `Help me find and use the ${asset.title} asset in the current workspace.`,
    }));
}

function workflowEntries() {
  return PLATFORM_WORKFLOWS.map((workflow) => ({
    id: `workflow:${workflow.id}`,
    sourceId: workflow.id,
    kind: 'workflow',
    category: 'workflow',
    type: workflow.executionMode,
    title: workflow.name,
    label: workflow.name,
    description: workflow.description,
    path: `/workflows?workflow=${workflow.id}`,
    workspaceIds: workflow.workspaceIds || [],
    tags: unique((workflow.blocks || []).map((block) => [block.type, block.label, block.toolId, block.path])),
    aliases: unique((workflow.blocks || []).map((block) => [block.id, block.label, block.toolId])),
    assistantPrompt: `Help me launch or adapt the ${workflow.name}.`,
  }));
}

function simulationEntries() {
  return SIMULATION_SCENARIOS.map((scenario) => ({
    id: `simulation:${scenario.id}`,
    sourceId: scenario.id,
    kind: 'simulation',
    category: 'simulation',
    type: scenario.type,
    title: scenario.title,
    label: scenario.title,
    description: scenario.caseStem,
    path: `/simulation/${scenario.id}`,
    workspaceIds: unique([
      scenario.category === 'Medical IoT / Device Failure' ? 'medical-iot' : null,
      scenario.category === 'Fleet / Disaster Response' ? 'fleet' : null,
      scenario.category === 'Emergency' || scenario.category === 'Trauma' ? 'emergency' : null,
      scenario.category === 'Critical Care' ? 'icu' : null,
      scenario.category === 'Cardiology' ? 'cardiology' : null,
      scenario.category === 'Laboratory' ? 'laboratory' : null,
      'education',
      'simulation',
    ]),
    tags: unique([
      scenario.specialty,
      scenario.category,
      scenario.type,
      scenario.difficulty,
      ...(scenario.targetRoles || []),
      ...(scenario.requiredTools || []),
      ...(scenario.learningObjectives || []),
    ]),
    aliases: unique([scenario.specialty, scenario.category, ...(scenario.criticalActions || [])]),
    assistantPrompt: `Help me run the ${scenario.title} simulation and prepare a debrief.`,
  }));
}

function protocolEntries() {
  return PROTOCOL_PATHWAYS.map((pathway) => ({
    id: `protocol:${pathway.id}`,
    sourceId: pathway.id,
    kind: 'protocol',
    category: 'protocol',
    type: pathway.category,
    title: pathway.title,
    label: pathway.title,
    description: pathway.summary || pathway.subtitle,
    path: `/protocols?pathway=${pathway.id}`,
    workspaceIds: unique([
      pathway.category === 'sepsis' || pathway.category === 'stroke' || pathway.category === 'trauma' ? 'emergency' : null,
      pathway.category === 'respiratory failure' ? 'icu' : null,
      pathway.category === 'ACS' ? 'cardiology' : null,
      'clinical',
    ]),
    tags: unique([
      pathway.category,
      pathway.status,
      pathway.currentVersion,
      ...(pathway.indications || []),
      ...(pathway.steps || []),
      ...(pathway.redFlags || []),
    ]),
    aliases: unique([
      pathway.subtitle,
      ...(pathway.linkedCalculators || []).map((calculator) => [calculator.id, calculator.label]),
      ...(pathway.linkedSimulations || []).map((simulation) => [simulation.id, simulation.label]),
    ]),
    assistantPrompt: `Help me apply the ${pathway.title} pathway and identify the next safe action.`,
  }));
}

function aiModelEntries() {
  return AI_MODEL_REGISTRY.map((model) => ({
    id: `ai-model:${model.modelId}`,
    sourceId: model.modelId,
    kind: 'ai-model',
    category: 'ai-model',
    type: model.status,
    title: model.name,
    label: model.name,
    description: model.purpose,
    path: model.route || '/ai-models',
    workspaceIds: ['assistant', 'governance', 'clinical'],
    tags: unique([
      model.owner,
      model.status,
      model.costProfile,
      model.riskLevel,
      model.input,
      model.output,
      ...(model.artifactDependencies || []),
    ]),
    aliases: [model.modelId],
    assistantPrompt: `Explain how the ${model.name} AI model supports this workflow.`,
  }));
}

function marketplaceAgentEntries() {
  return MARKETPLACE_ITEMS.filter((item) => item.category === 'ai-agents').map((agent) => ({
    id: `ai-agent:${agent.id}`,
    sourceId: agent.id,
    kind: 'ai-agent',
    category: 'ai-agent',
    type: agent.category,
    title: agent.title,
    label: agent.title,
    description: agent.summary,
    path: `${agent.route || '/assistant'}?agent=${agent.id}`,
    workspaceIds: ['assistant', 'clinical', 'operations'],
    tags: unique([agent.owner, agent.entitlement, ...(agent.tags || [])]),
    aliases: [agent.id],
    assistantPrompt: `Use the ${agent.title} for this request.`,
  }));
}

function workspaceAgentEntries() {
  const entries = CARE_WORKSPACES.flatMap((workspace) =>
    (workspace.defaultAIAgents || workspace.workspaceProfile?.defaultAIAgents || []).map((agentId) => ({
      id: `ai-agent:${workspace.id}:${agentId}`,
      sourceId: agentId,
      kind: 'ai-agent',
      category: 'ai-agent',
      type: 'workspace-agent',
      title: String(agentId).replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
      label: String(agentId).replace(/-/g, ' '),
      description: `${workspace.label} workspace AI agent for ${workspace.description}`,
      path: `/assistant?agent=${agentId}`,
      workspaceIds: [workspace.id, 'assistant'],
      tags: unique([workspace.label, workspace.shortLabel, workspace.aiContext, ...(workspace.toolIds || [])]),
      aliases: [agentId, workspace.id],
      assistantPrompt: `Use the ${agentId} agent with ${workspace.label} workspace context.`,
    }))
  );
  return entries;
}

function operationEntries() {
  return OPERATIONS_CENTER_SURFACES.map((surface) => ({
    id: `operation:${surface.id}`,
    sourceId: surface.id,
    kind: 'operation',
    category: 'operation',
    type: surface.domain,
    title: surface.title,
    label: surface.title,
    description: surface.summary,
    path: surface.path,
    workspaceIds: unique(['operations', surface.id === 'medical-iot' ? 'medical-iot' : null, surface.id === 'fleet' ? 'fleet' : null]),
    tags: unique([
      surface.domain,
      surface.status,
      ...(surface.roles || []),
      ...(surface.permissions || []),
      ...(surface.metrics || []).map((metric) => [metric.label, metric.value]),
    ]),
    aliases: [surface.id],
    assistantPrompt: `Help me inspect the ${surface.title} operation surface.`,
  }));
}

function automationEntries() {
  return buildAutomationRuleLibrary().map((rule) => ({
    id: `automation:${rule.id}`,
    sourceId: rule.id,
    kind: 'automation',
    category: 'automation',
    type: rule.executionMode,
    title: rule.name,
    label: rule.name,
    description: rule.goal,
    path: `/workflows?automation=${rule.id}`,
    workspaceIds: unique([
      /device|maintenance/i.test(rule.name) ? 'medical-iot' : null,
      /news|clinician|lab|potassium/i.test(rule.name) ? 'emergency' : null,
      'operations',
    ]),
    tags: unique([
      rule.status,
      rule.summary,
      rule.automationOutcome,
      rule.trigger?.label,
      rule.trigger?.description,
      rule.trigger?.source,
      rule.condition?.label,
      rule.condition?.description,
      rule.action?.label,
      rule.action?.description,
      rule.action?.destination,
    ]),
    aliases: [rule.trigger?.id, rule.condition?.id, rule.action?.id],
    assistantPrompt: `Help me review or adapt the ${rule.name} automation.`,
  }));
}

function notificationEntries() {
  return PLATFORM_NOTIFICATIONS.map((notification) => ({
    ...notification,
    id: `notification:${notification.id}`,
    sourceId: notification.id,
    kind: 'notification',
    category: 'notification',
    label: notification.title,
    path: '/notifications',
    tags: [notification.priority, notification.type],
    assistantPrompt: `Help me triage this notification: ${notification.title}.`,
  }));
}

export function buildSearchFirstDiscoveryEntries({
  assets,
  navigationPermissions = [],
  includeContextualDestinations = false,
} = {}) {
  const entries = [
    ...workspaceEntries(),
    ...dashboardEntries(),
    ...navigationDestinationEntries({ navigationPermissions, includeContextualDestinations }),
    ...assetEntries(assets),
    ...workflowEntries(),
    ...automationEntries(),
    ...simulationEntries(),
    ...protocolEntries(),
    ...aiModelEntries(),
    ...marketplaceAgentEntries(),
    ...workspaceAgentEntries(),
    ...operationEntries(),
    ...notificationEntries(),
  ];

  return entries.map((entry) => ({
    ...entry,
    searchText: searchBlob(entry),
  }));
}

export function filterSearchFirstDiscoveryEntries(entries, { query = '', workspaceId = 'all', category = 'all' } = {}) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  return entries
    .filter((entry) => workspaceId === 'all' || (entry.workspaceIds || []).includes(workspaceId))
    .filter((entry) => category === 'all' || entry.category === category || entry.type === category || entry.kind === category)
    .filter((entry) => {
      if (!queryTokens.length) return true;
      const text = searchDiscoveryText(entry);
      return queryTokens.every((token) => text.includes(token));
    })
    .sort((a, b) => String(a.title || a.label).localeCompare(String(b.title || b.label)));
}

export function buildSearchFirstResults(options = {}) {
  const normalizedQuery = String(options.query || '').trim();
  return filterSearchFirstDiscoveryEntries(
    buildSearchFirstDiscoveryEntries({
      ...options,
      includeContextualDestinations: options.includeContextualDestinations ?? Boolean(normalizedQuery),
    }),
    options
  );
}
