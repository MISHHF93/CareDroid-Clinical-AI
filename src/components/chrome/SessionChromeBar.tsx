import { useSimulationMode } from '../../contexts/SimulationModeContext';
import { useSystemConfig } from '../../contexts/SystemConfigContext';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import { ED_SCENARIO_DEMO_MODES } from '../../data/edScenarioFixtures';
import { useEmergencyStore } from '../../store/emergencyStore';
import './SessionChromeBar.css';

function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || Boolean(import.meta.env.DEV);
}

/** Compact status strip for session state that should stay visible outside the route body. */
export default function SessionChromeBar() {
  const surfaces = usePractitionerSurfaceVisibility();
  const activeScenarioId = useEmergencyStore((state) => state.activeScenarioId);
  const { enabled: simulationEnabled, active: simulationActive } = useSimulationMode();
  const { configDegraded, loading: configLoading, refresh } = useSystemConfig();

  const suppressDevSegments = !surfaces.chrome.showSessionDevSegments;
  const showSimulation =
    surfaces.chrome.showSessionSimulation && simulationEnabled && simulationActive;
  const showApiDegraded = configDegraded && !configLoading;
  const showDevSegment = isLocalDevHost() && !suppressDevSegments;
  const showApiSegment = showApiDegraded && !suppressDevSegments;
  const scenarioLabel =
    ED_SCENARIO_DEMO_MODES.find((scenario) => scenario.id === activeScenarioId)?.shortLabel ||
    'Training';

  if (!showDevSegment && !showSimulation && !showApiSegment) {
    return null;
  }

  return (
    <div className="session-chrome-bar session-chrome-bar--status-only" role="status" aria-live="polite">
      <div className="session-chrome-bar__segments">
        {showDevSegment ? (
          <span className="session-chrome-bar__segment">
            <strong>Dev</strong>
            <span>Local session</span>
          </span>
        ) : null}
        {showSimulation ? (
          <span className="session-chrome-bar__segment" data-show-detail="true">
            <strong>Simulation</strong>
            <span>{scenarioLabel} — mock data only</span>
          </span>
        ) : null}
        {showApiSegment ? (
          <span className="session-chrome-bar__segment session-chrome-bar__segment--warning">
            <strong>API</strong>
            <span>Settings unavailable — using defaults</span>
          </span>
        ) : null}
      </div>
      {showApiSegment ? (
        <div className="session-chrome-bar__actions">
          <button type="button" className="session-chrome-bar__retry" onClick={() => void refresh()}>
            Retry API
          </button>
        </div>
      ) : null}
    </div>
  );
}
