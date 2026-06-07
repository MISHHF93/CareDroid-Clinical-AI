import { REGISTRY } from './clinicalToolIdContract';
import { getUserFacingToolRegistryProjection } from './toolInventory';

export const DEFAULT_CARE_WORKSPACE_ID = 'emergency';

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
  laboratory: {
    id: 'laboratory',
    label: 'Laboratory',
    path: '/laboratory',
    description: 'Lab dashboard, specimen queue, abnormal alerts, and trends.',
  },
  simulation: {
    id: 'simulation',
    label: 'Simulation Suite',
    path: '/simulation',
    description: 'Simulation scenarios, debriefing, competency practice, and outcomes.',
  },
  competencies: {
    id: 'competencies',
    label: 'Competencies',
    path: '/competencies',
    description: 'Competency tracking, training gaps, and practice recommendations.',
  },
  governance: {
    id: 'governance',
    label: 'AI Governance',
    path: '/ai-governance',
    description: 'AI governance, auditability, policy, and review controls.',
  },
  aiEvaluation: {
    id: 'ai-evaluation',
    label: 'AI Evaluation',
    path: '/ai-evaluation',
    description: 'Evaluation lab, model quality, benchmark, and safety review.',
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

export const CLIENT_PROFILE_STORAGE_KEY = 'careDroid.clientProfile.v1';

const COMMON_CLINICAL_ROLES = Object.freeze([
  'emergency-physician',
  'icu-physician',
  'cardiologist',
  'nurse',
  'pharmacist',
  'lab-technician',
  'biomedical-engineer',
  'hospital-administrator',
  'researcher',
  'educator',
  'student',
  'compliance-officer',
  'platform-admin',
]);

const SUBSCRIPTION_TIER_RANK = Object.freeze({
  free: 0,
  starter: 1,
  professional: 2,
  academic: 2,
  enterprise: 3,
  government: 3,
});

const WORKSPACE_SAAS_METADATA = Object.freeze({
  emergency: {
    allowedOrganizationTypes: ['hospital', 'clinic', 'ems', 'government'],
    allowedRoles: [...COMMON_CLINICAL_ROLES, 'fleet-operator'],
    defaultAssetPacks: ['clinical-core', 'emergency-medicine'],
    defaultDashboardWidgets: ['triage-risk', 'emergency-calculators', 'active-alerts'],
    defaultAIAgents: ['emergency-copilot'],
    defaultNavigationGroups: ['dashboard', 'assistant', 'tools', 'operations'],
    subscriptionTier: 'starter',
  },
  icu: {
    allowedOrganizationTypes: ['hospital', 'long-term-care', 'government'],
    allowedRoles: ['icu-physician', 'nurse', 'biomedical-engineer', 'hospital-administrator', 'platform-admin'],
    defaultAssetPacks: ['clinical-core', 'critical-care'],
    defaultDashboardWidgets: ['sofa-trends', 'ventilator-context', 'telemetry-alerts'],
    defaultAIAgents: ['critical-care-copilot'],
    defaultNavigationGroups: ['dashboard', 'assistant', 'tools', 'operations'],
    subscriptionTier: 'professional',
  },
  cardiology: {
    allowedOrganizationTypes: ['hospital', 'clinic', 'telehealth', 'university'],
    allowedRoles: ['cardiologist', 'emergency-physician', 'nurse', 'educator', 'student', 'hospital-administrator', 'platform-admin'],
    defaultAssetPacks: ['clinical-core', 'cardiology-pack'],
    defaultDashboardWidgets: ['chest-pain-risk', 'ecg-context', 'recent-cardiology-tools'],
    defaultAIAgents: ['cardiology-copilot'],
    defaultNavigationGroups: ['dashboard', 'assistant', 'tools'],
    subscriptionTier: 'starter',
  },
  laboratory: {
    allowedOrganizationTypes: ['hospital', 'clinic', 'long-term-care', 'research-center', 'university'],
    allowedRoles: ['lab-technician', 'emergency-physician', 'icu-physician', 'nurse', 'researcher', 'educator', 'hospital-administrator', 'platform-admin'],
    defaultAssetPacks: ['clinical-core', 'laboratory-intelligence'],
    defaultDashboardWidgets: ['abnormal-labs', 'specimen-queue', 'lab-trends'],
    defaultAIAgents: ['lab-interpretation-agent'],
    defaultNavigationGroups: ['dashboard', 'assistant', 'tools'],
    subscriptionTier: 'starter',
  },
  operations: {
    allowedOrganizationTypes: ['hospital', 'clinic', 'ems', 'long-term-care', 'government', 'telehealth'],
    allowedRoles: ['hospital-administrator', 'fleet-operator', 'biomedical-engineer', 'nurse', 'compliance-officer', 'platform-admin'],
    defaultAssetPacks: ['core-platform', 'hospital-operations'],
    defaultDashboardWidgets: ['operations-summary', 'capacity-status', 'active-alerts'],
    defaultAIAgents: ['operations-copilot'],
    defaultNavigationGroups: ['dashboard', 'operations', 'assistant'],
    subscriptionTier: 'starter',
  },
  fleet: {
    allowedOrganizationTypes: ['ems', 'hospital', 'government'],
    allowedRoles: ['fleet-operator', 'biomedical-engineer', 'hospital-administrator', 'platform-admin'],
    defaultAssetPacks: ['core-platform', 'fleet-logistics'],
    defaultDashboardWidgets: ['fleet-status', 'route-risk', 'maintenance-readiness'],
    defaultAIAgents: ['fleet-operations-agent'],
    defaultNavigationGroups: ['operations', 'assistant'],
    subscriptionTier: 'professional',
  },
  'medical-iot': {
    allowedOrganizationTypes: ['hospital', 'long-term-care', 'clinic', 'telehealth', 'government'],
    allowedRoles: ['biomedical-engineer', 'icu-physician', 'nurse', 'hospital-administrator', 'platform-admin'],
    defaultAssetPacks: ['core-platform', 'medical-iot'],
    defaultDashboardWidgets: ['offline-devices', 'telemetry-freshness', 'battery-risk'],
    defaultAIAgents: ['device-telemetry-agent'],
    defaultNavigationGroups: ['operations', 'assistant'],
    subscriptionTier: 'professional',
  },
  education: {
    allowedOrganizationTypes: ['university', 'hospital', 'research-center'],
    allowedRoles: ['educator', 'student', 'researcher', 'emergency-physician', 'nurse', 'platform-admin'],
    defaultAssetPacks: ['clinical-core', 'education-simulation'],
    defaultDashboardWidgets: ['recommended-scenarios', 'competency-gaps', 'recent-debriefs'],
    defaultAIAgents: ['education-coach'],
    defaultNavigationGroups: ['dashboard', 'assistant', 'tools'],
    subscriptionTier: 'academic',
  },
  simulation: {
    allowedOrganizationTypes: ['university', 'hospital', 'research-center'],
    allowedRoles: ['educator', 'student', 'researcher', 'emergency-physician', 'nurse', 'platform-admin'],
    defaultAssetPacks: ['education-simulation'],
    defaultDashboardWidgets: ['scenario-library', 'incomplete-debriefs', 'recommended-practice'],
    defaultAIAgents: ['simulation-coach'],
    defaultNavigationGroups: ['dashboard', 'assistant', 'tools'],
    subscriptionTier: 'academic',
  },
  research: {
    allowedOrganizationTypes: ['research-center', 'university', 'hospital', 'government'],
    allowedRoles: ['researcher', 'educator', 'compliance-officer', 'hospital-administrator', 'platform-admin'],
    defaultAssetPacks: ['clinical-core', 'research-intelligence'],
    defaultDashboardWidgets: ['evidence-review', 'cohort-context', 'auditability'],
    defaultAIAgents: ['research-copilot'],
    defaultNavigationGroups: ['dashboard', 'assistant', 'tools', 'advanced'],
    subscriptionTier: 'academic',
  },
  governance: {
    allowedOrganizationTypes: ['hospital', 'clinic', 'ems', 'university', 'research-center', 'long-term-care', 'telehealth', 'government'],
    allowedRoles: ['compliance-officer', 'hospital-administrator', 'platform-admin'],
    defaultAssetPacks: ['core-platform', 'governance-risk'],
    defaultDashboardWidgets: ['audit-readiness', 'policy-review', 'human-review'],
    defaultAIAgents: ['governance-agent'],
    defaultNavigationGroups: ['advanced', 'settings'],
    subscriptionTier: 'professional',
  },
  'ai-evaluation': {
    allowedOrganizationTypes: ['research-center', 'university', 'hospital', 'government'],
    allowedRoles: ['researcher', 'educator', 'compliance-officer', 'platform-admin'],
    defaultAssetPacks: ['ai-evaluation-lab', 'governance-risk'],
    defaultDashboardWidgets: ['model-benchmarks', 'safety-findings', 'evaluation-runs'],
    defaultAIAgents: ['evaluation-agent'],
    defaultNavigationGroups: ['advanced', 'dashboard'],
    subscriptionTier: 'academic',
  },
});

export const WORKSPACE_ORGANIZATION_PRESETS = Object.freeze({
  hospital: ['emergency', 'icu', 'cardiology', 'laboratory', 'operations', 'medical-iot', 'governance'],
  clinic: ['cardiology', 'laboratory', 'governance'],
  ems: ['emergency', 'fleet', 'operations'],
  university: ['education', 'research', 'simulation', 'governance'],
  'research-center': ['research', 'governance', 'ai-evaluation'],
  research_center: ['research', 'governance', 'ai-evaluation'],
  research_institute: ['research', 'governance', 'ai-evaluation'],
  'long-term-care': ['medical-iot', 'laboratory', 'operations', 'governance'],
  long_term_care: ['medical-iot', 'laboratory', 'operations', 'governance'],
  telehealth: ['cardiology', 'operations', 'governance'],
  government: ['emergency', 'operations', 'medical-iot', 'governance', 'ai-evaluation'],
});

function normalizeOrganizationType(value = 'hospital') {
  return String(value || 'hospital').trim().toLowerCase().replace(/\s+/g, '-');
}

function normalizeRole(value = '') {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '-');
}

function tierAllows(required = 'free', current = 'free') {
  const requiredRank = SUBSCRIPTION_TIER_RANK[required] ?? 0;
  const currentRank = SUBSCRIPTION_TIER_RANK[current] ?? 0;
  return currentRank >= requiredRank;
}

function normalizeWorkspaceDefinition(workspace) {
  const metadata = WORKSPACE_SAAS_METADATA[workspace.id] || {};
  const defaultAssets = workspace.toolIds || [];
  return {
    ...workspace,
    workspaceId: workspace.id,
    allowedOrganizationTypes: metadata.allowedOrganizationTypes || ['hospital'],
    allowedRoles: metadata.allowedRoles || COMMON_CLINICAL_ROLES,
    defaultAssetPacks: metadata.defaultAssetPacks || ['clinical-core'],
    defaultAssets,
    defaultDashboardWidgets: metadata.defaultDashboardWidgets || ['recommended-assets', 'recent-assets'],
    defaultAIAgents: metadata.defaultAIAgents || ['clinical-copilot'],
    defaultNavigationGroups: metadata.defaultNavigationGroups || ['dashboard', 'assistant', 'tools'],
    subscriptionTier: metadata.subscriptionTier || 'free',
    status: metadata.status || 'active',
  };
}

const CARE_WORKSPACE_BASE = [
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
    id: 'icu',
    label: 'ICU',
    shortLabel: 'ICU',
    icon: 'Activity',
    path: '/workspace/icu',
    description: 'Critical care, ventilators, oxygenation, deterioration, and escalation support.',
    aiContext:
      'Prioritize critical-care acuity, ventilator context, oxygenation, SOFA trends, sepsis risk, and escalation signals.',
    routeIds: ['assistant', 'calculators', 'tools', 'commandCenter'],
    toolIds: [
      REGISTRY.sofaScore,
      REGISTRY.news2,
      REGISTRY.roxIndex,
      REGISTRY.pao2Fio2Ratio,
      REGISTRY.aaGradient,
      REGISTRY.ventilatorSupportAssistant,
      REGISTRY.medicalIotDashboard,
      REGISTRY.telemetryMonitoring,
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
    id: 'laboratory',
    label: 'Laboratory',
    shortLabel: 'Lab',
    icon: 'FlaskConical',
    path: '/workspace/laboratory',
    description: 'Lab interpretation, abnormal result review, specimen flow, and critical value follow-up.',
    aiContext:
      'Interpret lab context carefully, flag critical values, explain uncertainty, and recommend follow-up verification.',
    routeIds: ['assistant', 'laboratory', 'tools', 'commandCenter'],
    toolIds: [
      REGISTRY.labInterp,
      REGISTRY.laboratoryDashboard,
      REGISTRY.abgInterpreter,
      REGISTRY.calcGfr,
      REGISTRY.ckdStaging,
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
    id: 'education',
    label: 'Education',
    shortLabel: 'Education',
    icon: 'Trophy',
    path: '/workspace/education',
    description: 'Simulation, competency tracking, credentials, debriefs, and guided practice.',
    aiContext:
      'Teach with simulation-first framing, competency objectives, debriefing, safety reminders, and practice recommendations.',
    routeIds: ['assistant', 'simulation', 'competencies', 'commandCenter'],
    toolIds: [
      REGISTRY.simulationSuite,
      REGISTRY.scenarioPlayer,
      REGISTRY.simulationOutcomes,
      REGISTRY.competencyPlatform,
      REGISTRY.credentialingPlatform,
      REGISTRY.debriefDashboard,
      REGISTRY.competencyDashboard,
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
    id: 'governance',
    label: 'Governance',
    shortLabel: 'Governance',
    icon: 'Shield',
    path: '/workspace/governance',
    description: 'Configuration, governance, security, audit, deployment, and platform health.',
    aiContext:
      'Summarize governance, safety, configuration, audit, and deployment posture with clear unsupported/demo labels.',
    routeIds: ['governance', 'settings', 'systemHealth', 'developerCatalog'],
    toolIds: [
      REGISTRY.aiGovernance,
      REGISTRY.aiSecurity,
      REGISTRY.aiExplainability,
      REGISTRY.clinicalAudit,
      REGISTRY.hospitalOperationsCommand,
    ],
  },
  {
    id: 'simulation',
    label: 'Simulation',
    shortLabel: 'Simulation',
    icon: 'Trophy',
    path: '/workspace/simulation',
    description: 'Simulation scenarios, role-based practice, structured debriefs, and competency reinforcement.',
    aiContext:
      'Frame guidance as simulated training support, recommend scenarios by role, and keep debriefs clearly local/demo unless backend training records are connected.',
    routeIds: ['simulation', 'competencies', 'commandCenter'],
    toolIds: [
      REGISTRY.simulationSuite,
      REGISTRY.scenarioPlayer,
      REGISTRY.simulationOutcomes,
      REGISTRY.debriefDashboard,
      REGISTRY.competencyDashboard,
    ],
  },
  {
    id: 'ai-evaluation',
    label: 'AI Evaluation',
    shortLabel: 'AI Eval',
    icon: 'ClipboardList',
    path: '/workspace/ai-evaluation',
    description: 'Evaluation lab, model quality, benchmark review, safety findings, and governance evidence.',
    aiContext:
      'Focus on evaluation evidence, benchmark quality, hallucination risk, safety findings, and governance-ready summaries.',
    routeIds: ['aiEvaluation', 'governance', 'developerCatalog'],
    toolIds: [
      REGISTRY.aiEvaluation,
      REGISTRY.aiCommandCenter,
      REGISTRY.aiGovernance,
      REGISTRY.aiSecurity,
      REGISTRY.aiExplainability,
      REGISTRY.clinicalAudit,
    ],
  },
];

export const CARE_WORKSPACES = Object.freeze(CARE_WORKSPACE_BASE.map(normalizeWorkspaceDefinition));

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

export function getWorkspacePresetForOrganizationType(organizationType = 'hospital') {
  const normalized = normalizeOrganizationType(organizationType);
  return WORKSPACE_ORGANIZATION_PRESETS[normalized] || WORKSPACE_ORGANIZATION_PRESETS.hospital;
}

export function getCanonicalWorkspaceRegistry() {
  return CARE_WORKSPACES;
}

export function buildWorkspaceSetupFromRegistry(workspaceId) {
  const workspace = getCareWorkspaceById(workspaceId);
  return {
    id: workspace.workspaceId,
    type: workspace.workspaceId,
    name: workspace.label,
    displayName: workspace.label,
    enabledToolIds: workspace.defaultAssets,
    enabledModules: workspace.defaultNavigationGroups,
    enabledAssetPacks: workspace.defaultAssetPacks,
    defaultDashboard: workspace.defaultDashboardWidgets?.[0] || 'command',
    defaultAiAgentId: workspace.defaultAIAgents?.[0] || 'clinical-copilot',
    workspaceProfile: {
      workspaceId: workspace.workspaceId,
      label: workspace.label,
      description: workspace.description,
      allowedOrganizationTypes: workspace.allowedOrganizationTypes,
      allowedRoles: workspace.allowedRoles,
      defaultAssetPacks: workspace.defaultAssetPacks,
      defaultAssets: workspace.defaultAssets,
      defaultDashboardWidgets: workspace.defaultDashboardWidgets,
      defaultAIAgents: workspace.defaultAIAgents,
      defaultNavigationGroups: workspace.defaultNavigationGroups,
      subscriptionTier: workspace.subscriptionTier,
      status: workspace.status,
    },
  };
}

export function buildClientWorkspaceProfile({
  organizationId = 'local-demo-tenant',
  organizationName = 'Local Demo Organization',
  organizationType = 'hospital',
  subscriptionPlan = 'professional',
  selectedProducts = [],
  enabledAssetPacks = [],
  enabledWorkspaces,
  defaultWorkspace,
  users = [],
  roles = [],
  departments = [],
  integrations = [],
  branding = {},
} = {}) {
  const presetWorkspaces = enabledWorkspaces?.length
    ? enabledWorkspaces
    : getWorkspacePresetForOrganizationType(organizationType);
  const workspaceSetups = presetWorkspaces.map(buildWorkspaceSetupFromRegistry);
  const assetPacks = unique([
    ...enabledAssetPacks,
    ...workspaceSetups.flatMap((workspace) => workspace.enabledAssetPacks || []),
  ]);
  const enabledAssets = unique(workspaceSetups.flatMap((workspace) => workspace.enabledToolIds || []));
  const workspaceIds = workspaceSetups.map((workspace) => workspace.id);

  return {
    source: 'local-demo',
    organizationId,
    organizationName,
    organizationType: normalizeOrganizationType(organizationType),
    subscriptionPlan,
    selectedProducts,
    enabledAssetPacks: assetPacks,
    enabledAssets,
    enabledWorkspaces: workspaceIds,
    defaultWorkspace: defaultWorkspace && workspaceIds.includes(defaultWorkspace)
      ? defaultWorkspace
      : workspaceIds[0] || DEFAULT_CARE_WORKSPACE_ID,
    users,
    roles: roles.length ? roles : ['hospital-administrator'],
    departments,
    integrations,
    branding,
    workspaceSetups,
    defaultDashboard: {
      route: '/dashboard',
      workspaceId: defaultWorkspace && workspaceIds.includes(defaultWorkspace)
        ? defaultWorkspace
        : workspaceIds[0] || DEFAULT_CARE_WORKSPACE_ID,
    },
  };
}

export function readLocalClientProfile() {
  try {
    const raw = localStorage.getItem(CLIENT_PROFILE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveLocalClientProfile(profile) {
  try {
    localStorage.setItem(CLIENT_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent('careDroid:clientProfileChanged', { detail: profile }));
  } catch {
    // Local profile is best-effort for demo/offline onboarding.
  }
  return profile;
}

export function filterWorkspacesForClient({
  workspaces = CARE_WORKSPACES,
  clientProfile,
  organizationType,
  subscriptionPlan,
  role,
  userWorkspaceIds,
} = {}) {
  const profile = clientProfile || {};
  const orgType = normalizeOrganizationType(organizationType || profile.organizationType || 'hospital');
  const tier = subscriptionPlan || profile.subscriptionPlan || 'professional';
  const normalizedRole = normalizeRole(role || profile.roles?.[0] || '');
  const enabledSet = new Set(profile.enabledWorkspaces?.length
    ? profile.enabledWorkspaces
    : getWorkspacePresetForOrganizationType(orgType));
  const assignedSet = userWorkspaceIds?.length ? new Set(userWorkspaceIds) : null;
  const adminRole = ['platform-admin', 'hospital-administrator'].includes(normalizedRole);

  const filtered = workspaces.filter((workspace) => {
    const workspaceId = workspace.workspaceId || workspace.id;
    if (!enabledSet.has(workspaceId)) return false;
    if (!workspace.allowedOrganizationTypes.map(normalizeOrganizationType).includes(orgType)) return false;
    if (!tierAllows(workspace.subscriptionTier, tier)) return false;
    if (assignedSet && !assignedSet.has(workspaceId)) return false;
    if (normalizedRole && !adminRole) {
      const allowedRoles = (workspace.allowedRoles || []).map(normalizeRole);
      if (allowedRoles.length && !allowedRoles.includes(normalizedRole)) return false;
    }
    return workspace.status !== 'disabled';
  });

  return filtered.length ? filtered : [getCareWorkspaceById(profile.defaultWorkspace || DEFAULT_CARE_WORKSPACE_ID)];
}

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
