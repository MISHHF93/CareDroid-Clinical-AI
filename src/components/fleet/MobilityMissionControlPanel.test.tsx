import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MobilityMissionControlPanel from './MobilityMissionControlPanel';
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
    batteryPercent: 88,
    connectivity: { status: 'ONLINE', latencyMs: 14 },
    safetyInterlockEngaged: false,
    lastTelemetryIso: new Date().toISOString(),
    currentLocation: {
      facilityId: 'facility-metro-general',
      areaOrFloor: 'Corridor 3',
    },
  },
];

describe('MobilityMissionControlPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders mission control header, active queue, and cockpit', async () => {
    render(<MobilityMissionControlPanel vehicles={MOCK_VEHICLES} />);

    expect(screen.getByText(/Medical Mobility Mission Dispatch & Logistics/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Mission/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Active Dispatch Queue/i)).toBeInTheDocument();
    });
  });

  it('opens and closes the new mission scheduling modal', async () => {
    render(<MobilityMissionControlPanel vehicles={MOCK_VEHICLES} />);

    const newBtn = screen.getByRole('button', { name: /New Mission/i });
    fireEvent.click(newBtn);

    expect(screen.getByText(/Schedule New Medical Delivery Mission/i)).toBeInTheDocument();

    const closeBtn = screen.getByLabelText(/Close dialog/i);
    fireEvent.click(closeBtn);

    expect(screen.queryByText(/Schedule New Medical Delivery Mission/i)).not.toBeInTheDocument();
  });
});
