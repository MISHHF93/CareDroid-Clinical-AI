import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import CommandDashboard from './CommandDashboard';
import {
  mockConversationValue,
  mockNotificationsValue,
  mockToolPreferencesValue,
  mockUserValue,
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
  });

  it('renders the command center sections without blank states', () => {
    renderDashboard();

    expect(screen.getByRole('heading', { level: 1, name: /caredroid command center/i })).toBeInTheDocument();
    for (const name of [
      /ai assistant/i,
      /quick actions/i,
      /my tools/i,
      /my calculators/i,
      /my workspace/i,
      /notifications/i,
      /active alerts/i,
      /^recent activity$/i,
    ]) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
    expect(screen.getByText(/no recent tools yet/i)).toBeInTheDocument();
  });

  it('renders compact launch cards for primary dashboard entry points', () => {
    renderDashboard();

    const launchpad = screen.getByRole('heading', { name: /quick actions/i }).closest('section');
    for (const name of [
      /ai assistant/i,
      /my workspace/i,
      /my tools/i,
      /my calculators/i,
      /digital twin/i,
      /notifications/i,
      /active alerts/i,
      /hospital map/i,
      /medical iot/i,
      /open live vehicle tracking/i,
      /device management/i,
      /recent activity/i,
      /system status/i,
    ]) {
      expect(within(launchpad).getByRole('link', { name })).toBeInTheDocument();
    }
  });

  it('renders inventory-backed dashboard charts and KPI cards', () => {
    renderDashboard();

    expect(screen.getByText(/tool category distribution/i)).toBeInTheDocument();
    expect(screen.getByText(/launch type distribution/i)).toBeInTheDocument();
    expect(screen.getByText(/clinical tier distribution/i)).toBeInTheDocument();
    expect(screen.getByText(/recent activity trend/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/total tools:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ai tools:/i)).toBeInTheDocument();
  });

  it('keeps featured dashboard tool cards unique', () => {
    renderDashboard();
    const primarySections = [
      screen.getByRole('heading', { name: /^my tools$/i }).closest('section'),
      screen.getByRole('heading', { name: /^my calculators$/i }).closest('section'),
    ];
    const cards = primarySections.flatMap((section) => [...section.querySelectorAll('.command-tool-card')]);
    const labels = cards.map((card) => card.getAttribute('aria-label'));

    expect(cards.length).toBeGreaterThan(0);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('seeds free text into assistant and routes to the focused workspace', () => {
    renderDashboard();

    fireEvent.change(screen.getByLabelText(/ask caredroid what you need to do next/i), {
      target: { value: 'Help me triage chest pain' },
    });
    fireEvent.click(screen.getByRole('button', { name: /open assistant workspace/i }));

    expect(mockConversationValue.addMessage).toHaveBeenCalledWith('Help me triage chest pain', 'user');
    expect(screen.getByTestId('location')).toHaveTextContent('/assistant');
  });

  it('launches calculator cards through canonical launch behavior', () => {
    renderDashboard();
    const clinicalPanel = screen.getByRole('heading', { name: /my calculators/i }).closest('section');
    const qsofaButton = within(clinicalPanel).getByRole('button', { name: /open qsofa/i });

    fireEvent.click(qsofaButton);

    expect(mockToolPreferencesValue.recordToolAccess).toHaveBeenCalledWith('qsofa');
    expect(screen.getByTestId('location')).toHaveTextContent('/tools/calculators/qsofa');
  });

  it('surfaces Medical IoT as a first-class dashboard launch', () => {
    renderDashboard();
    const operationsPanel = screen.getByRole('heading', { name: /operations summary/i }).closest('section');
    const iotButton = within(operationsPanel).getByRole('button', { name: /open medical iot dashboard/i });

    fireEvent.click(iotButton);

    expect(mockToolPreferencesValue.recordToolAccess).toHaveBeenCalledWith('medical-iot-dashboard');
    expect(screen.getByTestId('location')).toHaveTextContent('/medical-iot');
  });

  it('surfaces Hospital Map as a first-class operations launch', () => {
    renderDashboard();
    const operationsPanel = screen.getByRole('heading', { name: /operations summary/i }).closest('section');
    const hospitalMapButton = within(operationsPanel).getByRole('button', { name: /open hospital map/i });

    fireEvent.click(hospitalMapButton);

    expect(mockToolPreferencesValue.recordToolAccess).toHaveBeenCalledWith('hospital-map');
    expect(screen.getByTestId('location')).toHaveTextContent('/hospital-map');
  });

  it('summarizes notifications and active alerts inside the command center', () => {
    mockNotificationsValue.notifications = [
      { id: 'n1', title: 'Lab result ready', message: 'CBC is ready', read: false, type: 'info' },
      { id: 'a1', title: 'Sepsis alert', message: 'High risk patient', read: false, type: 'critical' },
    ];

    renderDashboard();

    const notifications = screen.getByRole('heading', { name: /^notifications$/i }).closest('section');
    const activeAlerts = screen.getByRole('heading', { name: /^active alerts$/i }).closest('section');

    expect(within(notifications).getByText(/lab result ready/i)).toBeInTheDocument();
    expect(within(activeAlerts).getByText(/sepsis alert/i)).toBeInTheDocument();
    expect(within(activeAlerts).getByRole('link', { name: /open digital twin/i })).toHaveAttribute('href', '/digital-twin');
  });
});
