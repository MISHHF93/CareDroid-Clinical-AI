import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard } from '../dashboard/DashboardVisualizations';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { OPERATIONS_CENTER_SURFACES } from '../../data/digitalOperationsCenter';
import {
  applyLiveMetricsToSurfaces,
  buildLiveSurfaceMetrics,
  type OperationsLiveFeeds,
} from '../../utils/operationsHubLiveMetrics';

type OperationsLiveSnapshotPanelProps = {
  liveFeeds: OperationsLiveFeeds;
  loading?: boolean;
  lastRefreshed?: Date | null;
  onRefresh?: () => void;
  compact?: boolean;
};

const STRIP_SURFACE_IDS = ['hospital-map', 'medical-iot', 'fleet', 'notifications'] as const;

export default function OperationsLiveSnapshotPanel({
  liveFeeds,
  loading = false,
  lastRefreshed = null,
  onRefresh,
  compact = false,
}: OperationsLiveSnapshotPanelProps) {
  const stripSurfaces = useMemo(() => {
    const surfaces = OPERATIONS_CENTER_SURFACES.filter((surface) =>
      STRIP_SURFACE_IDS.includes(surface.id as (typeof STRIP_SURFACE_IDS)[number]),
    );
    return applyLiveMetricsToSurfaces(surfaces, liveFeeds);
  }, [liveFeeds]);

  const summaryMetrics = useMemo(
    () =>
      STRIP_SURFACE_IDS.map((surfaceId) => {
        const surface = stripSurfaces.find((row) => row.id === surfaceId);
        const metrics = buildLiveSurfaceMetrics(surfaceId, liveFeeds) || [];
        return {
          id: surfaceId,
          title: surface?.title || surfaceId,
          path: surface?.path || CANONICAL_ROUTES.operations,
          primary: metrics[0],
        };
      }),
    [liveFeeds, stripSurfaces],
  );

  return (
    <section
      className={`operations-live-snapshot${compact ? ' operations-live-snapshot--compact' : ''}`}
      aria-label="Operations live snapshot"
    >
      <div className="operations-live-snapshot__header">
        <div>
          <h2>Operations live snapshot</h2>
          <p>
            Hospital capacity, device telemetry, fleet readiness, and alert queue from the latest
            scan.
            {lastRefreshed ? ` Updated ${lastRefreshed.toLocaleTimeString()}.` : ''}
          </p>
        </div>
        <div className="operations-live-snapshot__actions">
          <Link to={CANONICAL_ROUTES.operations}>Open operations hub</Link>
          <Link to={CANONICAL_ROUTES.liveMap}>Live map</Link>
          {onRefresh ? (
            <button type="button" onClick={onRefresh} disabled={loading}>
              {loading ? 'Scanning…' : 'Refresh'}
            </button>
          ) : null}
        </div>
      </div>

      <div
        className="operations-live-snapshot__metrics"
        role="group"
        aria-label="Operations live summary metrics"
      >
        {summaryMetrics.map((row) => (
          <MetricCard
            key={row.id}
            label={row.title}
            value={row.primary?.value || '—'}
            hint={row.primary?.label || 'Live telemetry'}
            tone="neutral"
          />
        ))}
      </div>

      {!compact ? (
        <div className="operations-live-snapshot__grid">
          {stripSurfaces.map((surface) => (
            <Link key={surface.id} to={surface.path} className="operations-live-snapshot__surface">
              <strong>{surface.title}</strong>
              <div className="operations-live-snapshot__surface-metrics">
                {surface.metrics.map((metric) => (
                  <span key={metric.label}>
                    {metric.label}: {metric.value}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
