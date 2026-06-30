export const TARGET_FEATURE_MODULE_IDS = Object.freeze([
  'reception',
  'triage',
  'whiteboard',
  'waiting-room',
  'ems',
  'command',
  'copilot',
  'tools',
  'calculators',
  'shift',
  'admin',
  'platform',
  'team',
  'settings',
  'auth',
] as const);

export type FeatureModuleId = (typeof TARGET_FEATURE_MODULE_IDS)[number];

export type FeatureModuleImplementationStatus = 'implemented' | 'compatibility' | 'planned';

export type FeatureModuleContract = Readonly<{
  id: FeatureModuleId;
  label: string;
  primaryRoute: string;
  sourceDirectory: string;
  status: FeatureModuleImplementationStatus;
  pageFamilies: readonly string[];
  backendCapabilities: readonly string[];
  legacyDirectories?: readonly string[];
  notes: string;
}>;

export const TARGET_FEATURE_MODULE_CONTRACTS = Object.freeze([
  {
    id: 'reception',
    label: 'Reception',
    primaryRoute: '/emergency/reception',
    sourceDirectory: 'src/features/reception',
    status: 'planned',
    pageFamilies: ['src/pages/emergency/ReceptionWorkspace', 'src/pages/emergency/SmartIntake', 'src/pages/emergency/SelfArrivalCheckIn'],
    backendCapabilities: ['emergencyReceptionSnapshot', 'emergencyReceptionHandoff', 'emergencySmartIntake'],
    notes: 'Owns arrival, registration, smart intake, identity review, and reception queue behavior.',
  },
  {
    id: 'triage',
    label: 'Triage',
    primaryRoute: '/triage',
    sourceDirectory: 'src/features/triage',
    status: 'compatibility',
    pageFamilies: ['src/features/triage-queue', 'src/pages/emergency/ClinicalCalculatorHub'],
    backendCapabilities: ['emergencyTriageAssist', 'emergencyQueues'],
    legacyDirectories: ['src/features/triage-queue'],
    notes: 'Normalizes triage queue behavior behind the target triage module contract.',
  },
  {
    id: 'whiteboard',
    label: 'Whiteboard',
    primaryRoute: '/emergency/whiteboard',
    sourceDirectory: 'src/features/whiteboard',
    status: 'implemented',
    pageFamilies: ['src/features/whiteboard', 'src/pages/emergency/index', 'src/pages/emergency/PatientRoomDisplay'],
    backendCapabilities: ['emergencyWhiteboard', 'emergencyPatients', 'emergencyPatientJourney'],
    notes: 'Owns physician whiteboard, public display, patient-room display, and core ED board surfaces.',
  },
  {
    id: 'waiting-room',
    label: 'Waiting Room',
    primaryRoute: '/emergency/whiteboard?view=waiting-room',
    sourceDirectory: 'src/features/waiting-room',
    status: 'planned',
    pageFamilies: ['src/components/waiting-room', 'src/components/patient-experience'],
    backendCapabilities: ['emergencyQueues', 'emergencyReassessment'],
    notes: 'Owns public waiting display, reassessment attention, communication, LWBS risk, and patient-facing safety cues.',
  },
  {
    id: 'ems',
    label: 'EMS',
    primaryRoute: '/emergency/ems',
    sourceDirectory: 'src/features/ems',
    status: 'compatibility',
    pageFamilies: ['src/features/ems-module', 'src/pages/emergency/DispatchConsole'],
    backendCapabilities: ['emergencyEmsRuntime', 'emergencyReceptionHandoff'],
    legacyDirectories: ['src/features/ems-module'],
    notes: 'Compatibility module for ambulance tracker, handoff checklist, pre-arrival, and dispatch surfaces.',
  },
  {
    id: 'command',
    label: 'Command',
    primaryRoute: '/emergency/analytics',
    sourceDirectory: 'src/features/command',
    status: 'planned',
    pageFamilies: ['src/pages/analytics', 'src/pages/executive', 'src/pages/operations', 'src/pages/fleet'],
    backendCapabilities: ['emergencyOperationalAnalytics', 'emergencyCapacity', 'emergencyBoarding'],
    notes: 'Owns ED manager analytics, capacity, boarding, throughput, fleet, and operational command surfaces.',
  },
  {
    id: 'copilot',
    label: 'Copilot',
    primaryRoute: '/emergency/copilot',
    sourceDirectory: 'src/features/copilot',
    status: 'implemented',
    pageFamilies: ['src/features/copilot', 'src/pages/ai', 'src/pages/tools/*Ai'],
    backendCapabilities: ['chatMessage', 'chatIntentClassify', 'emergencyCopilotRuntime', 'clinicalIntelligence'],
    notes: 'Owns chat, AI command, memory, evaluation, cost, and clinical AI transparency handoff contracts.',
  },
  {
    id: 'tools',
    label: 'Tools',
    primaryRoute: '/tools',
    sourceDirectory: 'src/features/tools',
    status: 'planned',
    pageFamilies: ['src/pages/tools'],
    backendCapabilities: ['toolsList', 'toolsExecute', 'clinicalIntelligence'],
    notes: 'Owns tool catalog, shared tool sessions, clinical helpers, and non-calculator tool pages.',
  },
  {
    id: 'calculators',
    label: 'Calculators',
    primaryRoute: '/tools/calculators',
    sourceDirectory: 'src/features/calculators',
    status: 'planned',
    pageFamilies: ['src/pages/tools/*Calculator*', 'src/pages/tools/*Calculators*', 'src/pages/emergency/ClinicalCalculatorHub'],
    backendCapabilities: ['toolsList'],
    notes: 'Owns calculator hubs, source-backed calculator groups, calculator primitives, and result safety copy.',
  },
  {
    id: 'shift',
    label: 'Shift',
    primaryRoute: '/emergency/shift',
    sourceDirectory: 'src/features/shift',
    status: 'planned',
    pageFamilies: ['src/pages/emergency/shift'],
    backendCapabilities: ['emergencyShiftReportExport', 'emergencyWorkflowAudit'],
    notes: 'Owns shift summary, handoff notes, closeout metrics, and shift artifacts.',
  },
  {
    id: 'admin',
    label: 'Admin',
    primaryRoute: '/admin',
    sourceDirectory: 'src/features/admin',
    status: 'planned',
    pageFamilies: ['src/pages/admin'],
    backendCapabilities: ['tenantAdministration', 'organizationFeatureFlags'],
    notes: 'Owns staff management, role assignment, workflow administration, and admin operations.',
  },
  {
    id: 'platform',
    label: 'Platform',
    primaryRoute: '/platform-admin',
    sourceDirectory: 'src/features/platform',
    status: 'planned',
    pageFamilies: ['src/pages/platform', 'src/pages/governance', 'src/pages/saas', 'src/pages/commercial', 'src/pages/legal'],
    backendCapabilities: ['platformAssets', 'aiGovernance', 'emergencyGovernance', 'workspaces'],
    notes: 'Owns governance, platform OS, diagnostics, SaaS health, commercial pages, legal pages, and organization-wide surfaces.',
  },
  {
    id: 'team',
    label: 'Team',
    primaryRoute: '/team',
    sourceDirectory: 'src/features/team',
    status: 'planned',
    pageFamilies: ['src/pages/team'],
    backendCapabilities: ['teamManagement', 'userProfile'],
    notes: 'Owns team management, invites, membership, and role collaboration workflows.',
  },
  {
    id: 'settings',
    label: 'Settings',
    primaryRoute: '/settings',
    sourceDirectory: 'src/features/settings',
    status: 'planned',
    pageFamilies: ['src/pages/settings', 'src/pages/Settings', 'src/pages/NotificationPreferences'],
    backendCapabilities: ['userProfile', 'personalization'],
    notes: 'Owns app settings, notification preferences, feature management, and emergency settings wrappers.',
  },
  {
    id: 'auth',
    label: 'Auth',
    primaryRoute: '/auth',
    sourceDirectory: 'src/features/auth',
    status: 'planned',
    pageFamilies: ['src/pages/Profile', 'src/pages/profile', 'src/auth'],
    backendCapabilities: ['userProfile', 'workspaces', 'operationalProfile'],
    notes: 'Owns identity, session, demo persona, profile, security, workspace access, and account preferences.',
  },
] satisfies readonly FeatureModuleContract[]);

export const TARGET_FEATURE_MODULE_CONTRACTS_BY_ID = Object.freeze(
  TARGET_FEATURE_MODULE_CONTRACTS.reduce(
    (acc, contract) => {
      acc[contract.id] = contract;
      return acc;
    },
    {} as Record<FeatureModuleId, FeatureModuleContract>,
  ),
);

export function getFeatureModuleContract(id: FeatureModuleId): FeatureModuleContract {
  return TARGET_FEATURE_MODULE_CONTRACTS_BY_ID[id];
}

export function isFeatureModuleId(value: string): value is FeatureModuleId {
  return TARGET_FEATURE_MODULE_IDS.includes(value as FeatureModuleId);
}
