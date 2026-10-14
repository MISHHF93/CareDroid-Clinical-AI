import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MobilitySimulationCenter from './MobilitySimulationCenter';

describe('MobilitySimulationCenter', () => {
  it('renders simulation testbed with presets and execution pipeline', () => {
    render(<MobilitySimulationCenter />);

    expect(
      screen.getByText(/Mobility & Autonomous Logistics Simulation Testbed/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Select Operational Scenario/i)).toBeInTheDocument();
    expect(screen.getByText(/Autonomous Execution Pipeline/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Execute Scenario/i })).toBeInTheDocument();
  });

  it('selects a different simulation scenario from presets', () => {
    render(<MobilitySimulationCenter />);

    const chemoScenario = screen.getByText(/Internal Hospital STAT Chemotherapy Delivery/i);
    fireEvent.click(chemoScenario);

    expect(
      screen.getAllByText(/Internal Hospital STAT Chemotherapy Delivery/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Target Platform: MediRover Alpha AMR/i)).toBeInTheDocument();
  });
});
