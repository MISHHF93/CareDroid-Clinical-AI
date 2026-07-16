import React, { useMemo } from 'react';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';
import { buildCommandCenterFallbackSnapshot } from '../../config/displayAutoRefreshModel';
import { resolveOperationalPresentation } from '../../config/emergencyOperationalPresentationModel';
import { buildHourlyArrivalsChart } from '../../utils/commandCenterChartModel';
import OperationalPresentationFrame from '../emergency/OperationalPresentationFrame';
import DisplayRefreshStatusBar from '../emergency/DisplayRefreshStatusBar';
import { GraphicIconBadge } from '../graphics/CdlGraphicKit';
import { CategoryBarChart } from '../dashboard/DashboardCharts';
import { sortCommandCenterMetrics } from './commandCenterThroughputModel';
import CommandCenterSurgePanel from './CommandCenterSurgePanel';
import './CommandCenterThroughputScreen.css';

function trendGlyph(direction) {
  if (direction === 'up') return 'â†‘';
  if (direction === 'down') return 'â†“';
  return 'â†’';
}

export default function CommandCenterThroughputScreen({
  snapshot,
  surgeSnapshot = (null as any),
  title = 'Department Whiteboard',
  refreshIntervalMs = 30000,
  refreshStatus = (null as any),
  performanceMode = false,
  showTriageAwaiting = true,
  showLongestUntriagedWait = true,
  showTriageApproachingBreach = true,
  showTriageBreached = true,
  showRapidReviewFlags = true,
  showProviderAwaiting = true,
  showLongestProviderWait = true,
  showProviderApproachingBreach = true,
  showProviderBreached = true,
  showArrivalsByHour = true,
  showWaitingCount = true,
  showWaitingRoomOccupancy = false,
  showLongestWait = true,
  showAvgWaitTriage = true,
  showAvgWaitProvider = true,
  showEmsInbound = true,
  showEmsOffloadDelays = true,
  showOffloadDuration = true,
  showHandoffPending = true,
  showBoardingDuration = true,
  showReferralsBacklog = true,
  showCapacityScore = true,
  showCrowdLevel = true,
  showTrendIndicators = true,
  showLwbsRisk = false,
  showCrowdingForecast = true,
  showSystemHealth = true,
  className = '',
}) {
  const presentation = resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.commandCenter);
  const resolvedSnapshot = useMemo(() => {
    if (snapshot?.metrics?.length) return snapshot;
    if (snapshot) return snapshot;
    return buildCommandCenterFallbackSnapshot(refreshStatus?.lastUpdatedAt || null);
  }, [refreshStatus?.lastUpdatedAt, snapshot]);

  if (!resolvedSnapshot) return null;

  const visibleMetricIds = new Set(
    [
      showTriageAwaiting ? 'triage-awaiting' : null,
      showLongestUntriagedWait ? 'longest-untriaged-wait' : null,
      showTriageApproachingBreach ? 'triage-approaching-breach' : null,
      showTriageBreached ? 'triage-breached' : null,
      showRapidReviewFlags ? 'rapid-review-flags' : null,
      showProviderAwaiting ? 'provider-awaiting' : null,
      showLongestProviderWait ? 'longest-provider-wait' : null,
      showAvgWaitProvider ? 'avg-wait-provider' : null,
      showProviderApproachingBreach ? 'provider-approaching-breach' : null,
      showProviderBreached ? 'provider-breached' : null,
      showWaitingCount ? 'waiting-count' : null,
      showWaitingRoomOccupancy ? 'waiting-room-occupancy' : null,
      showLongestWait ? 'longest-wait' : null,
      showAvgWaitTriage ? 'avg-wait-triage' : null,
      showAvgWaitProvider ? 'avg-wait-provider' : null,
      showEmsInbound ? 'ems-inbound' : null,
      showEmsOffloadDelays ? 'ems-offload-delays' : null,
      showOffloadDuration ? 'offload-duration' : null,
      showHandoffPending ? 'handoff-pending' : null,
      showBoardingDuration ? 'boarding-duration' : null,
      showReferralsBacklog ? 'referrals-backlog' : null,
      showCapacityScore ? 'capacity-score' : null,
      showCrowdLevel ? 'crowd-level' : null,
      showLwbsRisk ? 'lwbs-risk' : null,
    ].filter(Boolean),
  );

  const metrics = sortCommandCenterMetrics(
    resolvedSnapshot.metrics.filter((metric) => visibleMetricIds.has(metric.id)),
  );
  const arrivalsChart = useMemo(
    () => buildHourlyArrivalsChart(resolvedSnapshot.hourlyArrivals || []),
    [resolvedSnapshot.hourlyArrivals],
  );

  return (
    <OperationalPresentationFrame
      screenMode={CARE_DROID_SCREEN_MODES.commandCenter}
      as="section"
      className={[
        'command-center-throughput',
        performanceMode ? 'command-center-throughput--performance' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Department throughput metrics"
    >
      <header className="command-center-throughput__header">
        <div>
          <p className="command-center-throughput__eyebrow">{presentation.pageEyebrow}</p>
          <h2>{title || presentation.pageTitle}</h2>
          <p className="command-center-throughput__subtitle">{presentation.pageSubtitle}</p>
        </div>
        <div className="command-center-throughput__meta">
          <DisplayRefreshStatusBar
            refreshStatus={
              refreshStatus || {
                enabled: true,
                refreshIntervalMs,
                lastUpdatedAt: resolvedSnapshot.updatedAt,
                lastAttemptAt: null,
                isRefreshing: false,
                errorMessage: null,
                tone: 'ok',
                showStaleBanner: false,
                hasCachedContent: Boolean(snapshot?.metrics?.length),
              }
            }
          />
        </div>
      </header>

      {surgeSnapshot ? <CommandCenterSurgePanel snapshot={surgeSnapshot} /> : null}

      <p className="command-center-throughput__summary" role="status">
        {resolvedSnapshot.summaryLine}
      </p>

      {showArrivalsByHour && arrivalsChart.length ? (
        <section className="command-center-throughput__arrivals" aria-label="Arrivals by hour">
          <div className="command-center-throughput__section-heading command-center-throughput__section-heading--chart">
            <GraphicIconBadge iconKey="chart-bar" accent="brand" size="sm" />
            <div>
              <h3>Arrivals by hour</h3>
              <span>{resolvedSnapshot.peakHourLabel}</span>
            </div>
          </div>
          <CategoryBarChart
            data={arrivalsChart}
            title="Arrivals by hour"
            xKey="name"
            color="var(--app-chart-1)"
            emptyMessage="Hourly arrival data will appear when analytics syncs."
          />
        </section>
      ) : null}

      {showTrendIndicators && resolvedSnapshot.trendIndicators?.length ? (
        <section className="command-center-throughput__trends" aria-label="Operational trend indicators">
          <div className="command-center-throughput__section-heading command-center-throughput__section-heading--chart">
            <GraphicIconBadge iconKey="activity" accent="information" size="sm" />
            <div>
              <h3>Trend indicators</h3>
              <span>Analytics and operational snapshot deltas</span>
            </div>
          </div>
          <div className="command-center-throughput__trend-grid">
            {resolvedSnapshot.trendIndicators.map((trend) => (
              <article
                key={trend.id}
                className="command-center-throughput__trend-card"
                data-tone={trend.tone}
                aria-label={`${trend.label}: ${trend.value}`}
              >
                <span className="command-center-throughput__trend-direction" aria-hidden="true">
                  {trendGlyph(trend.direction)}
                </span>
                <div>
                  <strong className="command-center-throughput__trend-value">{trend.value}</strong>
                  <span className="command-center-throughput__trend-label">{trend.label}</span>
                  <small className="command-center-throughput__trend-detail">{trend.detail}</small>
                </div>
              </article>
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
              <div className="command-center-throughput__tile-top">
                <strong className="command-center-throughput__value">{metric.value}</strong>
                {metric.trend ? (
                  <span
                    className="command-center-throughput__metric-trend"
                    data-direction={metric.trend.direction}
                    title={metric.trend.label}
                  >
                    {trendGlyph(metric.trend.direction)} {metric.trend.label}
                  </span>
                ) : null}
              </div>
              <span className="command-center-throughput__label">{metric.label}</span>
              <small className="command-center-throughput__detail">{metric.detail}</small>
            </article>
          ))}
        </div>
      ) : null}

      <div className="command-center-throughput__footer-grid">
        {showCrowdingForecast && resolvedSnapshot.crowdingForecast ? (
          <section
            className="command-center-throughput__forecast"
            data-tone={resolvedSnapshot.crowdingForecast.tone}
            aria-label="Crowding forecast"
          >
            <h3>Crowding outlook</h3>
            <strong>{resolvedSnapshot.crowdLevel?.staffLabel ?? resolvedSnapshot.crowdingForecast.label}</strong>
            <p>{resolvedSnapshot.crowdingForecast.detail}</p>
          </section>
        ) : null}
        {showSystemHealth && resolvedSnapshot.systemHealth ? (
          <section
            className="command-center-throughput__health"
            data-tone={resolvedSnapshot.systemHealth.tone}
            aria-label="Data freshness and system health"
          >
            <h3>Data freshness / system health</h3>
            <strong>{resolvedSnapshot.systemHealth.label}</strong>
            <p>
              {resolvedSnapshot.systemHealth.freshness} Â· {resolvedSnapshot.systemHealth.detail}
            </p>
          </section>
        ) : null}
      </div>
    </OperationalPresentationFrame>
  );
}
