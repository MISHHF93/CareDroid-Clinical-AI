import { getActiveWorkspaceRegistry, isFutureWorkspace } from '../config/workspace.config';
import { QUICK_COMMAND_DESTINATION_ITEMS, canExposeNavigationItem } from '../config/navigation.config';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { buildAssetInventoryProjection } from './assetInventory';
import { PLATFORM_DASHBOARDS, PLATFORM_NOTIFICATIONS, PLATFORM_WORKFLOWS } from './platformOperatingSystem';
import { SIMULATION_SCENARIOS } from './medicalSimulationCatalog';
import { PROTOCOL_PATHWAYS } from './protocolPathwayLibrary';
import { AI_MODEL_REGISTRY } from './aiModelRegistry';
import { OPERATIONS_CENTER_SURFACES } from './digitalOperationsCenter';
import { AUTOMATION_REGISTRY } from './automationRegistry';
import { MARKETPLACE_ITEMS } from './marketplaceCatalog';

function unique(values) {
  return [...new Set((values || []).flat().filter(Boolean).map(String))];
}

const ACTIVE_WORKSPACE_ID_SET = new Set(getActiveWorkspaceRegistry().map((workspace) => workspace.id));
const NON_WORKSPACE_SCOPE_IDS = new Set(['assistant', 'clinical', 'commercial']);
const FUTURE_MODULE_ROUTE_PREFIXES = Object.freeze([
  '/fleet',
  '/medical-iot',
  '/devices',
  '/laboratory',
  '/research',
  '/governance',
]);

function hasActiveWorkspaceScope(entry) {
  const workspaceIds = entry.workspaceIds || [];
  if (!workspaceIds.length) return true;
  return workspaceIds.some((workspaceId) => ACTIVE_WORKSPACE_ID_SET.has(workspaceId) || NON_WORKSPACE_SCOPE_IDS.has(workspaceId));
}

function isFutureModuleRoute(path = '') {
  return FUTURE_MODULE_ROUTE_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

const COMMERCIAL_CAPABILITY_GROUPS = Object.freeze([
  {
    id: 'products',
    title: 'Product Catalog',
    description: 'Search and launch CareDroid product packages, pack mappings, outcomes, and product detail pages.',
    path: CANONICAL_ROUTES.products,
    aliases: ['product catalog', 'products', 'solution catalog', 'product detail'],
  },
  {
    id: 'asset-packs',
    title: 'Asset Pack Builder',
    description: 'Discover sellable asset packs and the products, routes, and assets each pack powers.',
    path: CANONICAL_ROUTES.assetPacks,
    aliases: ['packs', 'asset packs', 'package assets', 'pack builder'],
  },
  {
    id: 'plans',
    title: 'Commercial Plans',
    description: 'Compare Starter, Professional, Enterprise, Academic, and Government packaging.',
    path: CANONICAL_ROUTES.plans,
    aliases: ['pricing', 'subscription', 'plans', 'commercial packaging'],
  },
  {
    id: 'specialties',
    title: 'Specialty Marketplace',
    description: 'Find capabilities by clinical specialty and launch specialty-specific solution pages.',
    path: CANONICAL_ROUTES.specialties,
    aliases: ['specialty', 'emergency department solution', 'cardiology solution', 'clinical specialty'],
  },
  {
    id: 'care-pathways',
    title: 'Care Pathways',
    description: 'Discover outcome-oriented pathways, pathway assets, and pathway launch routes.',
    path: CANONICAL_ROUTES.carePathways,
    aliases: ['pathways', 'care pathway', 'clinical pathway', 'outcome pathway'],
  },
  {
    id: 'agents',
    title: 'AI Agents Registry',
    description: 'Launch commercial AI agents and workspace agent experiences from search.',
    path: CANONICAL_ROUTES.agents,
    aliases: ['agents', 'ai agents', 'copilot agents', 'agent registry'],
  },
  {
    id: 'maturity-assessment',
    title: 'Hospital Maturity Assessment',
    description: 'Assess readiness and get consultative product recommendations.',
    path: CANONICAL_ROUTES.maturityAssessment,
    aliases: ['readiness', 'maturity', 'assessment', 'recommendations'],
  },
  {
    id: 'outcomes',
    title: 'Outcome Tracking',
    description: 'Open leadership outcome metrics and value tracking signals.',
    path: CANONICAL_ROUTES.outcomes,
    aliases: ['outcomes', 'metrics', 'leadership metrics', 'value outcomes'],
  },
  {
    id: 'value-tracking',
    title: 'Value Tracking',
    description: 'Review value metrics, adoption, and ROI signals for organizations.',
    path: CANONICAL_ROUTES.valueTracking,
    aliases: ['value', 'roi', 'adoption', 'value tracking'],
  },
  {
    id: 'product-intelligence',
    title: 'Product Intelligence',
    description: 'Measure SaaS product health from product to pack to asset to outcome.',
    path: CANONICAL_ROUTES.productIntelligence,
    aliases: ['product intelligence', 'product health', 'adoption score', 'roi score'],
  },
  {
    id: 'expansion-opportunities',
    title: 'Customer Expansion Opportunities',
    description: 'Find commercial growth recommendations by customer segment and pack usage.',
    path: CANONICAL_ROUTES.expansionOpportunities,
    aliases: ['expansion', 'upsell', 'cross sell', 'customer growth'],
  },
  {
    id: 'integrations-marketplace',
    title: 'Integrations Marketplace',
    description: 'Discover FHIR, HL7, SSO, scheduling, lab, telehealth, and integration options.',
    path: CANONICAL_ROUTES.integrationsMarketplace,
    aliases: ['integrations', 'fhir', 'hl7', 'sso', 'lab interface', 'telehealth'],
  },
  {
    id: 'integration-readiness',
    title: 'Integration Readiness',
    description: 'Review integration requirements, readiness gaps, and implementation next steps.',
    path: CANONICAL_ROUTES.integrationReadiness,
    aliases: ['readiness', 'integration readiness', 'implementation readiness'],
  },
  {
    id: 'solution-builder',
    title: 'Hospital Solution Builder',
    description: 'Build a recommended hospital solution from organization type, departments, and packs.',
    path: CANONICAL_ROUTES.solutionBuilder,
    aliases: ['solution builder', 'hospital builder', 'recommend solution', 'implementation plan'],
  },
  {
    id: 'automation-analytics',
    title: 'Automation Analytics',
    description: 'Track solution automation runs, adoption, failures, human overrides, and accepted AI recommendations.',
    path: CANONICAL_ROUTES.automationAnalytics,
    aliases: ['automation analytics', 'automation adoption', 'solution automation metrics', 'human overrides'],
  },
  {
    id: 'configuration-studio',
    title: 'Configuration Studio',
    description: 'Open admin tenant configuration for products, packs, workspaces, and enabled capabilities.',
    path: CANONICAL_ROUTES.configurationStudio,
    aliases: ['configuration', 'tenant configuration', 'configuration studio', 'admin setup'],
  },
]);

const COMMERCIAL_ROW_LEVEL_ENTRIES = Object.freeze([
  {
    id: 'specialty-emergency',
    title: 'Emergency Flow Intelligence Platform',
    description: 'Emergency specialty capabilities, ED flow workflows, EMS handoff, bottleneck reduction, triage, command routes, and alerts.',
    path: `${CANONICAL_ROUTES.specialties}/emergency`,
    workspaceIds: ['emergency'],
    aliases: [
      'ed',
      'emergency medicine',
      'emergency flow intelligence',
      'ems handoff',
      'ambulance offload',
      'bed flow',
      'boarding pressure',
      'surge prediction',
      'triage solution',
      'rapid response',
    ],
  },
  {
    id: 'specialty-cardiology',
    title: 'Cardiology Solution',
    description: 'Cardiology specialty capabilities, ACS pathways, cardiac calculators, and follow-up tools.',
    path: `${CANONICAL_ROUTES.specialties}/cardiology`,
    workspaceIds: ['cardiology'],
    aliases: ['heart', 'acs', 'cardiac', 'chest pain'],
  },
  {
    id: 'specialty-laboratory',
    title: 'Laboratory Solution',
    description: 'Laboratory interpretation, abnormal result workflows, specimen context, and lab tools.',
    path: `${CANONICAL_ROUTES.specialties}/laboratory`,
    workspaceIds: ['laboratory'],
    aliases: ['labs', 'lab interpreter', 'critical values'],
  },
  {
    id: 'pathway-sepsis',
    title: 'Sepsis Care Pathway',
    description: 'Find sepsis pathway assets, calculators, simulation, and escalation workflows.',
    path: `${CANONICAL_ROUTES.carePathways}/sepsis`,
    workspaceIds: ['emergency', 'icu'],
    aliases: ['sepsis', 'qsofa', 'sofa', 'infection', 'deterioration'],
  },
  {
    id: 'pathway-stroke',
    title: 'Stroke Care Pathway',
    description: 'Find stroke pathway assets, NIHSS support, simulations, and time-sensitive escalation.',
    path: `${CANONICAL_ROUTES.carePathways}/stroke`,
    workspaceIds: ['emergency', 'cardiology'],
    aliases: ['stroke', 'nihss', 'tia', 'neurology'],
  },
  {
    id: 'integration-fhir',
    title: 'FHIR Patient Integration',
    description: 'Launch FHIR patient integration discovery and readiness workflows.',
    path: `${CANONICAL_ROUTES.integrationsMarketplace}?category=fhir`,
    aliases: ['fhir', 'patient integration', 'ehr integration'],
  },
  {
    id: 'integration-hl7',
    title: 'HL7 ADT Integration',
    description: 'Discover HL7 ADT integration readiness and implementation requirements.',
    path: `${CANONICAL_ROUTES.integrationsMarketplace}?category=hl7`,
    aliases: ['hl7', 'adt', 'admission discharge transfer'],
  },
  {
    id: 'agent-emergency',
    title: 'Emergency AI Agent',
    description: 'Launch the Emergency agent with triage and escalation context.',
    path: `${CANONICAL_ROUTES.assistant}?agent=agent-emergency`,
    workspaceIds: ['emergency', 'assistant'],
    aliases: ['emergency agent', 'triage agent', 'red flags'],
  },
  {
    id: 'agent-operations',
    title: 'Operations AI Agent',
    description: 'Launch the Operations agent for maps, devices, alerts, and workflow coordination.',
    path: `${CANONICAL_ROUTES.assistant}?agent=agent-operations`,
    workspaceIds: ['operations', 'medical-iot', 'fleet', 'assistant'],
    aliases: ['operations agent', 'device agent', 'fleet agent'],
  },
]);

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
  return getActiveWorkspaceRegistry().map((workspace) => ({
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

const EMERGENCY_OS_DESTINATIONS = Object.freeze([
  {
    id: 'emergency-whiteboard',
    title: 'Emergency Whiteboard',
    path: CANONICAL_ROUTES.emergencyWhiteboard,
    aliases: ['whiteboard', 'board', 'patient flow', 'operational screen'],
  },
  {
    id: 'emergency-patients',
    title: 'Patients',
    path: CANONICAL_ROUTES.emergencyPatients,
    aliases: ['patients', 'patient list', 'patient snapshots'],
  },
  {
    id: 'emergency-journey',
    title: 'Patient Journey',
    path: CANONICAL_ROUTES.emergencyJourney,
    aliases: ['journey', 'patient journey', 'flow events', 'state transitions'],
  },
  {
    id: 'emergency-ems',
    title: 'EMS',
    path: CANONICAL_ROUTES.emergencyEms,
    aliases: ['ems', 'ambulance', 'pre-arrival', 'offload'],
  },
  {
    id: 'emergency-intake',
    title: 'Smart Intake',
    path: CANONICAL_ROUTES.emergencyIntake,
    aliases: ['intake', 'arrival', 'ocr', 'identity', 'registration'],
  },
  {
    id: 'emergency-queues',
    title: 'Queues',
    path: CANONICAL_ROUTES.emergencyQueues,
    aliases: ['queues', 'queue intelligence', 'waiting', 'who next'],
  },
  {
    id: 'emergency-reassessment',
    title: 'Reassessment',
    path: CANONICAL_ROUTES.emergencyReassessment,
    aliases: ['reassessment', 'reassessment due', 'safety review'],
  },
  {
    id: 'emergency-capacity',
    title: 'Capacity',
    path: CANONICAL_ROUTES.emergencyCapacity,
    aliases: ['capacity', 'rooms', 'occupancy', 'pressure'],
  },
  {
    id: 'emergency-boarding',
    title: 'Boarding',
    path: CANONICAL_ROUTES.emergencyBoarding,
    aliases: ['boarding', 'boarders', 'admission pending'],
  },
  {
    id: 'emergency-referrals',
    title: 'Referrals',
    path: CANONICAL_ROUTES.emergencyReferrals,
    aliases: ['referrals', 'consults', 'transfer', 'specialty'],
  },
  {
    id: 'emergency-provincial-health',
    title: 'Provincial Health',
    path: CANONICAL_ROUTES.emergencyProvincialHealth,
    aliases: ['provincial health', 'ohip', 'hie', 'external records', 'medications', 'allergies'],
  },
  {
    id: 'emergency-integrations',
    title: 'Integration Hub',
    path: CANONICAL_ROUTES.emergencyIntegrations,
    aliases: ['integrations', 'integration hub', 'fhir', 'hl7', 'iot', 'devices'],
  },
  {
    id: 'emergency-copilot',
    title: 'ED Copilot',
    path: CANONICAL_ROUTES.emergencyCopilot,
    aliases: ['copilot', 'assistant', 'ai', 'chat'],
  },
  {
    id: 'emergency-analytics',
    title: 'Analytics',
    path: CANONICAL_ROUTES.emergencyAnalytics,
    aliases: ['analytics', 'metrics', 'throughput', 'trends'],
  },
  {
    id: 'ai-governance',
    title: 'AI Governance',
    path: CANONICAL_ROUTES.aiGovernance,
    aliases: ['ai governance', 'governance', 'safety', 'compliance', 'model inventory'],
  },
  {
    id: 'emergency-settings',
    title: 'Settings',
    path: CANONICAL_ROUTES.emergencySettings,
    aliases: ['settings', 'thresholds', 'staff', 'configuration'],
  },
]);

function emergencyOsDestinationEntries() {
  return EMERGENCY_OS_DESTINATIONS.map((destination) => ({
    id: `emergency-os:${destination.id}`,
    sourceId: destination.id,
    kind: 'destination',
    category: 'emergency-os',
    type: 'navigation',
    title: destination.title,
    label: destination.title,
    description: `Open ${destination.title} in CareDroid Emergency OS.`,
    path: destination.path,
    workspaceIds: ['emergency'],
    aliases: unique([destination.id, ...(destination.aliases || [])]),
    assistantPrompt: `Open or explain the ${destination.title} Emergency OS workflow.`,
  }));
}

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
    .filter((destination) => !isFutureModuleRoute(destination.path))
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
  const entries = getActiveWorkspaceRegistry().flatMap((workspace) =>
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
  return OPERATIONS_CENTER_SURFACES.filter((surface) => !isFutureWorkspace(surface.id)).map((surface) => ({
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
  return AUTOMATION_REGISTRY.map((automation) => ({
    id: `automation:${automation.automationId}`,
    sourceId: automation.automationId,
    kind: 'automation',
    category: 'automation',
    type: automation.type,
    title: automation.title,
    label: automation.title,
    description: automation.description,
    path: `/workspace/${automation.workspace}/automations`,
    workspaceIds: unique([automation.workspace]),
    tags: unique([
      automation.status,
      automation.type,
      automation.department,
      automation.trigger,
      automation.riskLevel,
      automation.aiInvolvement,
      automation.outputs,
      automation.actions,
      automation.requiredAssets,
      automation.requiredWorkflows,
      automation.requiredIntegrations,
    ]),
    aliases: unique([
      automation.automationId,
      automation.title,
      automation.trigger,
      automation.workspace,
      ...automation.outputs,
    ]),
    assistantPrompt: `Help me review or adapt the ${automation.title} automation in the ${automation.workspace} workspace.`,
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

function commercialCapabilityEntries() {
  const groupEntries = COMMERCIAL_CAPABILITY_GROUPS.map((capability) => ({
    id: `commercial:${capability.id}`,
    sourceId: capability.id,
    kind: 'commercial',
    category: 'commercial',
    type: 'commercial-capability',
    title: capability.title,
    label: capability.title,
    description: capability.description,
    path: capability.path,
    workspaceIds: capability.workspaceIds || ['commercial'],
    tags: unique(['commercial', 'marketplace', capability.id]),
    aliases: unique(capability.aliases),
    assistantPrompt: `Help me find and launch ${capability.title}.`,
  }));

  const rowEntries = COMMERCIAL_ROW_LEVEL_ENTRIES.map((capability) => ({
    id: `commercial-row:${capability.id}`,
    sourceId: capability.id,
    kind: 'commercial',
    category: 'commercial',
    type: 'commercial-row',
    title: capability.title,
    label: capability.title,
    description: capability.description,
    path: capability.path,
    workspaceIds: unique([...(capability.workspaceIds || []), 'commercial']),
    tags: unique(['commercial', 'catalog-row', capability.id]),
    aliases: unique(capability.aliases),
    assistantPrompt: `Help me launch or explain ${capability.title}.`,
  }));

  return [...groupEntries, ...rowEntries];
}

export function buildSearchFirstDiscoveryEntries({
  assets,
  navigationPermissions = [],
  includeContextualDestinations = false,
  includePlatformCatalog = false,
} = {}) {
  const activeEmergencyEntries = [
    ...emergencyOsDestinationEntries(),
    ...navigationDestinationEntries({ navigationPermissions, includeContextualDestinations }),
  ];
  const platformCatalogEntries = includePlatformCatalog
    ? [
        ...workspaceEntries(),
        ...dashboardEntries(),
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
        ...commercialCapabilityEntries(),
      ]
    : [];

  const entries = [...activeEmergencyEntries, ...platformCatalogEntries]
    .filter(hasActiveWorkspaceScope)
    .filter((entry) => !isFutureModuleRoute(entry.path));

  return entries.map((entry) => ({
    ...entry,
    searchText: searchBlob(entry),
  }));
}

export function filterSearchFirstDiscoveryEntries(entries, { query = '', workspaceId = 'all', category = 'all' } = {}) {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const scoreEntry = (entry) => {
    if (!queryTokens.length) return 0;
    const label = String(entry.title || entry.label || '').toLowerCase();
    const aliases = (entry.aliases || []).map((alias) => String(alias).toLowerCase());
    const text = searchDiscoveryText(entry);
    return queryTokens.reduce((score, token) => {
      if (label === token) return score + 120;
      if (label.startsWith(token)) return score + 80;
      if (aliases.some((alias) => alias === token || alias.startsWith(token))) return score + 70;
      if (label.includes(token)) return score + 45;
      if (aliases.some((alias) => alias.includes(token))) return score + 35;
      if (text.includes(token)) return score + 10;
      return score;
    }, 0);
  };

  return entries
    .filter((entry) => workspaceId === 'all' || (entry.workspaceIds || []).includes(workspaceId))
    .filter((entry) => category === 'all' || entry.category === category || entry.type === category || entry.kind === category)
    .filter((entry) => {
      if (!queryTokens.length) return true;
      const text = searchDiscoveryText(entry);
      return queryTokens.every((token) => text.includes(token));
    })
    .sort((a, b) => scoreEntry(b) - scoreEntry(a) || String(a.title || a.label).localeCompare(String(b.title || b.label)));
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
