import { REGISTRY } from './clinicalToolIdContract';
import { getUserFacingToolRegistryProjection } from './toolInventory';
import {
  EMERGENCY_ANALYTICS_EVENTS,
  EMERGENCY_COMMAND_CENTER_WIDGETS,
  EMERGENCY_DEMO_TENANT,
  EMERGENCY_FIRST_CUSTOMER_DEPLOYMENT,
  EMERGENCY_FLOW_INTELLIGENCE_PLATFORM,
  EMERGENCY_ONBOARDING_EXPERIENCE,
  EMERGENCY_PATIENT_JOURNEY,
  EMERGENCY_ROI_ESTIMATOR,
} from './emergencyOperatingSystem';
import { CANONICAL_ROUTES } from '../config/routes.config';

export const DEFAULT_CARE_WORKSPACE_ID = 'emergency';

export const WORKSPACE_ROUTE_SHORTCUTS = Object.freeze({
  assistant: {
    id: 'assistant',
    label: 'AI Assistant',
    path: CANONICAL_ROUTES.emergencyCopilot,
    description: 'Ask questions, reason through patients, and launch context-aware tools.',
  },
  commandCenter: {
    id: 'command-center',
    label: 'Command Center',
    path: CANONICAL_ROUTES.emergencyWhiteboard,
    description: 'Compact operating overview, recent work, and recommendations.',
  },
  tools: {
    id: 'tools',
    label: 'Tool Library',
    path: CANONICAL_ROUTES.emergencyCopilot,
    description: 'Full canonical tool library when browsing is needed.',
  },
  calculators: {
    id: 'calculators',
    label: 'Calculators',
    path: CANONICAL_ROUTES.emergencyCopilot,
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
    path: CANONICAL_ROUTES.emergencySettings,
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

export const FUTURE_WORKSPACE_IDS = Object.freeze([
  'research',
  'education',
  'governance',
  'fleet',
  'medical-iot',
  'laboratory',
]);

const FUTURE_WORKSPACE_ID_SET = new Set(FUTURE_WORKSPACE_IDS);

export const FUTURE_WORKSPACE_LIFECYCLE = Object.freeze({
  lifecycleStage: 'future-module',
  status: 'roadmap',
  roadmapLabel: 'Future Module',
  availabilityLabel: 'Coming Later',
  productFocus:
    'Frozen from the primary product surface while CareDroid focuses on the Emergency Department Operating System.',
});

const WORKSPACE_SAAS_METADATA = Object.freeze({
  emergency: {
    allowedOrganizationTypes: ['hospital', 'clinic', 'ems', 'government'],
    allowedRoles: [...COMMON_CLINICAL_ROLES, 'fleet-operator'],
    defaultAssetPacks: ['core-platform', 'emergency-medicine'],
    defaultDashboardWidgets: EMERGENCY_COMMAND_CENTER_WIDGETS.map((widget) => widget.id),
    defaultAIAgents: ['emergency-copilot'],
    defaultNavigationGroups: ['whiteboard', 'patients', 'ems', 'operations', 'copilot'],
    subscriptionTier: 'starter',
  },
  icu: {
    allowedOrganizationTypes: ['hospital', 'long-term-care', 'government'],
    allowedRoles: ['icu-physician', 'nurse', 'biomedical-engineer', 'hospital-administrator', 'platform-admin'],
    defaultAssetPacks: ['core-platform', 'icu-pack'],
    defaultDashboardWidgets: ['sofa-trends', 'ventilator-context', 'telemetry-alerts'],
    defaultAIAgents: ['critical-care-copilot'],
    defaultNavigationGroups: ['dashboard', 'assistant', 'tools', 'operations'],
    subscriptionTier: 'professional',
  },
  cardiology: {
    allowedOrganizationTypes: ['hospital', 'clinic', 'telehealth', 'university'],
    allowedRoles: ['cardiologist', 'emergency-physician', 'nurse', 'educator', 'student', 'hospital-administrator', 'platform-admin'],
    defaultAssetPacks: ['core-platform', 'cardiology-pack'],
    defaultDashboardWidgets: ['chest-pain-risk', 'ecg-context', 'recent-cardiology-tools'],
    defaultAIAgents: ['cardiology-copilot'],
    defaultNavigationGroups: ['dashboard', 'assistant', 'tools'],
    subscriptionTier: 'starter',
  },
  laboratory: {
    allowedOrganizationTypes: ['hospital', 'clinic', 'long-term-care', 'research-center', 'university'],
    allowedRoles: ['lab-technician', 'emergency-physician', 'icu-physician', 'nurse', 'researcher', 'educator', 'hospital-administrator', 'platform-admin'],
    defaultAssetPacks: ['core-platform', 'laboratory-intelligence'],
    defaultDashboardWidgets: ['abnormal-labs', 'specimen-queue', 'lab-trends'],
    defaultAIAgents: ['lab-interpretation-agent'],
    defaultNavigationGroups: ['dashboard', 'assistant', 'tools'],
    subscriptionTier: 'starter',
  },
  pharmacy: {
    allowedOrganizationTypes: ['hospital', 'clinic', 'long-term-care', 'telehealth', 'government'],
    allowedRoles: ['pharmacist', 'emergency-physician', 'icu-physician', 'nurse', 'hospital-administrator', 'platform-admin'],
    defaultAssetPacks: ['core-platform', 'pharmacy-safety'],
    defaultDashboardWidgets: ['medication-safety', 'dose-review', 'renal-dose-risk'],
    defaultAIAgents: ['pharmacy-safety-agent'],
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
    defaultAssetPacks: ['core-platform', 'medical-iot-pack'],
    defaultDashboardWidgets: ['offline-devices', 'telemetry-freshness', 'battery-risk'],
    defaultAIAgents: ['device-telemetry-agent'],
    defaultNavigationGroups: ['operations', 'assistant'],
    subscriptionTier: 'professional',
  },
  education: {
    allowedOrganizationTypes: ['university', 'hospital', 'research-center'],
    allowedRoles: ['educator', 'student', 'researcher', 'emergency-physician', 'nurse', 'platform-admin'],
    defaultAssetPacks: ['core-platform', 'simulation-training-pack'],
    defaultDashboardWidgets: ['recommended-scenarios', 'competency-gaps', 'recent-debriefs'],
    defaultAIAgents: ['education-coach'],
    defaultNavigationGroups: ['dashboard', 'assistant', 'tools'],
    subscriptionTier: 'academic',
  },
  simulation: {
    allowedOrganizationTypes: ['university', 'hospital', 'research-center'],
    allowedRoles: ['educator', 'student', 'researcher', 'emergency-physician', 'nurse', 'platform-admin'],
    defaultAssetPacks: ['simulation-training-pack'],
    defaultDashboardWidgets: ['scenario-library', 'incomplete-debriefs', 'recommended-practice'],
    defaultAIAgents: ['simulation-coach'],
    defaultNavigationGroups: ['dashboard', 'assistant', 'tools'],
    subscriptionTier: 'academic',
  },
  research: {
    allowedOrganizationTypes: ['research-center', 'university', 'hospital', 'government'],
    allowedRoles: ['researcher', 'educator', 'compliance-officer', 'hospital-administrator', 'platform-admin'],
    defaultAssetPacks: ['core-platform', 'research-education'],
    defaultDashboardWidgets: ['evidence-review', 'cohort-context', 'auditability'],
    defaultAIAgents: ['research-copilot'],
    defaultNavigationGroups: ['dashboard', 'assistant', 'tools', 'advanced'],
    subscriptionTier: 'academic',
  },
  governance: {
    allowedOrganizationTypes: ['hospital', 'clinic', 'ems', 'university', 'research-center', 'long-term-care', 'telehealth', 'government'],
    allowedRoles: ['compliance-officer', 'hospital-administrator', 'platform-admin'],
    defaultAssetPacks: ['core-platform', 'governance-compliance-pack'],
    defaultDashboardWidgets: ['audit-readiness', 'policy-review', 'human-review'],
    defaultAIAgents: ['governance-agent'],
    defaultNavigationGroups: ['advanced', 'settings'],
    subscriptionTier: 'professional',
  },
  administration: {
    allowedOrganizationTypes: ['hospital', 'clinic', 'ems', 'university', 'research-center', 'long-term-care', 'telehealth', 'government'],
    allowedRoles: ['hospital-administrator', 'platform-admin'],
    defaultAssetPacks: ['core-platform', 'administration-pack'],
    defaultDashboardWidgets: ['tenant-health', 'workspace-setup', 'billing-readiness'],
    defaultAIAgents: ['administration-agent'],
    defaultNavigationGroups: ['settings', 'advanced', 'dashboard'],
    subscriptionTier: 'professional',
  },
  'ai-evaluation': {
    allowedOrganizationTypes: ['research-center', 'university', 'hospital', 'government'],
    allowedRoles: ['researcher', 'educator', 'compliance-officer', 'platform-admin'],
    defaultAssetPacks: ['governance-compliance-pack', 'research-education'],
    defaultDashboardWidgets: ['model-benchmarks', 'safety-findings', 'evaluation-runs'],
    defaultAIAgents: ['evaluation-agent'],
    defaultNavigationGroups: ['advanced', 'dashboard'],
    subscriptionTier: 'academic',
  },
});

export const WORKSPACE_ORGANIZATION_PRESETS = Object.freeze({
  hospital: ['emergency', 'icu', 'cardiology', 'laboratory', 'pharmacy', 'operations', 'medical-iot', 'governance', 'administration'],
  clinic: ['cardiology', 'laboratory', 'pharmacy', 'governance', 'administration'],
  ems: ['emergency', 'fleet', 'operations'],
  university: ['education', 'research', 'simulation', 'governance'],
  'research-center': ['research', 'governance', 'ai-evaluation'],
  research_center: ['research', 'governance', 'ai-evaluation'],
  research_institute: ['research', 'governance', 'ai-evaluation'],
  'long-term-care': ['medical-iot', 'laboratory', 'pharmacy', 'operations', 'governance'],
  long_term_care: ['medical-iot', 'laboratory', 'pharmacy', 'operations', 'governance'],
  telehealth: ['cardiology', 'pharmacy', 'operations', 'governance'],
  government: ['emergency', 'operations', 'medical-iot', 'governance', 'administration', 'ai-evaluation'],
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
  const futureLifecycle = FUTURE_WORKSPACE_ID_SET.has(workspace.id) ? FUTURE_WORKSPACE_LIFECYCLE : null;
  return {
    ...workspace,
    workspaceId: workspace.id,
    allowedOrganizationTypes: metadata.allowedOrganizationTypes || ['hospital'],
    allowedRoles: metadata.allowedRoles || COMMON_CLINICAL_ROLES,
    defaultAssetPacks: metadata.defaultAssetPacks || ['core-platform'],
    defaultAssets,
    defaultDashboardWidgets: metadata.defaultDashboardWidgets || ['recommended-assets', 'recent-assets'],
    defaultAIAgents: metadata.defaultAIAgents || ['clinical-copilot'],
    defaultNavigationGroups: metadata.defaultNavigationGroups || ['dashboard', 'assistant', 'tools'],
    subscriptionTier: metadata.subscriptionTier || 'free',
    lifecycleStage: futureLifecycle?.lifecycleStage || metadata.lifecycleStage || 'active',
    roadmapLabel: futureLifecycle?.roadmapLabel || metadata.roadmapLabel || null,
    availabilityLabel: futureLifecycle?.availabilityLabel || metadata.availabilityLabel || 'Available',
    productFocus: futureLifecycle?.productFocus || metadata.productFocus || null,
    status: futureLifecycle?.status || metadata.status || 'active',
  };
}

const CARE_WORKSPACE_BASE = [
  {
    id: 'emergency',
    label: 'Emergency',
    shortLabel: 'Emergency',
    icon: 'Siren',
    path: CANONICAL_ROUTES.emergencyWhiteboard,
    description:
      'Emergency OS is an AI-assisted patient flow platform for small emergency departments, urgent care clinics, and clinics handling 50-150 patients/day with fewer than 10 staff.',
    aiContext:
      'Prioritize ED flow bottlenecks from arrival through admission/discharge. Reduce waiting, handoff delays, bed pressure, referral friction, equipment gaps, and cognitive load while preserving human review and avoiding autonomous clinical decisions.',
    routeIds: ['assistant', 'commandCenter', 'hospitalMap', 'medicalIot', 'liveMap', 'simulation', 'calculators'],
    toolIds: [
      REGISTRY.qsofa,
      REGISTRY.news2,
      REGISTRY.sofaScore,
      REGISTRY.nihss,
      REGISTRY.heartScore,
      REGISTRY.graceAcs,
      REGISTRY.wellsPe,
      REGISTRY.wellsDvtCalculator,
      REGISTRY.mews,
      REGISTRY.revisedTraumaScore,
      REGISTRY.shockIndex,
      REGISTRY.guidelineRag,
      REGISTRY.calculatorRecommenderAi,
      REGISTRY.clinicalDocumentationAssistant,
      REGISTRY.patientSummaryAi,
      REGISTRY.timelineAi,
      REGISTRY.medicalIotDashboard,
      REGISTRY.telemetryMonitoring,
      REGISTRY.simulationSuite,
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
    id: 'pharmacy',
    label: 'Pharmacy',
    shortLabel: 'Pharmacy',
    icon: 'Pill',
    path: '/workspace/pharmacy',
    description: 'Medication safety, interaction checks, dosing, antimicrobial guidance, and pharmacy review.',
    aiContext:
      'Prioritize medication safety, allergies, interactions, renal dosing, antimicrobial guidance, and pharmacist review.',
    routeIds: ['assistant', 'tools', 'calculators', 'commandCenter'],
    toolIds: [
      REGISTRY.drugCheck,
      REGISTRY.doseCalculator,
      REGISTRY.antibioticGuide,
      REGISTRY.pediatricDoseSafetyChecker,
      REGISTRY.renalMonitoringDashboard,
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
    id: 'administration',
    label: 'Administration',
    shortLabel: 'Admin',
    icon: 'Settings',
    path: '/workspace/administration',
    description: 'Tenant setup, workspace configuration, billing readiness, access controls, and SaaS operations.',
    aiContext:
      'Focus on tenant setup, workspace configuration, access controls, billing readiness, SaaS architecture, and backend status.',
    routeIds: ['settings', 'profile', 'systemHealth', 'developerCatalog'],
    toolIds: [
      REGISTRY.aiGovernance,
      REGISTRY.aiSecurity,
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

const BACKEND_STATUS = Object.freeze({
  live: 'backend-wired',
  fallback: 'demo-local-fallback',
});

const STANDARD_WORKSPACE_SUBPAGES = Object.freeze([
  'dashboard',
  'tools',
  'workflows',
  'automations',
  'analytics',
  'alerts',
  'reports',
  'settings',
]);

function makeSubpage(id, label = id, metadata = {}) {
  return {
    ...metadata,
    id,
    label: label
      .split(/[-\s]+/)
      .filter(Boolean)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
      .join(' '),
  };
}

function normalizeMode(config) {
  const subpageIds = config.subpages || STANDARD_WORKSPACE_SUBPAGES;
  return Object.freeze({
    ...config,
    subpages: subpageIds.map((entry) =>
      typeof entry === 'string'
        ? makeSubpage(entry)
        : makeSubpage(entry.id, entry.label || entry.id, {
            group: entry.group,
            priority: entry.priority,
            quickTask: entry.quickTask,
            taskLabel: entry.taskLabel,
            taskHelper: entry.taskHelper,
          })
    ),
    dataPipeline: Object.freeze({
      source: config.dataPipeline?.source || config.primaryDataSources || [],
      ingestion: config.dataPipeline?.ingestion || ['workspace-context', 'api-client', 'local-fallback'],
      normalization: config.dataPipeline?.normalization || ['asset-registry-join', 'workspace-mode-tags'],
      workspaceContext: config.dataPipeline?.workspaceContext || `${config.workspaceId}-context`,
      assetRecommendations: config.dataPipeline?.assetRecommendations || config.assets || [],
      dashboardWidgets: config.dataPipeline?.dashboardWidgets || config.dashboards || [],
      alerts: config.dataPipeline?.alerts || config.alerts || [],
      aiContext: config.dataPipeline?.aiContext || config.aiAgents || [],
      reports: config.dataPipeline?.reports || config.reports || [],
    }),
  });
}

export const WORKSPACE_FUNCTIONALITY_MODES = Object.freeze({
  emergency: normalizeMode({
    workspaceId: 'emergency',
    modeName: 'Emergency OS',
    purpose:
      'Emergency OS for patient flow, queue flow, EMS flow, capacity flow, and decision support in small ED, urgent care, and clinic operations.',
    primaryUsers: ['Emergency physicians', 'Triage nurses', 'Charge nurses', 'EMS coordinators', 'Hospital operations'],
    primaryDataSources: [
      'frontend local/demo data',
      'backend APIs',
      'ADT',
      'EHR encounter data',
      'vitals and telemetry',
      'simulation data',
      'AI events',
      'asset usage',
      'workflow events',
      'intake events',
      'patient-provided documents',
      'identity verification',
    ],
    dashboards: EMERGENCY_COMMAND_CENTER_WIDGETS.map((widget) => widget.id),
    subpages: [
      {
        id: 'whiteboard',
        label: 'Whiteboard',
        group: 'command',
        priority: 1,
        quickTask: true,
        taskLabel: 'Open Emergency Whiteboard',
        taskHelper: 'Patients, queues, alerts, EMS, boarding, capacity',
      },
      { id: 'dashboard', label: 'Overview', group: 'command', priority: 8 },
      {
        id: 'command-center',
        label: 'Command Center',
        group: 'command',
        priority: 9,
      },
      {
        id: 'patient-path',
        label: 'Patient Path',
        group: 'command',
        priority: 3,
        quickTask: true,
        taskLabel: 'Find patient path blockers',
        taskHelper: 'Door-to-direction',
      },
      {
        id: 'intake',
        label: 'Intake',
        group: 'command',
        priority: 4,
        quickTask: true,
        taskLabel: 'Review intake bottlenecks',
        taskHelper: 'Registration and verification',
      },
      {
        id: 'patient-context',
        label: 'Patient Context',
        group: 'command',
        priority: 5,
        quickTask: true,
        taskLabel: 'Open patient snapshot',
        taskHelper: 'Source-cited context',
      },
      { id: 'director', label: 'Director', group: 'command', priority: 6 },
      { id: 'charge-nurse', label: 'Charge Nurse', group: 'command', priority: 7 },
      {
        id: 'waiting-room',
        label: 'Waiting Room',
        group: 'flow',
        priority: 1,
        quickTask: true,
        taskLabel: 'Review waiting room',
        taskHelper: 'Risk, waits, reassessment',
      },
      {
        id: 'triage',
        label: 'Triage',
        group: 'flow',
        priority: 2,
        quickTask: true,
        taskLabel: 'Review triage risk',
        taskHelper: 'Calculator-backed review',
      },
      { id: 'queues', label: 'Queues', group: 'flow', priority: 3 },
      {
        id: 'throughput',
        label: 'Throughput',
        group: 'flow',
        priority: 4,
        quickTask: true,
        taskLabel: 'Check throughput',
        taskHelper: 'Door-to-doctor KPIs',
      },
      { id: 'patients', label: 'Patients', group: 'flow', priority: 6 },
      {
        id: 'ems',
        label: 'EMS',
        group: 'operations',
        priority: 1,
        quickTask: true,
        taskLabel: 'Review EMS pressure',
        taskHelper: 'Arrivals and offload',
      },
      { id: 'pre-arrival', label: 'Pre-arrival', group: 'operations', priority: 2 },
      {
        id: 'capacity',
        label: 'Capacity',
        group: 'operations',
        priority: 3,
        quickTask: true,
        taskLabel: 'Check capacity',
        taskHelper: 'Spaces, beds, discharge',
      },
      {
        id: 'boarding',
        label: 'Boarding',
        group: 'operations',
        priority: 4,
        quickTask: true,
        taskLabel: 'Review boarding',
        taskHelper: 'Boarders and pending beds',
      },
      { id: 'resources', label: 'Resources', group: 'operations', priority: 5 },
      { id: 'escalations', label: 'Escalations', group: 'operations', priority: 6 },
      { id: 'iot', label: 'IoT', group: 'operations', priority: 7 },
      { id: 'shift-summary', label: 'Shift Summary', group: 'operations', priority: 8 },
      { id: 'referrals', label: 'Referrals', group: 'clinical', priority: 1 },
      { id: 'knowledge', label: 'Knowledge', group: 'clinical', priority: 2 },
      { id: 'evidence', label: 'Evidence', group: 'clinical', priority: 3 },
      { id: 'documentation', label: 'Documentation', group: 'clinical', priority: 4 },
      { id: 'simulations', label: 'Simulations', group: 'clinical', priority: 5 },
      { id: 'automations', label: 'Automations', group: 'proof', priority: 1 },
      { id: 'automation-roi', label: 'Automation ROI', group: 'proof', priority: 2 },
      { id: 'analytics', label: 'Analytics', group: 'proof', priority: 3 },
      { id: 'intake-analytics', label: 'Intake Analytics', group: 'proof', priority: 4 },
      { id: 'demo', label: EMERGENCY_DEMO_TENANT.mode === 'demo' ? 'Demo Mode' : 'Demo', group: 'proof', priority: 5 },
      { id: 'flow', label: EMERGENCY_FLOW_INTELLIGENCE_PLATFORM.title.replace('Emergency ', ''), group: 'proof', priority: 6 },
      { id: 'onboarding', label: EMERGENCY_ONBOARDING_EXPERIENCE.title.replace('Emergency OS ', ''), group: 'proof', priority: 7 },
      { id: 'roi', label: EMERGENCY_ROI_ESTIMATOR.title.replace('ED ', ''), group: 'proof', priority: 8 },
      { id: 'deployment', label: EMERGENCY_FIRST_CUSTOMER_DEPLOYMENT.title.replace('First Customer ', ''), group: 'proof', priority: 9 },
      { id: 'implementation', label: 'Implementation', group: 'proof', priority: 10 },
    ],
    assets: [
      'qsofa',
      'news2',
      'heart-score',
      'wells-pe',
      'wells-dvt-calculator',
      'shock-index',
      'nihss',
      'guideline-rag',
      'clinical-documentation-assistant',
      'medical-iot-dashboard',
      'simulation-suite',
    ],
    workflows: [
      'EMS pre-arrival pipeline',
      'capacity intelligence',
      'boarding intelligence',
      'automated triage matrix',
      'referral routing',
      'surge staffing',
      'simulation academy',
      'medical IoT monitoring',
      'documentation integrity',
      'RAG evidence retrieval',
      'virtual ED',
      'discharge summary drafting',
      'prior authorization',
      'smart intake',
      'document intelligence',
      'identity resolution',
      'patient snapshot',
      'medication capture',
      'allergy capture',
      'verification',
      'intake analytics',
    ],
    aiAgents: ['emergency-copilot', 'emergency-rag-router', 'documentation-integrity-agent', 'intake-automation-agent'],
    backendServices: [
      { id: 'calculators', label: 'Calculators', endpoint: '/api/tools/execute', status: BACKEND_STATUS.live },
      { id: 'encounters', label: 'ED encounters', endpoint: '/api/workspaces/emergency/encounters', status: BACKEND_STATUS.fallback },
      { id: 'ems-pre-arrival', label: 'EMS pre-arrival', endpoint: '/api/workspaces/emergency/pre-arrival', status: BACKEND_STATUS.fallback },
      { id: 'capacity-intelligence', label: 'Capacity intelligence', endpoint: '/api/workspaces/emergency/capacity', status: BACKEND_STATUS.fallback },
      { id: 'boarding-intelligence', label: 'Boarding intelligence', endpoint: '/api/workspaces/emergency/boarding', status: BACKEND_STATUS.fallback },
      { id: 'referrals', label: 'Referrals', endpoint: '/api/documentation/referral/draft', status: BACKEND_STATUS.fallback },
      { id: 'documentation', label: 'Documentation', endpoint: '/api/documentation/discharge-summary/draft', status: BACKEND_STATUS.fallback },
      { id: 'medical-iot', label: 'Medical IoT', endpoint: '/api/telemetry', status: BACKEND_STATUS.fallback },
      { id: 'simulations', label: 'Simulations', endpoint: '/api/simulations', status: BACKEND_STATUS.fallback },
      { id: 'evidence', label: 'Evidence retrieval', endpoint: '/api/clinical-intelligence/guideline-rag/query', status: BACKEND_STATUS.live },
      { id: 'ai-workflow', label: 'AI workflow', endpoint: '/api/chat', status: BACKEND_STATUS.live },
      { id: 'intake-os', label: 'Emergency Intake OS', endpoint: '/api/workspaces/emergency/intake', status: BACKEND_STATUS.fallback },
    ],
    dataPipeline: {
      source: ['EMS assessment', 'arrival data', 'registration data', 'vitals', 'chief complaint', 'orders', 'results', 'device telemetry', 'documentation drafts', 'queue events', 'capacity snapshots', 'boarding snapshots'],
      ingestion: ['EMS pre-arrival intake', 'arrival intake', 'triage intake', 'clinical events', 'device events', 'AI events', 'audit events', 'queue snapshots', 'capacity snapshots', 'boarding snapshots'],
      normalization: ['ems-pre-arrival-context', 'patient-journey-stage-mapping', 'queue-intelligence-join', 'capacity-pressure-score', 'boarding-risk-score', 'calculator-context-join', 'automation-registry-join'],
      workspaceContext: EMERGENCY_PATIENT_JOURNEY.map((stage) => stage.id).join(' -> '),
      dashboardWidgets: EMERGENCY_COMMAND_CENTER_WIDGETS.map((widget) => widget.id),
      aiContext: ['complaint-specific RAG', 'triage orchestrator', 'human review routing'],
      reports: EMERGENCY_ANALYTICS_EVENTS,
    },
    alerts: ['critical alerts', 'device alerts', 'high-risk patients', 'surge staffing watch', 'documentation integrity gap'],
    reports: ['triage volume', 'calculator utilization', 'referral volume', 'documentation drafts', 'AI recommendation acceptance', 'automation execution', 'simulation completion'],
    permissions: ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS'],
  }),
  icu: normalizeMode({
    workspaceId: 'icu',
    modeName: 'ICU Critical Care Mode',
    purpose: 'Critical-care trends, ventilator context, acuity scoring, telemetry review, and escalation.',
    primaryUsers: ['ICU physicians', 'Critical care nurses', 'Respiratory therapists', 'Biomedical engineers'],
    primaryDataSources: ['backend APIs', 'telemetry', 'frontend local/demo data', 'AI events', 'workflow events'],
    dashboards: ['sofa-trends', 'ventilator-context', 'telemetry-alerts'],
    assets: ['sofa-score', 'rox-index', 'pao2-fio2-ratio', 'ventilator-support-assistant'],
    workflows: ['sepsis escalation', 'ventilator review', 'deterioration monitoring'],
    aiAgents: ['critical-care-copilot'],
    backendServices: [
      { id: 'calculators', label: 'Calculators', endpoint: '/api/tools/execute', status: BACKEND_STATUS.live },
      { id: 'telemetry', label: 'Telemetry', endpoint: '/api/telemetry', status: BACKEND_STATUS.fallback },
      { id: 'ai-workflow', label: 'AI workflow', endpoint: '/api/chat', status: BACKEND_STATUS.live },
    ],
    alerts: ['SOFA trend', 'oxygenation risk', 'telemetry gaps'],
    reports: ['acuity review', 'ventilation summary', 'deterioration audit'],
    permissions: ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS'],
  }),
  cardiology: normalizeMode({
    workspaceId: 'cardiology',
    modeName: 'Cardiology Risk Mode',
    purpose: 'Chest pain, ACS, ECG, arrhythmia, and cardiac risk workflows.',
    primaryUsers: ['Cardiologists', 'Emergency physicians', 'Cardiology nurses'],
    primaryDataSources: ['backend APIs', 'frontend local/demo data', 'AI events', 'asset usage', 'workflow events'],
    dashboards: ['chest-pain-risk', 'ecg-context', 'recent-cardiology-tools'],
    assets: ['heart-score', 'timi-ua-nstemi', 'grace-acs', 'ecg-interpretation-assistant'],
    workflows: ['ACS review', 'ECG interpretation', 'arrhythmia follow-up'],
    aiAgents: ['cardiology-copilot'],
    backendServices: [
      { id: 'calculators', label: 'Calculators', endpoint: '/api/tools/execute', status: BACKEND_STATUS.live },
      { id: 'ai-workflow', label: 'AI workflow', endpoint: '/api/chat', status: BACKEND_STATUS.live },
    ],
    alerts: ['ACS risk', 'ECG review needed', 'troponin follow-up'],
    reports: ['chest pain review', 'cardiology utilization', 'ECG safety summary'],
    permissions: ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS'],
  }),
  laboratory: normalizeMode({
    workspaceId: 'laboratory',
    modeName: 'Laboratory Interpretation Mode',
    purpose: 'Lab interpretation, abnormal result review, specimen flow, critical values, and trends.',
    primaryUsers: ['Lab technicians', 'Pathologists', 'Clinicians', 'Researchers'],
    primaryDataSources: ['lab data', 'backend APIs', 'frontend local/demo data', 'AI events', 'workflow events'],
    dashboards: ['abnormal-labs', 'specimen-queue', 'lab-trends'],
    subpages: ['dashboard', 'tools', 'workflows', 'automations', 'results', 'specimens', 'trends', 'alerts', 'reports', 'settings'],
    assets: ['lab-interp', 'laboratory-dashboard', 'abg-interpreter', 'calc-gfr', 'ckd-staging'],
    workflows: ['critical value review', 'specimen queue review', 'trend interpretation'],
    aiAgents: ['lab-interpretation-agent'],
    backendServices: [
      { id: 'lab-results', label: 'Lab results', endpoint: '/api/labs/results', status: BACKEND_STATUS.fallback },
      { id: 'lab-interpretation', label: 'Lab interpretation', endpoint: '/api/tools/execute', status: BACKEND_STATUS.live },
      { id: 'specimen-queue', label: 'Specimen queue', endpoint: '/api/labs/specimens', status: BACKEND_STATUS.fallback },
      { id: 'trends', label: 'Lab trends', endpoint: '/api/labs/trends', status: BACKEND_STATUS.fallback },
    ],
    alerts: ['critical value', 'abnormal trend', 'delayed specimen'],
    reports: ['lab trend report', 'critical value review', 'specimen throughput'],
    permissions: ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS'],
  }),
  pharmacy: normalizeMode({
    workspaceId: 'pharmacy',
    modeName: 'Pharmacy Safety Mode',
    purpose: 'Medication safety, interactions, dosing, renal adjustment, and pharmacist review.',
    primaryUsers: ['Pharmacists', 'Clinicians', 'Nurses', 'Medication safety teams'],
    primaryDataSources: ['backend APIs', 'frontend local/demo data', 'asset usage', 'AI events', 'workflow events'],
    dashboards: ['medication-safety', 'dose-review', 'renal-dose-risk'],
    assets: ['drug-check', 'dose-calculator', 'antibiotic-guide', 'pediatric-dose-safety-checker'],
    workflows: ['interaction review', 'renal dosing review', 'antimicrobial guidance'],
    aiAgents: ['pharmacy-safety-agent'],
    backendServices: [
      { id: 'drug-check', label: 'Drug interaction check', endpoint: '/api/tools/execute', status: BACKEND_STATUS.live },
      { id: 'dosing', label: 'Dose calculation', endpoint: '/api/tools/execute', status: BACKEND_STATUS.live },
      { id: 'medication-review', label: 'Medication review queue', endpoint: '/api/pharmacy/reviews', status: BACKEND_STATUS.fallback },
    ],
    alerts: ['interaction risk', 'renal dose risk', 'antibiotic review'],
    reports: ['medication safety report', 'dose review summary', 'antimicrobial stewardship'],
    permissions: ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS'],
  }),
  operations: normalizeMode({
    workspaceId: 'operations',
    modeName: 'Hospital Operations Mode',
    purpose: 'Hospital map, digital twin, capacity, devices, alerts, and operational coordination.',
    primaryUsers: ['Hospital administrators', 'Operations leads', 'Charge nurses', 'Biomedical engineers'],
    primaryDataSources: ['backend APIs', 'telemetry', 'audit logs', 'user activity', 'workflow events', 'frontend local/demo data'],
    dashboards: ['operations-summary', 'capacity-status', 'active-alerts'],
    assets: ['hospital-map', 'hospital-operations-command', 'asset-tracking-dashboard', 'device-fleet-management'],
    workflows: ['capacity review', 'incident command', 'device readiness'],
    aiAgents: ['operations-copilot'],
    backendServices: [
      { id: 'hospital-map', label: 'Hospital map', endpoint: '/api/operations/map', status: BACKEND_STATUS.fallback },
      { id: 'digital-twin', label: 'Digital twin', endpoint: '/api/operations/digital-twin', status: BACKEND_STATUS.fallback },
      { id: 'capacity', label: 'Capacity', endpoint: '/api/operations/capacity', status: BACKEND_STATUS.fallback },
      { id: 'alerts', label: 'Alerts', endpoint: '/api/alerts', status: BACKEND_STATUS.fallback },
    ],
    alerts: ['capacity constraint', 'device issue', 'incident command'],
    reports: ['capacity report', 'operations review', 'incident summary'],
    permissions: ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS'],
  }),
  fleet: normalizeMode({
    workspaceId: 'fleet',
    modeName: 'Fleet Dispatch Mode',
    purpose: 'Vehicle tracking, dispatch, route issues, maintenance, and fleet analytics.',
    primaryUsers: ['Fleet operators', 'EMS coordinators', 'Dispatch supervisors'],
    primaryDataSources: ['fleet data', 'telemetry', 'backend APIs', 'frontend local/demo data', 'workflow events'],
    dashboards: ['fleet-status', 'route-risk', 'maintenance-readiness'],
    subpages: ['dashboard', 'tools', 'workflows', 'automations', 'map', 'dispatch', 'maintenance', 'analytics', 'alerts', 'reports', 'settings'],
    assets: ['fleet-live-map', 'live-tracking-map', 'fleet-command', 'route-optimizer', 'predictive-maintenance'],
    workflows: ['dispatch review', 'route optimization', 'maintenance readiness'],
    aiAgents: ['fleet-operations-agent'],
    backendServices: [
      { id: 'vehicles', label: 'Vehicles', endpoint: '/api/fleet/vehicles', status: BACKEND_STATUS.fallback },
      { id: 'tracking', label: 'Tracking', endpoint: '/api/fleet/tracking', status: BACKEND_STATUS.fallback },
      { id: 'dispatch', label: 'Dispatch', endpoint: '/api/fleet/dispatch', status: BACKEND_STATUS.fallback },
      { id: 'maintenance', label: 'Maintenance', endpoint: '/api/fleet/maintenance', status: BACKEND_STATUS.fallback },
    ],
    alerts: ['route delay', 'vehicle readiness', 'maintenance risk'],
    reports: ['fleet readiness', 'dispatch summary', 'route analytics'],
    permissions: ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS'],
  }),
  'medical-iot': normalizeMode({
    workspaceId: 'medical-iot',
    modeName: 'Medical IoT Telemetry Mode',
    purpose: 'Device telemetry, offline devices, stale signals, maintenance, battery risk, and biomedical alerts.',
    primaryUsers: ['Biomedical engineers', 'ICU clinicians', 'Nurses', 'Operations teams'],
    primaryDataSources: ['telemetry', 'backend APIs', 'frontend local/demo data', 'asset usage', 'workflow events'],
    dashboards: ['offline-devices', 'telemetry-freshness', 'battery-risk'],
    subpages: ['dashboard', 'tools', 'workflows', 'automations', 'devices', 'telemetry', 'maintenance', 'analytics', 'alerts', 'reports', 'settings'],
    assets: ['medical-iot-dashboard', 'telemetry-monitoring', 'device-maintenance', 'device-fleet-management'],
    workflows: ['offline device review', 'telemetry gap review', 'maintenance dispatch'],
    aiAgents: ['device-telemetry-agent'],
    backendServices: [
      { id: 'devices', label: 'Devices', endpoint: '/api/devices', status: BACKEND_STATUS.fallback },
      { id: 'telemetry', label: 'Telemetry', endpoint: '/api/telemetry', status: BACKEND_STATUS.fallback },
      { id: 'alerts', label: 'Alerts', endpoint: '/api/device-alerts', status: BACKEND_STATUS.fallback },
      { id: 'maintenance', label: 'Maintenance', endpoint: '/api/device-maintenance', status: BACKEND_STATUS.fallback },
    ],
    alerts: ['offline device', 'telemetry gap', 'battery risk', 'maintenance due'],
    reports: ['telemetry freshness', 'device risk', 'maintenance summary'],
    permissions: ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS'],
  }),
  education: normalizeMode({
    workspaceId: 'education',
    modeName: 'Education Training Mode',
    purpose: 'Simulation, competency tracking, debriefs, learner support, and guided practice.',
    primaryUsers: ['Educators', 'Students', 'Clinical preceptors'],
    primaryDataSources: ['simulation data', 'frontend local/demo data', 'user activity', 'AI events', 'workflow events'],
    dashboards: ['recommended-scenarios', 'competency-gaps', 'recent-debriefs'],
    assets: ['simulation-suite', 'scenario-player', 'competency-platform', 'debrief-dashboard'],
    workflows: ['scenario assignment', 'debrief review', 'competency practice'],
    aiAgents: ['education-coach'],
    backendServices: [
      { id: 'simulations', label: 'Simulations', endpoint: '/api/simulations', status: BACKEND_STATUS.fallback },
      { id: 'competencies', label: 'Competencies', endpoint: '/api/competencies', status: BACKEND_STATUS.fallback },
      { id: 'ai-workflow', label: 'AI workflow', endpoint: '/api/chat', status: BACKEND_STATUS.live },
    ],
    alerts: ['competency gap', 'incomplete debrief', 'recommended practice'],
    reports: ['learner progress', 'competency review', 'simulation outcomes'],
    permissions: ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS'],
  }),
  research: normalizeMode({
    workspaceId: 'research',
    modeName: 'Research Evidence Mode',
    purpose: 'Evidence retrieval, literature review, explainability, auditability, and research workflows.',
    primaryUsers: ['Researchers', 'Educators', 'Clinical governance teams'],
    primaryDataSources: ['backend APIs', 'frontend local/demo data', 'AI events', 'asset usage', 'audit logs'],
    dashboards: ['evidence-review', 'cohort-context', 'auditability'],
    assets: ['guideline-rag', 'differential-ai', 'timeline-ai', 'ai-explainability'],
    workflows: ['evidence review', 'cohort exploration', 'explainability review'],
    aiAgents: ['research-copilot'],
    backendServices: [
      { id: 'guidelines', label: 'Guideline retrieval', endpoint: '/api/guidelines', status: BACKEND_STATUS.fallback },
      { id: 'ai-workflow', label: 'AI workflow', endpoint: '/api/chat', status: BACKEND_STATUS.live },
      { id: 'audit', label: 'Audit', endpoint: '/api/audit', status: BACKEND_STATUS.fallback },
    ],
    alerts: ['evidence gap', 'citation needed', 'auditability risk'],
    reports: ['evidence review', 'research summary', 'explainability report'],
    permissions: ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS'],
  }),
  governance: normalizeMode({
    workspaceId: 'governance',
    modeName: 'Governance Review Mode',
    purpose: 'Audit, security, regulatory risk, human review, and AI governance evidence.',
    primaryUsers: ['Compliance officers', 'Security reviewers', 'Administrators', 'Platform admins'],
    primaryDataSources: ['audit logs', 'AI events', 'backend APIs', 'user activity', 'workflow events'],
    dashboards: ['audit-readiness', 'policy-review', 'human-review'],
    subpages: ['dashboard', 'tools', 'workflows', 'automations', 'audit', 'security', 'risk', 'reviews', 'analytics', 'alerts', 'reports', 'settings'],
    assets: ['ai-governance', 'ai-security', 'ai-explainability', 'clinical-audit'],
    workflows: ['human review queue', 'security review', 'regulatory risk review'],
    aiAgents: ['governance-agent'],
    backendServices: [
      { id: 'audit', label: 'Audit', endpoint: '/api/audit', status: BACKEND_STATUS.fallback },
      { id: 'security', label: 'Security', endpoint: '/api/security', status: BACKEND_STATUS.fallback },
      { id: 'regulatory', label: 'Regulatory', endpoint: '/api/regulatory', status: BACKEND_STATUS.fallback },
      { id: 'human-review', label: 'Human review', endpoint: '/api/reviews', status: BACKEND_STATUS.fallback },
    ],
    alerts: ['audit gap', 'security event', 'review overdue', 'policy risk'],
    reports: ['audit readiness', 'security summary', 'human review report'],
    permissions: ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS', 'MANAGE_SETTINGS'],
  }),
  administration: normalizeMode({
    workspaceId: 'administration',
    modeName: 'Administration SaaS Operations Mode',
    purpose: 'Tenant setup, workspace management, access controls, SaaS readiness, and backend connection review.',
    primaryUsers: ['Platform admins', 'Tenant admins', 'Hospital administrators'],
    primaryDataSources: ['backend APIs', 'audit logs', 'user activity', 'asset usage', 'frontend local/demo data'],
    dashboards: ['tenant-health', 'workspace-setup', 'billing-readiness'],
    assets: ['ai-governance', 'ai-security', 'clinical-audit', 'hospital-operations-command'],
    workflows: ['workspace setup', 'role review', 'entitlement review', 'backend readiness'],
    aiAgents: ['administration-agent'],
    backendServices: [
      { id: 'tenant-admin', label: 'Tenant admin', endpoint: '/api/tenant', status: BACKEND_STATUS.fallback },
      { id: 'workspace-admin', label: 'Workspace admin', endpoint: '/api/workspaces', status: BACKEND_STATUS.live },
      { id: 'users', label: 'Users', endpoint: '/api/users', status: BACKEND_STATUS.fallback },
      { id: 'billing', label: 'Billing', endpoint: '/api/billing', status: BACKEND_STATUS.fallback },
    ],
    alerts: ['configuration gap', 'backend fallback', 'role review', 'entitlement gap'],
    reports: ['workspace setup report', 'SaaS readiness', 'tenant operations'],
    permissions: ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS', 'MANAGE_SETTINGS'],
  }),
});

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

export function isFutureWorkspace(workspaceOrId) {
  const workspaceId =
    typeof workspaceOrId === 'string' ? workspaceOrId : workspaceOrId?.workspaceId || workspaceOrId?.id;
  return FUTURE_WORKSPACE_ID_SET.has(workspaceId);
}

export function getActiveWorkspaceRegistry(workspaces = CARE_WORKSPACES) {
  return workspaces.filter((workspace) => workspace.status === 'active' && !isFutureWorkspace(workspace));
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
    if (isFutureWorkspace(workspace) || workspace.status !== 'active') return false;
    if (!enabledSet.has(workspaceId)) return false;
    if (!workspace.allowedOrganizationTypes.map(normalizeOrganizationType).includes(orgType)) return false;
    if (!tierAllows(workspace.subscriptionTier, tier)) return false;
    if (assignedSet && !assignedSet.has(workspaceId)) return false;
    if (normalizedRole && !adminRole) {
      const allowedRoles = (workspace.allowedRoles || []).map(normalizeRole);
      if (allowedRoles.length && !allowedRoles.includes(normalizedRole)) return false;
    }
    return true;
  });

  return filtered.length ? filtered : [getCareWorkspaceById(DEFAULT_CARE_WORKSPACE_ID)];
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

export function getWorkspaceFunctionalityMode(workspaceId = DEFAULT_CARE_WORKSPACE_ID) {
  const workspace = getCareWorkspaceById(workspaceId);
  return (
    WORKSPACE_FUNCTIONALITY_MODES[workspace.id] ||
    normalizeMode({
      workspaceId: workspace.id,
      modeName: `${workspace.label} Workspace Mode`,
      purpose: workspace.description,
      primaryUsers: workspace.allowedRoles || [],
      primaryDataSources: ['frontend local/demo data', 'backend APIs', 'user activity', 'asset usage'],
      dashboards: workspace.defaultDashboardWidgets || [],
      assets: workspace.defaultAssets || [],
      workflows: workspace.defaultNavigationGroups || [],
      aiAgents: workspace.defaultAIAgents || [],
      backendServices: [
        { id: 'workspace-context', label: 'Workspace context', endpoint: '/api/workspaces/context', status: BACKEND_STATUS.live },
      ],
      alerts: ['workspace notification'],
      reports: ['workspace summary'],
      permissions: ['VIEW_DASHBOARD', 'USE_ASSISTANT', 'VIEW_TOOLS'],
    })
  );
}

export function getWorkspaceSubpageEntries(workspaceId = DEFAULT_CARE_WORKSPACE_ID) {
  const workspace = getCareWorkspaceById(workspaceId);
  const mode = getWorkspaceFunctionalityMode(workspace.id);
  return mode.subpages.map((subpage) => ({
    ...subpage,
    workspaceId: workspace.id,
    path: `/workspace/${workspace.id}/${subpage.id}`,
  }));
}

export function getWorkspaceSubpageById(workspaceId = DEFAULT_CARE_WORKSPACE_ID, subpageId = 'dashboard') {
  const normalizedSubpageId = String(subpageId || 'dashboard').trim().toLowerCase();
  return getWorkspaceSubpageEntries(workspaceId).find((subpage) => subpage.id === normalizedSubpageId) || null;
}

export function buildWorkspaceModeModel(workspaceId = DEFAULT_CARE_WORKSPACE_ID) {
  const workspace = getCareWorkspaceById(workspaceId);
  const mode = getWorkspaceFunctionalityMode(workspace.id);
  const subpageEntries = getWorkspaceSubpageEntries(workspace.id);
  return {
    workspace,
    mode,
    subpageEntries,
    backendStatus: {
      live: mode.backendServices.filter((service) => service.status === BACKEND_STATUS.live),
      fallback: mode.backendServices.filter((service) => service.status !== BACKEND_STATUS.live),
    },
  };
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
  const modeModel = buildWorkspaceModeModel(workspace.id);

  return {
    workspace,
    mode: modeModel.mode,
    subpageEntries: modeModel.subpageEntries,
    backendStatus: modeModel.backendStatus,
    routeEntries,
    toolEntries,
    stats: {
      routes: routeEntries.length,
      subpages: modeModel.subpageEntries.length,
      tools: toolEntries.length,
      calculators: toolEntries.filter((tool) => tool.category === 'Calculator').length,
      backendBacked: toolEntries.filter((tool) => tool.executorStatus === 'registered').length,
      dataSources: modeModel.mode.primaryDataSources.length,
    },
  };
}
