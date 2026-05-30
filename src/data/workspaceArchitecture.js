import { REGISTRY } from './clinicalToolIdContract';
import { getUserFacingToolRegistryProjection } from './toolInventory';

export const DEFAULT_CARE_WORKSPACE_ID = 'clinical';

export const WORKSPACE_ROUTE_SHORTCUTS = Object.freeze({
  assistant: {
    id: 'assistant',
    label: 'AI Assistant',
    path: '/assistant',
    description: 'Ask questions, reason through cases, and launch context-aware tools.',
  },
  commandCenter: {
    id: 'command-center',
    label: 'Command Center',
    path: '/dashboard',
    description: 'Compact operating overview, recent work, and recommendations.',
  },
  tools: {
    id: 'tools',
    label: 'Tool Library',
    path: '/tools',
    description: 'Full canonical tool library when browsing is needed.',
  },
  calculators: {
    id: 'calculators',
    label: 'Calculators',
    path: '/tools/calculators',
    description: 'Focused calculator hub and direct calculator routes.',
  },
  hospitalMap: {
    id: 'hospital-map',
    label: 'Hospital Map',
    path: '/hospital-map',
    description: 'Floors, beds, rooms, alerts, and device markers.',
  },
  medicalIot: {
    id: 'medical-iot',
    label: 'Medical IoT',
    path: '/medical-iot',
    description: 'Telemetry, device state, stale warnings, and signals.',
  },
  devices: {
    id: 'devices',
    label: 'Device Fleet',
    path: '/devices',
    description: 'Inventory, maintenance, calibration, firmware, and assignments.',
  },
  fleetMap: {
    id: 'fleet-map',
    label: 'Fleet Map',
    path: '/fleet/map',
    description: 'Vehicle positions, route lines, ETAs, and alerts.',
  },
  liveMap: {
    id: 'live-map',
    label: 'Live Map',
    path: '/live-map',
    description: 'Unified live operational tracking across fleet, map, and IoT signals.',
  },
  profile: {
    id: 'profile',
    label: 'Profile',
    path: '/profile',
    description: 'User profile, workspaces, security, and activity.',
  },
  settings: {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    description: 'Preferences, notification settings, team, and account setup.',
  },
  systemHealth: {
    id: 'system-health',
    label: 'System Health',
    path: '/system-health',
    description: 'Build metadata, backend readiness, and deployment health.',
  },
  developerCatalog: {
    id: 'developer-catalog',
    label: 'Developer Catalog / Source Audit',
    path: '/tools/catalog',
    description: 'Developer-only source audit and inventory inspection.',
  },
});

export const CARE_WORKSPACES = Object.freeze([
  {
    id: 'clinical',
    label: 'Clinical',
    shortLabel: 'Clinical',
    icon: 'Stethoscope',
    path: '/workspace/clinical',
    description: 'Patient-facing care, diagnostic reasoning, medication safety, and documentation.',
    aiContext:
      'Act as a clinical copilot. Ask for missing patient context, suggest appropriate tools, and keep recommendations scoped to decision support.',
    routeIds: ['assistant', 'commandCenter', 'tools', 'calculators'],
    toolIds: [
      REGISTRY.drugCheck,
      REGISTRY.labInterp,
      REGISTRY.diagnosis,
      REGISTRY.protocols,
      REGISTRY.procedures,
      REGISTRY.ambientScribe,
      REGISTRY.patientSummaryAi,
      REGISTRY.orderSetAi,
      REGISTRY.guidelineRag,
      REGISTRY.calculatorRecommenderAi,
    ],
  },
  {
    id: 'emergency',
    label: 'Emergency',
    shortLabel: 'Emergency',
    icon: 'Siren',
    path: '/workspace/emergency',
    description: 'Rapid triage, deterioration scores, stroke/cardiac pathways, and live alerts.',
    aiContext:
      'Prioritize time-sensitive triage, ask for vitals and red flags first, and surface emergency calculators before broad browsing.',
    routeIds: ['assistant', 'calculators', 'liveMap', 'hospitalMap'],
    toolIds: [
      REGISTRY.qsofa,
      REGISTRY.news2,
      REGISTRY.sofaScore,
      REGISTRY.nihss,
      REGISTRY.heartScore,
      REGISTRY.graceAcs,
      REGISTRY.mews,
      REGISTRY.revisedTraumaScore,
      REGISTRY.shockIndex,
      REGISTRY.ecgInterpretationAssistant,
      REGISTRY.acsWorkflowAssistant,
    ],
  },
  {
    id: 'neurology',
    label: 'Neurology',
    shortLabel: 'Neuro',
    icon: 'Brain',
    path: '/workspace/neurology',
    description: 'Stroke, TIA, neuro exams, neurologic deterioration, and timeline review.',
    aiContext:
      'Prioritize stroke/TIA timing, last-known-well, NIHSS, ABCD2, neurologic red flags, and escalation workflow suggestions.',
    routeIds: ['assistant', 'calculators', 'tools', 'commandCenter'],
    toolIds: [
      REGISTRY.nihss,
      REGISTRY.abcd2,
      REGISTRY.strokeWorkflowAssistant,
      REGISTRY.strokeCommandCenter,
      REGISTRY.neuroExamAssistant,
      REGISTRY.neurologyTimelineAi,
      REGISTRY.gcsCalculator,
    ],
  },
  {
    id: 'cardiology',
    label: 'Cardiology',
    shortLabel: 'Cardio',
    icon: 'Heart',
    path: '/workspace/cardiology',
    description: 'Chest pain, ACS risk, ECG support, arrhythmia, and cardiac workflows.',
    aiContext:
      'Prioritize ACS red flags, ECG/troponin context, HEART, TIMI, ACS workflow, cardiology risk, and clinician review.',
    routeIds: ['assistant', 'calculators', 'tools', 'commandCenter'],
    toolIds: [
      REGISTRY.heartScore,
      REGISTRY.timiUaNstemi,
      REGISTRY.graceAcs,
      REGISTRY.acsWorkflowAssistant,
      REGISTRY.ecgInterpretationAssistant,
      REGISTRY.atrialFibrillationAssistant,
      REGISTRY.cardiologyCommandCenter,
    ],
  },
  {
    id: 'respiratory',
    label: 'Respiratory',
    shortLabel: 'Resp',
    icon: 'Activity',
    path: '/workspace/respiratory',
    description: 'Ventilator support, oxygenation calculators, respiratory telemetry, and pulmonary workflows.',
    aiContext:
      'Prioritize oxygenation, ventilator context, ROX, P/F ratio, respiratory support needs, and escalation signals.',
    routeIds: ['assistant', 'calculators', 'tools', 'commandCenter'],
    toolIds: [
      REGISTRY.roxIndex,
      REGISTRY.pao2Fio2Ratio,
      REGISTRY.aaGradient,
      REGISTRY.ventilatorSupportAssistant,
      REGISTRY.respiratoryTelemetryDashboard,
      REGISTRY.respiratoryCommandCenter,
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    shortLabel: 'Ops',
    icon: 'LayoutDashboard',
    path: '/workspace/operations',
    description: 'Hospital flow, capacity, alerts, devices, staffing, and operational status.',
    aiContext:
      'Summarize operational status, capacity constraints, alerts, device readiness, and next best coordination steps.',
    routeIds: ['commandCenter', 'hospitalMap', 'liveMap', 'devices', 'systemHealth'],
    toolIds: [
      REGISTRY.hospitalMap,
      REGISTRY.hospitalOperationsCommand,
      REGISTRY.assetTrackingDashboard,
      REGISTRY.incidentCommandCenter,
      REGISTRY.bedOccupancyCalculator,
      REGISTRY.staffingRatioCalculator,
      REGISTRY.capacityPredictionEngine,
      REGISTRY.deviceFleetManagement,
    ],
  },
  {
    id: 'fleet',
    label: 'Fleet',
    shortLabel: 'Fleet',
    icon: 'Truck',
    path: '/workspace/fleet',
    description: 'Transport visibility, vehicle status, route optimization, and dispatch support.',
    aiContext:
      'Focus on logistics, ETA, route risk, vehicle status, and dispatch support. Do not imply autonomous dispatch.',
    routeIds: ['fleetMap', 'liveMap', 'commandCenter'],
    toolIds: [
      REGISTRY.fleetLiveMap,
      REGISTRY.liveTrackingMap,
      REGISTRY.fleetCommand,
      REGISTRY.routeOptimizer,
      REGISTRY.predictiveMaintenance,
      REGISTRY.dispatchAi,
    ],
  },
  {
    id: 'medical-iot',
    label: 'Medical IoT',
    shortLabel: 'IoT',
    icon: 'Smartphone',
    path: '/workspace/medical-iot',
    description: 'Device telemetry, signal quality, stale/offline warnings, and maintenance.',
    aiContext:
      'Interpret telemetry availability, signal quality, device battery, last-seen times, and safety limitations.',
    routeIds: ['medicalIot', 'devices', 'hospitalMap', 'liveMap'],
    toolIds: [
      REGISTRY.medicalIotDashboard,
      REGISTRY.telemetryMonitoring,
      REGISTRY.deviceMaintenance,
      REGISTRY.deviceFleetManagement,
      REGISTRY.deviceBatteryIntelligence,
    ],
  },
  {
    id: 'research',
    label: 'Research',
    shortLabel: 'Research',
    icon: 'Microscope',
    path: '/workspace/research',
    description: 'Guidelines, literature-backed retrieval, audit, explainability, and clinical analysis.',
    aiContext:
      'Emphasize cited sources, uncertainty, limitations, cohort logic, and explainability for every recommendation.',
    routeIds: ['assistant', 'tools', 'developerCatalog'],
    toolIds: [
      REGISTRY.guidelineRag,
      REGISTRY.differentialAi,
      REGISTRY.timelineAi,
      REGISTRY.aiExplainability,
      REGISTRY.clinicalAudit,
      REGISTRY.patientSummaryAi,
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    shortLabel: 'Admin',
    icon: 'Shield',
    path: '/workspace/admin',
    description: 'Configuration, governance, security, audit, deployment, and platform health.',
    aiContext:
      'Summarize governance, safety, configuration, audit, and deployment posture with clear unsupported/demo labels.',
    routeIds: ['settings', 'profile', 'systemHealth', 'developerCatalog'],
    toolIds: [
      REGISTRY.aiGovernance,
      REGISTRY.aiSecurity,
      REGISTRY.aiExplainability,
      REGISTRY.clinicalAudit,
      REGISTRY.hospitalOperationsCommand,
    ],
  },
]);

const WORKSPACE_BY_ID = Object.freeze(
  Object.fromEntries(CARE_WORKSPACES.map((workspace) => [workspace.id, workspace]))
);

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function getCareWorkspaceById(workspaceId) {
  return WORKSPACE_BY_ID[workspaceId] || WORKSPACE_BY_ID[DEFAULT_CARE_WORKSPACE_ID];
}

export function getCareWorkspaceRouteEntries(workspaceId) {
  const workspace = getCareWorkspaceById(workspaceId);
  return workspace.routeIds.map((routeId) => WORKSPACE_ROUTE_SHORTCUTS[routeId]).filter(Boolean);
}

export function getCareWorkspaceToolEntries(
  workspaceId,
  tools = getUserFacingToolRegistryProjection()
) {
  const workspace = getCareWorkspaceById(workspaceId);
  const byId = Object.fromEntries(tools.map((tool) => [tool.id, tool]));
  return uniqueById(workspace.toolIds.map((toolId) => byId[toolId]).filter(Boolean));
}

export function buildCareWorkspaceModel(
  workspaceId = DEFAULT_CARE_WORKSPACE_ID,
  tools = getUserFacingToolRegistryProjection()
) {
  const workspace = getCareWorkspaceById(workspaceId);
  const routeEntries = getCareWorkspaceRouteEntries(workspace.id);
  const toolEntries = getCareWorkspaceToolEntries(workspace.id, tools);

  return {
    workspace,
    routeEntries,
    toolEntries,
    stats: {
      routes: routeEntries.length,
      tools: toolEntries.length,
      calculators: toolEntries.filter((tool) => tool.category === 'Calculator').length,
      backendBacked: toolEntries.filter((tool) => tool.executorStatus === 'registered').length,
    },
  };
}
