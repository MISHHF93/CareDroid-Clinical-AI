import { REGISTRY } from './clinicalToolIdContract';
import {
  getUserFacingToolRegistryProjection,
  TOOL_EXECUTOR_STATUS,
  TOOL_LAUNCH_TYPES,
  TOOL_SURFACES,
} from './toolInventory';

export const COMMAND_DASHBOARD_PROMPTS = Object.freeze([
  {
    id: 'clinical-question',
    title: 'Start clinical question',
    prompt: 'Help me think through this patient presentation:',
    description: 'Open the focused assistant workspace with a case-first prompt.',
  },
  {
    id: 'interpret-labs',
    title: 'Interpret labs',
    prompt: 'Interpret these lab results and flag critical values:',
    toolId: REGISTRY.labInterp,
    description: 'Launch the lab interpreter workflow or seed assistant guidance.',
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
    REGISTRY.drugCheck,
    REGISTRY.labInterp,
    REGISTRY.abgInterpreter,
    REGISTRY.protocols,
    REGISTRY.antibioticGuide,
    REGISTRY.procedures,
  ]),
  fleet: Object.freeze([
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
    .map(([name, value]) => ({ name, value }))
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
  const allTools = uniqueById(tools);
  const byId = toolById(allTools);
  const clinicalFeatured = uniqueById([
    ...selectToolsByIds(COMMAND_DASHBOARD_GROUPS.clinical, byId),
    ...fallbackClinicalTools(allTools),
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
    .slice(0, 4);
  const medicalIotFeatured = uniqueById([
    ...selectToolsByIds(COMMAND_DASHBOARD_GROUPS.medicalIot, byId),
    ...fallbackMedicalIotTools(allTools),
  ]).slice(0, 3);

  return {
    allTools,
    toolById: byId,
    prompts: COMMAND_DASHBOARD_PROMPTS,
    panels: {
      clinicalTools: clinicalFeatured,
      referenceGuidelines: referenceFeatured,
      fleetOperations: fleetFeatured,
      medicalIot: medicalIotFeatured,
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

export function getCommandDashboardModel() {
  return buildCommandDashboardModel();
}
