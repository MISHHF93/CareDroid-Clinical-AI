import { useNavigate } from 'react-router-dom';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS, getToolIcon } from '../../navigation/iconRegistry';
import './fleetUxShared.css';

/**
 * Shared page content chrome for Fleet pages inside AppShell's main landmark.
 */
export function FleetOperationalBanner({ variant = 'default', children }) {
  const className =
    variant === 'critical'
      ? 'fleet-safety-banner fleet-safety-banner--critical'
      : 'fleet-safety-banner';

  return (
    <div className={className} role="note" aria-label="Operational limitations">
      {children}
    </div>
  );
}

export default function FleetPageChrome({
  toolId,
  title,
  lead,
  safetyNote,
  safetyVariant = 'default',
  mainId = 'fleet-page-main',
  children,
}) {
  const navigate = useNavigate();

  return (
    <>
      <a
        href={`#${mainId}`}
        className="fleet-skip-link"
        onClick={(event) => {
          const content = document.getElementById(mainId);
          if (!content) return;
          event.preventDefault();
          content.focus({ preventScroll: false });
        }}
      >
        Skip to main content
      </a>
      <header className="fleet-page-header">
        <button
          type="button"
          className="fleet-back-btn"
          onClick={() => navigate('/tools')}
          aria-label="Back to tools catalog"
        >
          <NavIcon icon={CHROME_ICONS.arrowLeft} size={16} aria-hidden />
          <span style={{ marginLeft: 6 }}>Back to tools</span>
        </button>
        <h1 id={`${toolId}-page-title`}>
          <NavIcon icon={getToolIcon(toolId)} size={28} aria-hidden />
          {title}
        </h1>
        {lead ? <p className="fleet-page-lead">{lead}</p> : null}
        {safetyNote ? (
          <FleetOperationalBanner variant={safetyVariant}>{safetyNote}</FleetOperationalBanner>
        ) : null}
      </header>
      <section
        id={mainId}
        className="fleet-page-content"
        tabIndex={-1}
        aria-labelledby={`${toolId}-page-title`}
      >
        {children}
      </section>
    </>
  );
}
