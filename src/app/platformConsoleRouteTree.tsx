import type { ComponentType, ReactNode } from 'react';
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { PLATFORM_CONSOLE_ROUTES } from '../config/platformConsoleRoutes';

const lazyRoute = lazyWithRetry;
const lazyNamed = (loader: () => Promise<Record<string, unknown>>, exportName: string) =>
  lazyRoute(() => loader().then((module) => ({ default: module[exportName] as ComponentType<unknown> })));

const ClinicalDecisionSupportPage = lazyRoute(() => import('../pages/clinical/ClinicalDecisionSupport'));
const ResearchEvidenceHubPage = lazyRoute(() => import('../pages/clinical/ResearchEvidenceHub'));
const ClinicalKnowledgeGraphPage = lazyRoute(() => import('../pages/clinical/ClinicalKnowledgeGraph'));
const ArtifactsPage = lazyRoute(() => import('../pages/governance/Artifacts'));
const MemoryDashboardPage = lazyRoute(() => import('../pages/ai/MemoryDashboard'));
const CostAnalyticsDashboardPage = lazyRoute(() => import('../pages/ai/CostAnalyticsDashboard'));
const AiEvaluationDashboardPage = lazyRoute(() => import('../pages/ai/AiEvaluationDashboard'));
const LaboratoryDashboardPage = lazyRoute(() => import('../pages/clinical/LaboratoryDashboard'));
const Medical3DViewerPage = lazyRoute(() => import('../pages/clinical/Medical3DViewer'));
const AnalyticsDashboardPage = lazyRoute(() => import('../pages/analytics/AnalyticsDashboard'));
const GovernanceRegistryPage = lazyRoute(() => import('../pages/governance/GovernanceRegistry'));
const CapabilityDiscoveryPage = lazyRoute(() => import('../pages/saas/CapabilityDiscovery'));
const PluginMarketplacePage = lazyRoute(() => import('../pages/saas/PluginMarketplace'));
const FeatureFlagCenterPage = lazyRoute(() => import('../pages/saas/FeatureFlagCenter'));
const DependencyMapPage = lazyRoute(() => import('../pages/governance/DependencyMap'));
const DependencyGraphPage = lazyRoute(() => import('../pages/governance/DependencyGraph'));
const DataLineageExplorerPage = lazyRoute(() => import('../pages/governance/DataLineageExplorer'));
const PlatformSelfDiagnosticsPage = lazyRoute(() => import('../pages/platform/PlatformSelfDiagnostics'));

const DepartmentIntelligencePage = lazyNamed(
  () => import('../pages/platform/DepartmentIntelligence'),
  'DepartmentIntelligencePage',
);
const OrganizationIntelligenceProfilePage = lazyNamed(
  () => import('../pages/organization/OrganizationPages'),
  'OrganizationIntelligenceProfile',
);
const PackMarketplacePage = lazyNamed(
  () => import('../pages/organization/OrganizationPages'),
  'PackMarketplace',
);
const DepartmentsPageComponent = lazyNamed(
  () => import('../pages/organization/OrganizationPages'),
  'DepartmentsPage',
);
const ServiceLinesPageComponent = lazyNamed(
  () => import('../pages/organization/OrganizationPages'),
  'ServiceLinesPage',
);
const OrganizationSettingsPage = lazyNamed(
  () => import('../pages/organization/OrganizationPages'),
  'OrganizationSettings',
);
const OrganizationOnboardingPage = lazyRoute(() => import('../pages/organization/OrganizationOnboarding'));
const WorkspaceDependencyGraphPage = lazyNamed(
  () => import('../pages/platform/WorkspaceDependencyGraph'),
  'WorkspaceDependencyGraphPage',
);
const WorkflowMiningEnginePage = lazyNamed(
  () => import('../pages/platform/WorkflowMiningEngine'),
  'WorkflowMiningEnginePage',
);
const WorkflowBuilderPage = lazyNamed(() => import('../pages/platform/WorkflowBuilder'), 'WorkflowBuilderPage');
const HealthcareKnowledgeHubPage = lazyNamed(
  () => import('../pages/platform/HealthcareKnowledgeHub'),
  'HealthcareKnowledgeHubPage',
);
const ProductIntelligenceLayerPage = lazyNamed(
  () => import('../pages/commercial/ProductIntelligence'),
  'ProductIntelligenceLayerPage',
);
const CustomerExpansionOpportunitiesPage = lazyNamed(
  () => import('../pages/commercial/ExpansionOpportunities'),
  'CustomerExpansionOpportunitiesPage',
);
const MaturityAssessmentPage = lazyNamed(
  () => import('../pages/commercial/MaturityAssessment'),
  'MaturityAssessmentPage',
);
const CareDroidBusinessBrainPage = lazyNamed(
  () => import('../pages/platform/BusinessBrain'),
  'CareDroidBusinessBrainPage',
);

const PLATFORM_CONSOLE_PAGE_COMPONENTS = Object.freeze({
  clinicalDecisionSupport: ClinicalDecisionSupportPage,
  researchEvidenceHub: ResearchEvidenceHubPage,
  clinicalKnowledgeGraph: ClinicalKnowledgeGraphPage,
  artifacts: ArtifactsPage,
  businessBrain: CareDroidBusinessBrainPage,
  memoryDashboard: MemoryDashboardPage,
  costAnalyticsDashboard: CostAnalyticsDashboardPage,
  aiEvaluationDashboard: AiEvaluationDashboardPage,
  laboratoryDashboard: LaboratoryDashboardPage,
  medical3dViewer: Medical3DViewerPage,
  analyticsDashboard: AnalyticsDashboardPage,
  governanceRegistry: GovernanceRegistryPage,
  capabilityDiscovery: CapabilityDiscoveryPage,
  pluginMarketplace: PluginMarketplacePage,
  featureFlagCenter: FeatureFlagCenterPage,
  dependencyMap: DependencyMapPage,
  dependencyGraph: DependencyGraphPage,
  dataLineageExplorer: DataLineageExplorerPage,
  platformSelfDiagnostics: PlatformSelfDiagnosticsPage,
  departmentIntelligence: DepartmentIntelligencePage,
  organizationIntelligence: OrganizationIntelligenceProfilePage,
  assetPacks: PackMarketplacePage,
  departments: DepartmentsPageComponent,
  serviceLines: ServiceLinesPageComponent,
  organizationSettings: OrganizationSettingsPage,
  organizationOnboarding: OrganizationOnboardingPage,
  workspaceDependencyGraph: WorkspaceDependencyGraphPage,
  workflowMining: WorkflowMiningEnginePage,
  workflowBuilder: WorkflowBuilderPage,
  healthcareKnowledgeHub: HealthcareKnowledgeHubPage,
  productIntelligence: ProductIntelligenceLayerPage,
  expansionOpportunities: CustomerExpansionOpportunitiesPage,
  maturityAssessment: MaturityAssessmentPage,
} as const);

type LazyRouteProps = {
  children: ReactNode;
  label: string;
};

export function renderPlatformConsoleRoutes(LazyRoute: ComponentType<LazyRouteProps>) {
  return (
    <>
      {PLATFORM_CONSOLE_ROUTES.map((route) => {
        const Page =
          PLATFORM_CONSOLE_PAGE_COMPONENTS[
            route.componentKey as keyof typeof PLATFORM_CONSOLE_PAGE_COMPONENTS
          ];
        return (
          <Route
            key={route.path}
            path={route.path}
            element={
              <LazyRoute label={`Loading ${route.label}...`}>
                <Page />
              </LazyRoute>
            }
          />
        );
      })}
    </>
  );
}