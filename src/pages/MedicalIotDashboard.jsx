import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMedicalIotSnapshot, formatTelemetryTime } from '../services/medicalIotService';
import {
  CategoryBarChart,
  MetricCard,
  MiniSparkline,
  TrendChart,
  VisualizationPanel,
} from '../components/dashboard/DashboardVisualizations';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import './MedicalIotDashboard.css';

function statusTone(status) {
  if (['online', 'normal', 'good'].includes(status)) return 'good';
  if (['warning', 'stale', 'medium'].includes(status)) return 'warning';
  if (['offline', 'abnormal', 'high'].includes(status)) return 'critical';
  return 'neutral';
}

function DeviceCard({ device }) {
  return (
    <article className="medical-iot-device-card">
      <div className="medical-iot-card-row">
        <div>
          <h3>{device.name}</h3>
          <p>{device.type} · {device.patientLabel}</p>
        </div>
        <span className={`medical-iot-badge medical-iot-badge--${statusTone(device.status)}`}>
          {device.status}
        </span>
      </div>
      <dl className="medical-iot-device-meta">
        <div>
          <dt>Battery</dt>
          <dd>{device.battery}%</dd>
        </div>
        <div>
          <dt>Connectivity</dt>
          <dd>{device.connectivity}</dd>
        </div>
        <div>
          <dt>Last seen</dt>
          <dd>{formatTelemetryTime(device.lastSeenAt)}</dd>
        </div>
      </dl>
    </article>
  );
}

function VitalCard({ vital }) {
  return (
    <article className={`medical-iot-vital-card medical-iot-vital-card--${statusTone(vital.status)}`}>
      <div className="medical-iot-card-row">
        <h3>{vital.label}</h3>
        <span className={`medical-iot-badge medical-iot-badge--${statusTone(vital.status)}`}>
          {vital.status}
        </span>
      </div>
      <div className="medical-iot-vital-value">
        <strong>{vital.value}</strong>
        <span>{vital.unit}</span>
      </div>
      <p>{vital.source}</p>
      <time dateTime={vital.timestamp}>{formatTelemetryTime(vital.timestamp)}</time>
    </article>
  );
}

function trendToChartData(trend) {
  return (trend?.points || []).map((value, index) => ({
    label: index === trend.points.length - 1 ? 'Now' : `T-${trend.points.length - index - 1}`,
    value,
  }));
}

export default function MedicalIotDashboard() {
  const [state, setState] = useState({
    loading: true,
    error: '',
    snapshot: null,
    message: '',
  });

  const loadSnapshot = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const result = await fetchMedicalIotSnapshot();
      setState({
        loading: false,
        error: '',
        snapshot: result.snapshot,
        message: result.message || '',
      });
    } catch (error) {
      setState({
        loading: false,
        error: error?.message || 'Unable to load Medical IoT telemetry.',
        snapshot: null,
        message: '',
      });
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  const snapshot = state.snapshot;
  const counts = useMemo(() => {
    const devices = snapshot?.devices || [];
    const alerts = snapshot?.alerts || [];
    return {
      connected: devices.filter((device) => device.status === 'online').length,
      offline: devices.filter((device) => device.status === 'offline').length,
      warnings: devices.filter((device) => ['warning', 'offline'].includes(device.status)).length,
      alerts: alerts.length,
    };
  }, [snapshot]);
  const freshnessMinutes = useMemo(() => {
    if (!snapshot?.generatedAt) return null;
    const updated = new Date(snapshot.generatedAt).getTime();
    if (Number.isNaN(updated)) return null;
    return Math.max(0, Math.round((Date.now() - updated) / 60000));
  }, [snapshot]);
  const deviceStatusDistribution = useMemo(() => {
    const statuses = (snapshot?.devices || []).reduce((acc, device) => {
      acc[device.status] = (acc[device.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(statuses).map(([name, value]) => ({ name, value }));
  }, [snapshot]);

  return (
    <main className="medical-iot-page">
      <section className="medical-iot-hero" aria-labelledby="medical-iot-title">
        <div>
          <p className="medical-iot-eyebrow">Connected care monitoring</p>
          <h1 id="medical-iot-title">Medical IoT Dashboard</h1>
          <p>
            Monitor connected devices, patient telemetry, vitals streams, wearable data, and abnormal
            signal alerts. Device data is monitoring support only and does not replace clinician assessment.
          </p>
        </div>
        <div className="medical-iot-hero-actions">
          <Link to="/dashboard" className="medical-iot-action">
            Back to Command Dashboard
          </Link>
          <Link to="/tools" className="medical-iot-action medical-iot-action--secondary">
            Open Tool Library
          </Link>
        </div>
      </section>

      {state.loading ? (
        <section className="medical-iot-state" aria-label="Loading Medical IoT telemetry">
          <NavIcon icon={CHROME_ICONS.loader} size={28} aria-hidden />
          <p>Loading Medical IoT telemetry...</p>
        </section>
      ) : null}

      {!state.loading && state.error ? (
        <section className="medical-iot-state medical-iot-state--error" role="alert">
          <NavIcon icon={CHROME_ICONS.alert} size={28} aria-hidden />
          <div>
            <h2>Medical IoT telemetry unavailable</h2>
            <p>{state.error}</p>
            <button type="button" className="medical-iot-action" onClick={loadSnapshot}>
              Retry loading Medical IoT telemetry
            </button>
          </div>
        </section>
      ) : null}

      {!state.loading && !state.error && snapshot ? (
        <>
          <section className="medical-iot-source" role="status">
            <strong>{snapshot.sourceLabel}</strong>
            <span>Last updated: {formatTelemetryTime(snapshot.generatedAt)}</span>
            {state.message ? <span>{state.message}</span> : null}
          </section>

          <section className="medical-iot-summary" aria-label="Medical IoT status summary">
            <MetricCard label="Connected devices" value={snapshot.devices.length} hint="Demo registry count" />
            <MetricCard label="Online" value={counts.connected} hint="Reporting in snapshot" tone="good" />
            <MetricCard label="Offline" value={counts.offline} hint="Needs connectivity review" tone={counts.offline ? 'critical' : 'good'} />
            <MetricCard label="Active alerts" value={counts.alerts} hint="Monitoring support only" tone={counts.alerts ? 'warning' : 'good'} />
            <MetricCard
              label="Freshness"
              value={freshnessMinutes == null ? 'Unknown' : `${freshnessMinutes}m`}
              hint="Generated demo snapshot"
            />
          </section>

          {snapshot.devices.length === 0 ? (
            <section className="medical-iot-state">
              <h2>No connected medical devices</h2>
              <p>
                No device registry or telemetry stream is connected yet. Add a backend device-registry
                service before displaying live patient telemetry.
              </p>
            </section>
          ) : (
            <section className="medical-iot-section" aria-labelledby="medical-iot-devices-title">
              <h2 id="medical-iot-devices-title">Connected Devices</h2>
              <div className="medical-iot-device-grid">
                {snapshot.devices.map((device) => (
                  <DeviceCard key={device.id} device={device} />
                ))}
              </div>
            </section>
          )}

          <section className="medical-iot-section" aria-labelledby="medical-iot-vitals-title">
            <h2 id="medical-iot-vitals-title">Patient Vitals Streams</h2>
            {snapshot.vitals.length === 0 ? (
              <p className="medical-iot-empty">No vitals streams are reporting right now.</p>
            ) : (
              <div className="medical-iot-vitals-grid">
                {snapshot.vitals.map((vital) => (
                  <VitalCard key={vital.id} vital={vital} />
                ))}
              </div>
            )}
          </section>

          <section className="medical-iot-section" aria-labelledby="medical-iot-visuals-title">
            <h2 id="medical-iot-visuals-title">Telemetry Visual Analytics</h2>
            <p className="medical-iot-visual-note">
              Demo data - mock telemetry, not live patient data and not for clinical decisions.
            </p>
            <div className="dashboard-visual-grid medical-iot-visual-grid">
              <VisualizationPanel title="Device Status Distribution" description="Online, warning, and offline connected-device states." badge="Demo data">
                <CategoryBarChart data={deviceStatusDistribution} title="Medical IoT device status distribution" />
              </VisualizationPanel>
              <VisualizationPanel title="SpO2 Trend" description="Recent pulse oximeter readings from demo telemetry." badge="Mock telemetry">
                <TrendChart data={trendToChartData(snapshot.trends.find((trend) => trend.label === 'SpO2'))} title="SpO2 telemetry trend" />
              </VisualizationPanel>
              <VisualizationPanel title="Glucose Trend" description="Recent glucose monitor readings from demo telemetry." badge="Mock telemetry">
                <TrendChart
                  data={trendToChartData(snapshot.trends.find((trend) => trend.label === 'Glucose'))}
                  title="Glucose telemetry trend"
                  color="var(--app-chart-4)"
                />
              </VisualizationPanel>
              <VisualizationPanel title="Heart Rate Trend" description="Recent ECG/heart-rate telemetry from demo data." badge="Mock telemetry">
                <TrendChart
                  data={trendToChartData(snapshot.trends.find((trend) => trend.label === 'Heart rate'))}
                  title="Heart rate telemetry trend"
                  color="var(--app-chart-5)"
                />
              </VisualizationPanel>
              <VisualizationPanel title="Device Connectivity Timeline" description="Snapshot trend of online devices over time." badge="Demo timeline">
                <TrendChart
                  data={(snapshot.connectivityTimeline || []).map((item) => ({ label: item.label, value: item.online }))}
                  title="Device connectivity timeline"
                  color="var(--app-chart-2)"
                />
              </VisualizationPanel>
            </div>
          </section>

          <section className="medical-iot-grid-row">
            <div className="medical-iot-section">
              <h2>Abnormal Reading Alerts</h2>
              {snapshot.alerts.length === 0 ? (
                <p className="medical-iot-empty">No abnormal reading alerts.</p>
              ) : (
                <div className="medical-iot-alert-list">
                  {snapshot.alerts.map((alert) => (
                    <article key={alert.id} className={`medical-iot-alert medical-iot-alert--${statusTone(alert.severity)}`}>
                      <div className="medical-iot-card-row">
                        <h3>{alert.title}</h3>
                        <span className={`medical-iot-badge medical-iot-badge--${statusTone(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p>{alert.detail}</p>
                      <span>{alert.source} · {formatTelemetryTime(alert.timestamp)}</span>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="medical-iot-section">
              <h2>Recent Telemetry Trends</h2>
              {snapshot.trends.length === 0 ? (
                <p className="medical-iot-empty">No recent telemetry trends.</p>
              ) : (
                <div className="medical-iot-trend-list">
                  {snapshot.trends.map((trend) => (
                    <article key={trend.label} className="medical-iot-trend-card">
                      <div>
                        <h3>{trend.label}</h3>
                        <p>{trend.points.join(' → ')}</p>
                      </div>
                      <MiniSparkline points={trend.points} label={`${trend.label} mini trend`} />
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
