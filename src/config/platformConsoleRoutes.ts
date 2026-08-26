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
  ...platformRoutes(CANONICAL_ROUTES.pharmacy, 'Pharmacy Dashboard', 'pharmacyDashboard', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.radiology, 'Radiology Dashboard', 'radiologyDashboard', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.education, 'Education Hub', 'educationHub', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.cardiology, 'Cardiology Dashboard', 'cardiologyDashboard', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.nephrology, 'Nephrology Dashboard', 'nephrologyDashboard', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.neurologyDept, 'Neurology Dashboard', 'neurologyDashboardDept', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.gastroenterology, 'Gastroenterology Dashboard', 'gastroenterologyDashboard', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.endocrinology, 'Endocrinology Dashboard', 'endocrinologyDashboard', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.pediatricsObgyn, 'Pediatrics & OB/GYN Dashboard', 'pediatricsObgynDashboard', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.psychiatryDept, 'Psychiatry Dashboard', 'psychiatryDashboardDept', { wildcard: true }),
  ...platformRoutes(CANONICAL_ROUTES.pulmonology, 'Pulmonology Dashboard', 'pulmonologyDashboard', { wildcard: true }),
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
  { path: CANONICAL_ROUTES.organization, label: 'Organization dashboard', componentKey: 'organizationDashboard' },
  { path: CANONICAL_ROUTES.onboarding, label: 'Organization onboarding', componentKey: 'organizationOnboarding' },
  // HEAL-080: full standalone dashboards orphaned by the Hospital Command
  // Center's condensed intelligence-lens consolidation (HEAL-022). The lens
  // views remain the default/primary experience; these give the fuller
  // original content a real, reachable path again rather than deleting it.
  {
    path: CANONICAL_ROUTES.executiveDashboard,
    label: 'Executive command center (full)',
    componentKey: 'executiveDashboard',
  },
  {
    path: CANONICAL_ROUTES.operationsCommandDashboard,
    label: 'Operations command dashboard',
    componentKey: 'operationsCommandDashboard',
  },
  {
    path: CANONICAL_ROUTES.aiOperationsDashboard,
    label: 'AI operations dashboard (full)',
    componentKey: 'aiOperationsDashboard',
  },
  {
    path: CANONICAL_ROUTES.predictiveAnalyticsDashboard,
    label: 'Predictive analytics dashboard (full)',
    componentKey: 'predictiveAnalyticsDashboard',
  },
  // HEAL-080 continuation: HEAL-025's remaining 3 orphaned OrganizationPages.tsx
  // exports (OrganizationDashboard was already restored separately by
  // HEAL-065's /organization fix). CustomerSuccessDashboard gets a new path
  // distinct from /customer-success and /success-center, which stay
  // redirected to TenantAdministrationCenter -- existing redirect behavior
  // untouched.
  {
    path: CANONICAL_ROUTES.assetLifecycleAdmin,
    label: 'Asset lifecycle admin',
    componentKey: 'assetLifecycleAdmin',
  },
  {
    path: CANONICAL_ROUTES.organizationAnalytics,
    label: 'Organization analytics',
    componentKey: 'organizationAnalytics',
  },
  {
    path: CANONICAL_ROUTES.customerSuccessDashboard,
    label: 'Customer success dashboard',
    componentKey: 'customerSuccessDashboard',
  },
  // HEAL-029/HEAL-080: previously had zero route (the only prior "path" was
  // a plugin-registry doc comment labeling it a "future" slot at /tools/catalog,
  // which never actually worked -- that path falls through to the /tools/*
  // catch-all). Given a real, distinct path outside the /tools/* namespace to
  // avoid touching that existing catch-all's routing logic.
  {
    path: CANONICAL_ROUTES.clinicalToolCatalog,
    label: 'Clinical tool catalog',
    componentKey: 'clinicalToolCatalog',
  },
]);

export const PLATFORM_CONSOLE_ROUTE_PATHS = Object.freeze(
  PLATFORM_CONSOLE_ROUTES.map((route) => route.path),
);

