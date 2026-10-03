import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import type { BottleneckRegistrySnapshot } from '../../services/bottleneckRegistry';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import './ServiceHealthIndicator.css';

export type ServiceHealthIndicatorProps = {
  bottleneckRegistry?: BottleneckRegistrySnapshot | null;
  className?: string;
  defaultExpanded?: boolean;
};

export default function ServiceHealthIndicator({
  bottleneckRegistry,
  className = '',
  defaultExpanded = false,
}: ServiceHealthIndicatorProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const activeBottlenecks = useMemo(
    () => bottleneckRegistry?.activeBottlenecks ?? [],
    [bottleneckRegistry?.activeBottlenecks],
  );

  const criticalCount = useMemo(
    () => activeBottlenecks.filter((b) => b.severity === 'critical').length,
    [activeBottlenecks],
  );

  const degradedCount = useMemo(
    () => activeBottlenecks.filter((b) => b.severity !== 'critical').length,
    [activeBottlenecks],
  );

  const overallStatus =
    criticalCount > 0 ? 'critical' : activeBottlenecks.length > 0 ? 'degraded' : 'healthy';

  const riskProjection = bottleneckRegistry?.threeMinuteRiskProjection;
  const isThreeMinuteAtRisk =
    riskProjection &&
    (riskProjection.status === 'at_risk' || riskProjection.status === 'breach_likely');

  const statusLabel =
    overallStatus === 'critical'
      ? `${criticalCount} Critical Bottleneck${criticalCount > 1 ? 's' : ''}`
      : overallStatus === 'degraded'
        ? `${degradedCount} Service${degradedCount > 1 ? 's' : ''} Degraded`
        : 'All Core Services Healthy';

  return (
    <section
      className={[
        'service-health-indicator',
        `service-health-indicator--${overallStatus}`,
        expanded ? 'service-health-indicator--expanded' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Service health and bottleneck status"
    >
      <div className="service-health-indicator__bar">
        <button
          type="button"
          className="service-health-indicator__toggle"
          aria-expanded={expanded ? 'true' : 'false'}
          aria-controls="service-health-details"
          onClick={() => setExpanded((prev) => !prev)}
        >
          <span className="service-health-indicator__icon-wrap" aria-hidden="true">
            {overallStatus === 'critical' ? (
              <ShieldAlert
                className="service-health-indicator__icon service-health-indicator__icon--critical"
                size={16}
              />
            ) : overallStatus === 'degraded' ? (
              <AlertTriangle
                className="service-health-indicator__icon service-health-indicator__icon--degraded"
                size={16}
              />
            ) : (
              <CheckCircle2
                className="service-health-indicator__icon service-health-indicator__icon--healthy"
                size={16}
              />
            )}
          </span>

          <span className="service-health-indicator__title">Service Health</span>
          <span className="service-health-indicator__status-badge">{statusLabel}</span>

          {isThreeMinuteAtRisk ? (
            <span
              className="service-health-indicator__3m-alert"
              title="Active bottlenecks threaten the 3-minute response SLA"
            >
              3-min SLA at risk
            </span>
          ) : null}

          <span className="service-health-indicator__chevron" aria-hidden="true">
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </span>
        </button>

        <Link
          to={CANONICAL_ROUTES.systemHealth}
          className="service-health-indicator__direct-link"
          aria-label="Open System Health and Diagnostics page"
        >
          <span>System Health</span>
          <ExternalLink size={13} aria-hidden="true" />
        </Link>
      </div>

      {expanded ? (
        <div id="service-health-details" className="service-health-indicator__panel">
          {isThreeMinuteAtRisk ? (
            <div className="service-health-indicator__risk-callout" role="alert">
              <strong>3-Minute Target Warning:</strong> {riskProjection?.summary}
              {riskProjection?.fallbackAction ? (
                <div className="service-health-indicator__risk-fallback">
                  <em>Guidance:</em> {riskProjection.fallbackAction}
                </div>
              ) : null}
            </div>
          ) : null}

          {activeBottlenecks.length === 0 ? (
            <div className="service-health-indicator__empty">
              <Activity size={18} aria-hidden="true" />
              <span>
                All operational services (AI, Triage, Labs, Radiology, Pharmacy, EHR sync) are
                functioning within nominal performance parameters.
              </span>
            </div>
          ) : (
            <ul className="service-health-indicator__list">
              {activeBottlenecks.map((bottleneck) => (
                <li
                  key={bottleneck.id}
                  className={`service-health-indicator__item service-health-indicator__item--${bottleneck.severity}`}
                >
                  <div className="service-health-indicator__item-head">
                    <span className="service-health-indicator__service-name">
                      {bottleneck.serviceName}
                    </span>
                    <span className="service-health-indicator__severity-tag">
                      {bottleneck.severity}
                    </span>
                    {bottleneck.impactsThreeMinuteTarget ? (
                      <span className="service-health-indicator__3m-tag">Impacts 3-Min SLA</span>
                    ) : null}
                  </div>

                  <p className="service-health-indicator__desc">{bottleneck.description}</p>

                  <div className="service-health-indicator__item-meta">
                    <span className="service-health-indicator__workflow">
                      Workflow: {bottleneck.affectedWorkflow}
                    </span>
                    {bottleneck.ownerRole ? (
                      <span className="service-health-indicator__owner">
                        Owner: {bottleneck.ownerRole.replace(/_/g, ' ')}
                      </span>
                    ) : null}
                  </div>

                  {bottleneck.fallbackAction ? (
                    <div className="service-health-indicator__fallback">
                      <strong>Fallback Procedure:</strong> {bottleneck.fallbackAction}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          <div className="service-health-indicator__footer">
            <Link
              to={CANONICAL_ROUTES.systemHealth}
              className="service-health-indicator__footer-link"
            >
              Open Full System Diagnostics & Infrastructure Settings →
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
