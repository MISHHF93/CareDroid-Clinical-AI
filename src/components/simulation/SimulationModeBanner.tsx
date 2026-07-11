import { useState } from 'react';
import { useEmergencyStore } from '../../store/emergencyStore';
import { ED_SCENARIO_DEMO_MODES } from '../../data/edScenarioFixtures';
import { useSimulationMode } from '../../contexts/SimulationModeContext';
import PlatformFeatureTransparencyPanel from './PlatformFeatureTransparencyPanel';
import SimulationModeToggle from './SimulationModeToggle';
import './SimulationModeBanner.css';

export default function SimulationModeBanner() {
  const { enabled, active } = useSimulationMode();
  const [showTransparency, setShowTransparency] = useState(false);
  const activeScenarioId = useEmergencyStore((state) => state.activeScenarioId);
  const scenarioLabel =
    ED_SCENARIO_DEMO_MODES.find((scenario) => scenario.id === activeScenarioId)?.shortLabel ||
    'Training scenario';

  if (!enabled || !active) {
    return null;
  }

  return (
    <div
      className={`simulation-mode-banner${showTransparency ? ' simulation-mode-banner--stacked' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="simulation-mode-banner__content">
        <span className="simulation-mode-banner__badge">Simulation mode</span>
        <span className="simulation-mode-banner__summary">
          Training and QA only — mock generators replace live patient data ({scenarioLabel}).
          Operational decisions must not rely on this session.
        </span>
      </div>
      <div className="simulation-mode-banner__actions">
        {showTransparency ? (<button
          type="button"
          className="simulation-mode-banner__link"
          onClick={() => setShowTransparency((open) => !open)}
          aria-expanded="true"
        >
          {showTransparency ? 'Hide feature status' : 'Live vs demo vs planned'}
        </button>) : (<button
          type="button"
          className="simulation-mode-banner__link"
          onClick={() => setShowTransparency((open) => !open)}
          aria-expanded="false"
        >
          {showTransparency ? 'Hide feature status' : 'Live vs demo vs planned'}
        </button>)}
        <SimulationModeToggle variant="banner" />
      </div>
      {showTransparency ? (
        <div className="simulation-mode-banner__panel">
          <PlatformFeatureTransparencyPanel compact />
        </div>
      ) : null}
    </div>
  );
}