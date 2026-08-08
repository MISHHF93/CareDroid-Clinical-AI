import { Link } from 'react-router-dom';
import { Activity, RefreshCw } from 'lucide-react';
import useUnifiedOperationalIntelligence from '../../hooks/useUnifiedOperationalIntelligence';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import type {
  UnifiedOperationalIntelligenceDomainStatus,
  UnifiedOperationalIntelligenceInsight,
} from '../../config/unifiedOperationalIntelligenceModel';
import { AiTruthLabel, hospitalCommandCenterRecommendationsTruthLabel } from '../ai/AiTruthLabel';
import './unified-operational-intelligence-panel.css';

type UnifiedOperationalIntelligencePanelProps = {
  className?: string;
  maxInsights?: number;
};

function domainStatusLabel(status: UnifiedOperationalIntelligenceDomainStatus['status']): string {
  if (status === 'critical') return 'Critical';
  if (status === 'watch') return 'Watch';
  return 'Healthy';
}

function insightTypeLabel(type: UnifiedOperationalIntelligenceInsight['type']): string {
  return type.replace(/_/g, ' ');
}

export function UnifiedOperationalIntelligencePanel({
  className = '',
  maxInsights = 8,
}: UnifiedOperationalIntelligencePanelProps) {
  const operationalIntelligence = useUnifiedOperationalIntelligence({ realtime: true });
  const { unifiedSnapshot, source, isRefreshing, refresh, refreshError, lastRefreshedAt } =
    operationalIntelligence;

  const tone =
    unifiedSnapshot.domainStatuses.some((domain) => domain.status === 'critical')
      ? 'critical'
      : unifiedSnapshot.domainStatuses.some((domain) => domain.status === 'watch')
        ? 'warning'
        : 'stable';

  const visibleInsights = unifiedSnapshot.insights.slice(0, maxInsights);

  return (
    <section
      className={`unified-operational-intelligence-panel unified-operational-intelligence-panel--${tone} ${className}`.trim()}
      aria-label="Unified operational intelligence"
    >
      <header className="unified-operational-intelligence-panel__header">
        <div className="unified-operational-intelligence-panel__identity">
          <Activity size={16} aria-hidden="true" />
          <strong>Unified operational intelligence</strong>
          <span className="unified-operational-intelligence-panel__source">
            Source: {source === 'degraded' ? 'degraded fallback' : source}
          </span>
          {lastRefreshedAt ? (
            <span className="unified-operational-intelligence-panel__refreshed">
              Updated {new Date(lastRefreshedAt).toLocaleTimeString()}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="cd-btn cd-btn--secondary cd-btn--sm unified-operational-intelligence-panel__refresh"
          onClick={() => void refresh()}
          disabled={isRefreshing}
          aria-busy={isRefreshing ? 'true' : 'false'}
        >
          <RefreshCw size={14} aria-hidden="true" />
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {refreshError ? (
        <p className="unified-operational-intelligence-panel__error" role="alert">
          {refreshError}
        </p>
      ) : null}

      <p className="unified-operational-intelligence-panel__safety" role="note">
        {unifiedSnapshot.safetyStatement}
      </p>

      <div className="unified-operational-intelligence-panel__metrics" role="status" aria-live="polite">
        <span>{unifiedSnapshot.metrics.activePatients} active</span>
        <span>{unifiedSnapshot.metrics.waitingPatients} waiting</span>
        <span>
          Capacity {unifiedSnapshot.metrics.capacityScore} ({unifiedSnapshot.metrics.capacityBand})
        </span>
        <span>{unifiedSnapshot.metrics.inboundEms} EMS inbound</span>
        <span>{unifiedSnapshot.metrics.activeBottlenecks} bottlenecks</span>
        <span>{unifiedSnapshot.metrics.congestionPredictions} congestion signals</span>
        <span>{unifiedSnapshot.metrics.unresolvedAlerts} alerts</span>
        <span>{unifiedSnapshot.metrics.workflowPendingReview} workflow reviews</span>
      </div>

      <div className="unified-operational-intelligence-panel__domains">
        {unifiedSnapshot.domainStatuses.map((domain) => (
          <span
            key={domain.id}
            className={`unified-operational-intelligence-panel__domain unified-operational-intelligence-panel__domain--${domain.status}`}
            title={domain.signalSources.join(' · ')}
          >
            {domain.label}: {domainStatusLabel(domain.status)}
            {domain.insightCount > 0 ? ` (${domain.insightCount})` : ''}
          </span>
        ))}
      </div>

      {visibleInsights.length === 0 ? (
        <p className="unified-operational-intelligence-panel__empty">
          No actionable operational insights from backend events. Monitoring patient flow, capacity,
          staffing, alerts, and workflow metrics.
        </p>
      ) : (
        <>
          <AiTruthLabel {...hospitalCommandCenterRecommendationsTruthLabel()} compact />
          <ol className="unified-operational-intelligence-panel__insights">
            {visibleInsights.map((insight) => (
              <li
                key={insight.id}
                className={`unified-operational-intelligence-panel__insight unified-operational-intelligence-panel__insight--${insight.severity}`}
              >
                <div className="unified-operational-intelligence-panel__insight-main">
                  <span className="unified-operational-intelligence-panel__insight-type">
                    {insight.domain.replace(/_/g, ' ')} · {insightTypeLabel(insight.type)}
                  </span>
                  <strong>{insight.title}</strong>
                  <p>{insight.summary}</p>
                  <span className="unified-operational-intelligence-panel__insight-meta">
                    Owner: {insight.ownerRole.replace(/_/g, ' ')}
                    {insight.sourceEventType ? ` · Event: ${insight.sourceEventType}` : ''}
                    {` · Confidence ${Math.round(insight.confidence * 100)}%`}
                  </span>
                </div>
                {insight.route ? (
                  <Link
                    to={insight.route}
                    className="cd-btn cd-btn--secondary cd-btn--sm unified-operational-intelligence-panel__action"
                  >
                    Open workflow
                  </Link>
                ) : null}
              </li>
            ))}
          </ol>
        </>
      )}

      <footer className="unified-operational-intelligence-panel__footer">
        <Link to={CANONICAL_ROUTES.emergencyCopilot} className="cd-btn cd-btn--ghost cd-btn--sm">
          AI Chief review
        </Link>
        <Link to={CANONICAL_ROUTES.emergencyAlerts} className="cd-btn cd-btn--ghost cd-btn--sm">
          Alert center
        </Link>
      </footer>
    </section>
  );
}

export default UnifiedOperationalIntelligencePanel;