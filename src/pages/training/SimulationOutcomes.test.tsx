import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SimulationOutcomes from './SimulationOutcomes';
import { SIMULATION_SCENARIOS } from '../../data/medicalSimulationCatalog';
import { recordSimulationRun } from '../../services/simulationScoringService';

function renderPage() {
  return render(
    <MemoryRouter>
      <SimulationOutcomes />
    </MemoryRouter>,
  );
}

const sepsis = SIMULATION_SCENARIOS.find((s) => s.id === 'sepsis-deterioration')!;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe('SimulationOutcomes — IX15 real-data wiring', () => {
  it('falls back to the seeded demo constants when no practice runs are recorded', () => {
    renderPage();
    expect(screen.getByText(/Demo-local outcome metrics for training review/)).toBeInTheDocument();
    expect(screen.queryByTestId('clear-practice-history')).not.toBeInTheDocument();
  });

  it('renders real aggregated metrics from recorded runs instead of the demo constants', () => {
    recordSimulationRun(sepsis, sepsis.criticalActions);
    renderPage();

    expect(screen.getByText(/Your own recorded practice runs \(1\)/)).toBeInTheDocument();
    expect(screen.getByText('Practice runs')).toBeInTheDocument();
    expect(screen.getByTestId('clear-practice-history')).toBeInTheDocument();
  });

  it('clearing practice history reverts the page to the honest demo fallback', () => {
    recordSimulationRun(sepsis, sepsis.criticalActions);
    renderPage();
    expect(screen.getByTestId('clear-practice-history')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('clear-practice-history'));

    expect(screen.queryByTestId('clear-practice-history')).not.toBeInTheDocument();
    expect(screen.getByText(/Demo-local outcome metrics for training review/)).toBeInTheDocument();
  });
});
