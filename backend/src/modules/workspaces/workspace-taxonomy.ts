import { WorkspaceMembershipRole } from './entities/workspace-membership.entity';
import { WorkspaceType } from './entities/workspace.entity';

export type WorkspaceShortcutDefinition = {
  id: string;
  label: string;
  path: string;
  description: string;
  assetId?: string;
};

export type WorkspaceDefinition = {
  type: WorkspaceType;
  name: string;
  displayName: string;
  description: string;
  assistantContext: string;
  defaultDashboard: string;
  enabledToolIds: string[];
  enabledModules: string[];
  shortcuts: WorkspaceShortcutDefinition[];
  recommendedAssetIds: string[];
  preferredMembershipRole?: WorkspaceMembershipRole;
};

const baseShortcuts = {
  assistant: {
    id: 'assistant',
    label: 'AI Assistant',
    path: '/assistant',
    description: 'Ask with the active workspace context attached.',
  },
  dashboard: {
    id: 'dashboard',
    label: 'Command Center',
    path: '/dashboard',
    description: 'Open the workspace-aware command center.',
  },
  tools: {
    id: 'tools',
    label: 'Tool Library',
    path: '/tools',
    description: 'Browse visible workspace assets.',
  },
};

export const REQUESTED_WORKSPACE_TYPES = Object.freeze([
  WorkspaceType.EMERGENCY,
  WorkspaceType.ICU,
  WorkspaceType.CARDIOLOGY,
  WorkspaceType.LABORATORY,
  WorkspaceType.OPERATIONS,
  WorkspaceType.FLEET,
  WorkspaceType.MEDICAL_IOT,
  WorkspaceType.EDUCATION,
  WorkspaceType.RESEARCH,
  WorkspaceType.GOVERNANCE,
]);

export const WORKSPACE_DEFINITIONS: Record<WorkspaceType, WorkspaceDefinition> = {
  [WorkspaceType.PERSONAL]: {
    type: WorkspaceType.PERSONAL,
    name: 'Personal Clinical Workspace',
    displayName: 'Personal Clinical Workspace',
    description: 'Personal tools, calculators, references, and assistant workflows.',
    assistantContext:
      'Use general clinical copilot behavior and ask for missing patient context before recommending tools.',
    defaultDashboard: 'command',
    enabledToolIds: ['calculators', 'drug-check', 'lab-interp', 'protocols', 'diagnosis-assistant'],
    enabledModules: ['dashboard', 'assistant', 'tools', 'calculators'],
    shortcuts: [baseShortcuts.assistant, baseShortcuts.dashboard, baseShortcuts.tools],
    recommendedAssetIds: ['calculators', 'drug-check', 'lab-interp', 'protocols'],
    preferredMembershipRole: WorkspaceMembershipRole.OWNER,
  },
  [WorkspaceType.HOSPITAL]: {
    type: WorkspaceType.HOSPITAL,
    name: 'Hospital Operations Workspace',
    displayName: 'Hospital Operations',
    description: 'Hospital flow, maps, devices, alerts, and operational coordination.',
    assistantContext:
      'Summarize hospital operational status, capacity, maps, device readiness, and next coordination steps.',
    defaultDashboard: 'operations',
    enabledToolIds: ['hospital-map', 'medical-iot', 'digital-twin', 'lab-interp', 'protocols'],
    enabledModules: ['dashboard', 'patients', 'maps', 'medical-iot', 'notifications'],
    shortcuts: [
      baseShortcuts.dashboard,
      { id: 'hospital-map', label: 'Hospital Map', path: '/hospital-map', description: 'Open bed, room, alert, and device map.', assetId: 'hospital-map' },
      { id: 'medical-iot', label: 'Medical IoT', path: '/medical-iot', description: 'Open device telemetry and signal status.', assetId: 'medical-iot-dashboard' },
    ],
    recommendedAssetIds: ['hospital-map', 'digital-twin', 'medical-iot-dashboard', 'lab-interp'],
  },
  [WorkspaceType.EMERGENCY]: {
    type: WorkspaceType.EMERGENCY,
    name: 'Emergency Workspace',
    displayName: 'Emergency',
    description: 'Rapid triage, deterioration scoring, live alerts, and time-sensitive pathways.',
    assistantContext:
      'Prioritize ABCs, vitals, red flags, time-sensitive triage, and emergency calculators before broad browsing.',
    defaultDashboard: 'emergency',
    enabledToolIds: ['qsofa', 'news2', 'sofa-score', 'nihss', 'heart-score', 'trauma-score', 'protocols', 'hospital-map', 'fleet-live-map'],
    enabledModules: ['dashboard', 'assistant', 'alerts', 'calculators', 'maps', 'fleet'],
    shortcuts: [
      baseShortcuts.assistant,
      { id: 'calculators', label: 'Emergency Calculators', path: '/tools/calculators', description: 'Open deterioration and triage calculators.', assetId: 'qsofa' },
      { id: 'live-map', label: 'Live Map', path: '/live-map', description: 'Open operational live map.', assetId: 'live-tracking-map' },
    ],
    recommendedAssetIds: ['qsofa', 'news2', 'sofa-score', 'nihss', 'heart-score', 'protocols'],
  },
  [WorkspaceType.ICU]: {
    type: WorkspaceType.ICU,
    name: 'ICU Workspace',
    displayName: 'ICU',
    description: 'Critical care, ventilators, oxygenation, deterioration, and escalation support.',
    assistantContext:
      'Prioritize critical-care acuity, ventilator context, oxygenation, SOFA trends, sepsis risk, and escalation signals.',
    defaultDashboard: 'icu',
    enabledToolIds: ['sofa-score', 'news2', 'rox-index', 'pao2-fio2-ratio', 'aa-gradient', 'ventilator-support-assistant', 'medical-iot-dashboard', 'telemetry-monitoring'],
    enabledModules: ['dashboard', 'assistant', 'calculators', 'medical-iot', 'notifications'],
    shortcuts: [
      baseShortcuts.assistant,
      { id: 'icu-calculators', label: 'ICU Calculators', path: '/tools/calculators', description: 'Open SOFA, ROX, P/F ratio, and ICU scores.', assetId: 'sofa-score' },
      { id: 'telemetry', label: 'Telemetry', path: '/medical-iot', description: 'Open ICU telemetry and devices.', assetId: 'telemetry-monitoring' },
    ],
    recommendedAssetIds: ['sofa-score', 'news2', 'rox-index', 'pao2-fio2-ratio', 'medical-iot-dashboard'],
  },
  [WorkspaceType.CARDIOLOGY]: {
    type: WorkspaceType.CARDIOLOGY,
    name: 'Cardiology Workspace',
    displayName: 'Cardiology',
    description: 'Chest pain, ACS risk, ECG support, arrhythmia, and cardiac workflows.',
    assistantContext:
      'Prioritize ACS red flags, ECG and troponin context, HEART/TIMI/GRACE risk, and clinician review.',
    defaultDashboard: 'cardiology',
    enabledToolIds: ['heart-score', 'timi-ua-nstemi', 'grace-acs', 'acs-workflow-assistant', 'ecg-interpretation-assistant', 'atrial-fibrillation-assistant'],
    enabledModules: ['dashboard', 'assistant', 'calculators', 'tools'],
    shortcuts: [
      baseShortcuts.assistant,
      { id: 'heart-score', label: 'HEART Score', path: '/tools/calculators', description: 'Open chest pain risk scoring.', assetId: 'heart-score' },
      { id: 'cardiology-tools', label: 'Cardiology Tools', path: '/workspace/cardiology', description: 'Open cardiology workspace tools.' },
    ],
    recommendedAssetIds: ['heart-score', 'timi-ua-nstemi', 'grace-acs', 'acs-workflow-assistant'],
  },
  [WorkspaceType.LABORATORY]: {
    type: WorkspaceType.LABORATORY,
    name: 'Laboratory Workspace',
    displayName: 'Laboratory',
    description: 'Lab interpretation, abnormal result review, specimen flow, and critical value follow-up.',
    assistantContext:
      'Interpret lab context carefully, flag critical values, explain uncertainty, and recommend follow-up verification.',
    defaultDashboard: 'laboratory',
    enabledToolIds: ['lab-interp', 'laboratory-dashboard', 'abg-interpreter', 'calc-gfr', 'ckd-staging'],
    enabledModules: ['dashboard', 'assistant', 'laboratory', 'tools'],
    shortcuts: [
      baseShortcuts.assistant,
      { id: 'laboratory', label: 'Laboratory Dashboard', path: '/laboratory', description: 'Open lab queue, abnormal flags, and trends.', assetId: 'laboratory-dashboard' },
      { id: 'lab-interpreter', label: 'Lab Interpreter', path: '/tools/lab-interpreter', description: 'Interpret structured lab values.', assetId: 'lab-interp' },
    ],
    recommendedAssetIds: ['lab-interp', 'laboratory-dashboard', 'abg-interpreter', 'calc-gfr'],
  },
  [WorkspaceType.OPERATIONS]: {
    type: WorkspaceType.OPERATIONS,
    name: 'Operations Workspace',
    displayName: 'Operations',
    description: 'Hospital flow, capacity, alerts, staffing, and cross-functional coordination.',
    assistantContext:
      'Focus on operational status, bed capacity, staffing, device readiness, alerts, and next best coordination steps.',
    defaultDashboard: 'operations',
    enabledToolIds: ['hospital-map', 'digital-twin', 'hospital-operations-command', 'incident-command-center', 'bed-occupancy-calculator', 'staffing-ratio-calculator', 'capacity-prediction-engine'],
    enabledModules: ['dashboard', 'operations', 'maps', 'notifications', 'analytics'],
    shortcuts: [
      baseShortcuts.dashboard,
      { id: 'digital-twin', label: 'Digital Twin', path: '/digital-twin', description: 'Open operational digital twin.', assetId: 'digital-twin' },
      { id: 'hospital-map', label: 'Hospital Map', path: '/hospital-map', description: 'Open hospital map.', assetId: 'hospital-map' },
    ],
    recommendedAssetIds: ['digital-twin', 'hospital-map', 'hospital-operations-command', 'capacity-prediction-engine'],
  },
  [WorkspaceType.FLEET]: {
    type: WorkspaceType.FLEET,
    name: 'Fleet Workspace',
    displayName: 'Fleet',
    description: 'Transport visibility, vehicle state, routes, dispatch, and predictive maintenance.',
    assistantContext:
      'Focus on logistics, ETA, route risk, vehicle state, and dispatch support without implying autonomous dispatch.',
    defaultDashboard: 'fleet',
    enabledToolIds: ['fleet-dashboard', 'fleet-live-map', 'live-tracking-map', 'fleet-command', 'route-optimizer', 'predictive-maintenance', 'dispatch-ai'],
    enabledModules: ['dashboard', 'fleet', 'live-tracking', 'operations'],
    shortcuts: [
      { id: 'fleet-map', label: 'Fleet Map', path: '/fleet/map', description: 'Open vehicle map and ETAs.', assetId: 'fleet-live-map' },
      { id: 'fleet-command', label: 'Fleet Command', path: '/fleet/command', description: 'Open dispatch command center.', assetId: 'fleet-command' },
      { id: 'route-optimizer', label: 'Route Optimizer', path: '/fleet/route-optimizer', description: 'Open route optimization.', assetId: 'route-optimizer' },
    ],
    recommendedAssetIds: ['fleet-dashboard', 'fleet-live-map', 'fleet-command', 'route-optimizer', 'predictive-maintenance'],
    preferredMembershipRole: WorkspaceMembershipRole.DISPATCHER,
  },
  [WorkspaceType.MEDICAL_IOT]: {
    type: WorkspaceType.MEDICAL_IOT,
    name: 'Medical IoT Workspace',
    displayName: 'Medical IoT',
    description: 'Device telemetry, signal quality, stale state, maintenance, and fleet readiness.',
    assistantContext:
      'Interpret device telemetry, battery state, signal quality, last-seen timestamps, maintenance needs, and safety limitations.',
    defaultDashboard: 'medical-iot',
    enabledToolIds: ['medical-iot-dashboard', 'telemetry-monitoring', 'device-maintenance', 'device-fleet-management', 'device-battery-intelligence'],
    enabledModules: ['dashboard', 'medical-iot', 'devices', 'maps'],
    shortcuts: [
      { id: 'medical-iot', label: 'Medical IoT', path: '/medical-iot', description: 'Open telemetry dashboard.', assetId: 'medical-iot-dashboard' },
      { id: 'devices', label: 'Device Fleet', path: '/devices', description: 'Open device fleet management.', assetId: 'device-fleet-management' },
      { id: 'hospital-map', label: 'Hospital Map', path: '/hospital-map', description: 'Open device locations on map.', assetId: 'hospital-map' },
    ],
    recommendedAssetIds: ['medical-iot-dashboard', 'telemetry-monitoring', 'device-maintenance', 'device-fleet-management'],
  },
  [WorkspaceType.EDUCATION]: {
    type: WorkspaceType.EDUCATION,
    name: 'Education Workspace',
    displayName: 'Education',
    description: 'Simulation, competency tracking, credentials, debriefs, and guided practice.',
    assistantContext:
      'Teach with simulation-first framing, competency objectives, debriefing, safety reminders, and practice recommendations.',
    defaultDashboard: 'education',
    enabledToolIds: ['simulation-suite', 'scenario-player', 'simulation-outcomes', 'competency-platform', 'credentialing-platform', 'debrief-dashboard', 'competency-dashboard'],
    enabledModules: ['dashboard', 'assistant', 'simulation', 'education', 'credentials'],
    shortcuts: [
      { id: 'simulation', label: 'Simulation Suite', path: '/simulation', description: 'Open simulation scenarios.', assetId: 'simulation-suite' },
      { id: 'simulation-outcomes', label: 'Simulation Outcomes', path: '/simulation/outcomes', description: 'Review learner outcomes.', assetId: 'simulation-outcomes' },
      { id: 'competencies', label: 'Competencies', path: '/competencies', description: 'Open competency tracking.', assetId: 'competency-platform' },
    ],
    recommendedAssetIds: ['simulation-suite', 'scenario-player', 'simulation-outcomes', 'competency-platform'],
  },
  [WorkspaceType.RESEARCH]: {
    type: WorkspaceType.RESEARCH,
    name: 'Research Workspace',
    displayName: 'Research',
    description: 'Guidelines, cited retrieval, evidence review, audit, explainability, and study workflows.',
    assistantContext:
      'Emphasize citations, uncertainty, cohort logic, limitations, explainability, and reproducible evidence review.',
    defaultDashboard: 'research',
    enabledToolIds: ['guideline-rag', 'research-evidence-hub', 'clinical-audit', 'ai-explainability', 'differential-ai'],
    enabledModules: ['dashboard', 'assistant', 'research', 'rag', 'audit'],
    shortcuts: [
      { id: 'research', label: 'Research Hub', path: '/research', description: 'Open evidence and research hub.', assetId: 'research-evidence-hub' },
      { id: 'guidelines', label: 'Guidelines', path: '/tools/guideline-rag', description: 'Open guideline retrieval.', assetId: 'guideline-rag' },
      { id: 'explainability', label: 'AI Explainability', path: '/tools/ai-explainability', description: 'Open explainability tools.', assetId: 'ai-explainability' },
    ],
    recommendedAssetIds: ['guideline-rag', 'research-evidence-hub', 'ai-explainability', 'clinical-audit'],
    preferredMembershipRole: WorkspaceMembershipRole.RESEARCHER,
  },
  [WorkspaceType.GOVERNANCE]: {
    type: WorkspaceType.GOVERNANCE,
    name: 'Governance Workspace',
    displayName: 'Governance',
    description: 'Audit, AI governance, compliance, security, policy, and operational review.',
    assistantContext:
      'Focus on governance, auditability, compliance evidence, policy controls, safety review, and escalation paths.',
    defaultDashboard: 'governance',
    enabledToolIds: ['audit-logs', 'clinical-audit', 'ai-governance', 'ai-security', 'system-config', 'analytics'],
    enabledModules: ['dashboard', 'governance', 'audit', 'settings', 'analytics'],
    shortcuts: [
      { id: 'ai-governance', label: 'AI Governance', path: '/ai-governance', description: 'Open governance center.', assetId: 'ai-governance' },
      { id: 'audit', label: 'Audit Logs', path: '/audit', description: 'Open audit log review.', assetId: 'audit-logs' },
      { id: 'security', label: 'AI Security', path: '/security', description: 'Open security dashboard.', assetId: 'ai-security' },
    ],
    recommendedAssetIds: ['ai-governance', 'audit-logs', 'clinical-audit', 'ai-security'],
    preferredMembershipRole: WorkspaceMembershipRole.ADMIN,
  },
  [WorkspaceType.ADMIN]: {
    type: WorkspaceType.ADMIN,
    name: 'Admin Workspace',
    displayName: 'Governance',
    description: 'Legacy admin workspace mapped to Governance.',
    assistantContext:
      'Focus on governance, auditability, compliance evidence, policy controls, safety review, and escalation paths.',
    defaultDashboard: 'governance',
    enabledToolIds: ['audit-logs', 'analytics', 'team-management', 'system-config', 'ai-governance'],
    enabledModules: ['admin', 'audit', 'analytics', 'settings', 'governance'],
    shortcuts: [
      { id: 'ai-governance', label: 'AI Governance', path: '/ai-governance', description: 'Open governance center.', assetId: 'ai-governance' },
      { id: 'settings', label: 'Settings', path: '/settings', description: 'Open settings.' },
    ],
    recommendedAssetIds: ['audit-logs', 'analytics', 'system-config', 'ai-governance'],
    preferredMembershipRole: WorkspaceMembershipRole.ADMIN,
  },
};

export function getWorkspaceDefinition(type: WorkspaceType | string): WorkspaceDefinition {
  return WORKSPACE_DEFINITIONS[type as WorkspaceType] || WORKSPACE_DEFINITIONS[WorkspaceType.EMERGENCY];
}

export function workspaceSettingsForType(type: WorkspaceType | string) {
  const definition = getWorkspaceDefinition(type);
  return {
    defaultDashboard: definition.defaultDashboard,
    enabledToolIds: definition.enabledToolIds,
    enabledModules: definition.enabledModules,
    assistantContext: definition.assistantContext,
    shortcuts: definition.shortcuts,
    recommendedAssetIds: definition.recommendedAssetIds,
    workspaceKey: definition.type,
    emergencyModeEnabled: definition.type === WorkspaceType.EMERGENCY,
  };
}

export function workspaceRouteKey(type: WorkspaceType | string): string {
  if (type === WorkspaceType.ADMIN) return WorkspaceType.GOVERNANCE;
  if (type === WorkspaceType.HOSPITAL) return WorkspaceType.OPERATIONS;
  if (type === WorkspaceType.PERSONAL) return WorkspaceType.EMERGENCY;
  return String(type || WorkspaceType.EMERGENCY);
}
