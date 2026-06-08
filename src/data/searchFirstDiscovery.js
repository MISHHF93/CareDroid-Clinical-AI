import { CARE_WORKSPACES } from '../config/workspace.config';
import { buildAssetInventoryProjection } from './assetInventory';
import { PLATFORM_DASHBOARDS, PLATFORM_NOTIFICATIONS, PLATFORM_WORKFLOWS } from './platformOperatingSystem';
import { SIMULATION_SCENARIOS } from './medicalSimulationCatalog';

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
    path: `/simulation?scenario=${scenario.id}`,
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

export function buildSearchFirstDiscoveryEntries({ assets } = {}) {
  const entries = [
    ...workspaceEntries(),
    ...dashboardEntries(),
    ...assetEntries(assets),
    ...workflowEntries(),
    ...simulationEntries(),
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
  return filterSearchFirstDiscoveryEntries(buildSearchFirstDiscoveryEntries(options), options);
}
