import { REGISTRY } from './clinicalToolIdContract';
import { CANONICAL_ROUTES } from '../config/routes.config';
import {
  getUserFacingToolRegistryProjection,
  TOOL_EXECUTOR_STATUS,
  TOOL_LAUNCH_TYPES,
  TOOL_SURFACES,
} from './toolInventory';
import { getAssetAwareToolProjection } from './assetAccess';
import { getRoleBasedAssetRecommendations } from './assetRecommendation';
import { getMountedCapabilityById, getMountedCapabilityGraph } from './mountedCapabilityGraph';

export const COMMAND_DASHBOARD_PROMPTS = Object.freeze([
  {
    id: 'clinical-question',
    title: 'Start clinical question',
    prompt: 'Help me think through this patient presentation:',
    description: 'Open the focused assistant workspace with a case-first prompt.',
  },
  {
    id: 'clinical-decision-support',
    title: 'Clinical decision support',
    prompt: 'Open clinical decision support for this patient presentation.',
    toolId: REGISTRY.clinicalDecisionSupport,
    description: 'Risk stratify symptoms and recommend calculators, workflows, labs, imaging, and escalation.',
  },
  {
    id: 'open-protocol-library',
    title: 'Open protocol library',
    prompt: 'Open the protocol and clinical pathway library for this case.',
    toolId: REGISTRY.protocols,
    description: 'Review pathways, version history, linked calculators, simulations, and AI explanations.',
  },
  {
    id: 'open-research-hub',
    title: 'Open research hub',
    prompt: 'Open the Research and Evidence Hub for this clinical topic.',
    toolId: REGISTRY.researchEvidenceHub,
    description: 'Review literature, guidelines, evidence summaries, study tracking, and citations.',
  },
  {
    id: 'draft-documentation',
    title: 'Draft documentation',
    prompt: 'Open the Clinical Documentation Assistant to draft a note for this encounter.',
    toolId: REGISTRY.clinicalDocumentationAssistant,
    description: 'Draft SOAP, H&P, progress, discharge, consult, procedure, and patient instruction notes.',
  },
  {
    id: 'open-knowledge-graph',
    title: 'Open knowledge graph',
    prompt: 'Open the Clinical Knowledge Graph and show graph relationships for this case.',
    toolId: REGISTRY.clinicalKnowledgeGraph,
    description: 'Explore assets, packs, products, roles, routes, workflows, agents, and integration relationships.',
  },
  {
    id: 'open-predictive-analytics',
    title: 'Open predictive analytics',
    prompt: 'Open predictive analytics and show demo risk predictions.',
    toolId: REGISTRY.predictiveAnalyticsDashboard,
    description: 'Review deterioration, readmission, sepsis, ICU, device, and fleet maintenance predictions.',
  },
  {
    id: 'open-operations',
    title: 'Open operations',
    prompt: 'Open the Operations hub for the current operational role.',
    route: CANONICAL_ROUTES.operations,
    description: 'Combine Digital Twin, Hospital Map, Medical IoT, Fleet, Notifications, and System Health.',
  },
  {
    id: 'interpret-labs',
    title: 'Interpret labs',
    prompt: 'Interpret these lab results and flag critical values:',
    toolId: REGISTRY.labInterp,
    description: 'Launch the lab interpreter workflow or seed assistant guidance.',
  },
  {
    id: 'open-laboratory',
    title: 'Show lab dashboard',
    prompt: 'Open the laboratory dashboard and show abnormal labs.',
    toolId: REGISTRY.laboratoryDashboard,
    description: 'Review demo lab results, specimen queue, reference ranges, and trends.',
  },
  {
    id: 'start-simulation',
    title: 'Start simulation',
    prompt: 'Start a medical simulation scenario.',
    toolId: REGISTRY.simulationSuite,
    description: 'Launch demo virtual patient training scenarios with AI tutor context.',
  },
  {
    id: 'practice-sepsis-case',
    title: 'Practice sepsis case',
    prompt: 'Practice the sepsis deterioration simulation case.',
    toolId: REGISTRY.scenarioPlayer,
    description: 'Open the scenario player with vitals, labs, decisions, checklist, and debrief.',
  },
  {
    id: 'show-simulation-outcomes',
    title: 'Show simulation outcomes',
    prompt: 'Show my simulation outcomes and competency weak areas.',
    toolId: REGISTRY.simulationOutcomes,
    description: 'Review demo completion trends, competency coverage, and recommended practice.',
  },
  {
    id: 'show-competencies',
    title: 'Show competencies',
    prompt: 'Show my competency status and training gaps.',
    toolId: REGISTRY.competencyPlatform,
    description: 'Review simulation completion, skill completion, training status, and gaps.',
  },
  {
    id: 'show-credentials',
    title: 'Show credentials',
    prompt: 'Show my credentials, certifications, and CME credits.',
    toolId: REGISTRY.credentialingPlatform,
    description: 'Review certifications, CME credits, renewal status, and credential readiness.',
  },
  {
    id: 'open-3d-viewer',
    title: 'Open 3D viewer',
    prompt: 'Open the 3D anatomy viewer.',
    toolId: REGISTRY.medical3dViewer,
    description: 'Open the asset-safe medical model viewer fallback.',
  },
  {
    id: 'medication-safety',
    title: 'Check medication safety',
    prompt: 'Check for drug interactions between ',
    toolId: REGISTRY.drugCheck,
    description: 'Open medication safety support using the canonical drug checker.',
  },
  {
    id: 'severity-score',
    title: 'Calculate severity score',
    prompt: 'Help me choose and calculate the right severity score for this case.',
    toolId: REGISTRY.qsofa,
    description: 'Jump to high-value severity calculators with assistant context.',
  },
]);

export const COMMAND_DASHBOARD_GROUPS = Object.freeze({
  clinical: Object.freeze([
    REGISTRY.clinicalDecisionSupport,
    REGISTRY.qsofa,
    REGISTRY.news2,
    REGISTRY.sofaScore,
    REGISTRY.hasBled,
    REGISTRY.ascvdRisk,
    REGISTRY.phq9,
    REGISTRY.gad7,
    REGISTRY.wellsPe,
  ]),
  reference: Object.freeze([
    REGISTRY.guidelineRag,
    REGISTRY.researchEvidenceHub,
    REGISTRY.drugCheck,
    REGISTRY.labInterp,
    REGISTRY.abgInterpreter,
    REGISTRY.protocols,
    REGISTRY.antibioticGuide,
    REGISTRY.procedures,
  ]),
  fleet: Object.freeze([
    REGISTRY.liveTrackingMap,
    REGISTRY.fleetLiveMap,
    REGISTRY.hospitalMap,
    REGISTRY.hospitalOperationsCommand,
    REGISTRY.deviceFleetManagement,
    REGISTRY.fleetCommand,
    REGISTRY.routeOptimizer,
    REGISTRY.predictiveMaintenance,
    REGISTRY.dispatchAi,
  ]),
  medicalIot: Object.freeze([
    REGISTRY.medicalIotDashboard,
    REGISTRY.telemetryMonitoring,
    REGISTRY.deviceMaintenance,
  ]),
  expandedCare: Object.freeze([
    REGISTRY.competencyPlatform,
    REGISTRY.credentialingPlatform,
    REGISTRY.simulationSuite,
    REGISTRY.scenarioPlayer,
    REGISTRY.simulationOutcomes,
    REGISTRY.debriefDashboard,
    REGISTRY.competencyDashboard,
    REGISTRY.laboratoryDashboard,
    REGISTRY.medical3dViewer,
  ]),
});

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function toolById(tools) {
  return Object.fromEntries(tools.map((tool) => [tool.id, tool]));
}

function selectToolsByIds(ids, byId) {
  return ids.map((id) => byId[id]).filter(Boolean);
}

function enrichWithMountedCapability(tool) {
  const capability = getMountedCapabilityById(tool.id);
  if (!capability) return tool;
  return {
    ...tool,
    mountedCapability: capability,
    packIds: capability.packIds,
    productIds: capability.productIds,
    workspaceIds: capability.workspaceIds,
    roleIds: capability.roleIds,
    aiAliases: capability.aiAliases,
    demoStatus: capability.demoStatus,
    backendSupport: capability.backendSupport,
  };
}

function fallbackClinicalTools(tools) {
  return tools.filter(
    (tool) =>
      tool.category === 'Calculator' ||
      tool.surface === TOOL_SURFACES.CALCULATOR_FORM ||
      tool.surface === TOOL_SURFACES.CHAT_ASSISTED
  );
}

function fallbackReferenceTools(tools) {
  return tools.filter(
    (tool) =>
      tool.category === 'Reference' ||
      ['Diagnostic', 'AI Tools'].includes(tool.category) ||
      tool.launchType === TOOL_LAUNCH_TYPES.CLINICAL_PAGE
  );
}

function fallbackFleetTools(tools) {
  return tools.filter(
    (tool) =>
      tool.category === 'Fleet' ||
      tool.category === 'Hospital Operations' ||
      tool.surface === TOOL_SURFACES.FLEET_PAGE ||
      tool.surface === TOOL_SURFACES.HOSPITAL_OPERATIONS
  );
}

function fallbackMedicalIotTools(tools) {
  return tools.filter((tool) => tool.category === 'IoT' || tool.surface === TOOL_SURFACES.IOT_DASHBOARD);
}

function countByPredicate(tools, predicate) {
  return tools.reduce((count, tool) => count + (predicate(tool) ? 1 : 0), 0);
}

function countByField(tools, field, fallback = 'Unknown') {
  const counts = tools.reduce((acc, tool) => {
    const key = tool[field] || fallback;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

function readinessDistribution(tools) {
  return [
    {
      name: 'Backend-backed',
      value: countByPredicate(
        tools,
        (tool) =>
          tool.launchType === TOOL_LAUNCH_TYPES.BACKEND_BACKED ||
          tool.executorStatus === TOOL_EXECUTOR_STATUS.REGISTERED
      ),
    },
    {
      name: 'Local / routed',
      value: countByPredicate(
        tools,
        (tool) =>
          tool.launchType === TOOL_LAUNCH_TYPES.LOCAL_ONLY ||
          tool.launchType === TOOL_LAUNCH_TYPES.FLEET_LOCAL ||
          tool.launchType === TOOL_LAUNCH_TYPES.IOT_LOCAL ||
          tool.launchType === TOOL_LAUNCH_TYPES.HOSPITAL_LOCAL ||
          tool.launchType === TOOL_LAUNCH_TYPES.CLINICAL_PAGE ||
          tool.launchType === TOOL_LAUNCH_TYPES.HUB
      ),
    },
    {
      name: 'Assistant-guided',
      value: countByPredicate(tools, (tool) => tool.launchType === TOOL_LAUNCH_TYPES.CHAT_ASSISTED),
    },
    {
      name: 'Unsupported/planned',
      value: countByPredicate(
        tools,
        (tool) =>
          tool.launchType === TOOL_LAUNCH_TYPES.UNSUPPORTED_PLANNED ||
          tool.executorStatus === TOOL_EXECUTOR_STATUS.UNSUPPORTED
      ),
    },
  ].filter((item) => item.value > 0);
}

export function buildCommandDashboardModel(tools = getUserFacingToolRegistryProjection()) {
  const allTools = uniqueById(tools.map(enrichWithMountedCapability));
  const byId = toolById(allTools);
  const clinicalFeatured = uniqueById([
    ...selectToolsByIds(COMMAND_DASHBOARD_GROUPS.clinical, byId),
    ...fallbackClinicalTools(allTools),
  ]).slice(0, 8);
  const calculatorFeatured = uniqueById([
    ...selectToolsByIds(
      [
        REGISTRY.qsofa,
        REGISTRY.news2,
        REGISTRY.sofaScore,
        REGISTRY.hasBled,
        REGISTRY.heartScore,
        REGISTRY.nihss,
        REGISTRY.ascvdRisk,
        REGISTRY.wellsPe,
      ],
      byId
    ),
    ...fallbackClinicalTools(allTools).filter(
      (tool) => tool.category === 'Calculator' || tool.surface === TOOL_SURFACES.CALCULATOR_FORM
    ),
  ]).slice(0, 8);
  const referenceFeatured = uniqueById([
    ...selectToolsByIds(COMMAND_DASHBOARD_GROUPS.reference, byId),
    ...fallbackReferenceTools(allTools),
  ])
    .filter((tool) => !clinicalFeatured.some((featured) => featured.id === tool.id))
    .slice(0, 7);
  const fleetFeatured = uniqueById([
    ...selectToolsByIds(COMMAND_DASHBOARD_GROUPS.fleet, byId),
    ...fallbackFleetTools(allTools),
  ])
    .filter(
      (tool) =>
        !clinicalFeatured.some((featured) => featured.id === tool.id) &&
        !referenceFeatured.some((featured) => featured.id === tool.id)
    )
    .slice(0, 6);
  const medicalIotFeatured = uniqueById([
    ...selectToolsByIds(COMMAND_DASHBOARD_GROUPS.medicalIot, byId),
    ...fallbackMedicalIotTools(allTools),
  ]).slice(0, 3);
  const expandedCareFeatured = uniqueById([
    ...selectToolsByIds(COMMAND_DASHBOARD_GROUPS.expandedCare, byId),
  ]);

  return {
    allTools,
    toolById: byId,
    prompts: COMMAND_DASHBOARD_PROMPTS,
    panels: {
      clinicalTools: clinicalFeatured,
      calculators: calculatorFeatured,
      referenceGuidelines: referenceFeatured,
      fleetOperations: fleetFeatured,
      medicalIot: medicalIotFeatured,
      expandedCare: expandedCareFeatured,
    },
    stats: {
      totalTools: allTools.length,
      calculators: countByPredicate(
        allTools,
        (tool) => tool.category === 'Calculator' || tool.surface === TOOL_SURFACES.CALCULATOR_FORM
      ),
      backendBacked: countByPredicate(
        allTools,
        (tool) =>
          tool.launchType === TOOL_LAUNCH_TYPES.BACKEND_BACKED ||
          tool.executorStatus === TOOL_EXECUTOR_STATUS.REGISTERED
      ),
      aiTools: countByPredicate(
        allTools,
        (tool) =>
          tool.launchType === TOOL_LAUNCH_TYPES.BACKEND_BACKED ||
          tool.launchType === TOOL_LAUNCH_TYPES.CHAT_ASSISTED ||
          ['Diagnostic', 'AI Tools'].includes(tool.category)
      ),
      unsupported: countByPredicate(
        allTools,
        (tool) =>
          tool.launchType === TOOL_LAUNCH_TYPES.UNSUPPORTED_PLANNED ||
          tool.executorStatus === TOOL_EXECUTOR_STATUS.UNSUPPORTED
      ),
    },
    visualizations: {
      categoryDistribution: countByField(allTools, 'category'),
      launchTypeDistribution: countByField(allTools, 'launchType'),
      tierDistribution: countByField(allTools, 'tier'),
      readinessDistribution: readinessDistribution(allTools),
    },
  };
}

export function buildCapabilityReachabilityAudit(graph = getMountedCapabilityGraph()) {
  return graph.capabilities.map((capability) => ({
    capabilityId: capability.capabilityId,
    route: capability.route,
    dashboard: capability.dashboardVisible,
    tools: capability.toolsVisible,
    operations: capability.operationsVisible,
    command: capability.commandVisible,
    search: capability.searchVisible,
    aiAlias: capability.aiAliases.length > 0,
    backendSupport: capability.backendSupport,
    demoStatus: capability.demoStatus,
  }));
}

export function getCommandDashboardModel(options: any = {}) {
  const { platformContext, account, roleProfile, userRole = 'student' } = options;
  const tools = platformContext
    ? getAssetAwareToolProjection(platformContext, userRole)
    : getUserFacingToolRegistryProjection();
  const model = buildCommandDashboardModel(tools);
  return {
    ...model,
    organization: platformContext?.organization || null,
    entitledPackIds: platformContext?.entitledPackIds || [],
    recommendedAssets: getRoleBasedAssetRecommendations({ account, roleProfile, limit: 8 }),
    defaultAiAgentId: platformContext?.defaultAiAgentId || 'agent-clinical',
  };
}
