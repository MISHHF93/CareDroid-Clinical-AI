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

  if (!surfaces.chrome.showEdDataSourceBanner) {
    return null;
  }
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
  if (!warnStale && !hasError) {
    return null;
  }

  return (
    <p
      className={`ed-data-source${warnStale ? ' ed-data-source--stale' : ''}${compact ? ' ed-data-source--compact' : ''} ${className}`.trim()}
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