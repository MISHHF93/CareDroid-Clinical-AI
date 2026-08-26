/**
 * Canonical route and alias configuration.
 *
 * React Router still owns rendering in `src/app/router.tsx`; this module owns stable paths
 * and redirect aliases so route consumers do not define competing maps.
 */

export const CANONICAL_ROUTES = Object.freeze({
  auth: '/auth',
  authCallback: '/auth-callback',
  authForgotPassword: '/auth/forgot-password',
  authMagicLink: '/auth/magic-link',
  authInvite: '/auth/invite',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',
  login: '/login',
  register: '/register',
  platformStart: '/start',
  adminOperations: '/admin',
  adminEdStaff: '/admin/staff-workflows',
  dashboard: '/dashboard',
  intake: '/intake',
  queue: '/queue',
  triage: '/triage',
  alerts: '/alerts',
  aiChief: '/ai-chief',
  staff: '/staff',
  analytics: '/analytics',
  reports: '/reports',
  patientProfile: '/patients/:id',
  executive: '/executive',
  executiveDashboard: '/executive-dashboard',
  operationsCommandDashboard: '/operations-command-dashboard',
  discover: '/discover',
  recommendations: '/recommendations',
  automation: '/automation',
  automationAudit: '/automation-audit',
  automationAnalytics: '/automation-analytics',
  assistant: '/assistant',
  aiCommandCenter: '/ai-command-center',
  aiOperationsDashboard: '/ai-operations-dashboard',
  clinicalToolCatalog: '/clinical-tool-catalog',
  tools: '/tools',
  operations: '/operations',
  emergencyWhiteboard: '/emergency/whiteboard',
  emergencyCommandCenter: '/emergency/command-center',
  emergencyPatients: '/emergency/patients',
  emergencyJourney: '/emergency/journey',
  emergencyEms: '/emergency/ems',
  emergencyIntake: '/emergency/intake',
  emergencyReception: '/emergency/reception',
  emergencySelfArrival: '/emergency/self-arrival',
  emergencyPatientRoom: '/emergency/patient-room',
  emergencyQueues: '/emergency/queues',
  emergencyReassessment: '/emergency/reassessment',
  emergencyCapacity: '/emergency/capacity',
  emergencyAnalytics: '/emergency/analytics',
  emergencySimulation: '/emergency/simulation',
  emergencyFederatedLearning: '/emergency/federated-learning',
  emergencyDigitalTwin: '/emergency/digital-twin',
  emergencyCopilot: '/emergency/copilot',
  emergencyDocumentation: '/emergency/documentation',
  emergencyBoarding: '/emergency/boarding',
  emergencyReferrals: '/emergency/referrals',
  emergencyProvincialHealth: '/emergency/provincial-health',
  emergencyIntegrations: '/emergency/integrations',
  integrationHub: '/integrations/hub',
  cosmosViewer: '/cosmos',
  emergencyAiGovernance: '/emergency/ai-governance',
  emergencyPulse: '/emergency/pulse',
  emergencyShift: '/emergency/shift',
  emergencySettings: '/emergency/settings',
  emergencyHelp: '/emergency/help',
  emergencyAlerts: '/emergency/alerts',
  emergencyCollaboration: '/emergency/collaboration',
  emergencyTools: '/emergency/tools',
  emergencyDispatch: '/emergency/dispatch',
  emergencyEdReadiness: '/emergency/ed-readiness',
  emergencyDiagnostics: '/emergency/diagnostics',
  emergencyHandoffs: '/emergency/handoffs',
  emergencyReports: '/emergency/reports',
  workspace: '/workspace',
  workspaces: '/workspaces',
  operationsCenter: '/operations-center',
  calculators: '/tools/calculators',
  calculatorDetail: '/tools/calculators/:slug',
  toolsCardiology: '/emergency/tools/cardiology/:toolId',
  toolsNephrology: '/emergency/tools/nephrology/:toolId',
  toolsNeurology: '/emergency/tools/neurology/:toolId',
  toolsGastroenterology: '/emergency/tools/gastroenterology/:toolId',
  toolsEndocrine: '/emergency/tools/endocrine/:toolId',
  toolsPediatrics: '/emergency/tools/pediatrics/:toolId',
  toolsPsychiatry: '/emergency/tools/psychiatry/:toolId',
  toolsPulmonology: '/emergency/tools/pulmonology/:toolId',
  protocols: '/protocols',
  research: '/research',
  documentation: '/documentation',
  knowledgeGraph: '/knowledge-graph',
  predictiveAnalytics: '/predictive-analytics',
  predictiveAnalyticsDashboard: '/predictive-analytics-dashboard',
  clinicalDecisionSupport: '/clinical-decision-support',
  competencies: '/competencies',
  credentials: '/credentials',
  simulation: '/simulation',
  simulationOutcomes: '/simulation/outcomes',
  laboratory: '/laboratory',
  pharmacy: '/pharmacy',
  radiology: '/radiology',
  education: '/education',
  cardiology: '/cardiology',
  nephrology: '/nephrology',
  neurologyDept: '/neurology',
  gastroenterology: '/gastroenterology',
  endocrinology: '/endocrinology',
  pediatricsObgyn: '/pediatrics-obgyn',
  psychiatryDept: '/psychiatry',
  pulmonology: '/pulmonology',
  medical3dViewer: '/3d-viewer',
  liveMap: '/live-map',
  hospitalMap: '/hospital-map',
  medicalIot: '/medical-iot',
  devices: '/devices',
  fleetCommand: '/fleet/command',
  fleetMap: '/fleet/map',
  surveillanceNexus: '/surveillance/nexus',
  digitalTwin: '/digital-twin',
  digitalTwinIntelligence: '/digital-twin-intelligence',
  profile: '/profile',
  profileSettings: '/profile/settings',
  profileToolPreferences: '/profile/tool-preferences',
  settings: '/settings',
  settingsFeatures: '/settings/features',
  version: '/version',
  helpCenter: '/help-center',
  appNavigator: '/navigator',
  legalPrivacyPolicy: '/legal/privacy-policy',
  legalTerms: '/legal/terms',
  legalGdpr: '/legal/gdpr',
  legalHipaa: '/legal/hipaa',
  onboardingConsent: '/onboarding/consent',
  consentHistory: '/legal/consent-history',
  customerPortal: '/customer-portal',
  knowledgeHub: '/knowledge-hub',
  knowledgeBase: '/knowledge-base',
  marketplace: '/marketplace',
  enterpriseReadiness: '/enterprise-readiness',
  trackMindWorkspace: '/trackmind',
  trackMindMaturity: '/trackmind-maturity',
  enterprisePlatform: '/enterprise-platform',
  platformIntelligence: '/platform-intelligence',
  platformAdmin: '/platform-admin',
  billing: '/billing',
  usage: '/usage',
  notifications: '/notifications',
  timeline: '/timeline',
  workflows: '/workflows',
  workflowMining: '/workflow-mining',
  workspaceDependencyGraph: '/workspace-dependency-graph',
  search: '/search',
  developerCatalog: '/tools/catalog',
  plugins: '/plugins',
  featureFlags: '/feature-flags',
  dependencyMap: '/dependency-map',
  dependencyGraph: '/dependency-graph',
  dataLineage: '/data-lineage',
  selfDiagnostics: '/self-diagnostics',
  systemHealth: '/system-health',
  saasHealth: '/saas-health',
  governanceRegistry: '/governance-registry',
  aiGovernance: '/ai-governance',
  security: '/security',
  audit: '/audit',
  regulatory: '/regulatory',
  humanReview: '/human-review',
  assets: '/assets',
  artifacts: '/artifacts',
  memory: '/memory',
  trainingDashboard: '/training',
  costs: '/costs',
  fleetPredictiveMaintenance: '/fleet/predictive-maintenance',
  fleetRouteOptimizer: '/fleet/route-optimizer',
  aiModels: '/ai-models',
  aiEvaluation: '/ai-evaluation',
  platformLearningEngine: '/platform-learning-engine',
  brain: '/brain',
  businessBrain: '/business-brain',
  organization: '/organization',
  organizationIntelligence: '/organization-intelligence',
  organizationSettings: '/settings/organization',
  tenantAdmin: '/tenant-admin',
  tenantAdminWorkspaces: '/tenant-admin/workspaces',
  organizationPacks: '/settings/organization/packs',
  organizationAssets: '/settings/organization/assets',
  organizationAnalytics: '/organization-analytics',
  platformAnalytics: '/platform-analytics',
  assetLifecycleAdmin: '/asset-lifecycle-admin',
  customerSuccessDashboard: '/customer-success-dashboard',
  departmentIntelligence: '/department-intelligence',
  departments: '/departments',
  serviceLines: '/service-lines',
  products: '/products',
  assetPacks: '/asset-packs',
  plans: '/plans',
  specialties: '/specialties',
  carePathways: '/care-pathways',
  agents: '/agents',
  maturityAssessment: '/maturity-assessment',
  outcomes: '/outcomes',
  valueTracking: '/value-tracking',
  productIntelligence: '/product-intelligence',
  expansionOpportunities: '/expansion-opportunities',
  customerSuccess: '/customer-success',
  successCenter: '/success-center',
  integrationsMarketplace: '/integrations-marketplace',
  integrationReadiness: '/integration-readiness',
  solutionBuilder: '/solution-builder',
  configurationStudio: '/configuration-studio',
  welcome: '/welcome',
  onboarding: '/onboarding',
});

/** Canonical pre-triage queue landing — architecture target for `/triage` bookmarks. */
export const TRIAGE_PRETRIAGE_ROUTE = `${CANONICAL_ROUTES.emergencyQueues}?queue=pretriage`;

export const CANONICAL_APP_ROUTE_TREE = Object.freeze([
  { path: '/', type: 'redirect', to: '/emergency/reception' },
  { path: '/auth-callback', type: 'page', componentKey: 'AuthCallback' },
  { path: '/shared/tools/:shareId', type: 'page', componentKey: 'SharedToolSession' },
  { path: '/whiteboard', type: 'redirect', to: '/emergency/whiteboard' },
  { path: '/reception', type: 'redirect', to: '/emergency/reception' },
  { path: '/triage', type: 'redirect', to: TRIAGE_PRETRIAGE_ROUTE },
  { path: '/charge', type: 'redirect', to: '/emergency/whiteboard' },
  { path: '/physician', type: 'redirect', to: '/emergency/whiteboard' },
  { path: '/ems', type: 'redirect', to: '/emergency/ems' },
  { path: '/analytics', type: 'redirect', to: '/emergency/analytics' },
  { path: '/copilot', type: 'redirect', to: '/emergency/copilot' },
  { path: '/calculators', type: 'redirect', to: '/emergency/tools' },
  { path: '/admin', type: 'redirect', to: '/admin' },
  { path: '/emergency', type: 'redirect', to: '/emergency/reception' },
  { path: '/emergency/command-center', type: 'page', componentKey: 'HospitalCommandCenter' },
  { path: '/emergency/whiteboard', type: 'page', componentKey: 'EmergencyWhiteboard' },
  { path: '/emergency/collaboration', type: 'page', componentKey: 'CollaborationHub' },
  { path: '/emergency/patients', type: 'page', componentKey: 'EmergencyPatientsRoute' },
  { path: '/emergency/journey', type: 'redirect', to: '/emergency/command-center' },
  { path: '/emergency/dispatch', type: 'page', componentKey: 'DispatchConsole' },
  { path: '/emergency/ems', type: 'page', componentKey: 'EMSPipeline' },
  { path: '/emergency/ed-readiness', type: 'page', componentKey: 'EdReadinessOperatingPage' },
  { path: '/emergency/reception', type: 'page', componentKey: 'ReceptionWorkspace' },
  { path: '/emergency/intake', type: 'page', componentKey: 'SmartIntake' },
  { path: '/emergency/queues', type: 'page', componentKey: 'EmergencyQueueRoute' },
  { path: '/emergency/reassessment', type: 'page', componentKey: 'EmergencyReassessmentRoute' },
  { path: '/emergency/capacity', type: 'page', componentKey: 'CapacityDetail' },
  { path: '/emergency/boarding', type: 'page', componentKey: 'EmergencyBoardingRoute' },
  { path: '/emergency/referrals', type: 'page', componentKey: 'ReferralPanel' },
  { path: '/emergency/copilot', type: 'page', componentKey: 'EmergencyCopilotRoute' },
  { path: '/emergency/documentation', type: 'page', componentKey: 'ClinicalDocumentationAssistant' },
  { path: '/emergency/tools', type: 'page', componentKey: 'ToolsOverview' },
  { path: '/emergency/pulse', type: 'page', componentKey: 'EmergencyDepartmentPulse' },
  { path: '/emergency/shift', type: 'page', componentKey: 'EmergencyShiftSummary' },
  { path: '/emergency/analytics', type: 'page', componentKey: 'EmergencyAnalytics' },
  { path: '/emergency/diagnostics', type: 'page', componentKey: 'DiagnosticsOperatingPage' },
  { path: '/emergency/handoffs', type: 'page', componentKey: 'HandoffsOperatingPage' },
  { path: '/emergency/reports', type: 'page', componentKey: 'EmergencyReportsOperatingPage' },
  { path: '/emergency/alerts', type: 'page', componentKey: 'ClinicalAlertsPage' },
  { path: '/emergency/settings', type: 'page', componentKey: 'EmergencySettingsRoute' },
  { path: '/emergency/help', type: 'page', componentKey: 'HelpHubPage' },
  { path: '*', type: 'redirect', to: '/emergency/reception' },
]);

export const EMERGENCY_OS_TARGET_ROUTES = Object.freeze(
  CANONICAL_APP_ROUTE_TREE.filter((route) => route.type === 'page').map((route) => route.path),
);

export const AUTH_PATH_ALIASES = Object.freeze([
  '/login',
  '/log-in',
  '/signin',
  '/sign-in',
  '/signup',
  '/sign-up',
  '/register',
  '/join',
  '/create-account',
  '/account/login',
  '/account/signup',
  '/account/register',
  '/accounts/login',
  '/accounts/signup',
]);

export const AUTH_SIGNUP_PATH_ALIASES = Object.freeze([
  '/signup',
  '/sign-up',
  '/register',
  '/join',
  '/create-account',
  '/account/signup',
  '/account/register',
  '/accounts/signup',
]);

export const ASSISTANT_ROUTE_ALIASES = Object.freeze(['/assistant', '/chat', '/ai', '/copilot']);
export const TOOLS_ROUTE_ALIASES = Object.freeze([
  '/tools',
  '/all-tools',
  '/clinical-tools',
  '/catalog',
]);
export const CALCULATORS_ROUTE_ALIASES = Object.freeze(['/calculators']);
export const SIMULATION_ROUTE_ALIASES = Object.freeze(['/medical-simulation']);
export const LABORATORY_ROUTE_ALIASES = Object.freeze(['/lab']);
export const MEDICAL_3D_VIEWER_ROUTE_ALIASES = Object.freeze(['/anatomy-viewer']);
export const LIVE_MAP_ROUTE_ALIASES = Object.freeze(['/maps', '/tracking', '/live-tracking']);
export const FLEET_MAP_ROUTE_ALIASES = Object.freeze([
  '/fleet',
  '/fleet/live-map',
  '/fleet/tracking',
]);
export const OPERATIONS_ROUTE_ALIASES = Object.freeze(['/operations-center']);
export const AUDIT_ROUTE_ALIASES = Object.freeze(['/audit-logs']);
/** Legacy bookmarks that should land on clinical startup (reception-first). */
export const APP_STARTUP_ROUTE_ALIASES = Object.freeze(['/home', '/app']);
export const HOME_ROUTE_ALIASES = APP_STARTUP_ROUTE_ALIASES;
export const ORGANIZATION_PACKS_ROUTE_ALIASES = Object.freeze([]);

/**
 * Short ED paths → single canonical mount (no duplicate page components in router).
 */
export const ED_CANONICAL_ROUTE_ALIASES = Object.freeze(
  [
    [CANONICAL_ROUTES.intake, CANONICAL_ROUTES.emergencyIntake],
    [CANONICAL_ROUTES.queue, CANONICAL_ROUTES.emergencyQueues],
    [CANONICAL_ROUTES.alerts, CANONICAL_ROUTES.emergencyAlerts],
    [CANONICAL_ROUTES.aiChief, CANONICAL_ROUTES.emergencyCopilot],
    [CANONICAL_ROUTES.departments, CANONICAL_ROUTES.emergencyCapacity],
    [CANONICAL_ROUTES.analytics, CANONICAL_ROUTES.emergencyAnalytics],
  ].map(([path, to]) => Object.freeze({ path, to, routeId: 'ed-canonical-alias' })),
);

/** Retired standalone dashboards folded into ED OS — mounted outside AppShell guard. */
export const OUTSIDE_SHELL_ROUTE_REDIRECTS = Object.freeze(
  [
    [CANONICAL_ROUTES.dashboard, CANONICAL_ROUTES.emergencyCommandCenter],
    ['/assistant', CANONICAL_ROUTES.emergencyCopilot],
    ['/chat', CANONICAL_ROUTES.emergencyCopilot],
    ['/ai', CANONICAL_ROUTES.emergencyCopilot],
    ['/copilot', CANONICAL_ROUTES.emergencyCopilot],
    [CANONICAL_ROUTES.automation, CANONICAL_ROUTES.workflows],
    [CANONICAL_ROUTES.automationAnalytics, CANONICAL_ROUTES.workflows],
  ].map(([path, to]) => Object.freeze({ path, to, routeId: 'outside-shell-redirect' })),
);

export const LEGACY_EMERGENCY_ROUTE_REDIRECTS = Object.freeze(
  [
    ['/ems', CANONICAL_ROUTES.emergencyEms],
    ['/journey', CANONICAL_ROUTES.emergencyPatients],
    ['/reception', CANONICAL_ROUTES.emergencyReception],
    ['/emergency/arrival', CANONICAL_ROUTES.emergencyReception],
    ['/workspace/emergency/reception', CANONICAL_ROUTES.emergencyReception],
    ['/queues', CANONICAL_ROUTES.emergencyQueues],
    ['/reassessment', CANONICAL_ROUTES.emergencyReassessment],
    ['/capacity', CANONICAL_ROUTES.emergencyCapacity],
    ['/boarding', CANONICAL_ROUTES.emergencyBoarding],
    ['/referrals', CANONICAL_ROUTES.emergencyReferrals],
    ['/provincial-health', CANONICAL_ROUTES.emergencyWhiteboard],
    ['/integrations/hub', CANONICAL_ROUTES.integrationHub],
    ['/platform/cosmos', CANONICAL_ROUTES.cosmosViewer],
    ['/cosmos', CANONICAL_ROUTES.cosmosViewer],

    ['/shift', CANONICAL_ROUTES.emergencyShift],
    ['/shift-summary', CANONICAL_ROUTES.emergencyShift],
    ['/pulse', CANONICAL_ROUTES.emergencyPulse],
    ['/tools', CANONICAL_ROUTES.emergencyTools],
    ['/calculators', CANONICAL_ROUTES.emergencyTools],
    ['/scores', CANONICAL_ROUTES.emergencyTools],
    ['/scores/*', CANONICAL_ROUTES.emergencyTools],
    ['/emergency/smart-intake', CANONICAL_ROUTES.emergencyIntake],
    ['/emergency/queue', CANONICAL_ROUTES.emergencyQueues],
    [CANONICAL_ROUTES.emergencyJourney, CANONICAL_ROUTES.emergencyCommandCenter],
    ['/emergency/patient-journey', CANONICAL_ROUTES.emergencyPatients],
    ['/emergency/provincial-health', CANONICAL_ROUTES.emergencyWhiteboard],
    ['/emergency/integrations', CANONICAL_ROUTES.integrationHub],
    ['/emergency/simulation', CANONICAL_ROUTES.simulation],
    ...SIMULATION_ROUTE_ALIASES.map((alias) => [alias, CANONICAL_ROUTES.simulation] as const),
    ['/emergency/department-pulse', CANONICAL_ROUTES.emergencyPulse],
    ['/department-pulse', CANONICAL_ROUTES.emergencyPulse],
    [CANONICAL_ROUTES.emergencyAiGovernance, CANONICAL_ROUTES.aiGovernance],
    [CANONICAL_ROUTES.emergencyDigitalTwin, CANONICAL_ROUTES.digitalTwin],
    ['/emergency/calculators', CANONICAL_ROUTES.emergencyTools],
    ['/emergency/clinical-tools', CANONICAL_ROUTES.emergencyTools],
    ['/emergency/shift-summary', CANONICAL_ROUTES.emergencyShift],
    ['/workspace/emergency/pulse', CANONICAL_ROUTES.emergencyPulse],
    ['/workspace/emergency/charge-nurse', CANONICAL_ROUTES.emergencyWhiteboard],
    ['/workspace/emergency', CANONICAL_ROUTES.emergencyWhiteboard],
    ['/workspace/emergency/whiteboard', CANONICAL_ROUTES.emergencyWhiteboard],
    ['/workspace/emergency/intake', CANONICAL_ROUTES.emergencyIntake],
    ['/workspace/emergency/patients', CANONICAL_ROUTES.emergencyPatients],
    ['/workspace/emergency/journey', CANONICAL_ROUTES.emergencyCommandCenter],
    ['/workspace/emergency/queue', CANONICAL_ROUTES.emergencyQueues],
    ['/workspace/emergency/queues', CANONICAL_ROUTES.emergencyQueues],
    ['/workspace/emergency/ems', CANONICAL_ROUTES.emergencyEms],
    ['/workspace/emergency/referrals', CANONICAL_ROUTES.emergencyReferrals],
    ['/workspace/emergency/provincial-health', CANONICAL_ROUTES.emergencyWhiteboard],
    ['/workspace/emergency/integrations', CANONICAL_ROUTES.emergencyWhiteboard],
    ['/workspace/emergency/capacity', CANONICAL_ROUTES.emergencyCapacity],
    ['/workspace/emergency/boarding', CANONICAL_ROUTES.emergencyBoarding],
    ['/workspace/emergency/simulation', CANONICAL_ROUTES.simulation],
    ['/workspace/emergency/federated-learning', CANONICAL_ROUTES.emergencyWhiteboard],
    ['/workspace/emergency/digital-twin', CANONICAL_ROUTES.digitalTwin],
    ['/workspace/emergency/tools', CANONICAL_ROUTES.emergencyTools],
    ['/workspace/emergency/calculators', CANONICAL_ROUTES.emergencyTools],
    ['/workspace/emergency/shift-summary', CANONICAL_ROUTES.emergencyShift],
    ['/workspace/emergency/shift', CANONICAL_ROUTES.emergencyShift],
    ['/workspace/emergency/settings', CANONICAL_ROUTES.emergencySettings],
    ['/workspace/emergency/copilot', CANONICAL_ROUTES.emergencyCopilot],
    ['/workspace/emergency/ai-governance', CANONICAL_ROUTES.aiGovernance],
    ['/workspace/emergency/command-center', CANONICAL_ROUTES.emergencyCommandCenter],
    ['/workspace/emergency/department-pulse', CANONICAL_ROUTES.emergencyPulse],
    ['/patients', CANONICAL_ROUTES.emergencyPatients],
    ['/patients/*', CANONICAL_ROUTES.emergencyPatients],
    ['/emergency/calls', CANONICAL_ROUTES.emergencyDispatch],
    ['/emergency/pre-arrival', CANONICAL_ROUTES.emergencyEms],
    ['/emergency/readiness', CANONICAL_ROUTES.emergencyEdReadiness],
    ['/staff', CANONICAL_ROUTES.emergencyShift],
    ['/diagnostics', CANONICAL_ROUTES.emergencyDiagnostics],
    ['/handoffs', CANONICAL_ROUTES.emergencyHandoffs],
    ['/reports', CANONICAL_ROUTES.emergencyReports],
    ['/help', CANONICAL_ROUTES.emergencyHelp],
    [CANONICAL_ROUTES.documentation, CANONICAL_ROUTES.emergencyDocumentation],
    [CANONICAL_ROUTES.automationAudit, `${CANONICAL_ROUTES.adminOperations}/audit-trail`],
    ['/settings/general', CANONICAL_ROUTES.emergencySettings],
    ['/settings/thresholds', CANONICAL_ROUTES.emergencySettings],
    ['/settings/staff', CANONICAL_ROUTES.emergencySettings],
    ['/settings/integrations', CANONICAL_ROUTES.emergencySettings],
    ['/settings/features', CANONICAL_ROUTES.featureFlags],
    ['/anatomy-viewer', CANONICAL_ROUTES.medical3dViewer],

    // NOTE: /hospital-map, /medical-iot, /devices removed — real pages now exist; explicit routes in router.tsx win
  ].map(([path, to]) =>
    Object.freeze({
      path,
      to,
      routeId: 'legacy-emergency',
      auth: 'required',
    }),
  ),
);

export const NON_ED_WORKSPACE_REDIRECT_ROUTES = Object.freeze([
  Object.freeze({ path: '/federated-learning', moduleName: 'Federated Learning' }),
  Object.freeze({ path: '/vehicle', moduleName: 'Vehicle Operations' }),
  Object.freeze({ path: '/vehicle/*', moduleName: 'Vehicle Operations' }),
  Object.freeze({ path: '/research/*', moduleName: 'Research' }),
]);

/**
 * In-shell redirects not covered by legacy ED aliases, outside-shell tables, or admin nested routes.
 * Mounted inside AppShell via router.tsx — keep alias tables here, not inline in the mount table.
 */
export const IN_SHELL_ROUTE_REDIRECTS = Object.freeze(
  [
    // The exact '/organization' entry that used to sit here never actually
    // fired: platformConsoleRoutes.ts registers a real, unwildcarded page
    // route at the same exact path (CANONICAL_ROUTES.organization ->
    // organizationDashboard), and it always won the match -- proven live
    // 2026-08-21 across fresh-load, refresh, and client-side SPA navigation,
    // all three landing on the real Organization Dashboard with the URL
    // staying '/organization'. Only the wildcard below is actually reachable
    // (proven live: '/organization/anything' does redirect to /admin).
    // Removed the dead exact entry rather than leaving two registrations
    // whose outcome depended on undocumented router precedence.
    ['/organization/*', CANONICAL_ROUTES.adminOperations],
    [CANONICAL_ROUTES.customerPortal, `${CANONICAL_ROUTES.adminOperations}/tenant`],
    [CANONICAL_ROUTES.successCenter, CANONICAL_ROUTES.customerSuccess],
    [CANONICAL_ROUTES.customerSuccess, `${CANONICAL_ROUTES.adminOperations}/tenant`],
    ['/fleet', CANONICAL_ROUTES.fleetCommand],
    ['/platform-learning', CANONICAL_ROUTES.emergencySettings],
    [AUDIT_ROUTE_ALIASES[0], CANONICAL_ROUTES.audit],
    ['/ai/evaluation', CANONICAL_ROUTES.aiEvaluation],
    ['/team', `${CANONICAL_ROUTES.adminOperations}/team`],
    // HEAL-347.48: CANONICAL_ROUTES.marketplace ('/marketplace') was
    // referenced by a nav-menu entry and the route-metadata catalog but had
    // no matching <Route> anywhere -- the real Plugin marketplace page only
    // ever mounted at CANONICAL_ROUTES.plugins ('/plugins'). Live-confirmed
    // dead nav link, redirecting to the role's landing route for every role.
    [CANONICAL_ROUTES.marketplace, CANONICAL_ROUTES.plugins],
  ].map(([path, to]) =>
    Object.freeze({
      path,
      to,
      routeId: 'in-shell-redirect',
      auth: 'required' as const,
    }),
  ),
);

export const WORKSPACE_EMERGENCY_SUBPAGE_REDIRECTS = Object.freeze({
  whiteboard: CANONICAL_ROUTES.emergencyWhiteboard,
  patients: CANONICAL_ROUTES.emergencyPatients,
  journey: CANONICAL_ROUTES.emergencyCommandCenter,
  'patient-journey': CANONICAL_ROUTES.emergencyPatients,
  queues: CANONICAL_ROUTES.emergencyQueues,
  queue: CANONICAL_ROUTES.emergencyQueues,
  reassessment: CANONICAL_ROUTES.emergencyReassessment,
  ems: CANONICAL_ROUTES.emergencyEms,
  referrals: CANONICAL_ROUTES.emergencyReferrals,
  'provincial-health': CANONICAL_ROUTES.emergencyWhiteboard,
  integrations: CANONICAL_ROUTES.emergencyWhiteboard,
  capacity: CANONICAL_ROUTES.emergencyCapacity,
  boarding: CANONICAL_ROUTES.emergencyBoarding,
  analytics: CANONICAL_ROUTES.emergencyAnalytics,
  simulation: CANONICAL_ROUTES.simulation,
  'real-time-simulation': CANONICAL_ROUTES.simulation,
  'federated-learning': CANONICAL_ROUTES.emergencyWhiteboard,
  'digital-twin': CANONICAL_ROUTES.emergencyWhiteboard,
  pulse: CANONICAL_ROUTES.emergencyPulse,
  'department-pulse': CANONICAL_ROUTES.emergencyPulse,
  'shift-summary': CANONICAL_ROUTES.emergencyShift,
  shift: CANONICAL_ROUTES.emergencyShift,
  tools: CANONICAL_ROUTES.emergencyTools,
  calculators: CANONICAL_ROUTES.emergencyTools,
  'clinical-tools': CANONICAL_ROUTES.emergencyTools,
  intake: CANONICAL_ROUTES.emergencyIntake,
  'smart-intake': CANONICAL_ROUTES.emergencyIntake,
  reception: CANONICAL_ROUTES.emergencyReception,
  arrival: CANONICAL_ROUTES.emergencyReception,
  'command-center': CANONICAL_ROUTES.emergencyCommandCenter,
  copilot: CANONICAL_ROUTES.emergencyCopilot,
  'ai-governance': CANONICAL_ROUTES.emergencyWhiteboard,
});

const P = Object.freeze({
  PATIENT_READ: 'patient:read',
  PATIENT_CREATE: 'patient:create',
  PATIENT_UPDATE: 'patient:update',
  PATIENT_ASSIGN: 'patient:assign',
  PATIENT_DISCHARGE: 'patient:discharge',
  TRIAGE_READ: 'triage:read',
  TRIAGE_CREATE: 'triage:create',
  TRIAGE_UPDATE: 'triage:update',
  AI_READ: 'ai:read',
  AI_REQUEST: 'ai:request',
  AI_REVIEW: 'ai:review',
  ALERT_READ: 'alert:read',
  ALERT_ACKNOWLEDGE: 'alert:acknowledge',
  ALERT_ESCALATE: 'alert:escalate',
  STAFF_READ: 'staff:read',
  STAFF_ASSIGN: 'staff:assign',
  ANALYTICS_READ: 'analytics:read',
  REPORTS_READ: 'reports:read',
  SETTINGS_READ: 'settings:read',
  AUDIT_READ: 'audit:read',
  LABS_READ: 'labs:read',
  IMAGING_READ: 'imaging:read',
  MEDICATION_READ: 'medication:read',
  COLLABORATION_READ: 'collaboration:read',
});

export const CANONICAL_NAVIGATION_GROUPS = Object.freeze([
  'Command',
  'Emergency',
  'Patients',
  'Clinical',
  'Operations',
  'Intelligence',
  'Administration',
  'Help',
]);

export const CAREDROID_USER_PROFILE_IDS = Object.freeze([
  'dispatcher',
  'ems_coordinator',
  'paramedic',
  'registration_clerk',
  'triage_nurse',
  'charge_nurse',
  'registered_nurse',
  'emergency_physician',
  'attending_physician',
  'resident_physician',
  'specialist',
  'pharmacist',
  'lab_technician',
  'radiology_technician',
  'patient_flow_coordinator',
  'hospital_admin',
  'it_admin',
  'quality_safety_officer',
  'demo_observer',
  'ed_director',
  'super_admin',
]);

const ALL_USER_PROFILES = CAREDROID_USER_PROFILE_IDS;
const CLINICAL_PROFILES = Object.freeze([
  'super_admin',
  'ed_director',
  'charge_nurse',
  'triage_nurse',
  'registered_nurse',
  'emergency_physician',
  'attending_physician',
  'resident_physician',
  'specialist',
  'paramedic',
]);
const PHYSICIAN_PROFILES = Object.freeze([
  'ed_director',
  'emergency_physician',
  'attending_physician',
  'resident_physician',
  'specialist',
]);
const OPS_PROFILES = Object.freeze([
  'super_admin',
  'hospital_admin',
  'ed_director',
  'charge_nurse',
  'patient_flow_coordinator',
  'ems_coordinator',
]);
const READ_ONLY_OPERATIONAL_PROFILES = Object.freeze([
  'lab_technician',
  'radiology_technician',
  'pharmacist',
  'quality_safety_officer',
  'demo_observer',
]);
/** Ordered pilot-customer sidebar IDs — single source for pilot nav visibility. */
export const CANONICAL_PILOT_VISIBLE_NAV_IDS = Object.freeze([
  'reception',
  'whiteboard',
  'command-center',
  'dispatch',
  'ed-readiness',
  'alerts',
  'collaboration',
  'diagnostics',
  'handoffs',
  'reports',
  'ems',
  'patients',
  'queues',
  'reassessment',
  'capacity',
  'referrals',
  'copilot',
  'tools',
  'analytics',
  'settings',
  'pulse',
  'shift',
  'help',
  'audit',
  'ai-center',
  'admin',
  // Curated for triage_nurse/registered_nurse/charge_nurse/quality_safety_officer/
  // hospital_admin/ed_director/super_admin in HOSPITAL_ROLE_NAV_IDS but previously
  // absent from both this ceiling and CANONICAL_PILOT_EXTENSION_NAV_IDS — an
  // oversight that silently stripped a role's own curated nav item, not an
  // intentional entitlement gate (unlike 'fleet', which IS a deliberate extension
  // surface — see CANONICAL_PILOT_EXTENSION_NAV_IDS — and is deliberately left out here).
  'triage',
  'hospital-map',
  'predictive-analytics',
  'executive',
]);

export const CANONICAL_PILOT_EXTENSION_NAV_IDS = Object.freeze([
  'intake',
  'integrations',
  'cosmos',
  'platform',
  'fleet',
  'surveillance',
  'simulation',
  'laboratory',
  'knowledge',
]);

export const USER_PROFILE_ROUTE_DEFAULTS = Object.freeze({
  dispatcher: CANONICAL_ROUTES.emergencyDispatch,
  ems_coordinator: CANONICAL_ROUTES.emergencyEms,
  paramedic: CANONICAL_ROUTES.emergencyEms,
  registration_clerk: CANONICAL_ROUTES.emergencyReception,
  triage_nurse: TRIAGE_PRETRIAGE_ROUTE,
  charge_nurse: CANONICAL_ROUTES.emergencyWhiteboard,
  registered_nurse: CANONICAL_ROUTES.emergencyQueues,
  emergency_physician: CANONICAL_ROUTES.emergencyWhiteboard,
  attending_physician: CANONICAL_ROUTES.emergencyWhiteboard,
  resident_physician: CANONICAL_ROUTES.emergencyWhiteboard,
  specialist: CANONICAL_ROUTES.emergencyPatients,
  pharmacist: CANONICAL_ROUTES.emergencyDiagnostics,
  lab_technician: CANONICAL_ROUTES.emergencyDiagnostics,
  radiology_technician: CANONICAL_ROUTES.emergencyDiagnostics,
  patient_flow_coordinator: CANONICAL_ROUTES.emergencyQueues,
  social_worker: CANONICAL_ROUTES.emergencyPatients,
  security_officer: CANONICAL_ROUTES.emergencyAlerts,
  hospital_admin: CANONICAL_ROUTES.emergencyAnalytics,
  it_admin: CANONICAL_ROUTES.emergencySettings,
  quality_safety_officer: CANONICAL_ROUTES.emergencyReports,
  demo_observer: CANONICAL_ROUTES.emergencyWhiteboard,
  ed_director: CANONICAL_ROUTES.emergencyWhiteboard,
  // Matches HOSPITAL_ROLE_HOME_ROUTES.super_admin (roleClusterNav.config.ts) and
  // it_admin's own settings/governance home -- Site Admin lands on System Governance,
  // not the generic ED whiteboard (the 2 tables previously disagreed here).
  super_admin: CANONICAL_ROUTES.emergencySettings,
  admin: CANONICAL_ROUTES.emergencySettings,
  ed_manager: CANONICAL_ROUTES.emergencyAnalytics,
  physician: CANONICAL_ROUTES.emergencyWhiteboard,
  ems_user: CANONICAL_ROUTES.emergencyEms,
  read_only_viewer: `${CANONICAL_ROUTES.emergencyWhiteboard}?display=readonly`,
  public_display: `${CANONICAL_ROUTES.emergencyWhiteboard}?display=waiting-room`,
});

export const USER_PROFILE_ROUTE_POLICIES = Object.freeze(
  Object.fromEntries(
    Object.entries(USER_PROFILE_ROUTE_DEFAULTS).map(([profileId, defaultRoute]) => [
      profileId,
      Object.freeze({
        profileId,
        defaultRoute,
        dashboardVariant:
          profileId === 'hospital_admin' || profileId === 'quality_safety_officer'
            ? 'administrative'
            : profileId === 'dispatcher' || profileId === 'ems_coordinator' || profileId === 'paramedic'
              ? 'prehospital'
              : profileId === 'registration_clerk'
                ? 'reception'
                : profileId === 'triage_nurse'
                  ? 'triage'
                  : profileId === 'demo_observer'
                    ? 'read-only'
                    : 'clinical',
        patientDataScope:
          profileId === 'dispatcher' || profileId === 'demo_observer'
            ? 'operational-summary'
            : profileId === 'lab_technician' || profileId === 'radiology_technician'
              ? 'diagnostic-orders'
              : profileId === 'hospital_admin' || profileId === 'quality_safety_officer'
                ? 'aggregate-audit'
                : profileId === 'registration_clerk'
                  ? 'registration-demographics'
                  : 'department-clinical',
        allowedAlertActions:
          profileId === 'demo_observer'
            ? []
            : profileId === 'dispatcher' || profileId === 'ems_coordinator'
              ? ['view', 'escalate']
              : profileId === 'quality_safety_officer'
                ? ['view']
                : ['view', 'acknowledge', 'escalate'],
        allowedAiChiefActions:
          profileId === 'demo_observer' || profileId === 'dispatcher'
            ? ['view']
            : profileId === 'quality_safety_officer'
              ? ['view', 'review']
              : profileId === 'it_admin'
                ? ['view', 'configure']
                : ['view', 'request', 'review'],
      }),
    ]),
  ),
);

function freezeArray(value) {
  return Object.freeze([...(value || [])]);
}

function normalizeProfileId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_');
}

function profileIdFromSubject(subject) {
  if (!subject) return 'demo_observer';
  if (typeof subject === 'string') return normalizeProfileId(subject);
  return normalizeProfileId(
    subject.role?.hospitalRole ||
      subject.user?.role ||
      subject.hospitalRole ||
      subject.roleProfileId ||
      subject.saasRole ||
      subject.role,
  );
}

function route(record) {
  const normalized = {
    aliases: [],
    allowedRoles: ALL_USER_PROFILES,
    breadcrumbs: ['CareDroid'],
    description: '',
    emergencySafe: true,
    featureGate: null,
    icon: 'layout-dashboard',
    layout: 'app',
    parentRoute: null,
    readOnlyAllowed: false,
    redirectTo: null,
    requiredPermissions: [],
    showInNav: true,
    userProfileVisibility: record.allowedRoles || ALL_USER_PROFILES,
    workflowOwner: 'CareDroid',
    ...record,
  };

  return Object.freeze({
    ...normalized,
    aliases: freezeArray(normalized.aliases),
    allowedRoles: freezeArray(normalized.allowedRoles),
    breadcrumbs: freezeArray(normalized.breadcrumbs),
    requiredPermissions: freezeArray(normalized.requiredPermissions),
    userProfileVisibility: freezeArray(normalized.userProfileVisibility),
    activePaths: normalized.activePaths ? freezeArray(normalized.activePaths) : undefined,
    emergencyRoles: normalized.emergencyRoles ? freezeArray(normalized.emergencyRoles) : undefined,
  });
}

export const CANONICAL_ROUTE_MAP = Object.freeze([
  route({
    id: 'command-center',
    path: CANONICAL_ROUTES.emergencyCommandCenter,
    label: 'Hospital Command Center',
    description:
      'Real-time ED operational awareness — occupancy, waits, staff, EMS, bottlenecks, alerts, AI recommendations, and 3-minute compliance.',
    pageComponent: 'HospitalCommandCenter',
    requiredPermissions: [P.PATIENT_READ],
    allowedRoles: [...OPS_PROFILES, ...PHYSICIAN_PROFILES, 'registered_nurse', 'demo_observer'],
    navigationGroup: 'Command',
    priority: 30,
    icon: 'journey',
    readOnlyAllowed: true,
    breadcrumbs: ['Command', 'Command Center'],
    helpTopicId: 'command-center',
    workflowOwner: 'Charge nurse / ED command',
  }),
  route({
    id: 'reception',
    path: CANONICAL_ROUTES.emergencyReception,
    label: 'Reception',
    description: 'Emergency reception desk for arrival capture, identity verification, and queue handoff.',
    pageComponent: 'ReceptionWorkspace',
    requiredPermissions: [P.PATIENT_READ],
    allowedRoles: ['super_admin', 'ed_director', 'charge_nurse', 'triage_nurse', 'registration_clerk', 'registered_nurse', 'emergency_physician', 'attending_physician', 'resident_physician', 'demo_observer'],
    navigationGroup: 'Emergency',
    priority: 10,
    icon: 'user-check',
    readOnlyAllowed: false,
    breadcrumbs: ['Emergency', 'Reception'],
    helpTopicId: 'reception',
    workflowOwner: 'Registration clerk / emergency receptionist',
  }),
  route({
    id: 'whiteboard',
    path: CANONICAL_ROUTES.emergencyWhiteboard,
    label: 'Whiteboard',
    description: 'Role-aware operational dashboard and emergency whiteboard.',
    pageComponent: 'EmergencyWhiteboard',
    requiredPermissions: [P.PATIENT_READ],
    allowedRoles: [...CLINICAL_PROFILES, ...OPS_PROFILES, ...READ_ONLY_OPERATIONAL_PROFILES],
    navigationGroup: 'Command',
    priority: 20,
    icon: 'layout-dashboard',
    readOnlyAllowed: true,
    aliases: [],
    activePaths: [CANONICAL_ROUTES.emergencyWhiteboard, '/emergency/whiteboard'],
    breadcrumbs: ['Command', 'Whiteboard'],
    helpTopicId: 'whiteboard',
    workflowOwner: 'ED operations',
  }),
  route({
    id: 'dispatch',
    path: CANONICAL_ROUTES.emergencyDispatch,
    label: 'Dispatch',
    description: 'Emergency call intake and dispatch coordination.',
    pageComponent: 'DispatchConsole',
    requiredPermissions: [P.PATIENT_READ],
    allowedRoles: ['super_admin', 'hospital_admin', 'ed_director', 'dispatcher', 'ems_coordinator', 'charge_nurse'],
    navigationGroup: 'Emergency',
    priority: 40,
    icon: 'send',
    aliases: ['/emergency/calls'],
    breadcrumbs: ['Emergency', 'Dispatch'],
    helpTopicId: 'dispatcher',
    workflowOwner: 'Dispatcher',
  }),
  route({
    id: 'collaboration',
    path: CANONICAL_ROUTES.emergencyCollaboration,
    label: 'Collaboration Hub',
    description:
      'Department channels, patient threads, incident coordination, and AI Chief recommendations in one place.',
    pageComponent: 'CollaborationHub',
    requiredPermissions: [P.COLLABORATION_READ],
    navigationGroup: 'Command',
    priority: 25,
    icon: 'messages',
    readOnlyAllowed: true,
    breadcrumbs: ['Command', 'Collaboration Hub'],
    helpTopicId: 'collaboration',
    workflowOwner: 'All ED staff',
  }),
  route({
    id: 'ems',
    path: CANONICAL_ROUTES.emergencyEms,
    label: 'EMS',
    description: 'EMS arrivals, pre-arrival notifications, bay readiness, and handoff completion.',
    pageComponent: 'EMSPipeline',
    requiredPermissions: [P.PATIENT_READ],
    allowedRoles: ['super_admin', 'ed_director', 'charge_nurse', 'triage_nurse', 'emergency_physician', 'attending_physician', 'resident_physician', 'paramedic', 'registration_clerk', 'ems_coordinator', 'dispatcher'],
    navigationGroup: 'Emergency',
    priority: 100,
    icon: 'ambulance',
    featureGate: 'ems_pipeline',
    aliases: ['/emergency/pre-arrival'],
    breadcrumbs: ['Emergency', 'EMS'],
    helpTopicId: 'ems',
    workflowOwner: 'EMS coordinator / paramedic',
  }),
  route({
    id: 'ed-readiness',
    path: CANONICAL_ROUTES.emergencyEdReadiness,
    label: 'ED Readiness',
    description: 'ED readiness board for inbound critical arrivals and operational preparedness.',
    pageComponent: 'FullJourneyOperatingPage',
    requiredPermissions: [P.PATIENT_READ],
    allowedRoles: ['super_admin', 'hospital_admin', 'ed_director', 'charge_nurse', 'ems_coordinator', 'patient_flow_coordinator'],
    navigationGroup: 'Emergency',
    priority: 50,
    icon: 'shield-check',
    aliases: ['/emergency/readiness'],
    breadcrumbs: ['Emergency', 'ED Readiness'],
    helpTopicId: 'ems-readiness',
    workflowOwner: 'EMS coordinator',
  }),
  route({
    id: 'intake',
    path: CANONICAL_ROUTES.emergencyIntake,
    label: 'Intake',
    description:
      'Standalone intake surface; reception-embedded Smart Intake is the canonical arrival workflow.',
    pageComponent: 'SmartIntake',
    requiredPermissions: [P.PATIENT_CREATE],
    allowedRoles: ['super_admin', 'ed_director', 'charge_nurse', 'triage_nurse', 'registered_nurse', 'emergency_physician', 'attending_physician', 'resident_physician', 'registration_clerk', 'paramedic'],
    navigationGroup: 'Patients',
    priority: 25,
    icon: 'intake',
    aliases: [CANONICAL_ROUTES.intake],
    breadcrumbs: ['Patients', 'Intake'],
    helpTopicId: 'smart-intake',
    workflowOwner: 'Reception / triage',
  }),
  route({
    id: 'patients',
    path: CANONICAL_ROUTES.emergencyPatients,
    label: 'Patients',
    description: 'Patient list and journey overview.',
    pageComponent: 'PatientsRoute',
    requiredPermissions: [P.PATIENT_READ],
    readOnlyAllowed: true,
    allowedRoles: [...CLINICAL_PROFILES, ...OPS_PROFILES, 'registration_clerk', 'pharmacist', 'lab_technician', 'radiology_technician', 'quality_safety_officer', 'demo_observer'],
    navigationGroup: 'Patients',
    priority: 110,
    icon: 'emergency-patients',
    aliases: ['/patients'],
    breadcrumbs: ['Patients'],
    helpTopicId: 'patients',
    workflowOwner: 'Clinical team',
  }),
  route({
    id: 'patient-detail',
    path: CANONICAL_ROUTES.patientProfile,
    label: 'Patient Profile',
    description: 'Patient-specific detail route for direct chart review.',
    pageComponent: 'PatientProfileRoute',
    requiredPermissions: [P.PATIENT_READ],
    allowedRoles: [...CLINICAL_PROFILES, ...OPS_PROFILES, 'registration_clerk', 'pharmacist'],
    navigationGroup: 'Patients',
    showInNav: false,
    priority: 46,
    icon: 'emergency-patients',
    parentRoute: CANONICAL_ROUTES.emergencyPatients,
    breadcrumbs: ['Patients', 'Patient Profile'],
    helpTopicId: 'patients',
    workflowOwner: 'Clinical team',
  }),
  route({
    id: 'queues',
    path: CANONICAL_ROUTES.emergencyQueues,
    label: 'Queues',
    description: 'Waiting, triage, reassessment, and treatment queue coordination.',
    pageComponent: 'QueueRoute',
    requiredPermissions: [P.PATIENT_READ],
    allowedRoles: [...CLINICAL_PROFILES, ...OPS_PROFILES, 'registration_clerk', 'ems_coordinator'],
    navigationGroup: 'Patients',
    priority: 120,
    icon: 'queues',
    aliases: [CANONICAL_ROUTES.queue],
    breadcrumbs: ['Patients', 'Queues'],
    helpTopicId: 'queue',
    workflowOwner: 'Charge nurse / patient flow coordinator',
  }),
  route({
    id: 'triage',
    path: CANONICAL_ROUTES.triage,
    label: 'Triage',
    description: 'Triage nurse entry point focused on pretriage and acuity workflow.',
    pageComponent: 'QueueRoute',
    redirectTo: TRIAGE_PRETRIAGE_ROUTE,
    requiredPermissions: [P.PATIENT_READ, P.TRIAGE_READ],
    allowedRoles: ['super_admin', 'ed_director', 'charge_nurse', 'triage_nurse', 'registered_nurse'],
    emergencyRoles: ['admin', 'ed_manager', 'charge_nurse', 'triage_nurse'],
    navigationGroup: 'Clinical',
    priority: 55,
    icon: 'triage-priority',
    activePaths: [CANONICAL_ROUTES.triage, `${CANONICAL_ROUTES.triage}?queue=pretriage`],
    breadcrumbs: ['Clinical', 'Triage'],
    helpTopicId: 'triage',
    workflowOwner: 'Triage nurse',
  }),
  route({
    id: 'reassessment',
    path: CANONICAL_ROUTES.emergencyReassessment,
    label: 'Reassessment',
    description: 'Reassessment timers and overdue clinical review.',
    pageComponent: 'ReassessmentRoute',
    requiredPermissions: [P.PATIENT_READ, P.TRIAGE_READ],
    allowedRoles: ['super_admin', 'ed_director', 'charge_nurse', 'triage_nurse', 'registered_nurse', 'emergency_physician', 'attending_physician', 'resident_physician'],
    navigationGroup: 'Clinical',
    priority: 130,
    icon: 'reassessment',
    breadcrumbs: ['Clinical', 'Reassessment'],
    helpTopicId: 'reassessment',
    workflowOwner: 'Nursing',
  }),
  route({
    id: 'alerts',
    path: CANONICAL_ROUTES.emergencyAlerts,
    label: 'Critical Alerts',
    description: 'Critical alerts, escalation status, and acknowledgement workflow.',
    pageComponent: 'ClinicalAlertsPage',
    requiredPermissions: [P.ALERT_READ],
    allowedRoles: ALL_USER_PROFILES,
    navigationGroup: 'Emergency',
    priority: 60,
    icon: 'alerts',
    aliases: [CANONICAL_ROUTES.alerts],
    readOnlyAllowed: true,
    breadcrumbs: ['Emergency', 'Critical Alerts'],
    helpTopicId: 'alerts',
    workflowOwner: 'Charge nurse / safety officer',
  }),
  route({
    id: 'diagnostics',
    path: CANONICAL_ROUTES.emergencyDiagnostics,
    label: 'Diagnostics',
    description: 'Diagnostic coordination for lab, radiology, medication, and order review.',
    pageComponent: 'FullJourneyOperatingPage',
    requiredPermissions: [P.PATIENT_READ],
    allowedRoles: [...CLINICAL_PROFILES, 'pharmacist', 'lab_technician', 'radiology_technician', 'quality_safety_officer', 'demo_observer'],
    navigationGroup: 'Clinical',
    priority: 70,
    icon: 'stethoscope',
    aliases: ['/diagnostics'],
    readOnlyAllowed: true,
    breadcrumbs: ['Clinical', 'Diagnostics'],
    helpTopicId: 'diagnostics',
    workflowOwner: 'Diagnostics team',
  }),
  route({
    id: 'handoffs',
    path: CANONICAL_ROUTES.emergencyHandoffs,
    label: 'Handoffs',
    description: 'Shift, EMS, referral, and patient movement handoff coordination.',
    pageComponent: 'FullJourneyOperatingPage',
    requiredPermissions: [P.PATIENT_READ],
    allowedRoles: [...CLINICAL_PROFILES, ...OPS_PROFILES, 'registered_nurse', 'ems_coordinator', 'patient_flow_coordinator'],
    navigationGroup: 'Operations',
    priority: 80,
    icon: 'notes',
    aliases: ['/handoffs'],
    breadcrumbs: ['Operations', 'Handoffs'],
    helpTopicId: 'handoffs',
    workflowOwner: 'Charge nurse / patient flow coordinator',
  }),
  route({
    id: 'capacity',
    path: CANONICAL_ROUTES.emergencyCapacity,
    label: 'Flow & Capacity',
    description: 'Capacity, boarding, bed pressure, and department throughput management.',
    pageComponent: 'CapacityRoute',
    requiredPermissions: [P.ANALYTICS_READ],
    allowedRoles: [...OPS_PROFILES, 'quality_safety_officer'],
    navigationGroup: 'Operations',
    priority: 140,
    icon: 'capacity',
    featureGate: 'capacity_intel',
    aliases: [CANONICAL_ROUTES.departments],
    breadcrumbs: ['Operations', 'Flow & Capacity'],
    helpTopicId: 'capacity',
    workflowOwner: 'Charge nurse / patient flow coordinator',
  }),
  route({
    id: 'referrals',
    path: CANONICAL_ROUTES.emergencyReferrals,
    label: 'Referrals',
    description: 'Referral, consult, and transfer coordination.',
    pageComponent: 'ReferralPanel',
    requiredPermissions: [P.PATIENT_READ],
    allowedRoles: [...PHYSICIAN_PROFILES, 'super_admin', 'charge_nurse'],
    navigationGroup: 'Clinical',
    priority: 150,
    icon: 'referrals',
    featureGate: 'referral_intel',
    breadcrumbs: ['Clinical', 'Referrals'],
    helpTopicId: 'referrals',
    workflowOwner: 'Physician / charge nurse',
  }),
  route({
    id: 'copilot',
    path: CANONICAL_ROUTES.emergencyCopilot,
    label: 'Copilot',
    description:
      'Sole conversational AI entry — opens the docked CareDroid Copilot (Unified AI node). Chat/Context/Safety live inside the panel.',
    pageComponent: 'CopilotRoute',
    requiredPermissions: [P.AI_READ],
    allowedRoles: [...CLINICAL_PROFILES, ...OPS_PROFILES, 'registration_clerk', 'quality_safety_officer', 'demo_observer'],
    navigationGroup: 'Intelligence',
    priority: 160,
    icon: 'ed-copilot',
    aliases: [CANONICAL_ROUTES.aiChief, '/copilot', '/assistant', '/chat', '/ai'],
    readOnlyAllowed: true,
    breadcrumbs: ['Intelligence', 'CareDroid Copilot'],
    helpTopicId: 'copilot',
    workflowOwner: 'Clinical leadership',
  }),
  route({
    id: 'tools',
    path: CANONICAL_ROUTES.emergencyTools,
    label: 'Medical Tools',
    description: 'Clinical calculators, protocols, and supporting medical tools.',
    pageComponent: 'ToolsOverview',
    requiredPermissions: [P.PATIENT_READ],
    allowedRoles: [...CLINICAL_PROFILES, ...OPS_PROFILES, 'pharmacist', 'lab_technician', 'radiology_technician', 'demo_observer'],
    navigationGroup: 'Clinical',
    priority: 170,
    icon: 'clinical-tools',
    breadcrumbs: ['Clinical', 'Medical Tools'],
    helpTopicId: 'tools',
    workflowOwner: 'Clinical team',
  }),
  route({
    id: 'analytics',
    path: CANONICAL_ROUTES.emergencyAnalytics,
    label: 'Analytics',
    description: 'Operational and clinical analytics for throughput, safety, and compliance review.',
    pageComponent: 'EmergencyAnalytics',
    requiredPermissions: [P.ANALYTICS_READ],
    allowedRoles: ['super_admin', 'hospital_admin', 'ed_director', 'charge_nurse', 'emergency_physician', 'attending_physician', 'patient_flow_coordinator', 'quality_safety_officer', 'demo_observer', 'ems_coordinator'],
    navigationGroup: 'Intelligence',
    priority: 180,
    icon: 'emergency-analytics',
    aliases: [CANONICAL_ROUTES.analytics],
    readOnlyAllowed: true,
    breadcrumbs: ['Intelligence', 'Analytics'],
    helpTopicId: 'analytics',
    workflowOwner: 'Hospital administrator / quality safety officer',
  }),
  route({
    id: 'reports',
    path: CANONICAL_ROUTES.emergencyReports,
    label: 'Reports',
    description: 'Operational reporting, quality review, and safety evidence.',
    pageComponent: 'FullJourneyOperatingPage',
    requiredPermissions: [P.REPORTS_READ],
    allowedRoles: ['super_admin', 'hospital_admin', 'ed_director', 'charge_nurse', 'emergency_physician', 'attending_physician', 'patient_flow_coordinator', 'quality_safety_officer', 'demo_observer'],
    navigationGroup: 'Intelligence',
    priority: 90,
    icon: 'report',
    aliases: [CANONICAL_ROUTES.reports],
    readOnlyAllowed: true,
    breadcrumbs: ['Intelligence', 'Reports'],
    helpTopicId: 'reports',
    workflowOwner: 'Quality safety officer',
  }),
  route({
    id: 'staff',
    path: CANONICAL_ROUTES.staff,
    label: 'Staff',
    description: 'Staffing and shift coordination entry; routed to handoff/shift surfaces in the current app.',
    pageComponent: 'EmergencyShiftSummary',
    requiredPermissions: [P.STAFF_READ],
    allowedRoles: [...OPS_PROFILES, ...CLINICAL_PROFILES, 'registered_nurse'],
    navigationGroup: 'Operations',
    showInNav: false,
    priority: 110,
    icon: 'users',
    redirectTo: CANONICAL_ROUTES.emergencyShift,
    breadcrumbs: ['Operations', 'Staff'],
    helpTopicId: 'shift',
    workflowOwner: 'Charge nurse',
  }),
  route({
    id: 'pulse',
    path: CANONICAL_ROUTES.emergencyPulse,
    label: 'Department Pulse',
    description: 'Live ED pulse and status summary.',
    pageComponent: 'EmergencyDepartmentPulse',
    requiredPermissions: [P.ANALYTICS_READ],
    allowedRoles: [...OPS_PROFILES, ...CLINICAL_PROFILES, 'demo_observer', 'registration_clerk'],
    navigationGroup: 'Intelligence',
    priority: 230,
    icon: 'activity',
    showInNav: true,
    readOnlyAllowed: true,
    breadcrumbs: ['Intelligence', 'Department Pulse'],
    helpTopicId: 'pulse',
    workflowOwner: 'ED operations',
  }),
  route({
    id: 'shift',
    path: CANONICAL_ROUTES.emergencyShift,
    label: 'Shift',
    description: 'Shift summary and handoff readiness.',
    pageComponent: 'EmergencyShiftSummary',
    requiredPermissions: [P.STAFF_READ],
    allowedRoles: [...OPS_PROFILES, ...CLINICAL_PROFILES, 'registered_nurse', 'registration_clerk'],
    navigationGroup: 'Operations',
    priority: 240,
    icon: 'clock',
    breadcrumbs: ['Operations', 'Shift'],
    helpTopicId: 'shift',
    workflowOwner: 'Charge nurse',
  }),
  route({
    id: 'onboarding',
    path: CANONICAL_ROUTES.onboarding,
    label: 'Organization onboarding',
    description: 'Create a new CareDroid organization (name, slug, type). Staff, queues, thresholds, alerts, and roles are configured afterward from Tenant admin and Emergency settings.',
    pageComponent: 'OrganizationOnboarding',
    showInNav: false,
    navigationGroup: 'Organization',
    priority: 900,
    icon: 'building',
    breadcrumbs: ['Organization', 'Onboarding'],
    workflowOwner: 'Site admin',
  }),
  route({
    id: 'settings',
    path: CANONICAL_ROUTES.emergencySettings,
    label: 'Settings',
    description: 'Role-aware ED settings and platform configuration.',
    pageComponent: 'EmergencySettings',
    requiredPermissions: [P.SETTINGS_READ],
    allowedRoles: ['super_admin', 'hospital_admin', 'ed_director', 'charge_nurse', 'registration_clerk', 'it_admin'],
    navigationGroup: 'Administration',
    priority: 190,
    icon: 'settings',
    breadcrumbs: ['Administration', 'Settings'],
    helpTopicId: 'settings',
    workflowOwner: 'IT administrator',
  }),
  route({
    id: 'help',
    path: CANONICAL_ROUTES.emergencyHelp,
    label: 'Help',
    description: 'Route-aware and role-aware CareDroid user manual.',
    pageComponent: 'HelpHubPage',
    allowedRoles: ALL_USER_PROFILES,
    navigationGroup: 'Help',
    priority: 250,
    icon: 'help-circle',
    aliases: ['/help'],
    emergencySafe: true,
    readOnlyAllowed: true,
    breadcrumbs: ['Help'],
    helpTopicId: 'help',
    workflowOwner: 'CareDroid support',
  }),
  route({
    id: 'app-navigator',
    path: CANONICAL_ROUTES.appNavigator,
    label: 'App navigator',
    description: 'Ask a workflow question in plain language and get grounded matches from the verified route catalog.',
    pageComponent: 'AppNavigator',
    allowedRoles: ALL_USER_PROFILES,
    navigationGroup: 'Help',
    priority: 255,
    icon: 'search',
    readOnlyAllowed: true,
    breadcrumbs: ['Help', 'App navigator'],
    helpTopicId: 'app-navigator',
    workflowOwner: 'CareDroid support',
  }),
  route({
    id: 'fleet',
    path: CANONICAL_ROUTES.fleetCommand,
    label: 'Fleet',
    description: 'EMS fleet command dashboard for ambulance tracking, dispatch coordination, and live status.',
    pageComponent: 'FleetDashboard',
    requiredPermissions: [P.PATIENT_READ],
    allowedRoles: ['super_admin', 'hospital_admin', 'it_admin', 'ems_coordinator', 'dispatcher'],
    navigationGroup: 'Operations',
    priority: 260,
    icon: 'ambulance',
    emergencySafe: false,
    breadcrumbs: ['Operations', 'Fleet'],
    helpTopicId: 'ems',
    workflowOwner: 'EMS operations',
  }),
  route({
    id: 'hospital-map',
    path: CANONICAL_ROUTES.hospitalMap,
    label: 'Hospital Map',
    description: 'Hospital-wide bed map with unit occupancy, capacity score, and diversion status.',
    pageComponent: 'HospitalMapDashboard',
    requiredPermissions: [P.ANALYTICS_READ],
    allowedRoles: ['super_admin', 'hospital_admin', 'ed_director', 'charge_nurse', 'patient_flow_coordinator', 'quality_safety_officer'],
    navigationGroup: 'Operations',
    priority: 143,
    icon: 'map',
    emergencySafe: false,
    readOnlyAllowed: true,
    breadcrumbs: ['Operations', 'Hospital Map'],
    helpTopicId: 'capacity',
    workflowOwner: 'Hospital administrator / patient flow coordinator',
  }),
  route({
    id: 'executive',
    path: CANONICAL_ROUTES.executive,
    label: 'Executive',
    description: 'C-suite KPI dashboard: patient volumes, wait times, LOS, platform health, and surge status.',
    pageComponent: 'HospitalCommandCenter',
    redirectTo: `${CANONICAL_ROUTES.emergencyCommandCenter}?view=executive`,
    requiredPermissions: [P.ANALYTICS_READ],
    allowedRoles: ['super_admin', 'hospital_admin', 'ed_director', 'quality_safety_officer'],
    navigationGroup: 'Intelligence',
    priority: 146,
    icon: 'chart-bar',
    emergencySafe: false,
    readOnlyAllowed: true,
    breadcrumbs: ['Intelligence', 'Executive'],
    helpTopicId: 'analytics',
    workflowOwner: 'Hospital administrator',
  }),
  route({
    id: 'predictive-analytics',
    path: CANONICAL_ROUTES.predictiveAnalytics,
    label: 'Predictive AI',
    description: 'Predictive risk models for deterioration, readmission, mortality, and overcrowding.',
    pageComponent: 'HospitalCommandCenter',
    redirectTo: `${CANONICAL_ROUTES.emergencyCommandCenter}?view=predictive`,
    requiredPermissions: [P.ANALYTICS_READ],
    allowedRoles: ['super_admin', 'hospital_admin', 'ed_director', 'charge_nurse', 'emergency_physician', 'attending_physician', 'quality_safety_officer', 'patient_flow_coordinator'],
    navigationGroup: 'Intelligence',
    priority: 148,
    icon: 'predictive-trend',
    emergencySafe: false,
    readOnlyAllowed: true,
    breadcrumbs: ['Intelligence', 'Predictive AI'],
    helpTopicId: 'analytics',
    workflowOwner: 'Clinical leadership',
  }),
  route({
    id: 'medical-iot',
    path: CANONICAL_ROUTES.medicalIot,
    label: 'Medical IoT',
    description: 'Medical IoT device roster with battery, alarm, and connectivity monitoring.',
    pageComponent: 'MedicalIotDashboard',
    requiredPermissions: [P.SETTINGS_READ],
    allowedRoles: ['super_admin', 'hospital_admin', 'it_admin', 'ed_director'],
    navigationGroup: 'Operations',
    showInNav: false,
    priority: 149,
    icon: 'activity',
    emergencySafe: false,
    readOnlyAllowed: true,
    breadcrumbs: ['Operations', 'Medical IoT'],
    helpTopicId: 'settings',
    workflowOwner: 'IT administrator',
  }),
  // HEAL-347.48: 'devices' (Device Fleet Management, a fully-built 162-line
  // page -- src/pages/operations/DeviceFleetManagement.tsx) had NO entry at
  // all in this catalog, unlike its siblings above (fleet/hospital-map/
  // medical-iot). getRouteByPath('/devices') returned null, so
  // canRouteRecordIncludeProfile always returned false regardless of role --
  // live-confirmed super_admin and hospital_admin both got silently bounced
  // away while it_admin (via a separate, uncoordinated access path) could
  // still reach it. Mirrors medical-iot's allowedRoles exactly, since both
  // pages cover the same biomedical/IT-operations audience.
  route({
    id: 'devices',
    path: CANONICAL_ROUTES.devices,
    label: 'Device Fleet',
    description: 'Biomedical device fleet inventory, maintenance, and lifecycle tracking.',
    pageComponent: 'DeviceFleetManagement',
    requiredPermissions: [P.SETTINGS_READ],
    allowedRoles: ['super_admin', 'hospital_admin', 'it_admin', 'ed_director'],
    navigationGroup: 'Operations',
    showInNav: false,
    priority: 150,
    icon: 'activity',
    emergencySafe: false,
    readOnlyAllowed: true,
    breadcrumbs: ['Operations', 'Device Fleet'],
    helpTopicId: 'settings',
    workflowOwner: 'IT administrator',
  }),
  route({
    id: 'surveillance',
    path: CANONICAL_ROUTES.surveillanceNexus,
    label: 'Surveillance',
    description: 'Surveillance extension route redirected to the ED whiteboard until a dedicated nexus page ships.',
    pageComponent: 'EmergencyWhiteboard',
    requiredPermissions: [P.SETTINGS_READ],
    allowedRoles: ['super_admin', 'hospital_admin', 'it_admin', 'quality_safety_officer'],
    navigationGroup: 'Operations',
    showInNav: false,
    priority: 270,
    icon: 'activity',
    emergencySafe: false,
    redirectTo: CANONICAL_ROUTES.emergencyWhiteboard,
    breadcrumbs: ['Operations', 'Surveillance'],
    helpTopicId: 'settings',
    workflowOwner: 'IT administrator',
  }),
  route({
    id: 'simulation',
    path: CANONICAL_ROUTES.simulation,
    label: 'Simulation',
    description: 'Medical simulation suite — scenario library, player, debrief, and outcomes.',
    pageComponent: 'MedicalSimulationSuite',
    requiredPermissions: [P.ANALYTICS_READ],
    allowedRoles: ['super_admin', 'hospital_admin', 'ed_director', 'quality_safety_officer'],
    navigationGroup: 'Intelligence',
    priority: 280,
    icon: 'list-check',
    aliases: [CANONICAL_ROUTES.emergencySimulation, ...SIMULATION_ROUTE_ALIASES],
    emergencySafe: false,
    breadcrumbs: ['Intelligence', 'Simulation'],
    helpTopicId: 'simulation',
    workflowOwner: 'Education / quality',
  }),
  route({
    id: 'laboratory',
    path: CANONICAL_ROUTES.laboratory,
    label: 'Laboratory',
    description: 'Laboratory results dashboard — specimen tracking, pending orders, and critical values.',
    pageComponent: 'LaboratoryDashboard',
    requiredPermissions: [P.LABS_READ],
    allowedRoles: ['super_admin', 'ed_director', 'charge_nurse', 'emergency_physician', 'attending_physician', 'resident_physician', 'lab_technician', 'pharmacist'],
    navigationGroup: 'Clinical',
    priority: 290,
    icon: 'stethoscope',
    readOnlyAllowed: true,
    breadcrumbs: ['Clinical', 'Laboratory'],
    helpTopicId: 'diagnostics',
    workflowOwner: 'Laboratory',
  }),
  route({
    id: 'knowledge',
    path: CANONICAL_ROUTES.knowledgeGraph,
    label: 'Knowledge Graph',
    description: 'Knowledge graph extension route redirected to tools and guidance surfaces when not mounted.',
    pageComponent: 'ToolsOverview',
    requiredPermissions: [P.AI_READ],
    allowedRoles: ['super_admin', 'hospital_admin', 'ed_director', 'it_admin', 'quality_safety_officer'],
    navigationGroup: 'Intelligence',
    priority: 300,
    icon: 'chart-bar',
    emergencySafe: false,
    breadcrumbs: ['Intelligence', 'Knowledge Graph'],
    helpTopicId: 'tools',
    workflowOwner: 'Platform intelligence',
  }),
  route({
    id: 'ai-center',
    path: CANONICAL_ROUTES.aiCommandCenter,
    label: 'AI Center',
    description: 'AI operations dashboard: model health, expert roster, memory usage, RAG metrics, cost, and audit logs.',
    pageComponent: 'HospitalCommandCenter',
    redirectTo: `${CANONICAL_ROUTES.emergencyCommandCenter}?view=ai`,
    requiredPermissions: [P.AI_READ],
    allowedRoles: ['super_admin', 'hospital_admin', 'ed_director', 'it_admin', 'quality_safety_officer'],
    navigationGroup: 'Intelligence',
    priority: 320,
    icon: 'robot',
    emergencySafe: false,
    readOnlyAllowed: true,
    breadcrumbs: ['Intelligence', 'AI Center'],
    helpTopicId: 'copilot',
    workflowOwner: 'AI governance',
  }),
  route({
    id: 'cosmos',
    path: CANONICAL_ROUTES.cosmosViewer,
    label: 'Cosmos',
    description: 'Retired visual extension route redirected to the operational dashboard.',
    pageComponent: 'EmergencyWhiteboard',
    requiredPermissions: [P.PATIENT_READ],
    allowedRoles: ALL_USER_PROFILES,
    navigationGroup: 'Intelligence',
    priority: 210,
    icon: 'chart-bar',
    emergencySafe: false,
    redirectTo: CANONICAL_ROUTES.emergencyWhiteboard,
    breadcrumbs: ['Intelligence', 'Cosmos'],
    helpTopicId: 'whiteboard',
    workflowOwner: 'CareDroid platform',
  }),
  route({
    id: 'admin',
    path: CANONICAL_ROUTES.adminOperations,
    label: 'Admin',
    description: 'Administrative operations, staff workflows, tenant settings, and audit views.',
    pageComponent: 'AdminOperationsShell',
    requiredPermissions: [P.SETTINGS_READ],
    allowedRoles: ['super_admin', 'hospital_admin', 'ed_director', 'it_admin', 'quality_safety_officer'],
    navigationGroup: 'Administration',
    priority: 330,
    icon: 'admin-console',
    emergencySafe: false,
    breadcrumbs: ['Administration', 'Admin'],
    helpTopicId: 'admin',
    workflowOwner: 'Hospital administrator / IT administrator',
  }),
  route({
    id: 'audit',
    path: CANONICAL_ROUTES.audit,
    label: 'Audit',
    description: 'Governance and audit workspace.',
    pageComponent: 'PlatformGovernanceWorkspace',
    requiredPermissions: [P.AUDIT_READ],
    allowedRoles: ['super_admin', 'hospital_admin', 'it_admin', 'quality_safety_officer'],
    navigationGroup: 'Administration',
    showInNav: true,
    priority: 310,
    icon: 'audit-trail',
    emergencySafe: false,
    readOnlyAllowed: true,
    breadcrumbs: ['Administration', 'Audit'],
    helpTopicId: 'audit',
    workflowOwner: 'Quality safety officer / IT administrator',
  }),
  route({
    id: 'integrations',
    path: CANONICAL_ROUTES.integrationHub,
    label: 'Integrations',
    description: 'Integration hub for connected systems and external handoffs.',
    pageComponent: 'IntegrationHubPage',
    requiredPermissions: [P.SETTINGS_READ],
    allowedRoles: ['super_admin', 'hospital_admin', 'it_admin', 'ed_director'],
    navigationGroup: 'Administration',
    showInNav: true,
    priority: 200,
    icon: 'integrations',
    emergencySafe: false,
    breadcrumbs: ['Administration', 'Integrations'],
    helpTopicId: 'integrations',
    workflowOwner: 'IT administrator',
  }),
  route({
    id: 'platform',
    path: CANONICAL_ROUTES.platformStart,
    label: 'Platform',
    description: 'Platform entry hub for role selection, demos, and workspace launch.',
    pageComponent: 'PlatformEntryHub',
    requiredPermissions: [P.PATIENT_READ],
    allowedRoles: ALL_USER_PROFILES,
    navigationGroup: 'Administration',
    showInNav: true,
    priority: 220,
    icon: 'platform',
    emergencySafe: false,
    aliases: [CANONICAL_ROUTES.workspace],
    breadcrumbs: ['Administration', 'Platform'],
    helpTopicId: 'platform-start',
    workflowOwner: 'CareDroid platform',
  }),
]);

export const CANONICAL_ROUTE_MAP_BY_ID = Object.freeze(
  Object.fromEntries(CANONICAL_ROUTE_MAP.map((record) => [record.id, record])),
);

function normalizePathPattern(path) {
  return String(path || '').replace(/\/+$/, '') || '/';
}

export function normalizeRoutePath(path) {
  const [pathname] = String(path || '/').split(/[?#]/);
  return normalizePathPattern(pathname);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// CANONICAL_ROUTE_MAP is a fixed, frozen array built once at module load, so
// the set of distinct patterns routePatternMatches ever sees is bounded and
// never changes at runtime -- caching the compiled RegExp per pattern is
// always safe. Without this, every dynamic (":param") route comparison
// rebuilt and recompiled a RegExp from scratch on every single call; profiled
// as one of the hottest application functions during route/permission checks
// (getRouteByPath/getRouteAccess run on every nav-item render).
const compiledPatternCache = new Map();

function compilePattern(normalizedPattern) {
  let regex = compiledPatternCache.get(normalizedPattern);
  if (!regex) {
    const expression = `^${normalizedPattern
      .split('/')
      .map((segment) => (segment.startsWith(':') ? '[^/]+' : escapeRegExp(segment)))
      .join('/')}(?:/.*)?$`;
    regex = new RegExp(expression);
    compiledPatternCache.set(normalizedPattern, regex);
  }
  return regex;
}

function routePatternMatches(pattern, pathname, allowPrefix = true) {
  const normalizedPattern = normalizePathPattern(pattern);
  const normalizedPath = normalizeRoutePath(pathname);
  if (normalizedPattern === normalizedPath) return true;
  if (
    allowPrefix &&
    !normalizedPattern.includes(':') &&
    normalizedPath.startsWith(`${normalizedPattern}/`)
  ) {
    return true;
  }
  if (!allowPrefix && !normalizedPattern.includes(':')) return false;
  return compilePattern(normalizedPattern).test(normalizedPath);
}

export function getRouteByPath(path) {
  const normalizedPath = normalizeRoutePath(path);
  return (
    CANONICAL_ROUTE_MAP.find((record) => routePatternMatches(record.path, normalizedPath)) ||
    CANONICAL_ROUTE_MAP.find((record) =>
      (record.aliases || []).some((alias) => routePatternMatches(alias, normalizedPath, false)),
    ) ||
    // 2026-08-25: ROUTE_RECORDS (defined further below in this file) is a
    // separate, larger array from CANONICAL_ROUTE_MAP -- not a subset or
    // superset of it, confirmed by id overlap (only 6 of ~113 combined ids
    // appear in both). Real, live consequence found and verified: the
    // 'copilot' record in CANONICAL_ROUTE_MAP (path /emergency/copilot,
    // requiredPermissions/allowedRoles set) carries no `aliases` field at
    // all, while its ROUTE_RECORDS counterpart (id 'assistant') declares
    // ASSISTANT_ROUTE_ALIASES ('/assistant', '/chat', '/ai', '/copilot').
    // canonicalAccess.ts's routeAccessMatches() falls back to this function
    // specifically to resolve an alias back to whatever canonical path a
    // role's access list actually names -- with the alias invisible here,
    // any role whose access list names /emergency/copilot (not one of its
    // aliases) was being denied on every one of those 4 alias URLs,
    // regardless of role, confirmed live even for 'admin'. Falling back to
    // ROUTE_RECORDS (same two-phase own-path-then-aliases search) closes
    // that gap for every current and future caller of this function, not
    // just the one path found so far -- without changing any existing
    // CANONICAL_ROUTE_MAP match (this is strictly additive: it only returns
    // a ROUTE_RECORDS hit when CANONICAL_ROUTE_MAP had none).
    ROUTE_RECORDS.find((record) => routePatternMatches(record.path, normalizedPath)) ||
    ROUTE_RECORDS.find((record) =>
      (record.aliases || []).some((alias) => routePatternMatches(alias, normalizedPath, false)),
    ) ||
    null
  );
}

export function getRouteById(id) {
  return CANONICAL_ROUTE_MAP_BY_ID[id] || null;
}

export function getBreadcrumbsForRoute(pathOrId) {
  const routeRecord =
    CANONICAL_ROUTE_MAP_BY_ID[pathOrId] || getRouteByPath(pathOrId) || null;
  return routeRecord ? routeRecord.breadcrumbs : Object.freeze(['CareDroid']);
}

export function getDefaultRouteForProfile(profile) {
  const profileId = profileIdFromSubject(profile);
  return (
    USER_PROFILE_ROUTE_DEFAULTS[profileId] ||
    USER_PROFILE_ROUTE_DEFAULTS[profileId.replace(/-/g, '_')] ||
    CANONICAL_ROUTES.emergencyWhiteboard
  );
}

export function getAccessibleRoutesForProfile(profile) {
  const profileId = profileIdFromSubject(profile);
  const explicitAccess =
    profile?.routeAccess ||
    profile?.navigationAccess ||
    profile?.routes?.allowed ||
    profile?.catalog?.navigationRoutes ||
    null;

  if (explicitAccess?.length) {
    const access = new Set(explicitAccess.map((path) => normalizeRoutePath(path)));
    return CANONICAL_ROUTE_MAP.filter((record) =>
      [record.path, ...(record.aliases || [])].some((path) => access.has(normalizeRoutePath(path))),
    );
  }

  return CANONICAL_ROUTE_MAP.filter((record) =>
    (record.allowedRoles || []).map(normalizeProfileId).includes(profileId),
  );
}

export function canRouteRecordIncludeProfile(routeRecord, profile) {
  const profileId = profileIdFromSubject(profile);
  return (routeRecord?.allowedRoles || []).map(normalizeProfileId).includes(profileId);
}

export const ROUTE_RECORDS = Object.freeze([
  Object.freeze({
    id: 'auth',
    path: CANONICAL_ROUTES.platformStart,
    layout: 'auth',
    auth: 'publicOnly',
    status: 'redirect',
    aliases: AUTH_PATH_ALIASES,
    navGroup: 'auth',
  }),
  Object.freeze({
    id: 'startup',
    path: CANONICAL_ROUTES.emergencyReception,
    componentKey: 'ReceptionWorkspace',
    layout: 'app',
    auth: 'required',
    status: 'redirect',
    aliases: APP_STARTUP_ROUTE_ALIASES,
    navGroup: 'primary',
  }),
  Object.freeze({
    id: 'dashboard',
    path: CANONICAL_ROUTES.emergencyCommandCenter,
    componentKey: 'HospitalCommandCenter',
    layout: 'app',
    auth: 'required',
    status: 'redirect',
    aliases: [CANONICAL_ROUTES.dashboard],
    navGroup: 'primary',
  }),
  Object.freeze({
    id: 'executive',
    path: CANONICAL_ROUTES.emergencyCommandCenter,
    componentKey: 'HospitalCommandCenter',
    layout: 'app',
    auth: 'required',
    status: 'redirect',
    aliases: [CANONICAL_ROUTES.executive],
    navGroup: 'advanced',
    notes:
      'Executive intelligence lens consolidated into Hospital Command Center (?view=executive).',
  }),
  Object.freeze({
    id: 'assistant',
    path: CANONICAL_ROUTES.emergencyCopilot,
    componentKey: 'EmergencyCopilotPanel',
    layout: 'app',
    auth: 'required',
    status: 'redirect',
    aliases: ASSISTANT_ROUTE_ALIASES,
    navGroup: 'primary',
  }),
  Object.freeze({
    id: 'aiCommandCenter',
    path: CANONICAL_ROUTES.emergencyCommandCenter,
    componentKey: 'HospitalCommandCenter',
    layout: 'app',
    auth: 'required',
    status: 'redirect',
    aliases: [CANONICAL_ROUTES.aiCommandCenter, '/ai/command-center', '/ai-command'],
    navGroup: 'advanced',
    notes:
      'AI operations lens consolidated into Hospital Command Center (?view=ai).',
  }),
  Object.freeze({
    id: 'predictiveAnalytics',
    path: CANONICAL_ROUTES.emergencyCommandCenter,
    componentKey: 'HospitalCommandCenter',
    layout: 'app',
    auth: 'required',
    status: 'redirect',
    aliases: [CANONICAL_ROUTES.predictiveAnalytics],
    navGroup: 'advanced',
    notes:
      'Predictive intelligence lens consolidated into Hospital Command Center (?view=predictive).',
  }),
  Object.freeze({
    id: 'recommendations',
    path: CANONICAL_ROUTES.emergencyTools,
    componentKey: 'ToolsOverview',
    layout: 'app',
    auth: 'required',
    status: 'redirect',
    aliases: [],
    navGroup: 'solutions',
    notes:
      'Retired standalone recommendations route redirects into CareDroid tools with recommendation filters.',
  }),
  Object.freeze({
    id: 'knowledgeHub',
    path: CANONICAL_ROUTES.knowledgeHub,
    componentKey: 'HealthcareKnowledgeHubPage',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'account',
    notes:
      'Centralized healthcare knowledge hub for protocols, pathways, calculators, simulations, AI guidance, and documentation.',
  }),
  Object.freeze({
    id: 'knowledgeBase',
    path: CANONICAL_ROUTES.knowledgeBase,
    componentKey: 'KnowledgeBasePage',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: [],
    navGroup: 'account',
  }),
  Object.freeze({
    id: 'marketplace',
    path: CANONICAL_ROUTES.marketplace,
    componentKey: 'MarketplacePage',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'account',
    notes:
      'Unified extensibility marketplace for asset packs, workflows, simulations, protocols, AI agents, and integrations.',
  }),
  Object.freeze({
    id: 'enterpriseReadiness',
    path: CANONICAL_ROUTES.enterpriseReadiness,
    componentKey: 'EnterpriseReadinessPage',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: [],
    navGroup: 'account',
    notes:
      'Enterprise readiness center with weighted SSO, RBAC, tenant isolation, audit, governance, integration, and security scoring.',
  }),
  Object.freeze({
    id: 'trackMindMaturity',
    path: CANONICAL_ROUTES.trackMindMaturity,
    componentKey: 'TrackMindMaturityDashboard',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: [],
    navGroup: 'account',
    notes:
      'TrackMind Operating System Maturity Framework — nine-domain scoring for operations, safety, compliance, security, equine welfare, facilities, finance, AI governance, and data quality.',
  }),
  Object.freeze({
    id: 'enterprisePlatform',
    path: CANONICAL_ROUTES.enterprisePlatform,
    componentKey: 'EnterpriseOperatingPlatformHub',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: [],
    navGroup: 'account',
    notes:
      'TrackMind Enterprise Operating Platform — Prompts 99–116: benchmarking, franchise readiness, certification, risk, continuity, DR, assets, workforce, training, knowledge, playbooks, decision support, scenarios, strategy, portfolio, governance, ESG, architecture.',
  }),
  Object.freeze({
    id: 'platformIntelligence',
    path: CANONICAL_ROUTES.platformIntelligence,
    componentKey: 'PlatformIntelligenceHub',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: [],
    navGroup: 'account',
    notes:
      'TrackMind Platform Intelligence — Prompts 117–136: artifact registry, lineage, metadata, KPI intelligence, observability, technical debt, convergence review.',
  }),
  // Future module
  Object.freeze({
    id: 'platformAdmin',
    path: CANONICAL_ROUTES.platformAdmin,
    componentKey: 'PlatformAdminPage',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: [],
    navGroup: 'account',
    notes:
      'SaaS operating system layer unifying organization, subscription, products, packs, assets, workspaces, users, AI agents, and automations.',
  }),
  Object.freeze({
    id: 'tools',
    path: CANONICAL_ROUTES.emergencyTools,
    componentKey: 'ToolsOverview',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: TOOLS_ROUTE_ALIASES,
    matchPrefixes: ['/tools/'],
    navGroup: 'tools',
  }),
  Object.freeze({
    id: 'calculators',
    path: CANONICAL_ROUTES.emergencyTools,
    componentKey: 'ToolsOverview',
    layout: 'app',
    auth: 'required',
    status: 'redirect',
    aliases: CALCULATORS_ROUTE_ALIASES,
    matchPrefixes: ['/tools/calculators/'],
    navGroup: 'tools',
  }),
  Object.freeze({
    id: 'operations',
    path: CANONICAL_ROUTES.emergencyQueues,
    componentKey: 'EmergencyQueueRoute',
    layout: 'app',
    auth: 'required',
    status: 'redirect',
    aliases: OPERATIONS_ROUTE_ALIASES,
    matchPrefixes: ['/operations/'],
    navGroup: 'primary',
  }),
  // Future module
  Object.freeze({
    id: 'digitalTwin',
    path: CANONICAL_ROUTES.emergencyTools,
    componentKey: 'ToolsOverview',
    layout: 'app',
    auth: 'required',
    status: 'redirect',
    aliases: [],
    matchPrefixes: ['/digital-twin/'],
    navGroup: 'operations',
  }),
  Object.freeze({
    id: 'digitalTwinIntelligence',
    path: CANONICAL_ROUTES.digitalTwinIntelligence,
    componentKey: 'DigitalTwinIntelligence',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: [],
    matchPrefixes: ['/digital-twin-intelligence/'],
    navGroup: 'operations',
    notes:
      'Predictive operational twin combining Hospital Map, Fleet, Medical IoT, occupancy, telemetry, alerts, and maintenance readiness.',
  }),
  Object.freeze({
    id: 'hospitalMap',
    path: CANONICAL_ROUTES.hospitalMap,
    componentKey: 'HospitalMapDashboard',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    matchPrefixes: ['/hospital-map/'],
    navGroup: 'operations',
    notes: 'Indoor hospital floor plan with device and bed markers.',
  }),
  Object.freeze({
    id: 'medicalIot',
    path: CANONICAL_ROUTES.medicalIot,
    componentKey: 'MedicalIotDashboard',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'operations',
    notes: 'Medical IoT device registry, vitals, and connectivity.',
  }),
  Object.freeze({
    id: 'devices',
    path: CANONICAL_ROUTES.devices,
    componentKey: 'DeviceFleetManagement',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'operations',
    notes: 'Biomedical device fleet inventory and maintenance.',
  }),
  Object.freeze({
    id: 'surveillanceNexus',
    path: CANONICAL_ROUTES.surveillanceNexus,
    componentKey: 'EmergencyWhiteboard',
    layout: 'app',
    auth: 'required',
    status: 'redirect',
    aliases: ['/surveillance', '/cctv', '/iot-nexus'],
    matchPrefixes: ['/surveillance/'],
    navGroup: 'operations',
    notes: 'Redirected to the ED whiteboard; dedicated surveillance nexus page not mounted.',
  }),
  Object.freeze({
    id: 'simulation',
    path: CANONICAL_ROUTES.simulation,
    componentKey: 'MedicalSimulationSuite',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: SIMULATION_ROUTE_ALIASES,
    matchPrefixes: ['/simulation/'],
    navGroup: 'training',
    notes: 'Canonical training console — scenario library, player, outcomes, and competencies.',
  }),
  // Future module
  Object.freeze({
    id: 'laboratory',
    path: CANONICAL_ROUTES.laboratory,
    componentKey: 'LaboratoryDashboard',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: LABORATORY_ROUTE_ALIASES,
    navGroup: 'tools',
  }),
  Object.freeze({
    id: 'medical3dViewer',
    path: CANONICAL_ROUTES.medical3dViewer,
    componentKey: 'Medical3DViewer',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: MEDICAL_3D_VIEWER_ROUTE_ALIASES,
    navGroup: 'tools',
  }),
  Object.freeze({
    id: 'liveMap',
    path: CANONICAL_ROUTES.emergencyTools,
    componentKey: 'ToolsOverview',
    layout: 'app',
    auth: 'required',
    status: 'redirect',
    aliases: LIVE_MAP_ROUTE_ALIASES,
    navGroup: 'operations',
  }),
  // Future module
  Object.freeze({
    id: 'fleetMap',
    path: CANONICAL_ROUTES.fleetMap,
    componentKey: 'FleetLiveMap',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: FLEET_MAP_ROUTE_ALIASES,
    matchPrefixes: ['/fleet/'],
    navGroup: 'operations',
  }),
  // Future module
  Object.freeze({
    id: 'fleetCommand',
    path: CANONICAL_ROUTES.fleetCommand,
    componentKey: 'FleetDashboard',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'operations',
    notes:
      'Fleet command dashboard retained as an operations detail route while /fleet/map is the canonical map entry.',
  }),
  Object.freeze({
    id: 'audit',
    path: CANONICAL_ROUTES.audit,
    componentKey: 'PlatformGovernanceWorkspace',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: AUDIT_ROUTE_ALIASES,
    matchPrefixes: ['/audit/'],
    navGroup: 'advanced',
  }),
  Object.freeze({
    id: 'assetPacks',
    path: CANONICAL_ROUTES.assetPacks,
    componentKey: 'PackMarketplace',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'products',
    notes: 'Canonical organization-aware asset pack marketplace.',
  }),
  Object.freeze({
    id: 'businessBrain',
    path: CANONICAL_ROUTES.businessBrain,
    componentKey: 'CareDroidBusinessBrainPage',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'advanced',
    notes:
      'Business intelligence layer aggregating platform and business analytics into advisory recommendations.',
  }),
  Object.freeze({
    id: 'organization',
    path: CANONICAL_ROUTES.organization,
    componentKey: 'OrganizationDashboard',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    matchPrefixes: ['/organization/'],
    navGroup: 'organization',
    notes: 'Tenant organization dashboard and settings entry point.',
  }),
  Object.freeze({
    id: 'platformAnalytics',
    path: CANONICAL_ROUTES.platformAnalytics,
    componentKey: 'PlatformAnalyticsPage',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'advanced',
    notes: 'Tenant analytics for usage, adoption, automation, and value signals.',
  }),
  Object.freeze({
    id: 'departmentIntelligence',
    path: CANONICAL_ROUTES.departmentIntelligence,
    componentKey: 'DepartmentIntelligencePage',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'products',
    notes:
      'Department performance intelligence with health scores and measurable platform outcomes.',
  }),
  Object.freeze({
    id: 'workflowMining',
    path: CANONICAL_ROUTES.workflowMining,
    componentKey: 'WorkflowMiningEnginePage',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'operations',
    notes:
      'Workflow mining engine for common journeys, friction, dead ends, and unnecessary clicks.',
  }),
  Object.freeze({
    id: 'workspaceDependencyGraph',
    path: CANONICAL_ROUTES.workspaceDependencyGraph,
    componentKey: 'WorkspaceDependencyGraphPage',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'operations',
    notes:
      'Cross-workspace intelligence dependency graph for handoffs, signals, and operational relationships.',
  }),
  Object.freeze({
    id: 'organizationIntelligence',
    path: CANONICAL_ROUTES.organizationIntelligence,
    componentKey: 'OrganizationIntelligenceProfile',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'advanced',
    notes:
      'Organization intelligence profile with behavior-aware pack, asset, AI, workflow, simulation, and automation recommendations.',
  }),
  Object.freeze({
    id: 'platformLearningEngine',
    path: CANONICAL_ROUTES.platformLearningEngine,
    componentKey: 'PlatformLearningEngine',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: ['/platform-learning'],
    navGroup: 'advanced',
    notes:
      'Privacy-safe platform learning engine that turns usage signals into optimization suggestions.',
  }),
  Object.freeze({
    id: 'brain',
    path: CANONICAL_ROUTES.brain,
    componentKey: 'CareDroidBrainDashboard',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: [],
    navGroup: 'advanced',
    notes:
      'Centralized CareDroid Brain intelligence layer across platform, organization, role, asset, automation, memory, recommendations, and learning systems.',
  }),
  Object.freeze({
    id: 'products',
    path: CANONICAL_ROUTES.products,
    componentKey: 'ProductsIndexPage',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: [],
    matchPrefixes: ['/products/'],
    navGroup: 'products',
    notes: 'Sellable CareDroid product catalog mapped to packs and assets.',
  }),
  Object.freeze({
    id: 'plans',
    path: CANONICAL_ROUTES.plans,
    componentKey: 'CommercialPlansPage',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: [],
    navGroup: 'products',
    notes: 'Subscription plan catalog mapped to included products and packs.',
  }),
  Object.freeze({
    id: 'specialties',
    path: CANONICAL_ROUTES.specialties,
    componentKey: 'SpecialtiesIndexPage',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: [],
    matchPrefixes: ['/specialties/'],
    navGroup: 'products',
  }),
  Object.freeze({
    id: 'carePathways',
    path: CANONICAL_ROUTES.carePathways,
    componentKey: 'CarePathwaysIndexPage',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: [],
    matchPrefixes: ['/care-pathways/'],
    navGroup: 'products',
  }),
  Object.freeze({
    id: 'agents',
    path: CANONICAL_ROUTES.agents,
    componentKey: 'AgentsRegistryPage',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: [],
    navGroup: 'products',
    notes: 'AI agent registry mounted to products, packs, workspaces, and role profiles.',
  }),
  Object.freeze({
    id: 'maturityAssessment',
    path: CANONICAL_ROUTES.maturityAssessment,
    componentKey: 'MaturityAssessmentPage',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'products',
  }),
  Object.freeze({
    id: 'outcomes',
    path: CANONICAL_ROUTES.outcomes,
    componentKey: 'OutcomesDashboardPage',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: [],
    navGroup: 'products',
  }),
  Object.freeze({
    id: 'integrationsMarketplace',
    path: CANONICAL_ROUTES.integrationsMarketplace,
    componentKey: 'IntegrationsMarketplacePage',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: [],
    navGroup: 'products',
    notes:
      'Integration marketplace route documented as product/system purpose until integration assets are launchable.',
  }),
  Object.freeze({
    id: 'departments',
    path: CANONICAL_ROUTES.departments,
    componentKey: 'DepartmentsPage',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'products',
    notes: 'Department-to-asset mapping across packs, assets, roles, permissions, and users.',
  }),
  Object.freeze({
    id: 'serviceLines',
    path: CANONICAL_ROUTES.serviceLines,
    componentKey: 'ServiceLinesPage',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'products',
    notes: 'Service-line architecture across departments, asset packs, and assets.',
  }),
  Object.freeze({
    id: 'integrationReadiness',
    path: CANONICAL_ROUTES.integrationReadiness,
    componentKey: 'IntegrationReadinessPage',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: [],
    navGroup: 'products',
    notes:
      'Integration readiness across interoperability, identity, government, and scheduling systems.',
  }),
  Object.freeze({
    id: 'configurationStudio',
    path: CANONICAL_ROUTES.configurationStudio,
    componentKey: 'ConfigurationStudioPage',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: [],
    navGroup: 'products',
    notes: 'No-code configuration studio for tenant-safe product and pack setup.',
  }),
  Object.freeze({
    id: 'solutionBuilder',
    path: CANONICAL_ROUTES.solutionBuilder,
    componentKey: 'HospitalSolutionBuilderPage',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: [],
    navGroup: 'products',
    notes: 'No-code hospital deployment recommendation and apply workflow.',
  }),
  Object.freeze({
    id: 'valueTracking',
    path: CANONICAL_ROUTES.valueTracking,
    componentKey: 'ValueTrackingPage',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: [],
    navGroup: 'products',
    notes: 'Clinical, operational, and executive value tracking framework.',
  }),
  Object.freeze({
    id: 'productIntelligence',
    path: CANONICAL_ROUTES.productIntelligence,
    componentKey: 'ProductIntelligenceLayerPage',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'products',
    notes:
      'Product intelligence layer for adoption, ROI, health, and engagement value-chain metrics.',
  }),
  Object.freeze({
    id: 'expansionOpportunities',
    path: CANONICAL_ROUTES.expansionOpportunities,
    componentKey: 'CustomerExpansionOpportunitiesPage',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'products',
    notes: 'Customer expansion engine for upsell, cross-sell, and next-best pack opportunities.',
  }),
  Object.freeze({
    id: 'customerSuccess',
    path: CANONICAL_ROUTES.customerSuccess,
    componentKey: 'CustomerSuccessPlatformPage',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: [],
    navGroup: 'products',
    notes:
      'Customer success platform — onboarding progress, adoption metrics, feature utilization, health scores, support tracking, renewal readiness, and KPIs.',
  }),
  Object.freeze({
    id: 'customerPortal',
    path: CANONICAL_ROUTES.customerPortal,
    componentKey: 'TenantAdministrationCenter',
    layout: 'app',
    auth: 'required',
    status: 'redirect',
    aliases: [],
    navGroup: 'account',
    notes: 'Redirected to tenant administration; dedicated customer portal page not mounted.',
  }),
  Object.freeze({
    id: 'successCenter',
    path: CANONICAL_ROUTES.successCenter,
    componentKey: 'CustomerSuccessDashboard',
    layout: 'app',
    auth: 'required',
    status: 'redirect',
    aliases: [],
    navGroup: 'products',
    notes: 'Redirected to customer success dashboard route; legacy success-center alias retained.',
  }),
  Object.freeze({
    id: 'billing',
    path: CANONICAL_ROUTES.billing,
    componentKey: 'BillingPage',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'account',
    notes: 'Organization subscription billing and plan limit overview.',
  }),
  Object.freeze({
    id: 'usage',
    path: CANONICAL_ROUTES.usage,
    componentKey: 'UsagePage',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'operations',
    notes: 'Organization usage metering by workspace, asset, role, and period.',
  }),
  Object.freeze({
    id: 'saasHealth',
    path: CANONICAL_ROUTES.saasHealth,
    componentKey: 'SaasHealthCenter',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'advanced',
    notes:
      'SaaS health center for frontend, backend, API, integrations, tenant, AI, and simulation health.',
  }),
  // Future module
  Object.freeze({
    id: 'governanceRegistry',
    path: CANONICAL_ROUTES.governanceRegistry,
    componentKey: 'GovernanceRegistry',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: [],
    navGroup: 'advanced',
    notes:
      'Platform governance registry for owner, steward, approver, risk, evidence, version, audit, and review schedules.',
  }),
  Object.freeze({
    id: 'aiGovernance',
    path: CANONICAL_ROUTES.aiGovernance,
    componentKey: 'PlatformGovernanceWorkspace',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'advanced',
    notes:
      'AI governance surface (AI service inventory, safety rules, compliance reporting, prompt validation, human-review posture) served by the shared PlatformGovernanceWorkspace shell.',
  }),
  Object.freeze({
    id: 'dependencyGraph',
    path: CANONICAL_ROUTES.dependencyGraph,
    componentKey: 'DependencyGraph',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'advanced',
    notes:
      'Asset dependency graph across products, packs, assets, routes, backend services, and integrations.',
  }),
  Object.freeze({
    id: 'artifacts',
    path: CANONICAL_ROUTES.artifacts,
    componentKey: 'Artifacts',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'advanced',
    notes:
      'Machine-learning-ready artifact intelligence catalog with CSV/JSON export, feature rows, and resonance metadata.',
  }),
  Object.freeze({
    id: 'knowledgeGraph',
    path: CANONICAL_ROUTES.knowledgeGraph,
    componentKey: 'ClinicalKnowledgeGraph',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'advanced',
    notes:
      'Artifact knowledge graph across assets, packs, products, workspaces, roles, routes, simulations, workflows, AI agents, and integrations.',
  }),
  Object.freeze({
    id: 'aiModels',
    path: CANONICAL_ROUTES.aiModels,
    componentKey: 'AiModelsPage',
    layout: 'app',
    auth: 'required',
    status: 'future',
    aliases: [],
    navGroup: 'advanced',
    notes:
      'Unified AI model registry for gateway, MoE, RAG, tool calling, resonance, tutoring, cost, guardrails, and evaluation systems.',
  }),
  Object.freeze({
    id: 'aiEvaluation',
    path: CANONICAL_ROUTES.aiEvaluation,
    componentKey: 'AiEvaluationDashboard',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: ['/ai/evaluation'],
    navGroup: 'advanced',
    notes:
      'AI Evaluation Lab for model quality, hallucination, tool-call, workflow, latency, cost, and comparison benchmarks.',
  }),
  // Future module
  Object.freeze({
    id: 'tenantAdmin',
    path: CANONICAL_ROUTES.tenantAdmin,
    componentKey: 'TenantAdministrationCenter',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'account',
    notes: 'Tenant-scoped organization administration center for no-code customer configuration.',
  }),
  Object.freeze({
    id: 'organizationPacks',
    path: CANONICAL_ROUTES.organizationPacks,
    componentKey: 'PackMarketplace',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: ORGANIZATION_PACKS_ROUTE_ALIASES,
    navGroup: 'organization',
    notes: 'Organization-specific pack marketplace and entitlement management.',
  }),
  Object.freeze({
    id: 'workflows',
    path: CANONICAL_ROUTES.workflows,
    componentKey: 'WorkflowBuilderPage',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [CANONICAL_ROUTES.automation, CANONICAL_ROUTES.automationAnalytics],
    navGroup: 'secondary',
    notes:
      'Canonical workflow route. Legacy /automation and /automation-analytics redirect here to avoid duplicate workflow UI ownership.',
  }),
]);

export const ROUTE_RECORDS_BY_ID = Object.freeze(
  Object.fromEntries(ROUTE_RECORDS.map((record) => [record.id, record])),
);

export const ROUTE_ALIAS_REDIRECTS = Object.freeze(
  ROUTE_RECORDS.filter((record) => record.status !== 'future').flatMap((record) =>
    (record.aliases || []).map((path) =>
      Object.freeze({
        path,
        to: record.path,
        routeId: record.id,
        auth: record.auth,
      }),
    ),
  ),
);

export const PROTECTED_ROUTE_ALIAS_REDIRECTS = Object.freeze(
  ROUTE_ALIAS_REDIRECTS.filter((entry) => entry.auth === 'required'),
);

function aliasesForRoute(id) {
  const record = ROUTE_RECORDS_BY_ID[id];
  if (!record || record.status === 'future') return Object.freeze([]);
  return record.aliases || Object.freeze([]);
}

export const ROUTE_ALIAS_GROUPS = Object.freeze({
  auth: Object.freeze({ target: CANONICAL_ROUTES.platformStart, aliases: aliasesForRoute('auth') }),
  dashboard: Object.freeze({
    target: CANONICAL_ROUTES.emergencyCommandCenter,
    aliases: aliasesForRoute('dashboard'),
  }),
  startup: Object.freeze({
    target: CANONICAL_ROUTES.emergencyReception,
    aliases: aliasesForRoute('startup'),
  }),
  assistant: Object.freeze({
    target: CANONICAL_ROUTES.emergencyCopilot,
    aliases: aliasesForRoute('assistant'),
  }),
  knowledgeBase: Object.freeze({
    target: CANONICAL_ROUTES.knowledgeBase,
    aliases: aliasesForRoute('knowledgeBase'),
  }),
  marketplace: Object.freeze({
    target: CANONICAL_ROUTES.marketplace,
    aliases: aliasesForRoute('marketplace'),
  }),
  enterpriseReadiness: Object.freeze({
    target: CANONICAL_ROUTES.enterpriseReadiness,
    aliases: aliasesForRoute('enterpriseReadiness'),
  }),
  trackMindMaturity: Object.freeze({
    target: CANONICAL_ROUTES.trackMindMaturity,
    aliases: aliasesForRoute('trackMindMaturity'),
  }),
  enterprisePlatform: Object.freeze({
    target: CANONICAL_ROUTES.enterprisePlatform,
    aliases: aliasesForRoute('enterprisePlatform'),
  }),
  platformIntelligence: Object.freeze({
    target: CANONICAL_ROUTES.platformIntelligence,
    aliases: aliasesForRoute('platformIntelligence'),
  }),
  platformAdmin: Object.freeze({
    target: CANONICAL_ROUTES.platformAdmin,
    aliases: aliasesForRoute('platformAdmin'),
  }),
  tools: Object.freeze({
    target: CANONICAL_ROUTES.emergencyTools,
    aliases: aliasesForRoute('tools'),
  }),
  calculators: Object.freeze({
    target: CANONICAL_ROUTES.emergencyTools,
    aliases: aliasesForRoute('calculators'),
  }),
  simulation: Object.freeze({
    target: CANONICAL_ROUTES.simulation,
    aliases: aliasesForRoute('simulation'),
  }),
  laboratory: Object.freeze({
    target: CANONICAL_ROUTES.laboratory,
    aliases: aliasesForRoute('laboratory'),
  }),
  medical3dViewer: Object.freeze({
    target: CANONICAL_ROUTES.medical3dViewer,
    aliases: aliasesForRoute('medical3dViewer'),
  }),
  liveMap: Object.freeze({ target: CANONICAL_ROUTES.liveMap, aliases: aliasesForRoute('liveMap') }),
  fleetMap: Object.freeze({
    target: CANONICAL_ROUTES.fleetMap,
    aliases: aliasesForRoute('fleetMap'),
  }),
  operations: Object.freeze({
    target: CANONICAL_ROUTES.emergencyQueues,
    aliases: aliasesForRoute('operations'),
  }),
  audit: Object.freeze({ target: CANONICAL_ROUTES.audit, aliases: aliasesForRoute('audit') }),
  assetPacks: Object.freeze({
    target: CANONICAL_ROUTES.assetPacks,
    aliases: aliasesForRoute('assetPacks'),
  }),
  organizationPacks: Object.freeze({
    target: CANONICAL_ROUTES.organizationPacks,
    aliases: aliasesForRoute('organizationPacks'),
  }),
});

export function getRouteAliasTarget(pathname) {
  return ROUTE_ALIAS_REDIRECTS.find((entry) => entry.path === pathname)?.to || null;
}
