import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MedicalRoboticsRegistryPanel from './MedicalRoboticsRegistryPanel';
import type { MobilityVehicle } from '../../domain/mobility/mobilityTypes';

const MOCK_VEHICLES: MobilityVehicle[] = [
  {
    id: 'veh-drone-02',
    name: 'AeroMed Falcon',
    type: 'DELIVERY_DRONE',
    vehicleType: 'medical_delivery_drone',
    manufacturer: 'Zipline',
    model: 'Platform 2',
    status: 'IDLE_AVAILABLE',
    operatingStatus: 'available',
    operatingMode: 'STANDBY',
    batteryPercent: 96,
    connectivity: { status: 'ONLINE', protocol: 'REST_BRIDGED', latencyMs: 24 },
    safetyInterlockEngaged: false,
    lastTelemetryIso: new Date().toISOString(),
    currentLocation: {
      facilityId: 'facility-metro-general',
      areaOrFloor: 'Helipad Pad 3',
    },
    temperatureChamber: {
      currentCelsius: 4.0,
      inRange: true,
    },
  },
];

describe('MedicalRoboticsRegistryPanel', () => {
  it('renders vehicle cards with status, battery and protocol', () => {
    render(<MedicalRoboticsRegistryPanel vehicles={MOCK_VEHICLES} />);

    expect(screen.getByText(/Medical Robotics & Autonomous Fleet Registry/i)).toBeInTheDocument();
    expect(screen.getByText('AeroMed Falcon')).toBeInTheDocument();
    expect(screen.getAllByText('Available').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('96%')).toBeInTheDocument();
    expect(screen.getByText(/4°C/i)).toBeInTheDocument();
  });

  it('triggers emergency interlock e-stop action', () => {
    const onAction = vi.fn();
    render(<MedicalRoboticsRegistryPanel vehicles={MOCK_VEHICLES} onExecuteAction={onAction} />);

    const estopBtn = screen.getByRole('button', { name: /Toggle Safety Interlock/i });
    expect(estopBtn).toBeInTheDocument();
    fireEvent.click(estopBtn);
    expect(onAction).toHaveBeenCalledWith('veh-drone-02', 'ENGAGE_ESTOP');
  });

  it('filters vehicles by search query', () => {
    render(<MedicalRoboticsRegistryPanel vehicles={MOCK_VEHICLES} />);

    const searchInput = screen.getByLabelText(/Filter robotics registry/i);
    fireEvent.change(searchInput, { target: { value: 'NonexistentVehicle' } });
    expect(screen.getByText(/No autonomous platforms match current filters/i)).toBeInTheDocument();
  });
});
