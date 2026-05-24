import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import CommandDashboard from './CommandDashboard';
import {
  mockConversationValue,
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
  });

  it('renders the command dashboard panels without blank states', () => {
    renderDashboard();

    expect(screen.getByRole('heading', { level: 1, name: /caredroid command dashboard/i })).toBeInTheDocument();
    for (const name of [
      /ai assistant/i,
      /clinical tools/i,
      /reference & guidelines/i,
      /fleet & operations/i,
      /medical iot \/ device monitoring/i,
      /command analytics/i,
      /^recent activity$/i,
      /system status/i,
    ]) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
    expect(screen.getByText(/no recent tools yet/i)).toBeInTheDocument();
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
    const { container } = renderDashboard();
    const cards = [...container.querySelectorAll('.command-tool-card')];
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
    const clinicalPanel = screen.getByRole('heading', { name: /clinical tools/i }).closest('section');
    const qsofaButton = within(clinicalPanel).getByRole('button', { name: /open qsofa/i });

    fireEvent.click(qsofaButton);

    expect(mockToolPreferencesValue.recordToolAccess).toHaveBeenCalledWith('qsofa');
    expect(screen.getByTestId('location')).toHaveTextContent('/tools/calculators/qsofa');
  });

  it('surfaces Medical IoT as a first-class dashboard launch', () => {
    renderDashboard();
    const iotPanel = screen.getByRole('heading', { name: /medical iot \/ device monitoring/i }).closest('section');
    const iotButton = within(iotPanel).getByRole('button', { name: /open medical iot dashboard/i });

    fireEvent.click(iotButton);

    expect(mockToolPreferencesValue.recordToolAccess).toHaveBeenCalledWith('medical-iot-dashboard');
    expect(screen.getByTestId('location')).toHaveTextContent('/medical-iot');
  });

  it('surfaces Hospital Map as a first-class operations launch', () => {
    renderDashboard();
    const operationsPanel = screen.getByRole('heading', { name: /fleet & operations/i }).closest('section');
    const hospitalMapButton = within(operationsPanel).getByRole('button', { name: /open hospital map/i });

    fireEvent.click(hospitalMapButton);

    expect(mockToolPreferencesValue.recordToolAccess).toHaveBeenCalledWith('hospital-map');
    expect(screen.getByTestId('location')).toHaveTextContent('/hospital-map');
  });
});
