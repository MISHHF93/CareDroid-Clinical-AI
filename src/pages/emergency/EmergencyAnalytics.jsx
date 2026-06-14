import React, { useEffect } from 'react';
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
import './EmergencyAnalytics.css';

const COLORS = ['#38bdf8', '#22c55e', '#f59e0b', '#f97316', '#ef4444', '#a78bfa'];

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
  if (source === 'client-fallback') return 'Walkthrough dataset';
  return 'Operational data';
}

function analyticsStatusMessage(message = '') {
  if (!message) return '';
  if (/fixture|demo|backend|fallback/i.test(message)) {
    return 'Operational analytics are using the current walkthrough dataset.';
  }
  return message;
}

function findUpgradeSignal(signals = [], capability) {
  return signals.find((signal) => signal.capability === capability) || null;
}

function signalMeta(signal) {
  if (!signal) return 'Review required';
  const confidence =
    typeof signal.confidence === 'number' ? `${Math.round(signal.confidence * 100)}% confidence` : 'confidence pending';
  return `${signal.safety?.status || 'review_required'} | ${confidence}`;
}

export default function EmergencyAnalytics() {
  const emergencyAnalytics = useEmergencyStore((state) => state.emergencyAnalytics);
  const loadEmergencyAnalytics = useEmergencyStore((state) => state.loadEmergencyAnalytics);
  const upgradeHarness = useAdvancedEmergencyOsUpgradeHarness();
  const data = emergencyAnalytics.data?.operationalCommand || {};
  const shift = emergencyAnalytics.data?.shift || {};
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

  useEffect(() => {
    void loadEmergencyAnalytics({ force: true });
  }, [loadEmergencyAnalytics]);

  return (
    <section className="emergency-analytics" aria-label="Emergency operational analytics">
      <header className="emergency-analytics__header">
        <div>
          <span>Operational Command</span>
          <h1>Emergency Analytics</h1>
          <p>
            Current shift, arrival, wait-time, and complaint-mix signals for ED leadership review.
          </p>
        </div>
        <strong>
          {emergencyAnalytics.status === 'loading'
            ? 'Loading'
            : analyticsSourceLabel(emergencyAnalytics.source)}
        </strong>
      </header>

      {emergencyAnalytics.status === 'loading' ? (
        <p className="emergency-analytics__state" role="status">
          Loading Emergency OS analytics...
        </p>
      ) : null}
      {statusMessage ? (
        <p className="emergency-analytics__state">
          {statusMessage}
        </p>
      ) : null}
      {emergencyAnalytics.status !== 'loading' && !hasOperationalData ? (
        <p className="emergency-analytics__state emergency-analytics__state--empty">
          Operational analytics will populate when Emergency OS has active patient flow data for this department.
        </p>
      ) : null}

      {upgradeHarness.data?.data ? (
        <div className="emergency-analytics__grid" aria-label="Advanced Emergency OS upgrade harness analytics">
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

        <ChartCard title="Hourly Arrival Heatmap" subtitle="Today">
          {hourlyArrivals.length ? (
            <div className="emergency-analytics__heatmap">
              {hourlyArrivals.map((hour) => (
                <span
                  key={hour.hour}
                  style={{ '--heat': Math.min(1, (hour.count || 0) / 6) }}
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
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="emergency-analytics__legend">
                {topComplaints.slice(0, 6).map((item, index) => (
                  <span key={item.name}>
                    <i style={{ background: COLORS[index % COLORS.length] }} />
                    {item.name}: {item.count}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <ChartEmpty>No complaint mix returned.</ChartEmpty>
          )}
        </ChartCard>
      </div>
    </section>
  );
}
