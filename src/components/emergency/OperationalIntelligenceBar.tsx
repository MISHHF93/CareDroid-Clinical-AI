import { memo } from 'react';
import { Link } from 'react-router-dom';
import { BrainCircuit } from 'lucide-react';
import useAiChiefOrchestrator from '../../hooks/useAiChiefOrchestrator';
import useUnifiedOperationalIntelligence from '../../hooks/useUnifiedOperationalIntelligence';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import './operational-intelligence-bar.css';

/**
 * Merges the former AiChiefOrchestrationBar + UnifiedOperationalIntelligenceCommandBar into
 * one identity/signals/insight/actions block. Both hooks read the same
 * useOperationalIntelligenceCore snapshot underneath, so calling both here (instead of two
 * sibling components each calling one) removes the duplicate card without losing either
 * hook's unique fields (AI Chief's risks/recommendations/knowledge graph vs. the unified
 * hook's bottleneck/congestion counts and backend source/freshness).
 */
function OperationalIntelligenceBar() {
  const surfaces = usePractitionerSurfaceVisibility();
  const aiChief = useAiChiefOrchestrator({ realtime: false });
  const unified = useUnifiedOperationalIntelligence({ realtime: false });

  if (!surfaces.emergencyRoutes.showAiChiefBar) {
    return null;
  }

  const criticalDomainCount = Math.max(aiChief.criticalDomainCount, unified.criticalDomainCount);
  const watchDomainCount = Math.max(aiChief.watchDomainCount, unified.watchDomainCount);
  const tone =
    criticalDomainCount > 0 || aiChief.snapshot.metrics.unacknowledgedCriticalAlerts > 0
      ? 'critical'
      : watchDomainCount > 0
        ? 'warning'
        : 'neutral';

  const insightRisk = aiChief.topRisk;
  const insightRecommendation = aiChief.topRecommendation;
  const fallbackInsight = !insightRisk && !insightRecommendation ? unified.topInsight : null;
  const actionRoute = insightRecommendation?.route || fallbackInsight?.route || null;

  return (
    <aside
      className={`operational-intelligence-bar operational-intelligence-bar--${tone}`}
      aria-label="AI Chief and operational intelligence status"
    >
      <div className="operational-intelligence-bar__identity">
        <BrainCircuit size={16} aria-hidden="true" />
        <strong>AI Chief</strong>
        <span className="operational-intelligence-bar__domains">
          {criticalDomainCount > 0
            ? `${criticalDomainCount} critical domain${criticalDomainCount === 1 ? '' : 's'}`
            : watchDomainCount > 0
              ? `${watchDomainCount} domain${watchDomainCount === 1 ? '' : 's'} on watch`
              : 'All domains stable'}
        </span>
        <span className="operational-intelligence-bar__source">
          {unified.source === 'degraded' ? 'degraded feed' : 'live feed'}
        </span>
      </div>

      <div
        className="operational-intelligence-bar__signals"
        role="status"
        aria-live="polite"
        aria-atomic="false"
      >
        <span>{aiChief.snapshot.metrics.activePatients} active</span>
        <span>{aiChief.snapshot.metrics.p1p2Patients} P1/P2</span>
        <span>{aiChief.snapshot.metrics.inboundEms} EMS inbound</span>
        {aiChief.snapshot.metrics.unacknowledgedCriticalAlerts > 0 ? (
          <span className="operational-intelligence-bar__alert">
            {aiChief.snapshot.metrics.unacknowledgedCriticalAlerts} unacked critical
          </span>
        ) : null}
        <span>{unified.unifiedSnapshot.metrics.activeBottlenecks} bottlenecks</span>
        <span>{unified.unifiedSnapshot.metrics.congestionPredictions} congestion</span>
        {aiChief.knowledgeGraphSummary.criticalNodes.length > 0 ? (
          <span>{aiChief.knowledgeGraphSummary.criticalNodes.length} graph signals</span>
        ) : null}
      </div>

      <div className="operational-intelligence-bar__insight">
        {insightRisk ? (
          <p className="operational-intelligence-bar__risk" title={insightRisk.summary}>
            <strong>Risk:</strong> {insightRisk.title}
          </p>
        ) : null}
        {insightRecommendation ? (
          <p
            className="operational-intelligence-bar__recommendation"
            title={insightRecommendation.rationale}
          >
            <strong>Suggest:</strong> {insightRecommendation.action}
          </p>
        ) : fallbackInsight ? (
          <p className="operational-intelligence-bar__recommendation" title={fallbackInsight.summary}>
            <strong>Insight:</strong> {fallbackInsight.title}
          </p>
        ) : (
          <p className="operational-intelligence-bar__recommendation operational-intelligence-bar__recommendation--idle">
            Monitoring patient flow, capacity, staffing, and alerts — advisory only.
          </p>
        )}
      </div>

      <div className="operational-intelligence-bar__actions">
        {actionRoute ? (
          <Link to={actionRoute} className="operational-intelligence-bar__action">
            Open workflow
          </Link>
        ) : null}
        <Link to={CANONICAL_ROUTES.emergencyCopilot} className="operational-intelligence-bar__action">
          Ask AI Chief
        </Link>
        <Link
          to={CANONICAL_ROUTES.emergencyCommandCenter}
          className="operational-intelligence-bar__action"
        >
          Command center
        </Link>
      </div>
    </aside>
  );
}

export default memo(OperationalIntelligenceBar);
