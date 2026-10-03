import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HospitalAutonomousOperationsMatrix } from './HospitalAutonomousOperationsMatrix';
import { hospitalRoboticsFleetService } from '../../domain/robotics/hospitalRoboticsFleetService';
import { offlineStoreAndForwardQueue } from '../../domain/edge/offlineStoreAndForward';

describe('HospitalAutonomousOperationsMatrix Component', () => {
  beforeEach(async () => {
    // Reset any robotics interlocks so tests are fully isolated
    for (const r of hospitalRoboticsFleetService.listFleet()) {
      await hospitalRoboticsFleetService.resumeRobot(r.id);
    }
  });

  it('renders all 8 operational matrix cards and status indicators', () => {
    render(<HospitalAutonomousOperationsMatrix />);

    expect(screen.getByTestId('hospital-autonomous-matrix')).toBeInTheDocument();
    expect(screen.getByTestId('matrix-estop-badge')).toHaveTextContent(/FLEET STANDBY/i);
    expect(screen.getByTestId('matrix-fleet-card')).toBeInTheDocument();
    expect(screen.getByTestId('matrix-flight-card')).toBeInTheDocument();
    expect(screen.getByTestId('matrix-devices-card')).toBeInTheDocument();
    expect(screen.getByTestId('matrix-agents-card')).toBeInTheDocument();
    expect(screen.getByTestId('matrix-twin-card')).toBeInTheDocument();
    expect(screen.getByTestId('matrix-edge-card')).toBeInTheDocument();
    expect(screen.getByTestId('matrix-missions-card')).toBeInTheDocument();
    expect(screen.getByTestId('matrix-interop-card')).toBeInTheDocument();
  });

  it('trips emergency stop when E-stop button is clicked and allows reset', async () => {
    render(<HospitalAutonomousOperationsMatrix />);

    const estopButton = screen.getByTestId('matrix-estop-btn');
    expect(estopButton).toBeInTheDocument();

    fireEvent.click(estopButton);

    await waitFor(() => {
      expect(screen.getByTestId('matrix-estop-badge')).toHaveTextContent(/E-STOP ACTIVE/i);
      expect(screen.getByTestId('matrix-action-notice')).toHaveTextContent(
        /EMERGENCY STOP TRIPPED/i,
      );
    });

    // After E-Stop, Reset button appears
    const clearButton = screen.getByTestId('matrix-clear-estop-btn');
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);
    await waitFor(() => {
      expect(screen.getByTestId('matrix-estop-badge')).toHaveTextContent(/FLEET STANDBY/i);
    });
  });

  it('dispatches a logistics rover mission when button is clicked', async () => {
    render(<HospitalAutonomousOperationsMatrix />);

    const dispatchBtn = screen.getByTestId('matrix-dispatch-rover-btn');
    fireEvent.click(dispatchBtn);

    await waitFor(() => {
      expect(screen.getByTestId('matrix-action-notice')).toHaveTextContent(/dispatched/i);
    });
  });

  it('simulates surge on digital twin and updates projected bottleneck status', () => {
    render(<HospitalAutonomousOperationsMatrix />);

    const surgeBtn = screen.getByTestId('matrix-simulate-surge-btn');
    fireEvent.click(surgeBtn);

    expect(screen.getByTestId('matrix-simulation-status')).toHaveTextContent(/Surge simulated/i);
    expect(screen.getByTestId('matrix-action-notice')).toHaveTextContent(
      /surge projection calculated/i,
    );
  });

  it('synchronizes offline queue and updates pending status', async () => {
    // Stage an item in the queue first
    offlineStoreAndForwardQueue.enqueue({
      idempotencyKey: 'idemp-matrix-test-1',
      entityType: 'vital_reading',
      action: 'insert',
      payload: { hr: 88, spo2: 98 },
      targetEndpoint: '/api/vitals',
    });

    render(<HospitalAutonomousOperationsMatrix />);

    const syncBtn = screen.getByTestId('matrix-sync-edge-btn');
    fireEvent.click(syncBtn);

    await waitFor(() => {
      expect(screen.getByTestId('matrix-action-notice')).toHaveTextContent(
        /synchronized to upstream gateway/i,
      );
    });
  });

  it('activates an emergency mission briefing when button is clicked', async () => {
    render(<HospitalAutonomousOperationsMatrix />);

    const activateBtn = screen.getByTestId('matrix-activate-mission-btn');
    fireEvent.click(activateBtn);

    await waitFor(() => {
      expect(screen.getByTestId('matrix-action-notice')).toHaveTextContent(
        /activated by Incident Commander/i,
      );
    });
  });

  it('synthesizes and exports a FHIR R4 Bundle with clinical resources', async () => {
    render(<HospitalAutonomousOperationsMatrix />);

    const exportBtn = screen.getByTestId('matrix-export-fhir-btn');
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(screen.getByTestId('matrix-fhir-notice')).toHaveTextContent(
        /FHIR R4 Bundle synthesized/i,
      );
      expect(screen.getByTestId('matrix-action-notice')).toHaveTextContent(/HL7 US-Core profiles/i);
    });
  });
});
