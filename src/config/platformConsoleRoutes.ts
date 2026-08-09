import { CANONICAL_ROUTES } from './routes.config';

export type PlatformConsoleRoute = {
  path: string;
  label: string;
  componentKey: string;
};

function platformRoutes(
  path: string,
  label: string,
  componentKey: string,
  options?: { wildcard?: boolean },
): PlatformConsoleRoute[] {
  const routes: PlatformConsoleRoute[] = [{ path, label, componentKey }];
  if (options?.wildcard) {
    routes.push({ path: `${path}/*`, label, componentKey });
  }
  return routes;
}

/** In-shell platform pages (clinical intel, SaaS, and platform intelligence surfaces). */
export const PLATFORM_CONSOLE_ROUTES = Object.freeze<PlatformConsoleRoute[]>([
  { path: CANONICAL_ROUTES.clinicalDecisionSupport, label: 'Clinical decision support', componentKey: 'clinicalDecisionSupport' },
  { path: CANONICAL_ROUTES.research, label: 'Research hub', componentKey: 'researchEvidenceHub' },
  { path: CANONICAL_ROUTES.knowledgeGraph, label: 'Knowledge graph', componentKey: 'clinicalKnowledgeGraph' },
  ...platformRoutes(CANONICAL_ROUTES.artifacts, 'Artifacts', 'artifacts', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.businessBrain, 'Business brain', 'businessBrain', { wildcard: true }),
  { path: CANONICAL_ROUTES.memory, label: 'Memory dashboard', componentKey: 'memoryDashboard' },
  { path: CANONICAL_ROUTES.costs, label: 'Cost analytics', componentKey: 'costAnalyticsDashboard' },
  { path: CANONICAL_ROUTES.aiEvaluation, label: 'AI evaluation lab', componentKey: 'aiEvaluationDashboard' },
  ...platformRoutes(CANONICAL_ROUTES.laboratory, 'Laboratory Dashboard', 'laboratoryDashboard', { wildcard: true }),
  { path: CANONICAL_ROUTES.medical3dViewer, label: '3D Anatomy Viewer', componentKey: 'medical3dViewer' },
  ...platformRoutes(CANONICAL_ROUTES.platformAnalytics, 'Platform analytics', 'analyticsDashboard', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.governanceRegistry, 'Governance registry', 'governanceRegistry', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.discover, 'Capability discovery', 'capabilityDiscovery', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.plugins, 'Plugin marketplace', 'pluginMarketplace', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.featureFlags, 'Feature flag center', 'featureFlagCenter', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.dependencyMap, 'Dependency map', 'dependencyMap', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.dependencyGraph, 'Dependency graph', 'dependencyGraph', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.dataLineage, 'Data lineage explorer', 'dataLineageExplorer', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.selfDiagnostics, 'Platform self-diagnostics', 'platformSelfDiagnostics', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.departmentIntelligence, 'Department intelligence', 'departmentIntelligence', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.organizationIntelligence, 'Organization intelligence', 'organizationIntelligence', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.workspaceDependencyGraph, 'Workspace dependency graph', 'workspaceDependencyGraph', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.workflowMining, 'Workflow mining', 'workflowMining', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.workflows, 'Workflows', 'workflowBuilder', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.knowledgeHub, 'Knowledge hub', 'healthcareKnowledgeHub', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.productIntelligence, 'Product intelligence', 'productIntelligence', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.expansionOpportunities, 'Expansion opportunities', 'expansionOpportunities', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.maturityAssessment, 'Maturity assessment', 'maturityAssessment', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.assetPacks, 'Asset pack marketplace', 'assetPacks', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.departments, 'Departments', 'departments', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.serviceLines, 'Service lines', 'serviceLines', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.organizationSettings, 'Organization settings', 'organizationSettings', { wildcard: true }),
]);

export const PLATFORM_CONSOLE_ROUTE_PATHS = Object.freeze(
  PLATFORM_CONSOLE_ROUTES.map((route) => route.path),
);

