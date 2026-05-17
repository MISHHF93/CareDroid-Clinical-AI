/**
 * Fleet Command Dashboard UI tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FleetDashboard from './FleetDashboard';

const mockFetchFleetCommandSnapshot = vi.fn();

vi.mock('../../services/fleetTelemetryService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchFleetCommandSnapshot: (...args) => mockFetchFleetCommandSnapshot(...args),
  };
});

vi.mock('../../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => ({
    recordToolAccess: vi.fn(),
    favorites: [],
    pinned: [],
    recentTools: [],
    toggleFavorite: vi.fn(),
    togglePinned: vi.fn(),
  }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const sampleSnapshot = {
  summary: {
    activeVehicles: 1,
    availableVehicles: 2,
    occupiedVehicles: 2,
    maintenanceCount: 1,
    totalVehicles: 1,
    averageUtilizationPercent: 55,
    averageEtaMinutes: 20,
    lowEnergyCount: 0,
    updatedAt: new Date().toISOString(),
    source: 'mock-telemetry',
  },
  vehicles: [
    {
      id: 'VH-TEST',
      label: 'Test Van',
      status: 'available',
      maintenanceStatus: 'ok',
      etaMinutes: null,
      energyType: 'electric',
      energyPercent: 80,
      utilizationPercent: 40,
      driver: null,
    },
  ],
};

function renderDashboard() {
  return render(
    <MemoryRouter>
      <FleetDashboard />
    </MemoryRouter>
  );
}

describe('FleetDashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchFleetCommandSnapshot.mockResolvedValue(sampleSnapshot);
  });

  it('renders route page with accessible title', () => {
    renderDashboard();
    expect(
      screen.getByRole('heading', { level: 1, name: /Fleet Command Dashboard/i })
    ).toBeInTheDocument();
  });

  it('shows loading then fleet summary widgets', async () => {
    renderDashboard();
    expect(screen.getByText(/Loading fleet telemetry/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Fleet summary/i })).toBeInTheDocument();
      const summaryGroup = screen.getByRole('group', { name: /Fleet summary metrics/i });
      expect(within(summaryGroup).getByText('Active')).toBeInTheDocument();
      expect(within(summaryGroup).getByText('Available')).toBeInTheDocument();
    });

    expect(screen.getByText('On job')).toBeInTheDocument();
    expect(screen.getByText('Avg utilization')).toBeInTheDocument();
    expect(screen.getByText('Test Van')).toBeInTheDocument();
    expect(screen.getByText('VH-TEST')).toBeInTheDocument();
    expect(mockFetchFleetCommandSnapshot).toHaveBeenCalled();
  });

  it('shows empty state when no vehicles report telemetry', async () => {
    mockFetchFleetCommandSnapshot.mockResolvedValue({
      summary: { ...sampleSnapshot.summary, totalVehicles: 0 },
      vehicles: [],
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/No vehicles are reporting telemetry/i)).toBeInTheDocument();
    });
  });

  it('shows error state and retry on fetch failure', async () => {
    mockFetchFleetCommandSnapshot.mockRejectedValue(new Error('Network unavailable'));

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Network unavailable/i);
    });

    expect(
      screen.getByRole('button', { name: /Retry loading fleet telemetry/i })
    ).toBeInTheDocument();
  });

  it('exposes skip link and anti-automation safety copy', async () => {
    renderDashboard();

    expect(screen.getByRole('link', { name: /Skip to main content/i })).toHaveAttribute(
      'href',
      '#fleet-dashboard-main'
    );
    expect(screen.getByText(/Decision support only/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Human dispatchers must approve/i)).toBeInTheDocument();
    });
  });

  it('shows operational alert when summary flags maintenance or low energy', async () => {
    mockFetchFleetCommandSnapshot.mockResolvedValue({
      ...sampleSnapshot,
      summary: {
        ...sampleSnapshot.summary,
        maintenanceCount: 2,
        lowEnergyCount: 1,
      },
      vehicles: [
        {
          ...sampleSnapshot.vehicles[0],
          energyPercent: 20,
        },
      ],
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Operational attention/i);
    });
  });
});
