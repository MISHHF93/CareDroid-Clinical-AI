import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import MedicalSimulationSuite from './MedicalSimulationSuite';
import SimulationScenarioPlayer from './SimulationScenarioPlayer';
import SimulationOutcomes from './SimulationOutcomes';
import LaboratoryDashboard from './LaboratoryDashboard';
import Medical3DViewer from './Medical3DViewer';

function renderPage(Page) {
  return render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>
  );
}

describe('simulation, laboratory, and 3D viewer pages', () => {
  it('renders simulation demo labels and scenario cards', () => {
    renderPage(MedicalSimulationSuite);
    expect(screen.getByRole('heading', { name: /medical simulation suite/i })).toBeInTheDocument();
    expect(screen.getByText(/demo training simulation - not live patient data/i)).toBeInTheDocument();
    expect(screen.getAllByText(/sepsis deterioration/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/stroke alert/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /launch scenario/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/profile segmentation/i)).toBeInTheDocument();
  });

  it('renders the scenario player, submits a decision, and shows debrief', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/simulation/sepsis-deterioration']}>
        <SimulationScenarioPlayer />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /sepsis deterioration/i })).toBeInTheDocument();
    expect(screen.getByText(/critical action checklist/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open lab panel/i })).toHaveAttribute('href', '/laboratory');

    await user.type(screen.getByPlaceholderText(/document your next action/i), 'Escalate and review lactate.');
    await user.click(screen.getByRole('button', { name: /submit decision/i }));
    await user.click(screen.getAllByRole('checkbox')[0]);
    await user.click(screen.getByRole('button', { name: /complete scenario/i }));

    expect(screen.getByRole('heading', { name: /debrief summary/i })).toBeInTheDocument();
    expect(screen.getByText(/what happened/i)).toBeInTheDocument();
    expect(screen.getByText(/ai tutor feedback/i)).toBeInTheDocument();
  });

  it('renders simulation outcomes metrics and recommended practice', () => {
    renderPage(SimulationOutcomes);
    expect(screen.getByRole('heading', { name: /simulation outcomes/i })).toBeInTheDocument();
    expect(screen.getByText(/demo outcomes dashboard/i)).toBeInTheDocument();
    expect(screen.getAllByText(/completion rate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/competency coverage/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/abnormal lab escalation/i)).toBeInTheDocument();
  });

  it('renders laboratory abnormal alerts, reference ranges, and specimen queue', () => {
    renderPage(LaboratoryDashboard);
    expect(screen.getByRole('heading', { name: /^laboratory$/i })).toBeInTheDocument();
    expect(screen.getByText(/demo laboratory dashboard - not live patient data/i)).toBeInTheDocument();
    expect(screen.getByText(/abnormal lab alerts and reference ranges/i)).toBeInTheDocument();
    expect(screen.getAllByText(/lactate/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/specimen queue/i).length).toBeGreaterThan(0);
  });

  it('renders the 3D viewer fallback without importing model assets', () => {
    renderPage(Medical3DViewer);
    expect(screen.getByRole('heading', { name: /^3d viewer$/i })).toBeInTheDocument();
    expect(screen.getByText(/asset-safe fallback/i)).toBeInTheDocument();
    expect(screen.getByText(/no external model asset loaded/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rotate placeholder model/i)).toBeInTheDocument();
  });
});
