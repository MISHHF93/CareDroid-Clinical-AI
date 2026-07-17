import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SimulationScenarioPlayer from './SimulationScenarioPlayer';
import { listSimulationRuns } from '../../services/simulationScoringService';

function renderPlayer(scenarioId = 'sepsis-deterioration') {
  return render(
    <MemoryRouter initialEntries={[`/training/simulation/${scenarioId}`]}>
      <Routes>
        <Route path="/training/simulation/:scenarioId" element={<SimulationScenarioPlayer />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe('SimulationScenarioPlayer — IX15 scoring wiring', () => {
  it('records a run to local practice history and discloses no-prod-write, without any network call', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch' as never).mockImplementation(() => {
      throw new Error('scenario scoring must never reach the network');
    });

    renderPlayer();

    fireEvent.click(screen.getByRole('button', { name: /Recognize possible septic shock/i }));
    const saveButton = await screen.findByTestId('scenario-record-run');
    fireEvent.click(saveButton);

    const disclosure = await screen.findByTestId('scenario-run-recorded');
    expect(disclosure.textContent).toMatch(/never written to any\s+patient record or backend/);

    const runs = listSimulationRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0].scenarioId).toBe('sepsis-deterioration');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('lets the user practice again, clearing the recorded state without duplicating history until re-saved', async () => {
    renderPlayer();

    fireEvent.click(screen.getByRole('button', { name: /Recognize possible septic shock/i }));
    fireEvent.click(await screen.findByTestId('scenario-record-run'));
    await screen.findByTestId('scenario-run-recorded');
    expect(listSimulationRuns()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /Practice again/i }));
    expect(screen.queryByTestId('scenario-run-recorded')).not.toBeInTheDocument();
    expect(listSimulationRuns()).toHaveLength(1);
  });

  it('toggling an action after saving clears the recorded confirmation, requiring an explicit re-save', async () => {
    renderPlayer();

    const actionButton = screen.getByRole('button', { name: /Recognize possible septic shock/i });
    fireEvent.click(actionButton);
    fireEvent.click(await screen.findByTestId('scenario-record-run'));
    await screen.findByTestId('scenario-run-recorded');

    fireEvent.click(screen.getByRole('button', { name: /Repeat vitals and mental status/i }));
    expect(screen.queryByTestId('scenario-run-recorded')).not.toBeInTheDocument();
    expect(screen.getByTestId('scenario-record-run')).toBeInTheDocument();
  });
});
