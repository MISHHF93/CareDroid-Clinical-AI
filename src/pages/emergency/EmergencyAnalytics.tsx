import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useEmergencyStore } from '../../store/emergencyStore';
import { useAdvancedEmergencyOsUpgradeHarness } from '../../hooks/useEmergencyOs';
import useOperationalIntelligence from '../../hooks/useOperationalIntelligence';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  filterOperationalMetrics,
  groupOperationalAlertsByMetric,
} from '../../config/operationalMetricsModel';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import { summarizeTriageBreachAnalytics } from '../../services/triageBreachTimer';
import EdDataSourceBanner from '../../components/emergency/EdDataSourceBanner';
import { PageShell } from '../../components/ui/CareDroidPrimitives';
import { MaturityChip } from './emergencyRouteShared';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import useEdRouteDataContext from '../../hooks/useEdRouteDataContext';
import './EmergencyAnalytics.css';

const CHART_COLORS = ['#38bdf8', '#22c55e', '#f59e0b', '#f97316', '#ef4444', '#a78bfa'];

function heatBucket(count) {
  return Math.min(6, Math.round(((count || 0) / 6) * 6));
}

function ChartCard({ title, subtitle, children }) {
  return (
    <section className="emergency-analytics__card">
      <header>
        <span>{title}</span>
        {subtitle ? <small>{subtitle}</small> : null}
      </header>
      {children}
    </section>
  );
}

function ChartEmpty({ children }) {
  return (
    <div className="emergency-analytics__empty">
      {children}
    </div>
  );
}

function analyticsSourceLabel(source) {
  if (source === 'backend') return 'Live aggregate feed';
  if (source === 'client-fallback') return 'Walkthrough/local dataset';
  return 'Operational data';
}

function analyticsStatusMessage(message = '') {
  if (!message) return '';
  if (/fixture|demo|backend|fallback/i.test(message)) {
    return 'Operational analytics are using walkthrough/local data and are not evidence of a live EHR, ADT, EMS CAD, or bed-management integration.';
  }
  return message;
}

function formatCentralFreshness(snapshot) {
  const timestamp = snapshot.sync?.lastSyncedAt || snapshot.generatedAt;
  const parsed = new Date(timestamp).getTime();
  const source =
    snapshot.sync?.source === 'backend-snapshot' ? 'backend central node' : 'local store snapshot';
  if (!Number.isFinite(parsed)) return source;
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - parsed) / 60000));
  if (elapsedMinutes < 1) return `${source} - now`;
  if (elapsedMinutes < 60) return `${source} - ${elapsedMinutes}m ago`;
  return `${source} - ${Math.round(elapsedMinutes / 60)}h ago`;
}

function findUpgradeSignal(signals = [] as any[], capability) {
  return signals.find((signal) => signal.capability === capability) || null;
}

function formatPressure(value = '') {
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}

function signalMeta(signal) {
  if (!signal) return 'Review required';
  const confidence =
    typeof signal.confidence === 'number' ? `${Math.round(signal.confidence * 100)}% confidence` : 'confidence pending';
  return `${signal.safety?.status || 'review_required'} | ${confidence}`;
}

export default function EmergencyAnalytics() {
  const surfaces = usePractitionerSurfaceVisibility();
  const emergencyRole = useEmergencyRolePermissions();
  const { backendAvailable, activeScenarioId } = useEdRouteDataContext();
  const emergencyAnalytics = useEmergencyStore((state) => state.emergencyAnalytics);
  const loadEmergencyAnalytics = useEmergencyStore((state) => state.loadEmergencyAnalytics);
  const patients = useEmergencyStore((state) => state.patients);
  const emergencySettings = useEmergencyStore((state) => state.emergencySettings);
  const operationalIntelligence = useOperationalIntelligence({ screenMode: 'COMMAND_CENTER_SCREEN' });
  const centralSnapshot = operationalIntelligence.centralSnapshot;
  const intelligenceSnapshot = operationalIntelligence.snapshot;
  const centralFreshness = formatCentralFreshness(centralSnapshot);
  const breachedQueues = centralSnapshot.queueHealth.filter((queue) => queue.breached);
  const activeAlerts = centralSnapshot.operationalAlerts.filter((alert) => !alert.dismissed);
  const centralCommandMetrics = useMemo(
    () => filterOperationalMetrics(centralSnapshot.operationalSummary.metrics, 'analytics'),
    [centralSnapshot.operationalSummary.metrics],
  );
  const groupedOperationalAlerts = useMemo(
    () => groupOperationalAlertsByMetric(activeAlerts),
    [activeAlerts],
  );
  const metricLinkedAlerts = useMemo(
    () =>
      centralCommandMetrics
        .map((metric) => ({
          key: metric.key,
          label: metric.label,
          count: groupedOperationalAlerts.byMetric[metric.key]?.length || 0,
        }))
        .filter((entry) => entry.count > 0),
    [centralCommandMetrics, groupedOperationalAlerts.byMetric],
  );
  const firstBreachedQueue = breachedQueues[0];
  const firstAlert = activeAlerts[0];
  const upgradeHarness = useAdvancedEmergencyOsUpgradeHarness();
  const data = (emergencyAnalytics.data?.operationalCommand || {}) as any;
  const shift = (emergencyAnalytics.data?.shift || {}) as any;
  const dailyVolume = data.dailyVolume || [];
  const hourlyArrivals = data.hourlyArrivals || [];
  const waitTrend = data.waitTrend || [];
  const topComplaints = data.topComplaints || [];
  const totalDailyVolume = (data.dailyVolume || []).reduce((sum, point) => sum + Number(point.count || 0), 0);
  const topComplaint = data.topComplaints?.[0];
  const hasOperationalData =
    dailyVolume.length || hourlyArrivals.length || waitTrend.length || topComplaints.length;
  const statusMessage = analyticsStatusMessage(emergencyAnalytics.message);
  const upgradeSignals = [
    ...(upgradeHarness.data?.data?.capacityAndForecasting || []),
    ...(upgradeHarness.data?.data?.patientFlow || []),
    ...(upgradeHarness.data?.data?.clinicalDecisionSupport || []),
    ...(upgradeHarness.data?.data?.governance || []),
  ];
  const bragSignal = findUpgradeSignal(upgradeSignals, 'brag_forecast_10h');
  const cdssSignal = findUpgradeSignal(upgradeSignals, 'multimodal_cdss');
  const federatedSignal = findUpgradeSignal(upgradeSignals, 'federated_learning_harness');
  const auditSignal = findUpgradeSignal(upgradeSignals, 'immutable_audit_abstraction');
  const blockedActions = upgradeHarness.data?.data?.blockedAutonomousActions || [];
  const triageBreachAnalytics = useMemo(
    () => summarizeTriageBreachAnalytics(patients, { settings: emergencySettings }),
    [patients, emergencySettings],
  );

  useEffect(() => {
    void loadEmergencyAnalytics({ force: true });
  }, [loadEmergencyAnalytics]);

  const sourceStatus =
    emergencyAnalytics.status === 'loading'
      ? 'Loading'
      : analyticsSourceLabel(emergencyAnalytics.source);
  const useCompactKpis = !surfaces.analytics.showKpiCards;
  const shiftKpis = [
    { label: 'Patients seen', value: shift.patientsSeen ?? 0 },
    { label: 'Discharges', value: shift.dischargeCount ?? 0 },
    { label: 'Daily volume', value: totalDailyVolume },
    { label: 'Avg wait', value: `${shift.averageWaitMinutes ?? 0}m` },
    { label: 'Boarding', value: shift.boardingCount ?? 0 },
    { label: 'High risk', value: shift.highRiskCount ?? 0 },
    { label: 'Reassess due', value: shift.reassessmentDueCount ?? 0 },
    { label: 'Top complaint', value: topComplaint ? `${topComplaint.count}` : '0' },
  ];

  return (
    <PageShell
      as="section"
      eyebrow="Analytics"
      title="Department Analytics"
      description={
        surfaces.analytics.showDescriptions
          ? 'Shift throughput, arrivals, wait times, and complaint mix for department review.'
          : undefined
      }
      actions={
        <>
          <MaturityChip maturity="demo" />
          <strong className="emergency-analytics__source-status">{sourceStatus}</strong>
        </>
      }
      className={`emergency-analytics cd-page-shell${
        surfaces.compactLayout ? ' emergency-analytics--practitioner-compact' : ''
      }`}
      headerClassName="emergency-analytics__header"
      contentClassName="emergency-analytics__content"
      aria-label="Emergency operational analytics"
    >
      <EdDataSourceBanner
        envelope={emergencyAnalytics}
        loading={emergencyAnalytics.status === 'loading'}
        error={emergencyAnalytics.status === 'error' ? emergencyAnalytics.message : undefined}
        activeScenarioId={activeScenarioId}
        backendAvailable={backendAvailable}
        compact
      />

      {emergencyAnalytics.status === 'loading' ? (
        <p className="emergency-analytics__state" role="status">
          Loading CareDroid analytics...
        </p>
      ) : null}
      {statusMessage && surfaces.analytics.showDescriptions ? (
        <p className="emergency-analytics__state">
          {statusMessage}
        </p>
      ) : null}
      {emergencyAnalytics.status !== 'loading' && !hasOperationalData ? (
        <p className="emergency-analytics__state emergency-analytics__state--empty">
          Operational analytics will populate when CareDroid has active patient flow data for this department. Do not present empty charts as connected hospital analytics.
        </p>
      ) : null}

      {surfaces.analytics.showPlatformLayers ? (
      <>
      <section
        className="emergency-analytics__command-layer"
        aria-label="Central node operational command layer"
      >
        <header>
          <div>
            <span>Central Node Metrics</span>
            <h2>Operational Command Layer</h2>
          </div>
          <strong>{centralFreshness}</strong>
        </header>
        <div className="emergency-analytics__grid">
          {centralCommandMetrics.map((metric) => (
            <ChartCard key={metric.key} title={metric.label} subtitle={centralFreshness}>
              <strong>{metric.value}</strong>
              <small className="emergency-analytics__source">Source: {metric.source}</small>
            </ChartCard>
          ))}
        </div>
      </section>

      <section
        className="emergency-analytics__command-layer"
        aria-label="Operational awareness intelligence"
      >
        <header>
          <div>
            <span>Awareness Layer</span>
            <h2>Operational Awareness</h2>
          </div>
          <strong>{centralSnapshot.sync.message}</strong>
        </header>
        <div className="emergency-analytics__grid">
          <ChartCard title="Capacity" subtitle="Central node score and band">
            <strong>{centralSnapshot.capacityStatus.score} {centralSnapshot.capacityStatus.band}</strong>
            <small className="emergency-analytics__source">
              {centralSnapshot.capacityStatus.occupiedRooms} rooms occupied · {centralSnapshot.capacityStatus.totalPatients} active records
            </small>
          </ChartCard>
          <ChartCard title="EMS Pressure" subtitle="Inbound and critical pressure">
            <strong>{formatPressure(centralSnapshot.emsPressure.status)}</strong>
            <small className="emergency-analytics__source">
              {centralSnapshot.emsPressure.inbound} inbound · {centralSnapshot.emsPressure.criticalInbound} critical
            </small>
          </ChartCard>
          <ChartCard title="Boarding" subtitle="Boarding escalation state">
            <strong>{centralSnapshot.boardingStatus.boarders}</strong>
            <small className="emergency-analytics__source">
              {formatPressure(centralSnapshot.boardingStatus.risk)} risk · source central node boardingStatus
            </small>
          </ChartCard>
          <ChartCard title="Queue Health" subtitle="Breaches and oldest wait">
            <strong>{breachedQueues.length}</strong>
            <small className="emergency-analytics__source">
              {firstBreachedQueue
                ? `${firstBreachedQueue.label}: ${firstBreachedQueue.oldestWaitMinutes}m vs ${firstBreachedQueue.targetMinutes}m`
                : 'No queue thresholds breached'}
            </small>
          </ChartCard>
          <ChartCard title="Reassessment" subtitle="Due and overdue">
            <strong>{centralSnapshot.reassessmentStatus.due}</strong>
            <small className="emergency-analytics__source">
              {centralSnapshot.reassessmentStatus.overdue} overdue · next action remains human reviewed
            </small>
          </ChartCard>
          <ChartCard title="Triage breach timer" subtitle="Arrival to triage against site target">
            <strong>{triageBreachAnalytics.summary.breachedCount}</strong>
            <small className="emergency-analytics__source">
              {triageBreachAnalytics.summary.breachRiskCount} at risk · target{' '}
              {triageBreachAnalytics.summary.targetMinutes}m · longest{' '}
              {triageBreachAnalytics.summary.longestElapsedLabel}
            </small>
          </ChartCard>
          <ChartCard title="Alerts" subtitle="Active alert/escalation context">
            <strong>{activeAlerts.length}</strong>
            <small className="emergency-analytics__source">
              {firstAlert ? `${firstAlert.severity}: ${firstAlert.title}` : 'All clear'}
              {metricLinkedAlerts.length
                ? ` · ${metricLinkedAlerts.map((entry) => `${entry.label} ${entry.count}`).join(' · ')}`
                : ''}
              {groupedOperationalAlerts.unmapped.length
                ? ` · ${groupedOperationalAlerts.unmapped.length} other`
                : ''}
            </small>
          </ChartCard>
          {intelligenceSnapshot.modelHealth ? (
            <ChartCard title="Operational Intelligence" subtitle="Rule-based baseline health">
              <strong>{intelligenceSnapshot.modelHealth.status}</strong>
              <small className="emergency-analytics__source">
                {intelligenceSnapshot.mode} · {intelligenceSnapshot.recommendations.length} advisory recommendations ·{' '}
                {intelligenceSnapshot.disclaimers.operational}
              </small>
            </ChartCard>
          ) : null}
        </div>
      </section>
      </>
      ) : null}

      {surfaces.analytics.showDepartmentShortcuts ? (
      <div className="emergency-analytics__grid" aria-label="Department shortcut links">
        <ChartCard title="Department Pulse" subtitle="Live command view">
          <strong>Queues, staff, EMS, alerts</strong>
          <small>Compact charge-nurse view surfaced from the CareDroid store.</small>
          {emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyPulse) ? (
            <Link className="emergency-analytics__link" to={CANONICAL_ROUTES.emergencyPulse}>
              Open Department Pulse
            </Link>
          ) : (
            <small>Department Pulse is restricted for this role.</small>
          )}
        </ChartCard>
        <ChartCard title="Shift Summary" subtitle="Handoff ready">
          <strong>Shift metrics and brief</strong>
          <small>Generate a handoff brief from patients, referrals, capacity, alerts, and EMS data.</small>
          {emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyShift) ? (
            <Link className="emergency-analytics__link" to={CANONICAL_ROUTES.emergencyShift}>
              Open Shift Summary
            </Link>
          ) : (
            <small>Shift Summary is restricted for this role.</small>
          )}
        </ChartCard>
      </div>
      ) : null}

      {surfaces.analytics.showPlatformLayers && upgradeHarness.data?.data ? (
        <div className="emergency-analytics__grid" aria-label="Advanced CareDroid upgrade harness analytics">
          <ChartCard title="Upgrade Harness" subtitle="Pilot readiness">
            <strong>
              {upgradeHarness.data.data.pilotReadiness.reviewRequired}/
              {upgradeHarness.data.data.pilotReadiness.totalCapabilities} review
            </strong>
            <small>{upgradeHarness.data.data.mode} | human review required</small>
          </ChartCard>
          <ChartCard title="10-hour BRAG" subtitle="Forecast peak">
            <strong>{bragSignal?.data?.peakBand || 'Review'}</strong>
            <small>{signalMeta(bragSignal)}</small>
          </ChartCard>
          <ChartCard title="CDSS Gate" subtitle="High-risk review cards">
            <strong>{cdssSignal?.data?.reviewQueue?.length || 0}</strong>
            <small>{cdssSignal?.safety?.policyVersion || 'safety policy active'}</small>
          </ChartCard>
          <ChartCard title="Federated Model" subtitle="Pilot privacy contract">
            <strong>{federatedSignal?.data?.modelCard?.metrics?.auc || '--'} AUC</strong>
            <small>{signalMeta(federatedSignal)}</small>
          </ChartCard>
          <ChartCard title="Blocked Actions" subtitle="Autonomy guardrail">
            <strong>{blockedActions.length}</strong>
            <small>
              {(blockedActions.length ? blockedActions : ['diagnosis', 'prescribing', 'disposition'])
                .slice(0, 3)
                .join(', ')}
            </small>
          </ChartCard>
          <ChartCard title="Audit Ledger" subtitle="Immutable abstraction">
            <strong>{auditSignal?.data?.ledgerEntries?.length || 0}</strong>
            <small>
              {String(auditSignal?.data?.latestHash || '').slice(0, 12) || 'pilot-audit'} |{' '}
              {auditSignal?.provenance?.provider || 'deterministic provider'}
            </small>
          </ChartCard>
        </div>
      ) : null}

      {useCompactKpis ? (
        <div className="emergency-analytics__kpi-strip" aria-label="Emergency analytics KPIs">
          {shiftKpis.map((kpi) => (
            <span key={kpi.label} className="emergency-analytics__kpi-strip-item">
              <strong>{kpi.value}</strong>
              <span>{kpi.label}</span>
            </span>
          ))}
        </div>
      ) : (
        <div className="emergency-analytics__grid" aria-label="Emergency analytics KPIs">
          <ChartCard title="Patients Seen" subtitle="Current shift">
            <strong>{shift.patientsSeen ?? 0}</strong>
          </ChartCard>
          <ChartCard title="Discharges" subtitle="Current shift">
            <strong>{shift.dischargeCount ?? 0}</strong>
          </ChartCard>
          <ChartCard title="Daily Volume Total" subtitle="Last 7 days">
            <strong>{totalDailyVolume}</strong>
          </ChartCard>
          <ChartCard title="Top Complaint" subtitle="Current board">
            <strong>{topComplaint ? `${topComplaint.name}: ${topComplaint.count}` : 'No volume'}</strong>
          </ChartCard>
          <ChartCard title="Average Wait" subtitle="Backend current">
            <strong>{shift.averageWaitMinutes ?? 0}m</strong>
          </ChartCard>
          <ChartCard title="Boarding" subtitle="Active boarders">
            <strong>{shift.boardingCount ?? 0}</strong>
          </ChartCard>
          <ChartCard title="High Risk" subtitle="Active patients">
            <strong>{shift.highRiskCount ?? 0}</strong>
          </ChartCard>
          <ChartCard title="Reassessment Due" subtitle="Safety queue">
            <strong>{shift.reassessmentDueCount ?? 0}</strong>
          </ChartCard>
        </div>
      )}

      <div className="emergency-analytics__grid">
        <ChartCard title="Daily Patient Volume" subtitle="Last 7 days">
          {dailyVolume.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyVolume}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--status-info)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty>No daily patient volume returned.</ChartEmpty>
          )}
        </ChartCard>

        {surfaces.analytics.showSecondaryCharts ? (
          <>
            <ChartCard title="Hourly Arrival Heatmap" subtitle="Today">
              {hourlyArrivals.length ? (
                <div className="emergency-analytics__heatmap">
                  {hourlyArrivals.map((hour) => (
                    <span
                      key={hour.hour}
                      className={`emergency-analytics__heatmap-cell emergency-analytics__heatmap-cell--${heatBucket(hour.count)}`}
                      title={`${hour.hour}: ${hour.count} arrivals`}
                    >
                      {hour.hour.slice(0, 2)}
                    </span>
                  ))}
                </div>
              ) : (
                <ChartEmpty>No hourly arrival data returned.</ChartEmpty>
              )}
            </ChartCard>

            <ChartCard title="Average Wait Time Trend" subtitle="7-day">
              {waitTrend.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={waitTrend}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="avgWaitMinutes"
                      name="Avg wait"
                      stroke="var(--status-warning)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty>No wait time trend returned.</ChartEmpty>
              )}
            </ChartCard>

            <ChartCard title="Top Chief Complaints" subtitle="Top 10">
              {topComplaints.length ? (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={topComplaints}
                        dataKey="count"
                        nameKey="name"
                        innerRadius={46}
                        outerRadius={82}
                        paddingAngle={2}
                      >
                        {topComplaints.map((entry, index) => (
                          <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="emergency-analytics__legend">
                    {topComplaints.slice(0, 6).map((item, index) => (
                      <span key={item.name}>
                        <i className={`emergency-analytics__legend-swatch emergency-analytics__legend-swatch--${index % 6}`} />
                        {item.name}: {item.count}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <ChartEmpty>No complaint mix returned.</ChartEmpty>
              )}
            </ChartCard>
          </>
        ) : null}
      </div>
    </PageShell>
  );
}
