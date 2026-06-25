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

  if (input.loading && !input.envelope) {
    return (
      <p className={`ed-data-source ed-data-source--loading ${className}`.trim()} role="status">
        Loading department data…
      </p>
    );
  }

  return (
    <p
      className={`ed-data-source${warnStale ? ' ed-data-source--stale' : ''}${compact ? ' ed-data-source--compact' : ''} ${className}`.trim()}
      role="status"
      title={
        warnStale ? 'Data may be stale. Validate against current department state.' : undefined
      }
    >
      <span className="ed-data-source__label">Data source:</span> {sourceLabel}
      <span className="ed-data-source__sep" aria-hidden>
        {' '}
        ·{' '}
      </span>
      {freshness.label}
      {input.error ? (
        <>
          <span className="ed-data-source__sep" aria-hidden>
            {' '}
            ·{' '}
          </span>
          <span className="ed-data-source__warn">API unavailable — using local store</span>
        </>
      ) : null}
      {warnStale ? (
        <>
          <span className="ed-data-source__sep" aria-hidden>
            {' '}
            ·{' '}
          </span>
          <span className="ed-data-source__warn">validate before operational decisions</span>
        </>
      ) : null}
    </p>
  );
}