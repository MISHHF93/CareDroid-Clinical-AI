import { CANONICAL_ROUTES } from './routes.config';

export type GovernanceWorkspaceRoute = {
  path: string;
  label: string;
  guarded?: boolean;
};

/** In-shell governance workspace routes (replace inline router mounts). */
export const GOVERNANCE_WORKSPACE_ROUTES = Object.freeze<GovernanceWorkspaceRoute[]>([
  { path: CANONICAL_ROUTES.audit, label: 'Audit trail spine', guarded: true },
  { path: '/audit/*', label: 'Audit trail spine', guarded: true },
  { path: CANONICAL_ROUTES.security, label: 'LLM security dashboard' },
  { path: CANONICAL_ROUTES.regulatory, label: 'Regulatory classification' },
  { path: '/regulatory/*', label: 'Regulatory classification' },
  { path: CANONICAL_ROUTES.aiGovernance, label: 'AI governance center' },
  { path: '/ai-governance/*', label: 'AI governance center' },
  { path: CANONICAL_ROUTES.humanReview, label: 'Human review queue' },
  { path: '/human-review/*', label: 'Human review queue' },
  { path: '/equity', label: 'Equity monitoring' },
  { path: '/equity/*', label: 'Equity monitoring' },
  { path: '/privacy', label: 'Privacy center' },
  { path: '/privacy/*', label: 'Privacy center' },
  { path: '/integrations', label: 'FHIR + HL7 integration' },
  { path: '/integrations/fhir', label: 'FHIR integration' },
  { path: '/integrations/hl7', label: 'HL7 integration' },
  { path: '/integrations/source-provenance', label: 'Source provenance' },
  { path: '/governance', label: 'Clinical governance' },
  { path: '/governance/*', label: 'Clinical governance' },
  { path: '/review', label: 'Human review queue' },
  { path: '/review/*', label: 'Human review queue' },
  { path: '/operations/observability', label: 'Deployment observability' },
  { path: '/operations/observability/*', label: 'Deployment observability' },
  { path: '/operations/incidents', label: 'Operations incident center' },
  { path: '/operations/incidents/*', label: 'Operations incident center' },
  { path: CANONICAL_ROUTES.systemHealth, label: 'Deployment observability' },
  { path: '/system-health/*', label: 'Deployment observability' },
]);

export const GOVERNANCE_CONSOLE_ROUTE_PATHS = Object.freeze(
  GOVERNANCE_WORKSPACE_ROUTES.map((route) => route.path),
);

const GOVERNANCE_WORKSPACE_PREFIXES = Object.freeze([
  '/governance/',
  '/audit/',
  '/ai-governance/',
  '/human-review/',
  '/equity/',
  '/privacy/',
  '/integrations/fhir',
  '/integrations/hl7',
  '/integrations/source-provenance',
  '/review/',
  '/operations/observability/',
  '/operations/incidents/',
  '/regulatory/',
  '/system-health/',
]);

const GOVERNANCE_WORKSPACE_EXACT_PATHS = new Set(
  GOVERNANCE_WORKSPACE_ROUTES.map((route) => route.path.replace(/\/\*$/, '')),
);

export function isGovernanceWorkspacePath(pathname: string) {
  const normalized = String(pathname || '/').replace(/\/+$/, '') || '/';
  if (GOVERNANCE_WORKSPACE_EXACT_PATHS.has(normalized)) return true;
  return GOVERNANCE_WORKSPACE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}
