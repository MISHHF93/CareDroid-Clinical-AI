/**
 * Route page smoke — major paths render non-empty content without crashing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import Calculators from '../pages/tools/Calculators';
import ToolsOverview from '../pages/tools/ToolsOverview';
import FleetDashboard from '../pages/fleet/FleetDashboard';
import RouteOptimizer from '../pages/fleet/RouteOptimizer';
import PredictiveMaintenance from '../pages/fleet/PredictiveMaintenance';
import AmbientScribe from '../pages/tools/AmbientScribe';
import CalculatorRecommender from '../pages/tools/CalculatorRecommender';
import GuidelineRag from '../pages/tools/GuidelineRag';
import DifferentialAi from '../pages/tools/DifferentialAi';
import TimelineAi from '../pages/tools/TimelineAi';
import PatientSummaryAi from '../pages/tools/PatientSummaryAi';
import OrderSetAi from '../pages/tools/OrderSetAi';
import AiExplainability from '../pages/tools/AiExplainability';
import ClinicalAudit from '../pages/tools/ClinicalAudit';
import Protocols from '../pages/tools/Protocols';
import Artifacts from '../pages/governance/Artifacts';
import MemoryDashboard from '../pages/ai/MemoryDashboard';
import TrainingDashboard from '../pages/training/TrainingDashboard';
import AnalyticsDashboard from '../pages/analytics/AnalyticsDashboard';
import FeatureFlagCenter from '../pages/saas/FeatureFlagCenter';
import PluginMarketplace from '../pages/saas/PluginMarketplace';
import DependencyMap from '../pages/governance/DependencyMap';
import DependencyGraph from '../pages/governance/DependencyGraph';
import DataLineageExplorer from '../pages/governance/DataLineageExplorer';
import GovernanceRegistry from '../pages/governance/GovernanceRegistry';
import PlatformSelfDiagnostics from '../pages/platform/PlatformSelfDiagnostics';
import CostAnalyticsDashboard from '../pages/ai/CostAnalyticsDashboard';
import AiEvaluationDashboard from '../pages/ai/AiEvaluationDashboard';
import AiCommandCenterDashboard from '../pages/ai/AiCommandCenterDashboard';
import PlatformSystemPage from '../pages/platform/PlatformSystemPage';
import PlatformGovernanceWorkspace from '../pages/platform/PlatformGovernanceWorkspace';
import SystemHealth from '../pages/SystemHealth';
import SaasHealthCenter from '../pages/saas/SaasHealthCenter';
import CommandDashboard from '../pages/executive/CommandDashboard';
import ExecutiveCommandCenter from '../pages/executive/ExecutiveCommandCenter';
import CapabilityDiscovery from '../pages/saas/CapabilityDiscovery';
import Operations from '../pages/operations/Operations';
import ResearchEvidenceHub from '../pages/clinical/ResearchEvidenceHub';
import ClinicalDocumentationAssistant from '../pages/ClinicalDocumentationAssistant';
import ClinicalKnowledgeGraph from '../pages/clinical/ClinicalKnowledgeGraph';
import PredictiveAnalyticsDashboard from '../pages/analytics/PredictiveAnalyticsDashboard';
import ClinicalDecisionSupport from '../pages/clinical/ClinicalDecisionSupport';
import Competencies from '../pages/training/Competencies';
import Credentials from '../pages/training/Credentials';
import MedicalSimulationSuite from '../pages/training/MedicalSimulationSuite';
import SimulationScenarioPlayer from '../pages/training/SimulationScenarioPlayer';
import SimulationOutcomes from '../pages/training/SimulationOutcomes';
import LaboratoryDashboard from '../pages/clinical/LaboratoryDashboard';
import Medical3DViewer from '../pages/clinical/Medical3DViewer';
import LiveTrackingMap from '../pages/operations/LiveTrackingMap';
import HospitalMapDashboard from '../pages/operations/HospitalMapDashboard';
import MedicalIotDashboard from '../pages/operations/MedicalIotDashboard';
import DeviceFleetManagement from '../pages/operations/DeviceFleetManagement';
import ClinicalAlertsPage from '../pages/ClinicalAlertsPage';
import FleetLiveMap from '../pages/fleet/FleetLiveMap';
import { OrganizationIntelligenceProfile } from '../pages/organization/OrganizationPages';
import {
  CareDroidBusinessBrainPage,
  DepartmentIntelligencePage,
  HealthcareKnowledgeHubPage,
  WorkflowBuilderPage,
  WorkflowMiningEnginePage,
  WorkspaceDependencyGraphPage,
} from '../pages/platform/PlatformOSPages';
import {
  CustomerExpansionOpportunitiesPage,
  MaturityAssessmentPage,
  ProductIntelligenceLayerPage,
} from '../pages/commercial/CommercialPages';
import { CORE_ROUTE_SMOKE, TIER_A_FORM_SMOKE_SLUGS } from './responsiveRegression.routes';

vi.mock('../pages/tools/Calculators.css', () => ({}));
vi.mock('../pages/tools/ToolPageLayout.css', () => ({}));
import {
  mockCompactViewport,
  mockConversationValue,
  mockToolPreferencesValue,
  mockUserValue,
  mockWorkspaceValue,
  expectNonEmptyPage,
  renderPageWithRouter,
} from './testRenderUtils';

const mockFetchFleetCommandSnapshot = vi.fn();

vi.mock('../contexts/UserContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useUser: () => mockUserValue,
  };
});

vi.mock('../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../contexts/WorkspaceContext', () => ({
  useWorkspace: () => mockWorkspaceValue,
}));

vi.mock('../hooks/useEffectiveUserProfile', () => ({
  default: () => ({ saasRole: 'emergency-physician', emergencyRole: 'physician' }),
}));

vi.mock('../hooks/useEmergencyRolePermissions', () => ({
  useEmergencyRolePermissions: () => ({
    role: 'physician',
    roleLabel: 'Physician',
    canAccessRoute: () => true,
    presentAction: () => ({ visible: true, enabled: true }),
  }),
}));

vi.mock('../hooks/useRouteScreenMode', () => ({
  default: () => 'clinical_workstation',
}));

vi.mock('../contexts/CostTrackingContext', () => ({
  useCostTracking: () => ({
    costData: {
      totalCost: 2.5,
      monthlyCost: 1.25,
      categoryCosts: { 'AI System': 1.25 },
      executions: [
        { id: 'exec-1', toolId: 'ai-gateway', cost: 0.5, timestamp: new Date().toISOString() },
      ],
    },
    costLimit: 10,
    isLoading: false,
    getTopSpendingTools: () => [{ toolId: 'ai-gateway', cost: 1.25, executions: 2 }],
    getCostTrends: () => [{ date: new Date().toISOString(), cost: 1.25 }],
    updateCostLimit: vi.fn(),
    resetCostData: vi.fn(),
    getROIMetrics: () => ({
      timeSavedHours: '2.0',
      valueSaved: '15.00',
      totalCost: '2.50',
      netValue: '12.50',
      roi: '500',
    }),
    isCostLimitApproaching: () => false,
    isCostLimitExceeded: () => false,
  }),
}));

vi.mock('../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    userId: '11111111-1111-4111-8111-111111111111',
    profile: { id: '11111111-1111-4111-8111-111111111111' },
    organization: {
      id: 'org-route-smoke',
      name: 'Route Smoke Hospital',
      organizationType: 'hospital',
      slug: 'route-smoke-hospital',
    },
    entitledPackIds: ['core-platform'],
    platformContext: {
      entitledPackIds: ['core-platform'],
      defaultAiAgentId: 'agent-clinical',
      availablePacks: [{ id: 'core-platform', name: 'Core Platform', assetIds: ['qsofa'] }],
    },
  }),
}));

vi.mock('../hooks/useNotificationActions', () => ({
  useNotificationActions: () => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }),
}));

vi.mock('../services/clinicalToolsApi', () => ({
  fetchBackendClinicalTools: vi.fn().mockResolvedValue({ ok: true, tools: [] }),
  fetchToolExecutorCatalog: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      registeredExecutorToolIds: [],
      aliases: {},
      unsupportedToolIds: [],
    },
  }),
}));

vi.mock('../data/artifactKnowledgeGraph', () => {
  const node = {
    id: 'asset:route-smoke',
    type: 'asset',
    label: 'Route Smoke Asset',
    summary: 'Small artifact graph fixture for route smoke.',
    path: '/artifacts',
    sourceId: 'route-smoke',
    tags: ['smoke'],
  };
  const edge = {
    id: 'asset:route-smoke|BELONGS_TO|pack:core-platform',
    source: 'asset:route-smoke',
    target: 'pack:core-platform',
    type: 'BELONGS_TO',
    rationale: 'Route smoke asset belongs to Core Platform.',
  };
  return {
    ARTIFACT_KNOWLEDGE_GRAPH_NODE_TYPES: [
      'asset',
      'pack',
      'product',
      'workspace',
      'organization',
      'role',
      'route',
      'simulation',
      'workflow',
      'ai-agent',
      'integration',
    ],
    ARTIFACT_KNOWLEDGE_GRAPH_RELATIONSHIPS: [
      'USES',
      'DEPENDS_ON',
      'BELONGS_TO',
      'RECOMMENDED_FOR',
      'SIMILAR_TO',
      'LAUNCHED_FROM',
      'PART_OF',
    ],
    buildKnowledgeGraphAiPrompt: () => 'Open the Clinical Knowledge Graph.',
    createArtifactKnowledgeGraphService: () => ({
      buildSnapshot: () => ({
        nodes: [node],
        edges: [edge],
        visibleNodeCount: 1,
        matchingNodeCount: 1,
        selectedNode: node,
        neighbors: [],
        relationshipRows: [
          {
            ...edge,
            sourceLabel: 'Route Smoke Asset',
            sourceType: 'asset',
            targetLabel: 'Core Platform',
            targetType: 'pack',
          },
        ],
        orphanNodes: [],
        duplicateGroups: [],
        recommendations: [],
        counts: {
          asset: 1,
          pack: 1,
          product: 0,
          workspace: 0,
          organization: 0,
          role: 0,
          route: 0,
          simulation: 0,
          workflow: 0,
          'ai-agent': 0,
          integration: 0,
        },
        relationshipCounts: { BELONGS_TO: 1 },
        summary: { nodes: 2, edges: 1 },
        coverage: {
          connectedAssetIds: ['asset:route-smoke'],
          totalAssets: 1,
          orphanAssetIds: [],
          allAssetsConnected: true,
        },
      }),
    }),
  };
});

vi.mock('../services/platformSystemsApi', () => ({
  fetchPlatformSystemCapability: vi.fn().mockResolvedValue({
    ok: true,
    data: { status: 'demo_available', safety: { reviewRequired: true } },
  }),
  fetchPlatformSystemHub: vi.fn().mockResolvedValue({
    ok: true,
    data: { status: 'demo_available', capabilities: [] },
  }),
  postPlatformSystemContract: vi.fn().mockResolvedValue({
    ok: true,
    data: { status: 'demo_review_required' },
  }),
}));

vi.mock('../services/productCatalogApi', () => ({
  ProductCatalogApi: {
    getAssetDependencyGraph: vi.fn().mockResolvedValue({
      summary: {
        products: 1,
        assetPacks: 1,
        assets: 1,
        routes: 1,
        backendServices: 1,
        integrations: 1,
      },
      issueCounts: {
        'missing-dependency': 0,
        'duplicate-dependency': 0,
        'orphan-asset': 0,
      },
      issues: [],
      chains: [
        {
          id: 'product:pack:asset',
          product: { id: 'product', name: 'Emergency Flow Intelligence Platform' },
          assetPack: { id: 'pack', name: 'Emergency Department Pack' },
          asset: { id: 'asset', title: 'qSOFA', assetType: 'calculator', dependencies: [] },
          route: '/tools/calculators/qsofa',
          backendServices: ['ClinicalTools'],
          integrations: [{ id: 'int-fhir', name: 'FHIR' }],
        },
      ],
    }),
    getMaturityQuestionnaire: vi.fn().mockResolvedValue({
      questions: [
        {
          id: 'digital_maturity',
          question: 'How mature is digital maturity?',
          options: [{ value: 3, label: 'Ready' }],
        },
      ],
    }),
    submitMaturityAssessment: vi.fn().mockResolvedValue({
      overallScore: 75,
      dimensions: [{ dimension: 'digital_maturity', score: 75 }],
      recommendedProducts: [],
    }),
  },
}));

vi.mock('../services/platformAssetsApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    PlatformAssetsApi: {
      ...actual.PlatformAssetsApi,
      getGovernanceRegistry: vi.fn().mockResolvedValue({
        generatedAt: '2026-06-06T13:30:00.000Z',
        summary: {
          totalAssets: 1,
          complete: 1,
          incomplete: 0,
          auditRequired: 1,
          humanReviewRequired: 1,
          byRiskLevel: { 'clinical-decision-support': 1 },
        },
        requiredFields: [
          'owner',
          'steward',
          'approver',
          'riskLevel',
          'evidenceSource',
          'version',
          'auditRequirement',
          'reviewSchedule',
        ],
        rows: [
          {
            assetId: 'qsofa',
            title: 'qSOFA',
            route: '/tools/calculators/qsofa',
            owner: 'ED Director',
            steward: 'Emergency Medicine Steward',
            approver: 'Clinical Governance Lead',
            riskLevel: 'clinical-decision-support',
            evidenceSource: 'validated protocol library',
            version: '2.1.0',
            auditRequirement: 'required',
            reviewSchedule: 'quarterly',
          },
        ],
      }),
      getOrganizationAnalytics: vi.fn().mockResolvedValue({
        enabledPackIds: ['core-platform'],
        dashboards: {
          adoption: {
            enabledPackCount: 1,
            enabledAssetCount: 1,
            totalAssetCount: 4,
            adoptionScore: 25,
          },
          engagement: {
            aiUsageCount: 0,
            simulationCompletionCount: 0,
            dashboardEngagementCount: 0,
          },
          underusedAssets: [{ id: 'qsofa', label: 'qSOFA', count: 0 }],
          topAssets: [{ id: 'qsofa', label: 'qSOFA', count: 3 }],
        },
        dimensions: {
          assetUsage: [{ id: 'qsofa', label: 'qSOFA', count: 3 }],
          workspaceUsage: [{ id: 'emergency', label: 'Emergency', count: 3 }],
          aiUsage: [],
        },
      }),
      getCustomerSuccessDashboard: vi.fn().mockResolvedValue({
        health: { score: 50, status: 'watch', retentionRisk: 'medium' },
        metrics: {
          adoption: { value: 25, enabledPackCount: 1, enabledAssetCount: 1, totalAssetCount: 4 },
          activeUsers: { value: 1 },
          assetUsage: { value: 3 },
          aiUsage: { value: 0 },
          simulationsCompleted: { value: 0 },
          workflowsCompleted: { value: 0 },
        },
      }),
      getTenantAdministration: vi.fn().mockResolvedValue({
        profile: { id: 'org-route-smoke', name: 'Route Smoke Hospital', organizationType: 'hospital' },
        departments: ['emergency'],
        workspaces: [{ id: 'emergency', name: 'Emergency', enabledToolIds: ['qsofa'] }],
      }),
      listMarketplacePacks: vi.fn().mockResolvedValue([
        { id: 'core-platform', name: 'Core Platform', assetIds: ['qsofa'] },
      ]),
    },
  };
});

vi.mock('../services/platformGovernanceApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchPlatformGovernanceSurface: vi.fn().mockResolvedValue({
      ok: true,
      sourceStatus: 'demo',
      data: actual.LOCAL_PLATFORM_GOVERNANCE_STATE,
      message: '',
    }),
  };
});

vi.mock('../services/systemHealthService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchDeploymentTruth: vi.fn().mockResolvedValue({
      backendProbe: { ok: true, data: { status: 'ok', version: '1.0.0' }, message: '' },
      systemHealth: {
        ok: true,
        data: {
          apiHealth: 'ok',
          backendVersion: '1.0.0',
          gitCommit: 'unknown',
          buildTimestamp: '2026-05-30T14:00:00.000Z',
          vercelEnvironment: 'test',
          deploymentStatus: 'guarded',
        },
        message: '',
      },
      backendHealth: {
        status: 'ok',
        service: 'CareDroid backend',
        frontendVersion: '1.0.0',
        backendVersion: '1.0.0',
        gitCommit: 'unknown',
        buildTimestamp: '2026-05-30T14:00:00.000Z',
        vercelEnvironment: 'test',
        deploymentStatus: 'guarded',
      },
      sourceStatus: 'live',
      message: '',
    }),
  };
});

vi.mock('../services/saasHealthApi', () => ({
  SAAS_HEALTH_FALLBACK: {
    status: 'critical',
    label: 'Critical',
    summary: { healthy: 0, warning: 0, critical: 7, total: 7 },
    checks: [],
  },
  fetchSaasHealthCenter: vi.fn().mockResolvedValue({
    ok: true,
    message: '',
    data: {
      status: 'warning',
      label: 'Warning',
      generatedAt: '2026-06-06T13:00:00.000Z',
      summary: { healthy: 5, warning: 2, critical: 0, total: 7 },
      checks: [
        {
          id: 'frontend',
          label: 'Frontend Health',
          status: 'healthy',
          displayStatus: 'Healthy',
          summary: 'Frontend build metadata is published.',
          evidence: ['frontendVersion=1.0.0'],
        },
        {
          id: 'backend',
          label: 'Backend Health',
          status: 'healthy',
          displayStatus: 'Healthy',
          summary: 'Backend health endpoint is responding.',
          evidence: ['backendVersion=1.0.0'],
        },
        {
          id: 'api',
          label: 'API Health',
          status: 'healthy',
          displayStatus: 'Healthy',
          summary: 'Authenticated API health contract is available.',
          evidence: ['apiHealth=ok'],
        },
        {
          id: 'integrations',
          label: 'Integrations',
          status: 'warning',
          displayStatus: 'Warning',
          summary: 'Integration layer is guarded by synthetic or demo connectors.',
          evidence: ['externalConnectors=synthetic'],
        },
        {
          id: 'tenant',
          label: 'Tenant Health',
          status: 'healthy',
          displayStatus: 'Healthy',
          summary: 'Tenant context guards are active.',
          evidence: ['tenantGuards=active'],
        },
        {
          id: 'ai',
          label: 'AI Health',
          status: 'warning',
          displayStatus: 'Warning',
          summary: 'AI gateway is guarded.',
          evidence: ['aiGateway=guarded'],
        },
        {
          id: 'simulation',
          label: 'Simulation Health',
          status: 'healthy',
          displayStatus: 'Healthy',
          summary: 'Simulation assets and scenario routes are included.',
          evidence: ['simulationStatus=healthy'],
        },
      ],
    },
  }),
}));

vi.mock('../services/clinicalChatService', () => ({
  sendClinicalChatMessage: vi.fn().mockResolvedValue({ ok: true, message: { content: 'ok' } }),
  mapChatResponseToAssistantMessage: vi.fn(() => ({ role: 'assistant', content: 'ok' })),
  registryIdToChatToolParam: vi.fn(() => null),
}));

vi.mock('../services/analyticsService', () => ({
  default: {
    trackPageView: vi.fn(),
    trackEvent: vi.fn(),
  },
}));

vi.mock('../services/artifactsApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchArtifacts: vi.fn().mockResolvedValue({ ok: true, artifacts: [] }),
    fetchArtifactGraph: vi.fn().mockResolvedValue({ ok: true, nodes: [], edges: [] }),
    fetchArtifactVersions: vi.fn().mockResolvedValue({ ok: true, versions: [] }),
  };
});

vi.mock('../services/memoryApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchMemoryDashboard: vi
      .fn()
      .mockResolvedValue({ ok: true, data: actual.LOCAL_MEMORY_DASHBOARD }),
    persistShortMemory: vi.fn().mockResolvedValue({ ok: true }),
  };
});

vi.mock('../services/trainingApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchTrainingDashboard: vi
      .fn()
      .mockResolvedValue({ ok: true, data: actual.LOCAL_TRAINING_DASHBOARD }),
    fetchMoeTrainingPlan: vi
      .fn()
      .mockResolvedValue({ ok: true, data: actual.LOCAL_MOE_TRAINING_PLAN }),
  };
});

vi.mock('../services/evaluationApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchEvaluationDashboard: vi
      .fn()
      .mockResolvedValue({ ok: true, data: actual.LOCAL_EVALUATION_DASHBOARD }),
  };
});

vi.mock('../services/aiCommandCenterApi', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchAiCommandCenterSnapshot: vi.fn().mockResolvedValue({
      ok: true,
      generatedAt: new Date().toISOString(),
      warnings: [],
      sourceStatus: { evaluation: 'live', memory: 'live', cost: 'live', audit: 'live' },
      health: {
        status: 'healthy',
        label: 'Healthy',
        latencyMs: 800,
        accuracy: 0.93,
        activeExperts: 3,
        failedBenchmarks: 0,
      },
      experts: [],
      ragMetrics: {
        retrievalPrecision: 0.9,
        retrievalLabel: '90%',
        cacheHitRate: 0.5,
        groundedAnswers: 2,
      },
      memoryUsage: {
        shortTerm: 1,
        longTerm: 1,
        clinical: 1,
        recentActivity: 1,
        savedWorkflows: 1,
        total: 3,
      },
      toolUsage: {
        totalRequests: 4,
        routeCounts: {},
        complexityCounts: {},
        successRate: 1,
        successLabel: '100%',
      },
      costMetrics: { totalUsd: 1, averageUsd: 0.1, tokenTotalUsd: 0.5, cacheHitRate: 0.5 },
      hallucinationMetrics: { rate: 0.02, label: '2%', benchmark: '<= 5%' },
      retrievalQuality: { precision: 0.9, label: '90%', trend: [] },
      trends: [],
      auditLogs: [],
    }),
  };
});

vi.mock('../services/clinicalAlertsApi', () => ({
  fetchClinicalAlerts: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      safety: 'Demo clinical alerts for route smoke.',
      alerts: [
        {
          id: 'alert-smoke',
          timestamp: new Date().toISOString(),
          severity: 'critical',
          title: 'Critical SOFA Score',
          description: 'Route smoke alert',
          source: 'SOFA Calculator',
          status: 'unacknowledged',
          findings: ['SOFA Score: 15/24'],
        },
      ],
    },
  }),
  acknowledgeClinicalAlertApi: vi.fn().mockResolvedValue({ ok: true, data: {} }),
}));

vi.mock('../contexts/SystemConfigContext', () => ({
  useSystemConfig: () => ({
    loading: false,
    error: null,
    configDegraded: false,
    isRagEnabled: false,
    availableTools: [],
    refresh: vi.fn(),
  }),
}));

vi.mock('../services/fleetTelemetryService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchFleetCommandSnapshot: (...args) => mockFetchFleetCommandSnapshot(...args),
  };
});

const PAGE_BY_ID = {
  dashboard: CommandDashboard,
  executive: ExecutiveCommandCenter,
  discover: CapabilityDiscovery,
  workflows: WorkflowBuilderPage,
  operations: Operations,
  research: ResearchEvidenceHub,
  documentation: ClinicalDocumentationAssistant,
  'knowledge-graph': ClinicalKnowledgeGraph,
  'predictive-analytics': PredictiveAnalyticsDashboard,
  'clinical-decision-support': ClinicalDecisionSupport,
  protocols: Protocols,
  competencies: Competencies,
  credentials: Credentials,
  simulation: MedicalSimulationSuite,
  'simulation-scenario': SimulationScenarioPlayer,
  'simulation-outcomes': SimulationOutcomes,
  laboratory: LaboratoryDashboard,
  '3d-viewer': Medical3DViewer,
  'live-map': LiveTrackingMap,
  'hospital-map': HospitalMapDashboard,
  'medical-iot': MedicalIotDashboard,
  devices: DeviceFleetManagement,
  'clinical-alerts': ClinicalAlertsPage,
  'tools-overview': ToolsOverview,

  'calculators-library-filter': ToolsOverview,
  'ambient-scribe': AmbientScribe,
  'calculator-recommender-ai': CalculatorRecommender,
  'guideline-rag': GuidelineRag,
  'differential-ai': DifferentialAi,
  'timeline-ai': TimelineAi,
  'patient-summary-ai': PatientSummaryAi,
  'order-set-ai': OrderSetAi,
  'ai-explainability': AiExplainability,
  'clinical-audit': ClinicalAudit,
  artifacts: Artifacts,
  memory: MemoryDashboard,
  training: TrainingDashboard,
  analytics: AnalyticsDashboard,
  'knowledge-hub': HealthcareKnowledgeHubPage,
  'feature-flags': FeatureFlagCenter,
  plugins: PluginMarketplace,
  'dependency-map': DependencyMap,
  'dependency-graph': DependencyGraph,
  'governance-registry-enterprise': GovernanceRegistry,
  'data-lineage': DataLineageExplorer,
  'self-diagnostics': PlatformSelfDiagnostics,
  costs: CostAnalyticsDashboard,
  'ai-evaluation': AiEvaluationDashboard,
  'ai-command-center': AiCommandCenterDashboard,
  'business-brain': CareDroidBusinessBrainPage,
  'integrations-platform': PlatformGovernanceWorkspace,
  'workflow-builder-ai': PlatformSystemPage,
  'patient-workspace-platform': PlatformSystemPage,
  'soap-builder': PlatformSystemPage,
  'governance-platform': PlatformGovernanceWorkspace,
  'ai-governance-center': PlatformGovernanceWorkspace,
  'llm-security-dashboard': PlatformGovernanceWorkspace,
  'regulatory-enterprise': PlatformGovernanceWorkspace,
  'equity-monitoring-enterprise': PlatformGovernanceWorkspace,
  'human-review-enterprise': PlatformGovernanceWorkspace,
  'privacy-enterprise': PlatformGovernanceWorkspace,
  'system-health-enterprise': SystemHealth,
  'saas-health-enterprise': SaasHealthCenter,
  'governance-clinical': PlatformGovernanceWorkspace,
  'ai-security-platform': PlatformGovernanceWorkspace,
  'regulatory-classification': PlatformGovernanceWorkspace,
  'validation-sandbox': PlatformGovernanceWorkspace,
  'human-review-queue': PlatformGovernanceWorkspace,
  'audit-trail-spine': PlatformGovernanceWorkspace,
  'deployment-observability': PlatformGovernanceWorkspace,
  'fleet-live-map': FleetLiveMap,
  'fleet-command': FleetDashboard,
  'fleet-route-optimizer': RouteOptimizer,
  'fleet-predictive-maintenance': PredictiveMaintenance,
  'organization-intelligence': OrganizationIntelligenceProfile,
  'department-intelligence': DepartmentIntelligencePage,
  'workflow-mining': WorkflowMiningEnginePage,
  'workspace-dependency-graph': WorkspaceDependencyGraphPage,
  'product-intelligence': ProductIntelligenceLayerPage,
  'expansion-opportunities': CustomerExpansionOpportunitiesPage,
  'maturity-assessment': MaturityAssessmentPage,
};

const THEME_ROUTE_SMOKE_IDS = new Set([
  'dashboard',
  'tools-overview',
  'fleet-live-map',
  'calculators-library-filter',

  'medical-iot',
  'devices',
  'clinical-alerts',
  'artifacts',
  'memory',
  'training',
  'costs',
  'ai-evaluation',
  'ai-command-center',
  'fleet-command',
  'hospital-map',
]);

const THEME_ROUTE_SMOKE = CORE_ROUTE_SMOKE.filter((route) => THEME_ROUTE_SMOKE_IDS.has(route.id));
const RESPONSIVE_UX_VIEWPORT_WIDTHS = Object.freeze([
  320, 360, 390, 412, 430, 768, 1024, 1280, 1440,
]);
const RESPONSIVE_MATRIX_ROUTE_IDS = new Set([
  'dashboard',
  'tools-overview',
  'fleet-live-map',
  'calculators-library-filter',
  'medical-iot',
  'hospital-map',
  'devices',
  'artifacts',
  'memory',
  'training',
  'costs',
  'ai-evaluation',
  'ai-command-center',
  'fleet-command',
]);
const RESPONSIVE_MATRIX_ROUTES = CORE_ROUTE_SMOKE.filter((route) =>
  RESPONSIVE_MATRIX_ROUTE_IDS.has(route.id)
);

function setViewportWidth(width) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    writable: true,
    value: width >= 768 ? 900 : 740,
  });
  mockCompactViewport(width <= 900);
}

function renderRoute(path, Page) {
  return renderPageWithRouter(
    <Routes>
      <Route path={path} element={<Page />} />
      <Route path="*" element={<Page />} />
    </Routes>,
    { route: path },
  );
}

describe('Route pages smoke — non-empty render', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    Element.prototype.scrollTo = vi.fn();
    mockCompactViewport(false);
    const { buildFleetDashboardSnapshot } =
      await import('../data/testHelpers/fleetToolsTestFixtures');
    mockFetchFleetCommandSnapshot.mockResolvedValue(buildFleetDashboardSnapshot());
  });

  it.each(CORE_ROUTE_SMOKE)(
    '$id at $path renders primary content',
    async (route) => {
      const { id, path, match, heading } = route;
      const Page = PAGE_BY_ID[id];
      const { container } = renderRoute(path, Page);

      if (match === 'composer') {
        expect(await screen.findByPlaceholderText(/ask anything clinical/i)).toBeInTheDocument();
      } else if (match === 'fleet-summary') {
        await waitFor(() => {
          expect(screen.getByRole('heading', { name: /fleet summary/i })).toBeInTheDocument();
        });
      } else {
        expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
      }

      expectNonEmptyPage(container);
    },
    15_000
  );
});

describe('Route pages smoke — light and dark theme render', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    Element.prototype.scrollTo = vi.fn();
    mockCompactViewport(false);
    const { buildFleetDashboardSnapshot } =
      await import('../data/testHelpers/fleetToolsTestFixtures');
    mockFetchFleetCommandSnapshot.mockResolvedValue(buildFleetDashboardSnapshot());
  });

  it.each(['light', 'dark'])(
    'major pages render non-empty content in %s mode',
    async (theme) => {
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;

      for (const route of THEME_ROUTE_SMOKE) {
        const Page = PAGE_BY_ID[route.id];
        const { container, unmount } = renderRoute(route.path, Page);

        if (route.match === 'composer') {
          expect(await screen.findByPlaceholderText(/ask anything clinical/i)).toBeInTheDocument();
        } else if (route.match === 'fleet-summary') {
          await waitFor(() => {
            expect(screen.getByRole('heading', { name: /fleet summary/i })).toBeInTheDocument();
          });
        } else {
          expect(
            await screen.findByRole('heading', { level: 1, name: route.heading })
          ).toBeInTheDocument();
        }

        expect(document.documentElement.dataset.theme).toBe(theme);
        expectNonEmptyPage(container);
        unmount();
      }
    },
    20_000
  );
});

describe('Route pages smoke — compact viewport (no crash)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    Element.prototype.scrollTo = vi.fn();
    mockCompactViewport(true);
    const { buildFleetDashboardSnapshot } =
      await import('../data/testHelpers/fleetToolsTestFixtures');
    mockFetchFleetCommandSnapshot.mockResolvedValue(buildFleetDashboardSnapshot());
  });

  it.each(CORE_ROUTE_SMOKE)(
    '$id survives compact viewport mock',
    async (route) => {
      const { id, path, match, heading } = route;
      const Page = PAGE_BY_ID[id];
      const { container } = renderRoute(path, Page);

      if (match === 'composer') {
        expect(await screen.findByPlaceholderText(/ask anything clinical/i)).toBeInTheDocument();
      } else if (match === 'fleet-summary') {
        await waitFor(() => {
          expect(screen.getByRole('heading', { name: /fleet summary/i })).toBeInTheDocument();
        });
      } else {
        expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
      }

      expectNonEmptyPage(container);
    },
    15_000
  );
});

describe('Route pages smoke — requested responsive matrix', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    Element.prototype.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
    const { buildFleetDashboardSnapshot } =
      await import('../data/testHelpers/fleetToolsTestFixtures');
    mockFetchFleetCommandSnapshot.mockResolvedValue(buildFleetDashboardSnapshot());
  });

  it.each(RESPONSIVE_UX_VIEWPORT_WIDTHS)(
    'renders core UX surfaces without empty content at %ipx',
    async (width) => {
      setViewportWidth(width);

      for (const route of RESPONSIVE_MATRIX_ROUTES) {
        const Page = PAGE_BY_ID[route.id];
        const { container, unmount } = renderRoute(route.path, Page);

        if (route.match === 'composer') {
          expect(await screen.findByPlaceholderText(/ask anything clinical/i)).toBeInTheDocument();
        } else if (route.match === 'fleet-summary') {
          await waitFor(() => {
            expect(screen.getByRole('heading', { name: /fleet summary/i })).toBeInTheDocument();
          });
        } else {
          expect(
            await screen.findByRole('heading', { level: 1, name: route.heading })
          ).toBeInTheDocument();
        }

        expectNonEmptyPage(container);
        unmount();
      }
    },
    45_000
  );
});

describe('Route pages smoke — calculator forms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
    mockCompactViewport(true);
  });

  it.each(TIER_A_FORM_SMOKE_SLUGS)(
    '$slug renders scrollable calculator content',
    async ({ slug, interfaceClass }) => {
      const path = `/tools/calculators/${slug}`;
      const { container } = render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route
              path="/tools/calculators/:slug"
              element={<Calculators initialCalculatorId={slug} />}
            />
          </Routes>
        </MemoryRouter>
      );

      expect(
        await screen.findByRole('heading', { level: 1, name: /medical calculators/i })
      ).toBeInTheDocument();
      expect(container.querySelector(`.${interfaceClass}`), slug).toBeTruthy();
      expectNonEmptyPage(container);
    },
    15_000
  );
});
