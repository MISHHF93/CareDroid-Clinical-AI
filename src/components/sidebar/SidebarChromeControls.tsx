import { IconHelpCircle, IconRefresh } from '@tabler/icons-react';
import { useSystemConfig } from '../../contexts/SystemConfigContext';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import { dispatchOpenHelpHub } from '../../contexts/HelpHubContext';
import './SidebarChromeControls.css';

/**
 * Sidebar session utilities for staff: Help (single entry) + Retry when API is down.
 * No static Dev/demo labels in clinical UX.
 */
export default function SidebarChromeControls() {
  const surfaces = usePractitionerSurfaceVisibility();
  const { configDegraded, loading: configLoading, refresh } = useSystemConfig();

  const suppressDevSegments = !surfaces.chrome.showSessionDevSegments;
  const showApiDegraded = configDegraded && !configLoading && !suppressDevSegments;

  return (
    <section className="sidebar-chrome-controls" aria-label="Session controls">
      <div className="sidebar-chrome-controls__group">
        <span className="sidebar-nav-group__label">Tools</span>
        <div className="sidebar-chrome-controls__stack">
          <button
            type="button"
            className="sidebar-chrome-control"
            onClick={() => dispatchOpenHelpHub({ tab: 'page' })}
            title="Open Help Center (?)"
          >
            <IconHelpCircle size={16} stroke={2} className="sidebar-chrome-control__icon" aria-hidden />
            <span className="sidebar-chrome-control__label">Help</span>
          </button>

          {showApiDegraded ? (
            <button
              type="button"
              className="sidebar-chrome-control sidebar-chrome-control--meta"
              onClick={() => void refresh()}
            >
              <IconRefresh size={16} stroke={2} className="sidebar-chrome-control__icon" aria-hidden />
              <span className="sidebar-chrome-control__label">Retry connection</span>
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
