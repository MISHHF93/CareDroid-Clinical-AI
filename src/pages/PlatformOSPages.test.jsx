import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import {
  AssetLibraryPage,
  ClinicalTimelinePage,
  DigitalTwinPage,
  NotificationCenterPage,
  SearchResultsPage,
  WorkflowBuilderPage,
  WorkspacesIndexPage,
} from './PlatformOSPages';
import {
  mockNotificationsValue,
  mockToolPreferencesValue,
  mockUserValue,
} from '../test/testRenderUtils';

vi.mock('./PlatformOSPages.css', () => ({}));

vi.mock('../contexts/NotificationContext', () => ({
  useNotifications: () => mockNotificationsValue,
}));

vi.mock('../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../contexts/UserContext', () => ({
  useUser: () => mockUserValue,
}));

vi.mock('../contexts/UserIdentityContext', () => ({
  useUserIdentity: () => ({
    account: { permissions: [] },
    platformContext: { permissions: [] },
    workspaceState: { effectivePermissions: [] },
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderPage(ui, route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
      <LocationProbe />
    </MemoryRouter>
  );
}

describe('PlatformOSPages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationsValue.notifications = [];
  });

  it('renders the workspace directory and navigates to workspace details', () => {
    render(
      <MemoryRouter initialEntries={['/workspaces']}>
        <Routes>
          <Route path="/workspaces" element={<><WorkspacesIndexPage /><LocationProbe /></>} />
          <Route path="/workspace/:workspaceId" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /emergency/i }));
    expect(screen.getByTestId('location')).toHaveTextContent('/workspace/emergency');
  });

  it('renders global search with quick launch results', () => {
    renderPage(<SearchResultsPage />, '/search');
    expect(screen.getByText(/local search demo/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^open /i })).toHaveLength(8);
    expect(screen.getByText(/showing top 8/i)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/search everything/i), {
      target: { value: 'digital twin' },
    });
    expect(screen.getByRole('button', { name: /open hospital digital twin/i })).toBeInTheDocument();
  });

  it('supports asset, workflow, simulation, protocol, AI, operation, and workspace search-first discovery', () => {
    renderPage(<SearchResultsPage />, '/search');
    const input = screen.getByPlaceholderText(/search everything/i);

    fireEvent.change(input, { target: { value: 'medical iot dashboard' } });
    expect(screen.getByRole('button', { name: /open medical iot dashboard/i })).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'sepsis escalation workflow' } });
    expect(screen.getByRole('button', { name: /open sepsis escalation workflow/i })).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'sepsis deterioration simulation' } });
    expect(screen.getByRole('button', { name: /open sepsis deterioration/i })).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'emergency workspace' } });
    expect(screen.getByRole('button', { name: /open emergency workspace/i })).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'sepsis management lactate pathway' } });
    expect(screen.getByRole('button', { name: /open sepsis management/i })).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'guardrails human review safety' } });
    expect(screen.getByRole('button', { name: /open guardrails/i })).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'clinical copilot agent' } });
    expect(screen.getByRole('button', { name: /open clinical copilot agent/i })).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'fleet dispatch maintenance map' } });
    expect(screen.getByRole('button', { name: /^open fleet$/i })).toBeInTheDocument();
  });

  it('renders timeline, notifications, digital twin, workflows, and assets', () => {
    let view = renderPage(<ClinicalTimelinePage />, '/timeline');
    expect(screen.getByRole('heading', { name: /^timeline$/i })).toBeInTheDocument();
    expect(screen.getByText(/local timeline demo/i)).toBeInTheDocument();
    view.unmount();

    view = renderPage(<NotificationCenterPage />, '/notifications');
    expect(screen.getByRole('heading', { name: /notification center/i })).toBeInTheDocument();
    view.unmount();

    view = renderPage(<DigitalTwinPage />, '/digital-twin');
    expect(screen.getByRole('heading', { name: /digital twin/i })).toBeInTheDocument();
    expect(screen.getByText(/operations aggregate/i)).toBeInTheDocument();
    for (const path of ['/hospital-map', '/medical-iot', '/devices', '/fleet/map', '/live-map']) {
      expect(screen.getByRole('link', { name: new RegExp(path.replace('/', '\\/')) })).toHaveAttribute('href', path);
    }
    view.unmount();

    view = renderPage(<WorkflowBuilderPage />, '/workflows');
    expect(screen.getByRole('heading', { name: /workflows/i })).toBeInTheDocument();
    expect(screen.getByText(/workflow demo preview/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save workflow draft \(demo disabled\)/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /ai-generate workflow \(demo disabled\)/i })).toBeDisabled();
    expect(screen.getByText(/not saved, queued, or scheduled/i)).toBeInTheDocument();
    view.unmount();

    renderPage(<AssetLibraryPage />, '/assets');
    expect(screen.getByRole('heading', { name: /asset library/i })).toBeInTheDocument();
    expect(screen.getByText(/platform asset projection/i)).toBeInTheDocument();
  });

  it('stitches workflow completion into results and recommended next actions', () => {
    renderPage(<WorkflowBuilderPage />, '/workflows?workflow=sepsis-escalation');

    expect(screen.getByRole('combobox', { name: /saved workflow/i })).toHaveValue('sepsis-escalation');
    fireEvent.click(screen.getByRole('button', { name: /mark workflow complete/i }));

    const resultRegion = screen.getByLabelText(/workflow result and next actions/i);
    expect(resultRegion).toHaveTextContent(/sepsis escalation workflow result/i);
    expect(resultRegion).toHaveTextContent(/result is connected to timeline, recommendations, and assistant/i);
    expect(screen.getByRole('link', { name: /review sepsis workflow result/i })).toHaveAttribute(
      'href',
      '/timeline?kind=workflow'
    );
    expect(screen.getByRole('link', { name: /open escalation recommendations/i })).toHaveAttribute(
      'href',
      '/recommendations?source=workflow&workflow=sepsis-escalation'
    );
    expect(screen.getByRole('link', { name: /ask assistant for handoff/i })).toHaveAttribute('href', '/assistant');
  });
});
