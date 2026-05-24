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
import CommandDashboard from '../pages/CommandDashboard';
import Dashboard from '../pages/Dashboard';
import LiveTrackingMap from '../pages/LiveTrackingMap';
import HospitalMapDashboard from '../pages/HospitalMapDashboard';
import MedicalIotDashboard from '../pages/MedicalIotDashboard';
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

vi.mock('../hooks/useNotificationActions', () => ({
  useNotificationActions: () => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }),
}));

vi.mock('../services/clinicalToolsApi', () => ({
  fetchBackendClinicalTools: vi.fn().mockResolvedValue({ ok: true, tools: [] }),
}));

vi.mock('../services/clinicalChatService', () => ({
  sendClinicalChatMessage: vi.fn().mockResolvedValue({ ok: true, message: { content: 'ok' } }),
  mapChatResponseToAssistantMessage: vi.fn(() => ({ role: 'assistant', content: 'ok' })),
  registryIdToChatToolParam: vi.fn(() => null),
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
  'live-map': LiveTrackingMap,
  'hospital-map': HospitalMapDashboard,
  'medical-iot': MedicalIotDashboard,
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
  'fleet-live-map': FleetLiveMap,
  'fleet-command': FleetDashboard,
  'fleet-route-optimizer': RouteOptimizer,
  'fleet-predictive-maintenance': PredictiveMaintenance,
};

const THEME_ROUTE_SMOKE_IDS = new Set([
  'dashboard',
  'assistant',
  'tools-overview',
  'calculators-hub',
  'tools-catalog',
  'medical-iot',
  'fleet-command',
  'hospital-map',
]);

const THEME_ROUTE_SMOKE = CORE_ROUTE_SMOKE.filter((route) => THEME_ROUTE_SMOKE_IDS.has(route.id));

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
    const { buildFleetDashboardSnapshot } = await import(
      '../data/testHelpers/fleetToolsTestFixtures'
    );
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
    const { buildFleetDashboardSnapshot } = await import(
      '../data/testHelpers/fleetToolsTestFixtures'
    );
    mockFetchFleetCommandSnapshot.mockResolvedValue(buildFleetDashboardSnapshot());
  });

  it.each(['light', 'dark'])('major pages render non-empty content in %s mode', async (theme) => {
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
        expect(await screen.findByRole('heading', { level: 1, name: route.heading })).toBeInTheDocument();
      }

      expect(document.documentElement.dataset.theme).toBe(theme);
      expectNonEmptyPage(container);
      unmount();
    }
  }, 20_000);
});

describe('Route pages smoke — compact viewport (no crash)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    Element.prototype.scrollTo = vi.fn();
    mockCompactViewport(true);
    const { buildFleetDashboardSnapshot } = await import(
      '../data/testHelpers/fleetToolsTestFixtures'
    );
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

      expect(await screen.findByRole('heading', { level: 1, name: /medical calculators/i })).toBeInTheDocument();
      expect(container.querySelector(`.${interfaceClass}`), slug).toBeTruthy();
      expectNonEmptyPage(container);
    },
    15_000
  );
});
