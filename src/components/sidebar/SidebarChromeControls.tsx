import { useEffect, useMemo, useState } from 'react';
import {
  IconHelpCircle,
  IconRefresh,
  IconSparkles,
} from '@tabler/icons-react';
import { useEmergencyStore } from '../../store/emergencyStore';
import { useSystemConfig } from '../../contexts/SystemConfigContext';
import { useCopilotChromeAccess } from '../../hooks/useCopilotChromeAccess';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import { dispatchOpenHelpHub } from '../../contexts/HelpHubContext';
import { EMERGENCY_OS_BRANDING } from '../../config/emergencyOsBranding.config';
import type { CopilotShellTab } from '../copilot/CopilotShell';
import './SidebarChromeControls.css';

function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || Boolean(import.meta.env.DEV);
}

export default function SidebarChromeControls() {
  const surfaces = usePractitionerSurfaceVisibility();
  const { showSessionCopilot, copilotSurfaces } = useCopilotChromeAccess();
  const copilotOpen = useEmergencyStore((state) => state.copilotOpen);
  const toggleCopilot = useEmergencyStore((state) => state.toggleCopilot);
  const setCopilotOpen = useEmergencyStore((state) => state.setCopilotOpen);
  const { configDegraded, loading: configLoading, refresh } = useSystemConfig();
  const [activeCopilotTab, setActiveCopilotTab] = useState<CopilotShellTab>('chat');

  const suppressDevSegments = !surfaces.chrome.showSessionDevSegments;
  const showApiDegraded = configDegraded && !configLoading;
  const showDevSegment = isLocalDevHost() && !suppressDevSegments;
  const showApiSegment = showApiDegraded && !suppressDevSegments;

  const copilotTabs = useMemo(() => {
    const tabs: { id: CopilotShellTab; label: string }[] = [{ id: 'chat', label: 'Chat' }];
    if (copilotSurfaces.showContextTab) tabs.push({ id: 'context', label: 'Ctx' });
    if (copilotSurfaces.showSafetyTab) tabs.push({ id: 'safety', label: 'Safe' });
    return tabs;
  }, [copilotSurfaces.showContextTab, copilotSurfaces.showSafetyTab]);

  const openCopilotTab = (tab: CopilotShellTab) => {
    setActiveCopilotTab(tab);
    if (!copilotOpen) setCopilotOpen(true);
    window.dispatchEvent(new CustomEvent('ed:copilot-set-tab', { detail: { tab } }));
  };

  useEffect(() => {
    const handleTabChanged = (event: Event) => {
      const tab = (event as CustomEvent<{ tab?: CopilotShellTab }>).detail?.tab;
      if (tab) setActiveCopilotTab(tab);
    };
    window.addEventListener('ed:copilot-tab-changed', handleTabChanged);
    return () => window.removeEventListener('ed:copilot-tab-changed', handleTabChanged);
  }, []);

  return (
    <section className="sidebar-chrome-controls" aria-label="Session controls">
      {showSessionCopilot ? (
        <div className="sidebar-chrome-controls__group">
          <span className="sidebar-nav-group__label">Copilot</span>
          <div className="sidebar-chrome-controls__stack">
            <button
              type="button"
              className={[
                'sidebar-chrome-control',
                copilotOpen ? 'sidebar-chrome-control--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-pressed={copilotOpen}
              title={`${copilotOpen ? 'Close' : 'Open'} ${EMERGENCY_OS_BRANDING.copilotName} (C)`}
              onClick={toggleCopilot}
            >
              <IconSparkles size={16} stroke={2} className="sidebar-chrome-control__icon" aria-hidden />
              <span className="sidebar-chrome-control__label">{EMERGENCY_OS_BRANDING.copilotName}</span>
            </button>
            <div
              className="sidebar-chrome-control-tabs"
              role="group"
              aria-label="Copilot panels"
              style={{ gridTemplateColumns: `repeat(${copilotTabs.length}, minmax(0, 1fr))` }}
            >
              {copilotTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={[
                    'sidebar-chrome-control-tab',
                    copilotOpen && activeCopilotTab === tab.id
                      ? 'sidebar-chrome-control-tab--active'
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
          </div>
        </div>
      ) : null}

      <div className="sidebar-chrome-controls__group">
        <span className="sidebar-nav-group__label">Tools</span>
        <div className="sidebar-chrome-controls__stack">
          <button
            type="button"
            className="sidebar-chrome-control"
            onClick={() => dispatchOpenHelpHub({ tab: 'page' })}
            title="Open CareDroid process guide (?)"
          >
            <IconHelpCircle size={16} stroke={2} className="sidebar-chrome-control__icon" aria-hidden />
            <span className="sidebar-chrome-control__label">Guide</span>
          </button>

          {showApiSegment ? (
            <button
              type="button"
              className="sidebar-chrome-control sidebar-chrome-control--meta"
              onClick={() => void refresh()}
            >
              <IconRefresh size={16} stroke={2} className="sidebar-chrome-control__icon" aria-hidden />
              <span className="sidebar-chrome-control__label">Retry API</span>
            </button>
          ) : null}

          {showDevSegment ? (
            <div className="sidebar-chrome-control sidebar-chrome-control--static" aria-label="Development mode">
              <span className="sidebar-chrome-control__label">Dev environment</span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
