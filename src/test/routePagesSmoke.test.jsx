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
import Dashboard from '../pages/Dashboard';
import { CORE_ROUTE_SMOKE } from './responsiveRegression.routes';

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

vi.mock('../services/fleetTelemetryService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchFleetCommandSnapshot: (...args) => mockFetchFleetCommandSnapshot(...args),
  };
});

const PAGE_BY_ID = {
  dashboard: Dashboard,
  'tools-overview': ToolsOverview,
  'tools-catalog': ClinicalToolCatalog,
  'calculators-hub': Calculators,
  'fleet-command': FleetDashboard,
  'fleet-route-optimizer': RouteOptimizer,
  'fleet-predictive-maintenance': PredictiveMaintenance,
};

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

  it.each(CORE_ROUTE_SMOKE)('$id at $path renders primary content', async (route) => {
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
  });
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

  it.each(CORE_ROUTE_SMOKE)('$id survives compact viewport mock', async (route) => {
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
  });
});
