import { PROTOCOL_PATHWAYS } from './protocolPathwayLibrary';
import { SIMULATION_SCENARIOS } from './medicalSimulationCatalog';
import { REGISTRY } from './clinicalToolIdContract';
import { getUserFacingToolRegistryProjection } from './toolInventory';
import {
  buildProfileToolGraph,
  getProfileAssistantRecommendations,
} from './profileToolSegmentation';
import { compileUserProfile } from '../config/userProfileCompiler';

export const DISCOVERY_SECTION_IDS = Object.freeze({
  NEW_TOOLS: 'new-tools',
  RECOMMENDED_TOOLS: 'recommended-tools',
  UNDERUSED_TOOLS: 'underused-tools',
  SIMULATIONS: 'simulations',
  WORKFLOWS: 'workflows',
  PROTOCOLS: 'protocols',
});

const NEW_TOOL_IDS = Object.freeze([
  REGISTRY.clinicalDecisionSupport,
  REGISTRY.clinicalDocumentationAssistant,
  REGISTRY.clinicalKnowledgeGraph,
  REGISTRY.predictiveAnalyticsDashboard,
  REGISTRY.researchEvidenceHub,
  REGISTRY.digitalOperationsCenter,
  REGISTRY.simulationSuite,
  REGISTRY.laboratoryDashboard,
  REGISTRY.medical3dViewer,
]);

const DEFAULT_DISCOVERY_PROFILE = Object.freeze({
  role: 'medical student',
  specialty: 'medical education',
  department: 'inpatient',
  workspace: 'all',
  permissionLevel: 'learner',
  permissions: ['USE_CALCULATORS', 'USE_DRUG_CHECKER', 'USE_LAB_INTERPRETER', 'USE_PROTOCOLS', 'USE_AI_CHAT'],
  preferredTools: [],
  recentTools: [],
  pinnedTools: [],
  hiddenTools: [],
  clinicalAccess: true,
  operationsAccess: false,
});

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function normalizeTool(tool, reason = '') {
  return {
    id: tool.id,
    title: tool.name || tool.label || tool.id,
    description: tool.description || tool.safetyCopy || 'CareDroid platform capability.',
    category: tool.category || tool.presentationCategory || 'Clinical',
    path: tool.path || tool.route || tool.navigationPath || '/tools',
    reason,
    source: 'tool-inventory',
    profileScore: tool.profileScore || 0,
  };
}

function makeSection(id, title, description, items) {
  return {
    id,
    title,
    description,
    items: uniqueById(items).slice(0, 8),
  };
}

function findTool(tools, id) {
  return tools.find((tool) => tool.id === id);
}

function buildNewTools(tools) {
  return NEW_TOOL_IDS.map((id) => findTool(tools, id))
    .filter(Boolean)
    .map((tool) => normalizeTool(tool, 'Recently added or newly wired platform capability.'));
}

function isWorkflowTool(tool) {
  const text = [
    tool.id,
    tool.name,
    tool.label,
    tool.category,
    tool.description,
    tool.path,
    tool.launchType,
  ]
    .join(' ')
    .toLowerCase();
  return (
    text.includes('workflow') ||
    text.includes('assistant') ||
    text.includes('documentation') ||
    text.includes('research') ||
    text.includes('knowledge graph') ||
    text.includes('operations center')
  );
}

function buildUnderusedTools(graph, recentToolIds = [] as any[], limit = 8) {
  const recent = new Set(recentToolIds);
  return graph.visibleTools
    .filter((tool) => !recent.has(tool.id))
    .filter((tool) => tool.profileScore >= 15 && tool.profileScore < 50)
    .slice(0, limit)
    .map((tool) => normalizeTool(tool, 'Relevant to your profile but not in your recent tools.'));
}

function buildSimulationItems(profile, limit = 8) {
  const role = profile?.role;
  const specialty = profile?.specialty;
  return SIMULATION_SCENARIOS.filter((scenario) => {
    if (!role && !specialty) return true;
    return (
      scenario.targetRoles?.includes(role) ||
      scenario.specialty?.toLowerCase().includes(String(specialty || '').toLowerCase())
    );
  })
    .slice(0, limit)
    .map((scenario) => ({
      id: scenario.id,
      title: scenario.title,
      description: scenario.caseStem,
      category: scenario.category,
      path: `/simulation/${scenario.id}`,
      reason: `${scenario.difficulty} ${scenario.type.replace(/-/g, ' ')}`,
      source: 'simulation-catalog',
    }));
}

function buildProtocolItems(profile, limit = 8) {
  return PROTOCOL_PATHWAYS
    .slice(0, limit)
    .map((protocol) => ({
      id: protocol.id,
      title: protocol.title,
      description: protocol.summary,
      category: protocol.category,
      path: '/protocols',
      reason: `${protocol.currentVersion} · ${protocol.linkedCalculators.length} calculators · ${protocol.linkedSimulations.length} simulations`,
      source: 'protocol-pathway-library',
    }));
}

export function buildCapabilityDiscovery({
  profile = DEFAULT_DISCOVERY_PROFILE,
  saasRole = null,
  tools = getUserFacingToolRegistryProjection(),
  recentToolIds = [] as any[],
}: any = {}) {
  const compiled = saasRole ? compileUserProfile({ saasRole, tools }) : null;
  const effectiveTools = compiled?.tools.visible?.length ? compiled.tools.visible : tools;
  const effectiveProfile = compiled?.segmentationProfile || profile;
  const graph = buildProfileToolGraph({ tools: effectiveTools, profile: effectiveProfile });
  const recommendedFromProfile = getProfileAssistantRecommendations(effectiveProfile, effectiveTools, 8)
    .map((item) => findTool(graph.visibleTools, item.toolId))
    .filter(Boolean)
    .map((tool) => normalizeTool(tool, `${effectiveProfile.role || profile.role} profile match`));

  const workflowTools = graph.visibleTools
    .filter(isWorkflowTool)
    .slice(0, 8)
    .map((tool) => normalizeTool(tool, 'Workflow or guided capability connected to your profile.'));

  const sections = [
    makeSection(
      DISCOVERY_SECTION_IDS.NEW_TOOLS,
      'New tools',
      'Recently added CareDroid capabilities you may not have seen yet.',
      buildNewTools(tools)
    ),
    makeSection(
      DISCOVERY_SECTION_IDS.RECOMMENDED_TOOLS,
      'Recommended tools',
      'Personalized from your role, specialty, workspace, pinned tools, and recent activity.',
      recommendedFromProfile
    ),
    makeSection(
      DISCOVERY_SECTION_IDS.UNDERUSED_TOOLS,
      'Underused tools',
      'Relevant capabilities that are not showing up in your recent tool history.',
      buildUnderusedTools(graph, recentToolIds)
    ),
    makeSection(
      DISCOVERY_SECTION_IDS.SIMULATIONS,
      'Simulations',
      'Training scenarios matched to your clinical or operational profile.',
      buildSimulationItems(effectiveProfile)
    ),
    makeSection(
      DISCOVERY_SECTION_IDS.WORKFLOWS,
      'Workflows',
      'Guided assistants, dashboards, and operational flows that connect multiple platform modules.',
      workflowTools
    ),
    makeSection(
      DISCOVERY_SECTION_IDS.PROTOCOLS,
      'Protocols',
      'Clinical pathways with linked calculators, simulations, and explanation support.',
      buildProtocolItems(effectiveProfile)
    ),
  ];

  return {
    profile: effectiveProfile,
    saasRole: compiled?.saasRole || null,
    sections,
    summary: {
      totalItems: sections.reduce((total, section) => total + section.items.length, 0),
      recommended: sections.find((section) => section.id === DISCOVERY_SECTION_IDS.RECOMMENDED_TOOLS)?.items.length || 0,
      underused: sections.find((section) => section.id === DISCOVERY_SECTION_IDS.UNDERUSED_TOOLS)?.items.length || 0,
      simulations: sections.find((section) => section.id === DISCOVERY_SECTION_IDS.SIMULATIONS)?.items.length || 0,
      workflows: sections.find((section) => section.id === DISCOVERY_SECTION_IDS.WORKFLOWS)?.items.length || 0,
      protocols: sections.find((section) => section.id === DISCOVERY_SECTION_IDS.PROTOCOLS)?.items.length || 0,
    },
  };
}

export function getCareDroidDidYouKnowSuggestions({
  profile = DEFAULT_DISCOVERY_PROFILE,
  saasRole = null,
  tools = getUserFacingToolRegistryProjection(),
  recentToolIds = [] as any[],
  limit = 3,
}: any = {}) {
  const discovery = buildCapabilityDiscovery({ profile, saasRole, tools, recentToolIds });
  return discovery.sections
    .flatMap((section) =>
      section.items.map((item) => ({
        id: `did-you-know-${item.id}`,
        label: `Did you know CareDroid can also ${item.title}?`,
        description: item.description,
        kind: 'route',
        path: item.path,
        toolId: item.id,
        source: `capability-discovery:${section.id}`,
        defaultRank: 95,
        keywords: [
          'did you know',
          'discover',
          'capability',
          section.title,
          item.title,
          item.category,
          profile?.role,
          profile?.specialty,
        ],
      }))
    )
    .slice(0, limit);
}
