import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import CommandDashboard from './CommandDashboard';
import {
  mockConversationValue,
  mockNotificationsValue,
  mockToolPreferencesValue,
  mockUserValue,
  mockWorkspaceValue,
} from '../test/testRenderUtils';

vi.mock('./CommandDashboard.css', () => ({}));

vi.mock('../contexts/UserContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useUser: () => mockUserValue,
  };
});

vi.mock('../contexts/ConversationContext', () => ({
  useConversation: () => mockConversationValue,
}));

vi.mock('../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../contexts/NotificationContext', () => ({
  useNotifications: () => mockNotificationsValue,
}));

vi.mock('../contexts/WorkspaceContext', () => ({
  useWorkspace: () => mockWorkspaceValue,
}));

vi.mock('../contexts/SystemConfigContext', () => ({
  useSystemConfig: () => ({
    loading: false,
    error: null,
    configDegraded: false,
    isRagEnabled: true,
    availableTools: [{ id: 'sofa-calculator' }],
    refresh: vi.fn(),
  }),
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <CommandDashboard />
      <LocationProbe />
    </MemoryRouter>
  );
}

describe('CommandDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToolPreferencesValue.favorites = [];
    mockToolPreferencesValue.pinned = [];
    mockToolPreferencesValue.recentTools = [];
    mockNotificationsValue.notifications = [];
    mockWorkspaceValue.activeWorkspaceId = 'emergency';
    mockWorkspaceValue.activeWorkspace = { id: 'emergency', name: 'Emergency' };
    mockWorkspaceValue.workspaces = [{ id: 'emergency', name: 'Emergency', toolIds: [] }];
    mockWorkspaceValue.recommendations = [];
    mockWorkspaceValue.shortcuts = [];
    mockWorkspaceValue.visibleAssetIds = [];
  });

  it('renders compressed command center sections without the old dashboard wall', () => {
    renderDashboard();

    expect(screen.getByRole('heading', { level: 1, name: /emergency command center/i })).toBeInTheDocument();
    expect(screen.getByText(/emergency os/i)).toBeInTheDocument();
    for (const name of [
      /^actions$/i,
      /ai assistant/i,
      /launch compression/i,
      /^recommendations$/i,
      /^signals$/i,
      /^status$/i,
    ]) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole('heading', { name: /command analytics/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /clinical tools detail/i })).not.toBeInTheDocument();
    expect(screen.getByText(/triage risk, active alerts/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/emergency os operating brief/i)).toBeInTheDocument();
    expect(screen.getByText(/rapid response environment/i)).toBeInTheDocument();
    expect(within(screen.getByLabelText(/dashboard context summary/i)).getByText(/red flags first/i)).toBeInTheDocument();
    const flow = screen.getByLabelText(/frontend operating system flow/i);
    for (const step of ['AppShell', 'Workspace', 'Dashboard', 'Asset Launch']) {
      expect(within(flow).getByText(step)).toBeInTheDocument();
    }
    expect(within(flow).queryByText('Workflow')).not.toBeInTheDocument();
  });

  it('renders compact action cards for primary dashboard entry points', () => {
    renderDashboard();

    const launchpad = screen.getByRole('heading', { name: /^actions$/i }).closest('section');
    for (const name of [
      /^ai assistant/i,
      /^tools/i,
      /^operations/i,
      /^profile/i,
      /^manage workspaces/i,
    ]) {
      expect(within(launchpad).getByRole('link', { name })).toBeInTheDocument();
    }
    expect(within(launchpad).getByRole('link', { name: /^ai assistant/i })).toHaveAttribute('href', '/assistant');
    expect(within(launchpad).getByRole('link', { name: /^tools/i })).toHaveAttribute('href', '/tools');
    expect(within(launchpad).getByRole('link', { name: /^operations/i })).toHaveAttribute('href', '/operations');
    expect(within(launchpad).getByRole('link', { name: /^profile/i })).toHaveAttribute('href', '/profile');
    expect(within(launchpad).getByRole('link', { name: /^manage workspaces/i })).toHaveAttribute('href', '/profile/workspaces');
    expect(within(launchpad).queryByRole('link', { name: /^global search/i })).not.toBeInTheDocument();
    expect(within(launchpad).queryByRole('link', { name: /^recommendations/i })).not.toBeInTheDocument();
    expect(within(launchpad).queryByRole('link', { name: /^workflows/i })).not.toBeInTheDocument();
    expect(within(launchpad).queryByRole('link', { name: /^medical simulation/i })).not.toBeInTheDocument();
    expect(within(launchpad).queryByRole('link', { name: /^assets/i })).not.toBeInTheDocument();
    expect(within(launchpad).queryByRole('link', { name: /^calculators/i })).not.toBeInTheDocument();
    expect(within(launchpad).queryByRole('link', { name: /system status/i })).not.toBeInTheDocument();
  });

  it('compresses dashboard routes to assets, workflows, simulations, and operations', () => {
    mockToolPreferencesValue.favorites = ['qsofa'];
    mockToolPreferencesValue.pinned = ['medical-iot-dashboard'];
    mockToolPreferencesValue.recentTools = ['drug-check'];

    renderDashboard();

    const compression = screen.getByRole('heading', { name: /launch compression/i }).closest('section');
    expect(within(compression).getByRole('link', { name: /^assets/i })).toHaveAttribute('href', '/assets');
    expect(within(compression).getByRole('link', { name: /^workflows/i })).toHaveAttribute('href', '/workflows');
    expect(within(compression).getByRole('link', { name: /^simulation/i })).toHaveAttribute('href', '/simulation');
    expect(within(compression).getByRole('link', { name: /^operations/i })).toHaveAttribute('href', '/operations');
    expect(within(compression).getByRole('button', { name: /open qsofa/i })).toBeInTheDocument();
    expect(within(compression).getByRole('button', { name: /open medical iot dashboard/i })).toBeInTheDocument();
    expect(within(compression).getByRole('button', { name: /open drug checker/i })).toBeInTheDocument();
  });

  it('renders compact status metrics instead of chart widgets', () => {
    renderDashboard();

    const status = screen.getByRole('heading', { name: /^status$/i }).closest('section');
    expect(within(status).getByText(/^tools$/i)).toBeInTheDocument();
    expect(within(status).getByText(/^ai tools$/i)).toBeInTheDocument();
    expect(within(status).getByText(/^backend$/i)).toBeInTheDocument();
    expect(within(status).queryByText(/^planned$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tool category distribution/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/launch type distribution/i)).not.toBeInTheDocument();
  });

  it('keeps recommended dashboard tool cards unique', () => {
    renderDashboard();
    const recommendations = screen.getByRole('heading', { name: /^recommendations$/i }).closest('section');
    const cards = [...recommendations.querySelectorAll('.command-tool-card')];
    const labels = cards.map((card) => card.getAttribute('aria-label'));

    expect(cards.length).toBeGreaterThan(0);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('renders active workspace recommendations before generic dashboard recommendations', () => {
    mockWorkspaceValue.recommendations = [{ assetId: 'medical-iot-dashboard', reason: 'workspace fit' }];

    renderDashboard();

    const recommendations = screen.getByRole('heading', { name: /^recommendations$/i }).closest('section');
    expect(within(recommendations).getByRole('button', { name: /open medical iot dashboard/i })).toBeInTheDocument();
  });

  it('seeds free text into assistant and routes to the focused workspace', () => {
    renderDashboard();

    fireEvent.change(screen.getByLabelText(/ask emergency assistant what you need to do next/i), {
      target: { value: 'Help me triage chest pain' },
    });
    fireEvent.click(screen.getByRole('button', { name: /ask assistant/i }));

    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('[Emergency OS]'),
      'user'
    );
    expect(mockConversationValue.addMessage).toHaveBeenCalledWith(
      expect.stringContaining('Help me triage chest pain'),
      'user'
    );
    expect(screen.getByTestId('location')).toHaveTextContent('/assistant');
  });

  it('changes dashboard identity for Medical IoT workspace', () => {
    mockWorkspaceValue.activeWorkspaceId = 'medical-iot';
    mockWorkspaceValue.activeWorkspace = { id: 'medical-iot', name: 'Medical IoT' };

    renderDashboard();

    expect(screen.getByRole('heading', { level: 1, name: /medical iot command center/i })).toBeInTheDocument();
    expect(screen.getByText(/medical iot os/i)).toBeInTheDocument();
    expect(screen.getByText(/telemetry and device operations environment/i)).toBeInTheDocument();
    expect(within(screen.getByLabelText(/dashboard context summary/i)).getByText(/device alerts/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/offline devices/i)).toBeInTheDocument();
  });

  it('changes dashboard identity for Fleet workspace', () => {
    mockWorkspaceValue.activeWorkspaceId = 'fleet';
    mockWorkspaceValue.activeWorkspace = { id: 'fleet', name: 'Fleet' };

    renderDashboard();

    expect(screen.getByRole('heading', { level: 1, name: /fleet command center/i })).toBeInTheDocument();
    expect(screen.getByText(/fleet os/i)).toBeInTheDocument();
    expect(screen.getByText(/transport logistics and dispatch environment/i)).toBeInTheDocument();
    expect(within(screen.getByLabelText(/dashboard context summary/i)).getByText(/fleet map/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/etas, route risk/i)).toBeInTheDocument();
  });

  it('launches the operations action to the canonical operations hub', () => {
    renderDashboard();

    const actions = screen.getByRole('heading', { name: /^actions$/i }).closest('section');
    fireEvent.click(within(actions).getByRole('link', { name: /^operations/i }));

    expect(screen.getByTestId('location')).toHaveTextContent('/operations');
  });

  it('launches recommended tool cards through canonical launch behavior', () => {
    renderDashboard();
    const recommendations = screen.getByRole('heading', { name: /^recommendations$/i }).closest('section');
    const firstToolButton = within(recommendations).getAllByRole('button', { name: /open /i })[0];

    fireEvent.click(firstToolButton);

    expect(mockToolPreferencesValue.recordToolAccess).toHaveBeenCalled();
    expect(screen.getByTestId('location')).not.toHaveTextContent('/dashboard');
  });

  it('compresses notifications and active alerts into the signals panel', () => {
    mockNotificationsValue.notifications = [
      { id: 'n1', title: 'Lab result ready', message: 'CBC is ready', read: false, type: 'info' },
      { id: 'a1', title: 'Sepsis alert', message: 'High risk patient', read: false, type: 'critical' },
    ];

    renderDashboard();

    const signals = screen.getByRole('heading', { name: /^signals$/i }).closest('section');

    expect(within(signals).getByText(/lab result ready/i)).toBeInTheDocument();
    expect(within(signals).getAllByText(/sepsis alert/i)).toHaveLength(1);
    expect(within(signals).getByRole('link', { name: /notifications/i })).toHaveAttribute('href', '/notifications');
    expect(within(signals).getByRole('link', { name: /alerts/i })).toHaveAttribute('href', '/clinical/alerts');
  });
});
