/**
 * Canonical route and alias configuration.
 *
 * React Router still owns rendering in `App.jsx`; this module owns stable paths
 * and redirect aliases so route consumers do not define competing maps.
 */

export const CANONICAL_ROUTES = Object.freeze({
  auth: '/auth',
  authCallback: '/auth-callback',
  dashboard: '/dashboard',
  discover: '/discover',
  automation: '/automation',
  assistant: '/assistant',
  tools: '/tools',
  operations: '/operations',
  operationsCenter: '/operations-center',
  calculators: '/tools/calculators',
  calculatorDetail: '/tools/calculators/:slug',
  protocols: '/protocols',
  research: '/research',
  documentation: '/documentation',
  knowledgeGraph: '/knowledge-graph',
  predictiveAnalytics: '/predictive-analytics',
  clinicalDecisionSupport: '/clinical-decision-support',
  competencies: '/competencies',
  credentials: '/credentials',
  simulation: '/simulation',
  simulationOutcomes: '/simulation/outcomes',
  laboratory: '/laboratory',
  medical3dViewer: '/3d-viewer',
  liveMap: '/live-map',
  hospitalMap: '/hospital-map',
  medicalIot: '/medical-iot',
  devices: '/devices',
  fleetCommand: '/fleet/command',
  fleetMap: '/fleet/map',
  digitalTwin: '/digital-twin',
  profile: '/profile',
  profileSettings: '/profile/settings',
  profileToolPreferences: '/profile/tool-preferences',
  settings: '/settings',
  billing: '/billing',
  usage: '/usage',
  notifications: '/notifications',
  timeline: '/timeline',
  workflows: '/workflows',
  search: '/search',
  developerCatalog: '/tools/catalog',
  plugins: '/plugins',
  featureFlags: '/feature-flags',
  dependencyMap: '/dependency-map',
  dataLineage: '/data-lineage',
  selfDiagnostics: '/self-diagnostics',
  systemHealth: '/system-health',
  aiGovernance: '/ai-governance',
  security: '/security',
  audit: '/audit',
  regulatory: '/regulatory',
  humanReview: '/human-review',
  assets: '/assets',
  organization: '/organization',
  organizationSettings: '/settings/organization',
  organizationPacks: '/settings/organization/packs',
  organizationAssets: '/settings/organization/assets',
  platformAnalytics: '/platform-analytics',
  products: '/products',
  assetPacks: '/asset-packs',
  plans: '/plans',
  specialties: '/specialties',
  carePathways: '/care-pathways',
  agents: '/agents',
  maturityAssessment: '/maturity-assessment',
  outcomes: '/outcomes',
  integrationsMarketplace: '/integrations-marketplace',
  configurationStudio: '/configuration-studio',
  welcome: '/welcome',
  onboarding: '/onboarding',
});

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

export const ASSISTANT_ROUTE_ALIASES = Object.freeze(['/chat', '/ai', '/copilot']);
export const TOOLS_ROUTE_ALIASES = Object.freeze(['/all-tools', '/clinical-tools', '/catalog']);
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
export const OPERATIONS_ROUTE_ALIASES = Object.freeze([]);
export const AUDIT_ROUTE_ALIASES = Object.freeze(['/audit-logs']);
export const HOME_ROUTE_ALIASES = Object.freeze(['/home']);
export const ORGANIZATION_PACKS_ROUTE_ALIASES = Object.freeze([]);

export const ROUTE_RECORDS = Object.freeze([
  Object.freeze({
    id: 'auth',
    path: CANONICAL_ROUTES.auth,
    layout: 'auth',
    auth: 'publicOnly',
    status: 'active',
    aliases: AUTH_PATH_ALIASES,
    navGroup: 'auth',
  }),
  Object.freeze({
    id: 'dashboard',
    path: CANONICAL_ROUTES.dashboard,
    componentKey: 'CommandDashboard',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: HOME_ROUTE_ALIASES,
    navGroup: 'primary',
  }),
  Object.freeze({
    id: 'assistant',
    path: CANONICAL_ROUTES.assistant,
    componentKey: 'AssistantPage',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: ASSISTANT_ROUTE_ALIASES,
    navGroup: 'primary',
  }),
  Object.freeze({
    id: 'tools',
    path: CANONICAL_ROUTES.tools,
    componentKey: 'ToolsOverview',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: TOOLS_ROUTE_ALIASES,
    matchPrefixes: ['/tools/'],
    navGroup: 'primary',
  }),
  Object.freeze({
    id: 'calculators',
    path: CANONICAL_ROUTES.calculators,
    componentKey: 'Calculators',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: CALCULATORS_ROUTE_ALIASES,
    matchPrefixes: ['/tools/calculators/'],
    navGroup: 'tools',
  }),
  Object.freeze({
    id: 'operations',
    path: CANONICAL_ROUTES.operations,
    componentKey: 'Operations',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: OPERATIONS_ROUTE_ALIASES,
    matchPrefixes: ['/operations/'],
    navGroup: 'primary',
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
    navGroup: 'tools',
  }),
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
    path: CANONICAL_ROUTES.liveMap,
    componentKey: 'LiveTrackingMap',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: LIVE_MAP_ROUTE_ALIASES,
    navGroup: 'operations',
  }),
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
    componentKey: 'AssetPacksBuilderPage',
    layout: 'app',
    auth: 'required',
    status: 'active',
    aliases: [],
    navGroup: 'products',
    notes: 'Sellable asset pack builder and product mapping view.',
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
    aliases: [],
    navGroup: 'secondary',
    notes: 'Workflow route kept distinct while /automation merge decision remains pending.',
  }),
]);

export const ROUTE_RECORDS_BY_ID = Object.freeze(
  Object.fromEntries(ROUTE_RECORDS.map((record) => [record.id, record]))
);

export const ROUTE_ALIAS_REDIRECTS = Object.freeze(
  ROUTE_RECORDS.flatMap((record) =>
    (record.aliases || []).map((path) =>
      Object.freeze({
        path,
        to: record.path,
        routeId: record.id,
        auth: record.auth,
      })
    )
  )
);

export const PROTECTED_ROUTE_ALIAS_REDIRECTS = Object.freeze(
  ROUTE_ALIAS_REDIRECTS.filter((entry) => entry.auth === 'required')
);

function aliasesForRoute(id) {
  return ROUTE_RECORDS_BY_ID[id]?.aliases || Object.freeze([]);
}

export const ROUTE_ALIAS_GROUPS = Object.freeze({
  auth: Object.freeze({ target: CANONICAL_ROUTES.auth, aliases: aliasesForRoute('auth') }),
  dashboard: Object.freeze({
    target: CANONICAL_ROUTES.dashboard,
    aliases: aliasesForRoute('dashboard'),
  }),
  assistant: Object.freeze({
    target: CANONICAL_ROUTES.assistant,
    aliases: aliasesForRoute('assistant'),
  }),
  tools: Object.freeze({ target: CANONICAL_ROUTES.tools, aliases: aliasesForRoute('tools') }),
  calculators: Object.freeze({
    target: CANONICAL_ROUTES.calculators,
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
  fleetMap: Object.freeze({ target: CANONICAL_ROUTES.fleetMap, aliases: aliasesForRoute('fleetMap') }),
  operations: Object.freeze({
    target: CANONICAL_ROUTES.operations,
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
