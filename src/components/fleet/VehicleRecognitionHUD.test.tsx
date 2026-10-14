import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import VehicleRecognitionHUD from './VehicleRecognitionHUD';
import type { MobilityVehicle } from '../../domain/mobility/mobilityTypes';

const MOCK_VEHICLES: MobilityVehicle[] = [
  {
    id: 'veh-amr-01',
    name: 'MediRover Alpha',
    type: 'INTERNAL_HOSPITAL_AMR',
    vehicleType: 'hospital_indoor_amr',
    manufacturer: 'Aethon',
    model: 'T3 Tug',
    status: 'ACTIVE_MISSION',
    operatingStatus: 'en_route',
    operatingMode: 'AUTONOMOUS',
    batteryPercent: 85,
    connectivity: { status: 'ONLINE', latencyMs: 14 },
    safetyInterlockEngaged: false,
    lastTelemetryIso: new Date().toISOString(),
    currentLocation: {
      facilityId: 'facility-metro-general',
      areaOrFloor: 'Tower B, Floor 3',
    },
  },
];

describe('VehicleRecognitionHUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders recognition HUD header, radar, and sensor telemetry', async () => {
    render(<VehicleRecognitionHUD vehicles={MOCK_VEHICLES} />);

    expect(screen.getByText(/Vehicle Recognition Intelligence Engine/i)).toBeInTheDocument();
    expect(screen.getByText(/Spatial Perception Field/i)).toBeInTheDocument();
    expect(screen.getByText(/Sensor Suite Health Telemetry/i)).toBeInTheDocument();
    expect(screen.getByText(/Recognition Test Bench/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Perception Status:/i)).toBeInTheDocument();
    });
  });

  it('allows switching vehicle from dropdown selector', () => {
    const onSelect = vi.fn();
    render(<VehicleRecognitionHUD vehicles={MOCK_VEHICLES} onSelectVehicle={onSelect} />);

    const select = screen.getByLabelText(/Select Autonomous Vehicle/i);
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: 'veh-amr-01' } });
    expect(onSelect).toHaveBeenCalledWith('veh-amr-01');
  });

  it('provides simulation injection controls', () => {
    render(<VehicleRecognitionHUD vehicles={MOCK_VEHICLES} />);

    expect(screen.getByRole('button', { name: /Simulate Clear Corridor/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Inject Gurney Obstacle/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Inject Sensor Degraded/i })).toBeInTheDocument();
  });
});
