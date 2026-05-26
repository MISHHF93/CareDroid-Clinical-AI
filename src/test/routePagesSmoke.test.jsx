/**
 * Route page smoke — major paths render non-empty content without crashing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ClinicalToolCatalog from '../pages/tools/ClinicalToolCatalog';
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
import Artifacts from '../pages/Artifacts';
import MemoryDashboard from '../pages/MemoryDashboard';
import TrainingDashboard from '../pages/TrainingDashboard';
import CostAnalyticsDashboard from '../pages/CostAnalyticsDashboard';
import AiEvaluationDashboard from '../pages/AiEvaluationDashboard';
import AiCommandCenterDashboard from '../pages/AiCommandCenterDashboard';
import PlatformSystemPage from '../pages/platform/PlatformSystemPage';
import PlatformGovernanceWorkspace from '../pages/platform/PlatformGovernanceWorkspace';
import CommandDashboard from '../pages/CommandDashboard';
import Dashboard from '../pages/Dashboard';
import Operations from '../pages/Operations';
import LiveTrackingMap from '../pages/LiveTrackingMap';
import HospitalMapDashboard from '../pages/HospitalMapDashboard';
import MedicalIotDashboard from '../pages/MedicalIotDashboard';
import DeviceFleetManagement from '../pages/DeviceFleetManagement';
import ClinicalAlertsPage from '../pages/ClinicalAlertsPage';
import FleetLiveMap from '../pages/fleet/FleetLiveMap';
import { CORE_ROUTE_SMOKE, TIER_A_FORM_SMOKE_SLUGS } from './responsiveRegression.routes';

vi.mock('../pages/tools/Calculators.css', () => ({}));
vi.mock('../pages/tools/ToolPageLayout.css', () => ({}));
import {
  mockCompactViewport,
  mockConversationValue,
  mockToolPreferencesValue,
  mockUserValue,
  expectNonEmptyPage,
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
  }),
}));

vi.mock('../hooks/useNotificationActions', () => ({
  useNotificationActions: () => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }),
}));

vi.mock('../services/clinicalToolsApi', () => ({
  fetchBackendClinicalTools: vi.fn().mockResolvedValue({ ok: true, tools: [] }),
}));

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
  assistant: Dashboard,
  operations: Operations,
  'live-map': LiveTrackingMap,
  'hospital-map': HospitalMapDashboard,
  'medical-iot': MedicalIotDashboard,
  devices: DeviceFleetManagement,
  'clinical-alerts': ClinicalAlertsPage,
  'tools-overview': ToolsOverview,
  'tools-catalog': ClinicalToolCatalog,
  'calculators-hub': Calculators,
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
  costs: CostAnalyticsDashboard,
  'ai-evaluation': AiEvaluationDashboard,
  'ai-command-center': AiCommandCenterDashboard,
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
  'system-health-enterprise': PlatformGovernanceWorkspace,
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
};

const THEME_ROUTE_SMOKE_IDS = new Set([
  'dashboard',
  'assistant',
  'tools-overview',
  'operations',
  'calculators-hub',
  'tools-catalog',
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
  'assistant',
  'tools-overview',
  'operations',
  'calculators-hub',
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
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={<Page />} />
        <Route path="*" element={<Page />} />
      </Routes>
    </MemoryRouter>
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
    25_000
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
