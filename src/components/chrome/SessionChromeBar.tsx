import { useState } from 'react';
import { useEmergencyStore } from '../../store/emergencyStore';
import { ED_SCENARIO_DEMO_MODES } from '../../data/edScenarioFixtures';
import { useSimulationMode } from '../../contexts/SimulationModeContext';
import { useSystemConfig } from '../../contexts/SystemConfigContext';
import useProfileSwitcherVisibility from '../../hooks/useProfileSwitcherVisibility';
import useEmergencyRolePermissions from '../../hooks/useEmergencyRolePermissions';
import SimulationModeToggle from '../simulation/SimulationModeToggle';
import DemoPersonaDrawer from '../account/DemoPersonaDrawer';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import './SessionChromeBar.css';

function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || Boolean(import.meta.env.DEV);
}

export default function SessionChromeBar() {
  const surfaces = usePractitionerSurfaceVisibility();
  const isDev = isLocalDevHost();
  const { enabled: simulationEnabled, active: simulationActive } = useSimulationMode();
  const activeScenarioId = useEmergencyStore((state) => state.activeScenarioId);
  const scenarioLabel =
    ED_SCENARIO_DEMO_MODES.find((scenario) => scenario.id === activeScenarioId)?.shortLabel ||
    'Training';
  const { configDegraded, loading: configLoading, refresh } = useSystemConfig();
  const showDemoPanel = useProfileSwitcherVisibility();
  const emergencyRole = useEmergencyRolePermissions();
  const [demoOpen, setDemoOpen] = useState(false);

  const suppressDevSegments = !surfaces.chrome.showSessionDevSegments;
  const showSimulation = simulationEnabled && simulationActive;
  const showApiDegraded = configDegraded && !configLoading;
  const showDevSegment = isDev && !suppressDevSegments;
  const showApiSegment = showApiDegraded && !suppressDevSegments;
  const hasSegments = showDevSegment || showSimulation || showApiSegment;

  if (!hasSegments && !showDemoPanel) {
    return null;
  }

  return (
    <div className="session-chrome-bar" role="status" aria-live="polite">
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

      <div className="session-chrome-bar__actions">
        {showDemoPanel ? (
          <button
            type="button"
            className="session-chrome-bar__pill"
            aria-expanded={demoOpen}
            aria-controls="session-chrome-demo-drawer"
            onClick={() => setDemoOpen((open) => !open)}
          >
            Demo · {emergencyRole.roleLabel || 'Profile'}
          </button>
        ) : null}
        {simulationEnabled ? <SimulationModeToggle variant="banner" /> : null}
        {showApiSegment ? (
          <button type="button" className="session-chrome-bar__retry" onClick={() => void refresh()}>
            Retry API
          </button>
        ) : null}
      </div>

      {showDemoPanel && demoOpen ? (
        <div id="session-chrome-demo-drawer" className="session-chrome-bar__drawer">
          <DemoPersonaDrawer onClose={() => setDemoOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}