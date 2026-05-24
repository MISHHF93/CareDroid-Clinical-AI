import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import LiveTrackingMap from './LiveTrackingMap';
import FleetLiveMap from './fleet/FleetLiveMap';
import { mockCompactViewport, mockToolPreferencesValue } from '../test/testRenderUtils';

const mocks = vi.hoisted(() => ({
  fetchFleetLiveTrackingSnapshot: vi.fn(),
}));

vi.mock('../contexts/ToolPreferencesContext', () => ({
  useToolPreferences: () => mockToolPreferencesValue,
}));

vi.mock('../services/fleetTelemetryService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchFleetLiveTrackingSnapshot: (...args) => mocks.fetchFleetLiveTrackingSnapshot(...args),
  };
});

const fleetSnapshot = {
  sourceLabel: 'Demo fleet live tracking - backend vehicle GPS and active-route endpoints are not connected',
  message: 'Fleet map uses demo coordinates only.',
  backendStatus: {
    implemented: false,
    plannedEndpoints: ['/api/fleet/vehicles/live', '/api/fleet/routes/active'],
  },
  summary: {
    totalVehicles: 2,
    activeVehicles: 1,
    availableVehicles: 0,
    staleVehicles: 1,
    offlineVehicles: 1,
    activeRoutes: 1,
    delayedRoutes: 0,
    activeAlerts: 2,
    updatedAt: '2026-05-24T05:00:00.000Z',
    source: 'demo-fleet-live-tracking',
  },
  routes: [
    {
      id: 'route-alpha',
      name: 'Alpha route',
      vehicleId: 'VH-500',
      status: 'active',
      etaMinutes: 14,
      stopsRemaining: 2,
      path: [
        { x: 20, y: 60 },
        { x: 44, y: 32 },
        { x: 70, y: 20 },
      ],
    },
  ],
  alerts: [
    {
      id: 'alert-vh-500-stale',
      vehicleId: 'VH-500',
      severity: 'medium',
      title: 'Stale GPS coordinate',
      detail: 'Vehicle coordinate is older than the review threshold.',
      triggeredAt: '2026-05-24T04:40:00.000Z',
    },
    {
      id: 'alert-vh-900-offline',
      vehicleId: 'VH-900',
      severity: 'high',
      title: 'Offline or stale GPS',
      detail: 'Vehicle has not reported recently.',
      triggeredAt: '2026-05-24T03:40:00.000Z',
    },
  ],
  vehicles: [
    {
      id: 'VH-500',
      label: 'Van 500 - Test route',
      status: 'active',
      freshness: 'stale',
      maintenanceStatus: 'ok',
      etaMinutes: 14,
      energyType: 'electric',
      energyPercent: 48,
      utilizationPercent: 70,
      driver: 'Test Driver',
      coordinates: { latitude: 40.75, longitude: -73.98 },
      mapPosition: { x: 44, y: 32 },
      heading: 90,
      speedMph: 18,
      routeId: 'route-alpha',
      destination: 'Test Clinic',
      lastSeenAt: '2026-05-24T04:40:00.000Z',
      locationSource: 'Demo GPS coordinate',
    },
    {
      id: 'VH-900',
      label: 'Truck 900 - Workshop',
      status: 'maintenance',
      freshness: 'offline',
      maintenanceStatus: 'scheduled_service',
      etaMinutes: null,
      energyType: 'diesel',
      energyPercent: 20,
      utilizationPercent: 0,
      driver: null,
      coordinates: { latitude: 40.71, longitude: -74.01 },
      mapPosition: { x: 18, y: 64 },
      heading: 0,
      speedMph: 0,
      routeId: null,
      destination: 'Workshop',
      lastSeenAt: '2026-05-24T03:40:00.000Z',
      locationSource: 'Demo yard coordinate',
    },
  ],
};

function renderWithRoute(ui, route) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

describe('Live tracking map experiences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompactViewport(false);
    mocks.fetchFleetLiveTrackingSnapshot.mockResolvedValue(fleetSnapshot);
  });

  it('renders /live-map with combined demo markers and detail drawer', async () => {
    const user = userEvent.setup();
    renderWithRoute(<LiveTrackingMap />, '/live-map');

    expect(await screen.findByRole('heading', { level: 1, name: /^live tracking map$/i })).toBeInTheDocument();
    expect(screen.getByText(/demo operations telemetry/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /combined tracking canvas/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /open van 500 - test route details/i }));
    const drawer = screen.getByRole('complementary', { name: /van 500 - test route details/i });
    expect(within(drawer).getByText(/demo gps coordinate/i)).toBeInTheDocument();
    expect(within(drawer).getByText(/fleet tracking support only/i)).toBeInTheDocument();
  });

  it('filters /live-map markers by layer and renders empty filter state', async () => {
    const user = userEvent.setup();
    renderWithRoute(<LiveTrackingMap />, '/live-map');

    await screen.findByRole('heading', { level: 1, name: /^live tracking map$/i });
    await user.selectOptions(screen.getByRole('combobox', { name: /layer/i }), 'fleet');
    expect(screen.getByRole('button', { name: /open van 500 - test route details/i })).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox', { name: /search marker/i }), 'no marker should match');
    expect(await screen.findByRole('heading', { name: /no markers match the filters/i })).toBeInTheDocument();
  });

  it('renders /fleet/map with vehicle markers, filters, stale state, and drawer', async () => {
    const user = userEvent.setup();
    renderWithRoute(<FleetLiveMap />, '/fleet/map');

    expect(await screen.findByRole('heading', { level: 1, name: /fleet live map/i })).toBeInTheDocument();
    expect(screen.getByText(/demo fleet live tracking/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /fleet vehicle live map/i })).toBeInTheDocument();
    expect(screen.getByText(/last updated required/i)).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: /gps freshness/i }), 'offline');
    expect(screen.getByRole('button', { name: /open truck 900 - workshop details/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /open truck 900 - workshop details/i }));
    const drawer = screen.getByRole('complementary', { name: /truck 900 - workshop details/i });
    expect(within(drawer).getByText(/offline or stale gps/i)).toBeInTheDocument();
    expect(within(drawer).getByText(/demo yard coordinate/i)).toBeInTheDocument();
  });

  it('renders backend failure states for both live map routes', async () => {
    mocks.fetchFleetLiveTrackingSnapshot.mockRejectedValue(new Error('Fleet live endpoint unavailable'));

    renderWithRoute(<FleetLiveMap />, '/fleet/map');
    expect(await screen.findByRole('alert')).toHaveTextContent(/fleet live endpoint unavailable/i);

    renderWithRoute(<LiveTrackingMap />, '/live-map');
    await waitFor(() => {
      expect(screen.getAllByRole('alert').some((alert) => /fleet live endpoint unavailable/i.test(alert.textContent || ''))).toBe(true);
    });
  });

  it('keeps map canvases present under compact mobile layout', async () => {
    mockCompactViewport(true);
    const { container } = renderWithRoute(<FleetLiveMap />, '/fleet/map');

    expect(await screen.findByRole('heading', { level: 1, name: /fleet live map/i })).toBeInTheDocument();
    expect(container.querySelector('.fleet-live-map-page')).toBeTruthy();
    expect(container.querySelector('.fleet-map-canvas')).toBeTruthy();
    expect(container.querySelector('.fleet-map-detail')).toBeTruthy();
  });
});
