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
      /^recommendations$/i,
      /^signals$/i,
      /^status$/i,
    ]) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole('heading', { name: /command analytics/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /clinical tools detail/i })).not.toBeInTheDocument();
    expect(screen.getByText(/triage risk, active alerts/i)).toBeInTheDocument();
    const flow = screen.getByLabelText(/frontend operating system flow/i);
    for (const step of ['AppShell', 'Workspace', 'Dashboard', 'Asset Launch', 'Workflow', 'Result']) {
      expect(within(flow).getByText(step)).toBeInTheDocument();
    }
  });

  it('renders compact action cards for primary dashboard entry points', () => {
    renderDashboard();

    const launchpad = screen.getByRole('heading', { name: /^actions$/i }).closest('section');
    for (const name of [
      /^ai assistant/i,
      /^assets/i,
      /^workflows/i,
      /^results/i,
      /^medical simulation/i,
      /^operations/i,
      /^my workspace/i,
      /^my tools/i,
    ]) {
      expect(within(launchpad).getByRole('link', { name })).toBeInTheDocument();
    }
    expect(within(launchpad).getByRole('link', { name: /^assets/i })).toHaveAttribute('href', '/assets');
    expect(within(launchpad).getByRole('link', { name: /^workflows/i })).toHaveAttribute('href', '/workflows');
    expect(within(launchpad).getByRole('link', { name: /^results/i })).toHaveAttribute('href', '/timeline');
    expect(within(launchpad).getByRole('link', { name: /^medical simulation/i })).toHaveAttribute('href', '/simulation');
    expect(within(launchpad).getByRole('link', { name: /^operations/i })).toHaveAttribute('href', '/operations');
    expect(within(launchpad).queryByRole('link', { name: /system status/i })).not.toBeInTheDocument();
  });

  it('renders compact status metrics instead of chart widgets', () => {
    renderDashboard();

    const status = screen.getByRole('heading', { name: /^status$/i }).closest('section');
    expect(within(status).getByText(/^tools$/i)).toBeInTheDocument();
    expect(within(status).getByText(/^ai tools$/i)).toBeInTheDocument();
    expect(within(status).getByText(/^backend$/i)).toBeInTheDocument();
    expect(within(status).getByText(/^planned$/i)).toBeInTheDocument();
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

  it('seeds free text into assistant and routes to the focused workspace', () => {
    renderDashboard();

    fireEvent.change(screen.getByLabelText(/ask emergency assistant what you need to do next/i), {
      target: { value: 'Help me triage chest pain' },
    });
    fireEvent.click(screen.getByRole('button', { name: /open emergency assistant/i }));

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
    expect(screen.getByPlaceholderText(/offline devices/i)).toBeInTheDocument();
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
