import { useEffect, useMemo, useState } from 'react';
import { IconSparkles } from '@tabler/icons-react';
import { useEmergencyStore } from '../../store/emergencyStore';
import { ED_SCENARIO_DEMO_MODES } from '../../data/edScenarioFixtures';
import { useSimulationMode } from '../../contexts/SimulationModeContext';
import { useSystemConfig } from '../../contexts/SystemConfigContext';
import useProfileSwitcherVisibility from '../../hooks/useProfileSwitcherVisibility';
import useEmergencyRolePermissions from '../../hooks/useEmergencyRolePermissions';
import { useCopilotChromeAccess } from '../../hooks/useCopilotChromeAccess';
import SimulationModeToggle from '../simulation/SimulationModeToggle';
import DemoPersonaDrawer from '../account/DemoPersonaDrawer';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import { EMERGENCY_OS_BRANDING } from '../../config/emergencyOsBranding.config';
import type { CopilotShellTab } from '../copilot/CopilotShell';
import HelpTrigger from '../help/HelpTrigger';
import './SessionChromeBar.css';

function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || Boolean(import.meta.env.DEV);
}

export default function SessionChromeBar() {
  const surfaces = usePractitionerSurfaceVisibility();
  const { showSessionCopilot, copilotSurfaces } = useCopilotChromeAccess();
  const copilotOpen = useEmergencyStore((state) => state.copilotOpen);
  const toggleCopilot = useEmergencyStore((state) => state.toggleCopilot);
  const setCopilotOpen = useEmergencyStore((state) => state.setCopilotOpen);
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
  const [activeCopilotTab, setActiveCopilotTab] = useState<CopilotShellTab>('chat');

  const suppressDevSegments = !surfaces.chrome.showSessionDevSegments;
  const showSimulation =
    surfaces.chrome.showSessionSimulation && simulationEnabled && simulationActive;
  const showApiDegraded = configDegraded && !configLoading;
  const showDevSegment = isDev && !suppressDevSegments;
  const showApiSegment = showApiDegraded && !suppressDevSegments;
  const hasStatusSegments = showDevSegment || showSimulation || showApiSegment;

  const copilotTabs = useMemo(() => {
    const tabs: { id: CopilotShellTab; label: string }[] = [{ id: 'chat', label: 'Chat' }];
    if (copilotSurfaces.showContextTab) {
      tabs.push({ id: 'context', label: 'Context' });
    }
    if (copilotSurfaces.showSafetyTab) {
      tabs.push({ id: 'safety', label: 'Safety' });
    }
    return tabs;
  }, [copilotSurfaces.showContextTab, copilotSurfaces.showSafetyTab]);

  const openCopilotTab = (tab: CopilotShellTab) => {
    setActiveCopilotTab(tab);
    if (!copilotOpen) {
      setCopilotOpen(true);
    }
    window.dispatchEvent(new CustomEvent('ed:copilot-set-tab', { detail: { tab } }));
  };

  useEffect(() => {
    const handleTabChanged = (event: Event) => {
      const tab = (event as CustomEvent<{ tab?: CopilotShellTab }>).detail?.tab;
      if (tab) {
        setActiveCopilotTab(tab);
      }
    };
    window.addEventListener('ed:copilot-tab-changed', handleTabChanged);
    return () => window.removeEventListener('ed:copilot-tab-changed', handleTabChanged);
  }, []);

  return (
    <div
      className={[
        'session-chrome-bar',
        showSessionCopilot ? 'session-chrome-bar--with-copilot' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-live="polite"
    >
      <div className="session-chrome-bar__segments">
        {showSessionCopilot ? (
          <div
            className="session-chrome-bar__copilot-group"
            role="group"
            aria-label={`${EMERGENCY_OS_BRANDING.copilotName} controls`}
          >
            <button
              type="button"
              className={[
                'session-chrome-bar__segment',
                'session-chrome-bar__segment--copilot',
                copilotOpen ? 'session-chrome-bar__segment--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={copilotOpen}
              title={`${copilotOpen ? 'Close' : 'Open'} ${EMERGENCY_OS_BRANDING.copilotName} (C)`}
              onClick={toggleCopilot}
            >
              <IconSparkles size={14} stroke={1.75} aria-hidden />
              <strong>{EMERGENCY_OS_BRANDING.copilotName}</strong>
              <span>{copilotOpen ? 'Panel open' : 'Press C'}</span>
            </button>
            {copilotTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={[
                  'session-chrome-bar__pill',
                  'session-chrome-bar__pill--copilot-tab',
                  copilotOpen && activeCopilotTab === tab.id
                    ? 'session-chrome-bar__pill--active'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={copilotOpen && activeCopilotTab === tab.id}
                onClick={() => openCopilotTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : null}
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
        <HelpTrigger variant="pill" label="Guide ?" tab="page" />
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