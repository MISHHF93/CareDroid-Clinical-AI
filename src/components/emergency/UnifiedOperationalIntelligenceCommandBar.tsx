import { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Radar } from 'lucide-react';
import useUnifiedOperationalIntelligence from '../../hooks/useUnifiedOperationalIntelligence';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { isHospitalOperationalPath } from './operationalCommandBarUtils';
import '../../styles/operational-command-bar-focus.css';
import './unified-operational-intelligence-command-bar.css';

function UnifiedOperationalIntelligenceCommandBar() {
  const { pathname } = useLocation();
  const surfaces = usePractitionerSurfaceVisibility();
  const { unifiedSnapshot, topInsight, criticalDomainCount, watchDomainCount, source } =
    useUnifiedOperationalIntelligence({ realtime: false });

  if (!surfaces.emergencyRoutes.showAiChiefBar || !isHospitalOperationalPath(pathname)) {
    return null;
  }

  if (!topInsight && criticalDomainCount === 0 && watchDomainCount === 0) {
    return null;
  }

  const tone =
    criticalDomainCount > 0 || topInsight?.severity === 'critical'
      ? 'critical'
      : watchDomainCount > 0 || topInsight?.severity === 'warning'
        ? 'warning'
        : 'neutral';

  return (
    <aside
      className={`unified-operational-intelligence-command-bar unified-operational-intelligence-command-bar--${tone}`}
      aria-label="Unified operational intelligence status"
    >
      <div className="unified-operational-intelligence-command-bar__identity">
        <Radar size={16} aria-hidden="true" />
        <strong>Operational intelligence</strong>
        <span className="unified-operational-intelligence-command-bar__source">
          {source === 'degraded' ? 'degraded' : 'backend'}
        </span>
        <span>
          {criticalDomainCount > 0
            ? `${criticalDomainCount} critical domain${criticalDomainCount === 1 ? '' : 's'}`
            : watchDomainCount > 0
              ? `${watchDomainCount} on watch`
              : 'Monitoring'}
        </span>
      </div>

      <div
        className="unified-operational-intelligence-command-bar__signals"
        role="status"
        aria-live="polite"
      >
        <span>{unifiedSnapshot.metrics.activeBottlenecks} bottlenecks</span>
        <span>{unifiedSnapshot.metrics.congestionPredictions} congestion</span>
        <span>{unifiedSnapshot.metrics.unresolvedAlerts} alerts</span>
        <span>{unifiedSnapshot.metrics.workflowPendingReview} reviews</span>
      </div>

      {topInsight ? (
        <p className="unified-operational-intelligence-command-bar__insight" title={topInsight.summary}>
          <strong>Top insight:</strong> {topInsight.title}
        </p>
      ) : (
        <p className="unified-operational-intelligence-command-bar__insight unified-operational-intelligence-command-bar__insight--idle">
          Backend event-driven operational model active — advisory only.
        </p>
      )}

      <div className="unified-operational-intelligence-command-bar__actions">
        {topInsight?.route ? (
          <Link
            to={topInsight.route}
            className="unified-operational-intelligence-command-bar__action"
          >
            Open workflow
          </Link>
        ) : null}
        <Link
          to={CANONICAL_ROUTES.emergencyCommandCenter}
          className="unified-operational-intelligence-command-bar__action"
        >
          Command center
        </Link>
      </div>
    </aside>
  );
}

export default memo(UnifiedOperationalIntelligenceCommandBar);