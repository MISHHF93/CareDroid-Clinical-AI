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
  notifications: '/notifications',
  timeline: '/timeline',
  workflows: '/workflows',
  search: '/search',
  developerCatalog: '/tools/catalog',
  systemHealth: '/system-health',
  aiGovernance: '/ai-governance',
  security: '/security',
  audit: '/audit',
  regulatory: '/regulatory',
  humanReview: '/human-review',
  assets: '/assets',
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

export const ROUTE_ALIAS_GROUPS = Object.freeze({
  auth: Object.freeze({ target: CANONICAL_ROUTES.auth, aliases: AUTH_PATH_ALIASES }),
  assistant: Object.freeze({
    target: CANONICAL_ROUTES.assistant,
    aliases: ASSISTANT_ROUTE_ALIASES,
  }),
  tools: Object.freeze({ target: CANONICAL_ROUTES.tools, aliases: TOOLS_ROUTE_ALIASES }),
  calculators: Object.freeze({
    target: CANONICAL_ROUTES.calculators,
    aliases: CALCULATORS_ROUTE_ALIASES,
  }),
  simulation: Object.freeze({
    target: CANONICAL_ROUTES.simulation,
    aliases: SIMULATION_ROUTE_ALIASES,
  }),
  laboratory: Object.freeze({
    target: CANONICAL_ROUTES.laboratory,
    aliases: LABORATORY_ROUTE_ALIASES,
  }),
  medical3dViewer: Object.freeze({
    target: CANONICAL_ROUTES.medical3dViewer,
    aliases: MEDICAL_3D_VIEWER_ROUTE_ALIASES,
  }),
  liveMap: Object.freeze({ target: CANONICAL_ROUTES.liveMap, aliases: LIVE_MAP_ROUTE_ALIASES }),
  fleetMap: Object.freeze({ target: CANONICAL_ROUTES.fleetMap, aliases: FLEET_MAP_ROUTE_ALIASES }),
  operations: Object.freeze({
    target: CANONICAL_ROUTES.operations,
    aliases: OPERATIONS_ROUTE_ALIASES,
  }),
  audit: Object.freeze({ target: CANONICAL_ROUTES.audit, aliases: AUDIT_ROUTE_ALIASES }),
});

export function getRouteAliasTarget(pathname) {
  for (const group of Object.values(ROUTE_ALIAS_GROUPS)) {
    if (group.aliases.includes(pathname)) return group.target;
  }
  return null;
}
