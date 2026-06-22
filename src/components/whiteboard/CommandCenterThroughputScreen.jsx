import React from 'react';
import './CommandCenterThroughputScreen.css';

function formatUpdatedAt(timestamp) {
  if (!timestamp) return '—';
  try {
    return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '—';
  }
}

export default function CommandCenterThroughputScreen({
  snapshot,
  title = 'Command center',
  refreshIntervalMs = 30000,
  showArrivalsByHour = true,
  showWaitingRoomOccupancy = true,
  showAvgWaitTriage = true,
  showAvgWaitProvider = true,
  showEmsOffloadDelays = true,
  showBoardingDuration = true,
  showReferralsBacklog = true,
  showLwbsRisk = true,
  showCrowdingForecast = true,
  showSystemHealth = true,
  className = '',
}) {
  if (!snapshot) return null;

  const visibleMetricIds = new Set(
    [
      showWaitingRoomOccupancy ? 'waiting-room-occupancy' : null,
      showAvgWaitTriage ? 'avg-wait-triage' : null,
      showAvgWaitProvider ? 'avg-wait-provider' : null,
      showEmsOffloadDelays ? 'ems-offload-delays' : null,
      showBoardingDuration ? 'boarding-duration' : null,
      showReferralsBacklog ? 'referrals-backlog' : null,
      showLwbsRisk ? 'lwbs-risk' : null,
    ].filter(Boolean),
  );

  const metrics = snapshot.metrics.filter((metric) => visibleMetricIds.has(metric.id));
  const maxHourlyCount = Math.max(1, ...snapshot.hourlyArrivals.map((entry) => entry.count));

  return (
    <section
      className={['command-center-throughput', className].filter(Boolean).join(' ')}
      aria-label="Emergency department command center throughput"
    >
      <header className="command-center-throughput__header">
        <div>
          <p className="command-center-throughput__eyebrow">Throughput command center</p>
          <h2>{title}</h2>
          <p className="command-center-throughput__subtitle">
            Manager and director operational view · aggregate metrics for flow decisions
          </p>
        </div>
        <div className="command-center-throughput__meta">
          <span>Updated {formatUpdatedAt(snapshot.updatedAt)}</span>
          <span>Refresh every {Math.round(refreshIntervalMs / 1000)}s</span>
        </div>
      </header>

      <p className="command-center-throughput__summary" role="status">
        {snapshot.summaryLine}
      </p>

      {showArrivalsByHour && snapshot.hourlyArrivals.length ? (
        <section className="command-center-throughput__arrivals" aria-label="Arrivals by hour">
          <div className="command-center-throughput__section-heading">
            <h3>Arrivals by hour</h3>
            <span>{snapshot.peakHourLabel}</span>
          </div>
          <div className="command-center-throughput__hourly-chart">
            {snapshot.hourlyArrivals.map((entry) => (
              <div key={entry.hour} className="command-center-throughput__hourly-bar">
                <div
                  className="command-center-throughput__hourly-fill"
                  style={{ height: `${Math.max(8, (entry.count / maxHourlyCount) * 100)}%` }}
                  title={`${entry.hour}: ${entry.count} arrivals`}
                />
                <span className="command-center-throughput__hourly-count">{entry.count || ''}</span>
                <span className="command-center-throughput__hourly-label">{entry.hour.slice(0, 2)}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {metrics.length ? (
        <div className="command-center-throughput__grid">
          {metrics.map((metric) => (
            <article
              key={metric.id}
              className="command-center-throughput__tile"
              data-tone={metric.tone}
              aria-label={`${metric.label}: ${metric.value}`}
            >
              <strong className="command-center-throughput__value">{metric.value}</strong>
              <span className="command-center-throughput__label">{metric.label}</span>
              <small className="command-center-throughput__detail">{metric.detail}</small>
            </article>
          ))}
        </div>
      ) : null}

      <div className="command-center-throughput__footer-grid">
        {showCrowdingForecast ? (
          <section
            className="command-center-throughput__forecast"
            data-tone={snapshot.crowdingForecast.tone}
            aria-label="Crowding forecast"
          >
            <h3>Crowding forecast</h3>
            <strong>{snapshot.crowdingForecast.label}</strong>
            <p>{snapshot.crowdingForecast.detail}</p>
          </section>
        ) : null}
        {showSystemHealth ? (
          <section
            className="command-center-throughput__health"
            data-tone={snapshot.systemHealth.tone}
            aria-label="Data freshness and system health"
          >
            <h3>Data freshness / system health</h3>
            <strong>{snapshot.systemHealth.label}</strong>
            <p>
              {snapshot.systemHealth.freshness} · {snapshot.systemHealth.detail}
            </p>
          </section>
        ) : null}
      </div>
    </section>
  );
}
