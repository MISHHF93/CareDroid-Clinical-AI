import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import FleetLiveMap from './FleetLiveMap';

const mocks = vi.hoisted(() => ({
  fetchFleetLiveTrackingSnapshot: vi.fn(),
  recordToolAccess: vi.fn(),
}));

vi.mock('../../services/fleetTelemetryService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchFleetLiveTrackingSnapshot: (...args) => mocks.fetchFleetLiveTrackingSnapshot(...args),
  };
});

vi.mock('../../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => ({
    recordToolAccess: mocks.recordToolAccess,
    favorites: [],
    pinned: [],
    recentTools: [],
    toggleFavorite: mocks.recordToolAccess,
    togglePinned: mocks.recordToolAccess,
  }),
}));

function fleetSnapshot() {
  return {
    sourceLabel: 'Backend demo fleet live tracking',
    message: 'Demo fleet map.',
    summary: {
      totalVehicles: 2,
      activeVehicles: 1,
      availableVehicles: 1,
      staleVehicles: 0,
      offlineVehicles: 0,
      activeRoutes: 1,
      delayedRoutes: 0,
      activeAlerts: 1,
      averageUtilizationPercent: 65,
      averageEtaMinutes: 18,
      updatedAt: '2026-05-24T12:00:00.000Z',
    },
    vehicles: [
      {
        id: 'VH-101',
        label: 'Van 101 - North route',
        status: 'occupied',
        freshness: 'fresh',
        maintenanceStatus: 'ok',
        etaMinutes: 18,
        energyType: 'electric',
        energyPercent: 72,
        utilizationPercent: 88,
        driver: 'A. Rivera',
        coordinates: { latitude: 40.7558, longitude: -73.9864 },
        mapPosition: { x: 38, y: 28 },
        heading: 74,
        speedMph: 22,
        routeId: 'route-north',
        destination: 'CareDroid North Clinic',
        lastSeenAt: '2026-05-24T11:58:00.000Z',
        locationSource: 'Backend demo GPS coordinate',
      },
      {
        id: 'VH-204',
        label: 'Truck 204 - Depot',
        status: 'available',
        freshness: 'fresh',
        maintenanceStatus: 'ok',
        etaMinutes: null,
        energyType: 'diesel',
        energyPercent: 91,
        utilizationPercent: 42,
        driver: null,
        coordinates: { latitude: 40.7411, longitude: -73.9903 },
        mapPosition: { x: 52, y: 58 },
        heading: 0,
        speedMph: 0,
        routeId: null,
        destination: 'Depot',
        lastSeenAt: '2026-05-24T11:56:00.000Z',
        locationSource: 'Backend demo depot coordinate',
      },
    ],
    routes: [
      {
        id: 'route-north',
        name: 'North clinic route',
        vehicleId: 'VH-101',
        status: 'active',
        etaMinutes: 18,
        stopsRemaining: 2,
        path: [
          { x: 24, y: 40 },
          { x: 38, y: 28 },
        ],
      },
    ],
    alerts: [
      {
        id: 'VH-101-route-alert',
        vehicleId: 'VH-101',
        severity: 'medium',
        title: 'Route check',
        detail: 'ETA requires dispatch review.',
        triggeredAt: '2026-05-24T11:58:00.000Z',
      },
    ],
  };
}

function renderFleetLiveMap() {
  return render(
    <MemoryRouter initialEntries={['/fleet/map']}>
      <FleetLiveMap />
    </MemoryRouter>,
  );
}

describe('FleetLiveMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchFleetLiveTrackingSnapshot.mockResolvedValue(fleetSnapshot());
  });

  it('renders vehicle markers, route lines, ETA, alerts, and utilization', async () => {
    const user = userEvent.setup();
    const { container } = renderFleetLiveMap();

    await waitFor(() => {
      expect(container.querySelector('.fleet-map-route')).toBeTruthy();
    });
    expect(screen.getByRole('img', { name: /demo fleet tracking map with vehicle markers/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open van 101 - north route details/i })).toBeInTheDocument();
    expect(screen.getByText(/avg utilization/i)).toBeInTheDocument();
    expect(screen.getByText(/vehicle utilization/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /open van 101 - north route details/i }));
    const drawer = screen.getByRole('complementary', { name: /van 101 - north route details/i });
    expect(within(drawer).getByText(/18 min/i)).toBeInTheDocument();
    expect(within(drawer).getByText(/88% active capacity/i)).toBeInTheDocument();
    expect(within(drawer).getByText(/route check/i)).toBeInTheDocument();
  });

  it('filters to vehicles on active routes', async () => {
    const user = userEvent.setup();
    const { container } = renderFleetLiveMap();

    await waitFor(() => {
      expect(container.querySelector('.fleet-map-route')).toBeTruthy();
    });
    await user.click(await screen.findByLabelText(/vehicles on active routes only/i));

    expect(screen.getByRole('button', { name: /open van 101 - north route details/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open truck 204 - depot details/i })).not.toBeInTheDocument();
  });
});
