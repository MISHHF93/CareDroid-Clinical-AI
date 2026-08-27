import {
  resolveEdDataSourcePresentation,
  type EdDataSourceInput,
} from '../../utils/edDataSource';
import { useSimulationMode } from '../../contexts/SimulationModeContext';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import './EdDataSourceBanner.css';

type EdDataSourceBannerProps = EdDataSourceInput & {
  className?: string;
  compact?: boolean;
};

export default function EdDataSourceBanner({
  className = '',
  compact = false,
  ...input
}: EdDataSourceBannerProps) {
  const surfaces = usePractitionerSurfaceVisibility();
  const { active: simulationModeActive } = useSimulationMode();

  const { sourceLabel, freshness, warnStale } = resolveEdDataSourcePresentation({
    ...input,
    simulationModeActive,
  });

  // Clinical UX: only surface data-source lines when something is wrong (stale/error).
  // Healthy “demo/local” labels are noise for medical staff.
  if (input.loading && !input.envelope) {
    return null;
  }

  const hasError = Boolean(input.error);

  // "Backend unavailable" is safety-relevant clinical information (clinicians
  // need to know their data may be stale/incomplete during a real outage) and
  // must never be swept into the same suppression flag as the cosmetic
  // "just stale, still connected" freshness note below -- that one alone
  // stays gated behind showEdDataSourceBanner, which pilot-customer cleanup
  // mode is allowed to suppress as noise.
  if (hasError) {
    if (!surfaces.chrome.showBackendUnavailableIndicator) {
      return null;
    }
  } else {
    if (!surfaces.chrome.showEdDataSourceBanner) {
      return null;
    }
    if (!warnStale) {
      return null;
    }
  }

  return (
    <p
      className={`ed-data-source${warnStale ? ' ed-data-source--stale' : ''}${hasError ? ' ed-data-source--error' : ''}${compact ? ' ed-data-source--compact' : ''} ${className}`.trim()}
      role="status"
      title={
        warnStale ? 'Data may be stale. Validate against current department state.' : undefined
      }
    >
      {hasError ? (
        <span className="ed-data-source__warn">Department data unavailable — check connection</span>
      ) : (
        <>
          <span className="ed-data-source__warn">Data may be stale</span>
          <span className="ed-data-source__sep" aria-hidden>
            {' '}
            ·{' '}
          </span>
          <span>{freshness.label}</span>
        </>
      )}
      {sourceLabel && warnStale ? (
        <>
          <span className="ed-data-source__sep" aria-hidden>
            {' '}
            ·{' '}
          </span>
          <span className="ed-data-source__label">{sourceLabel}</span>
        </>
      ) : null}
    </p>
  );
}