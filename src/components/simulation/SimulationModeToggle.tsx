import { useSimulationMode } from '../../contexts/SimulationModeContext';
import './SimulationModeToggle.css';

type SimulationModeToggleProps = {
  variant?: 'header' | 'banner';
};

export default function SimulationModeToggle({ variant = 'header' }: SimulationModeToggleProps) {
  const { enabled, active, toggle } = useSimulationMode();

  if (!enabled) {
    return null;
  }

  return (
    <button
      type="button"
      className={`simulation-mode-toggle simulation-mode-toggle--${variant}`}
      onClick={toggle}
      aria-pressed={active}
      title={
        active
          ? 'Simulation mode is on — mock data only. Click to return to live data sources.'
          : 'Enable simulation mode for training and QA without touching live patient data.'
      }
    >
      <span className="simulation-mode-toggle__indicator" aria-hidden />
      {active ? 'Simulation on' : 'Simulation off'}
    </button>
  );
}