import { useSystemConfig } from '../../contexts/SystemConfigContext';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import './SessionChromeBar.css';

/**
 * Minimal session status for staff — only actionable degradation (API down).
 * Dev / demo / training labels are not shown in clinical chrome.
 */
export default function SessionChromeBar() {
  const surfaces = usePractitionerSurfaceVisibility();
  const { configDegraded, loading: configLoading, refresh } = useSystemConfig();

  const suppressDevSegments = !surfaces.chrome.showSessionDevSegments;
  const showApiDegraded = configDegraded && !configLoading && !suppressDevSegments;

  if (!showApiDegraded) {
    return null;
  }

  return (
    <div
      className="session-chrome-bar session-chrome-bar--status-only"
      role="status"
      aria-live="polite"
    >
      <div className="session-chrome-bar__segments">
        <span className="session-chrome-bar__segment session-chrome-bar__segment--warning">
          <strong>Connection</strong>
          <span>Settings unavailable</span>
        </span>
      </div>
      <div className="session-chrome-bar__actions">
        <button type="button" className="session-chrome-bar__retry" onClick={() => void refresh()}>
          Retry
        </button>
      </div>
    </div>
  );
}
