import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DigitalTwinIntelligence from './DigitalTwinIntelligence';

vi.mock('./DigitalTwinIntelligence.css', () => ({}));

vi.mock('../data/platformOperatingSystem', () => ({
  buildDigitalTwinSnapshot: vi.fn(() => ({
    sourceLabel: 'Test digital twin',
    occupancy: { totalBeds: 10, occupiedBeds: 9 },
    floors: [{ id: 'icu', label: 'ICU', occupancy: 0.9, alerts: 2, devices: 8 }],
    rooms: [{ id: 'icu-1', label: 'ICU 1', telemetry: 'active', patientState: 'watch' }],
    fleet: [{ id: 'amb-1', label: 'Ambulance 1' }],
  })),
}));

vi.mock('../services/hospitalMapService', () => ({
  fetchHospitalMapSnapshot: vi.fn(async () => ({
    ok: true,
    snapshot: {
      rooms: [{ id: 'icu-1', roomNumber: 'ICU 1', activeAlertCount: 1, deviceCount: 1 }],
      beds: [{ id: 'bed-1', status: 'occupied' }, { id: 'bed-2', status: 'available' }],
      devices: [
        {
          id: 'monitor-1',
          name: 'ICU Monitor',
          status: 'offline',
          freshness: 'stale',
          battery: 12,
          maintenanceStatus: 'overdue',
          telemetry: [{ id: 'spo2', label: 'SpO2', status: 'stale', value: '88%' }],
        },
      ],
      alerts: [{ id: 'alert-1', title: 'Monitor offline', status: 'active', severity: 'high' }],
    },
  })),
}));

vi.mock('../services/medicalIotService', () => ({
  fetchMedicalIotSnapshot: vi.fn(async () => ({
    ok: true,
    snapshot: {
      devices: [{ id: 'iot-1', name: 'Pulse Ox', status: 'warning', battery: 18 }],
      vitals: [{ id: 'hr', label: 'HR', status: 'abnormal', value: '128' }],
      trends: [],
      alerts: [{ id: 'alert-2', title: 'IoT warning', status: 'active', severity: 'medium' }],
    },
  })),
}));

vi.mock('../services/fleetTelemetryService', () => ({
  fetchFleetLiveTrackingSnapshot: vi.fn(async () => ({
    summary: { averageUtilizationPercent: 80 },
    vehicles: [
      {
        id: 'VH-1',
        label: 'Vehicle 1',
        status: 'maintenance',
        maintenanceStatus: 'warning',
        energyPercent: 20,
        freshness: 'stale',
      },
    ],
    routes: [{ id: 'route-1', status: 'delayed' }],
    alerts: [{ id: 'fleet-alert', title: 'Fleet delayed', status: 'active', severity: 'medium' }],
  })),
}));

describe('DigitalTwinIntelligence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders health, risk, readiness scores and operational domains', async () => {
    render(
      <MemoryRouter>
        <DigitalTwinIntelligence />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /predictive operational twin/i })).toBeInTheDocument();
    expect(await screen.findByText(/operational twin intelligence assembled/i)).toBeVisible();
    expect(screen.getByText('Health Score')).toBeVisible();
    expect(screen.getByText('Risk Score')).toBeVisible();
    expect(screen.getByText('Readiness Score')).toBeVisible();
    expect(screen.getByText(/Rooms, devices, assets, telemetry, alerts, occupancy, maintenance/i)).toBeVisible();
    expect(screen.getByText('Alert queue')).toBeVisible();
    expect(screen.getByText('Telemetry degradation')).toBeVisible();
    expect(screen.getByText('Maintenance readiness')).toBeVisible();
  });

  it('links back to existing operational source surfaces', async () => {
    render(
      <MemoryRouter>
        <DigitalTwinIntelligence />
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText('Hospital Map')).toBeVisible());
    expect(screen.getByRole('link', { name: 'Digital Twin' })).toHaveAttribute('href', '/digital-twin');
    expect(screen.getByRole('link', { name: 'Hospital Map' })).toHaveAttribute('href', '/hospital-map');
    expect(screen.getByRole('link', { name: 'Medical IoT' })).toHaveAttribute('href', '/medical-iot');
    expect(screen.getByRole('link', { name: 'Devices' })).toHaveAttribute('href', '/devices');
    expect(screen.getByRole('link', { name: 'Fleet Map' })).toHaveAttribute('href', '/fleet/map');
  });
});
