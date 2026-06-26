import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import StateSourceNotice from '../../components/StateSourceNotice';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { SURVEILLANCE_NEXUS_ROUTES } from '../../config/surveillanceNexusModel';
import {
  fetchSurveillanceNexusSnapshot,
  formatSurveillanceTime,
  statusTone,
} from '../../services/surveillanceIoTService';
import type { SurveillanceNexusSnapshot } from '../../types/surveillanceIoT';
import { compileUserProfile, isRouteAllowedInCompiledProfile } from '../../config/userProfileCompiler';
import useEffectiveUserProfile from '../../hooks/useEffectiveUserProfile';

const REFRESH_MS = 60_000;

export default function SurveillanceNexusDashboard() {
  const { saasRole } = useEffectiveUserProfile();
  const compiled = useMemo(
    () => compileUserProfile({ saasRole }),
    [saasRole],
  );
  const [snapshot, setSnapshot] = useState<SurveillanceNexusSnapshot | null>(null);
  const [capability, setCapability] = useState('loading');
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchSurveillanceNexusSnapshot();
    setSnapshot(result.snapshot);
    setCapability(result.capability);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const openAlerts = useMemo(
    () => (snapshot?.alerts || []).filter((alert) => alert.status === 'open'),
    [snapshot?.alerts],
  );

  if (!isRouteAllowedInCompiledProfile(CANONICAL_ROUTES.surveillanceNexus, compiled)) {
    return (
      <div className="surv-nexus surv-nexus--loading" role="status">
        Surveillance Nexus is not available for your profile. Contact your administrator for hospital-operations or
        TrackMind entitlements.
      </div>
    );
  }

  if (loading && !snapshot) {
    return <div className="surv-nexus surv-nexus--loading">Loading surveillance nexus…</div>;
  }

  const data = snapshot!;

  return (
    <div className="surv-nexus">
      <header className="surv-nexus__header">
        <div>
          <p className="surv-nexus__eyebrow">TrackMind Nexus · Surveillance & IoT</p>
          <h1>Surveillance Nexus</h1>
          <p className="surv-nexus__lead">
            Camera registry, IoT devices, facility zones, health monitoring, alerts, and incident
            linkage across security, facilities, race-day, and welfare-safe contexts.
          </p>
        </div>
        <StateSourceNotice
          title={data.sourceLabel}
          states={[data.demo ? 'demo' : 'live']}
          details={data.generatedAt}
        />
      </header>

      <section className="surv-nexus__kpi-row" aria-label="Surveillance KPIs">
        {(data.kpiArtifacts || []).map((kpi) => (
          <article key={kpi.id} className="surv-nexus__kpi">
            <span className="surv-nexus__kpi-label">{kpi.label}</span>
            <strong>
              {kpi.value}
              {kpi.unit ? ` ${kpi.unit}` : ''}
            </strong>
            {kpi.trend ? <span className={`surv-nexus__trend surv-nexus__trend--${kpi.trend}`}>{kpi.trend}</span> : null}
          </article>
        ))}
      </section>

      <nav className="surv-nexus__tabs" aria-label="Surveillance sections">
        {['overview', 'cameras', 'iot', 'zones', 'health', 'alerts', 'incidents', 'integrations'].map(
          (tab) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? 'is-active' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ),
        )}
      </nav>

      <div className="surv-nexus__grid">
        <main className="surv-nexus__main">
          {activeTab === 'overview' && (
            <section>
              <h2>Platform posture</h2>
              <p className="surv-nexus__muted">
                Capability: <strong>{capability}</strong> · {openAlerts.length} open alert(s) ·{' '}
                {data.zones.length} zones · {data.cameras.length} cameras · {data.iotDevices.length}{' '}
                IoT devices
              </p>
              <ul className="surv-nexus__health-list">
                {data.healthMetrics.map((metric) => (
                  <li key={metric.id} className={`surv-nexus__health surv-nexus__health--${statusTone(metric.status)}`}>
                    <strong>{metric.label}</strong>
                    <span>{metric.score}% — {metric.detail}</span>
                    <span className="surv-nexus__domain">{metric.domain}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {activeTab === 'cameras' && (
            <section>
              <h2>Camera registry</h2>
              <div className="surv-nexus__table-wrap">
                <table className="surv-nexus__table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Zone</th>
                      <th>Status</th>
                      <th>Health</th>
                      <th>Adapter</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cameras.map((camera) => (
                      <tr key={camera.id}>
                        <td>
                          <strong>{camera.name}</strong>
                          <span className="surv-nexus__sub">{camera.manufacturer} {camera.model}</span>
                        </td>
                        <td>{camera.zoneLabel}</td>
                        <td>
                          <span className={`surv-nexus__badge surv-nexus__badge--${statusTone(camera.status)}`}>
                            {camera.status}
                          </span>
                        </td>
                        <td>{camera.healthScore}%</td>
                        <td>{camera.integrationAdapter}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === 'iot' && (
            <section>
              <h2>IoT device registry</h2>
              <div className="surv-nexus__cards">
                {data.iotDevices.map((device) => (
                  <article key={device.id} className="surv-nexus__card">
                    <div className="surv-nexus__card-head">
                      <strong>{device.name}</strong>
                      <span className={`surv-nexus__badge surv-nexus__badge--${statusTone(device.status)}`}>
                        {device.status}
                      </span>
                    </div>
                    <p>{device.deviceClass} · {device.zoneLabel}</p>
                    <p>{device.telemetryLabel}</p>
                    <p className="surv-nexus__muted">Adapter: {device.integrationAdapter}</p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'zones' && (
            <section>
              <h2>Facility zone mapping</h2>
              <div className="surv-nexus__cards">
                {data.zones.map((zone) => (
                  <article key={zone.id} className="surv-nexus__card">
                    <div className="surv-nexus__card-head">
                      <strong>{zone.name}</strong>
                      <span className="surv-nexus__code">{zone.shortCode}</span>
                    </div>
                    <p>{zone.facilityLabel}</p>
                    <p>
                      {zone.zoneType} · privacy {zone.privacyTier}
                      {zone.welfareSafeMode ? ' · welfare-safe' : ''}
                    </p>
                    <p className="surv-nexus__muted">
                      {zone.linkedCameraIds.length} cameras · {zone.linkedIotDeviceIds.length} IoT ·{' '}
                      {zone.activeAlertCount} alert(s)
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'health' && (
            <section>
              <h2>Surveillance health monitoring</h2>
              <ul className="surv-nexus__health-list">
                {data.healthMetrics.map((metric) => (
                  <li key={metric.id} className={`surv-nexus__health surv-nexus__health--${statusTone(metric.status)}`}>
                    <strong>{metric.label}</strong>
                    <span>{metric.score}% — {metric.detail}</span>
                    <span className="surv-nexus__muted">Checked {formatSurveillanceTime(metric.checkedAt)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {activeTab === 'alerts' && (
            <section>
              <h2>Alerts & rules</h2>
              <h3>Active alerts</h3>
              <ul className="surv-nexus__alert-list">
                {data.alerts.map((alert) => (
                  <li key={alert.id} className={`surv-nexus__alert surv-nexus__alert--${alert.severity}`}>
                    <strong>{alert.title}</strong>
                    <p>{alert.detail}</p>
                    <span className="surv-nexus__muted">{alert.status} · {alert.severity}</span>
                  </li>
                ))}
              </ul>
              <h3>Alert rules</h3>
              <ul className="surv-nexus__rule-list">
                {data.alertRules.map((rule) => (
                  <li key={rule.id}>
                    <strong>{rule.name}</strong>
                    <span>{rule.trigger}</span>
                    {rule.requiresApproval ? <em>Approval required</em> : null}
                    {rule.welfareSafe ? <em>Welfare-safe</em> : null}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {activeTab === 'incidents' && (
            <section>
              <h2>Incident linkage</h2>
              <ul className="surv-nexus__incident-list">
                {data.incidentLinks.map((incident) => (
                  <li key={incident.id} className="surv-nexus__incident">
                    <strong>{incident.incidentLabel}</strong>
                    <p>{incident.incidentType} · {incident.status}</p>
                    <p className="surv-nexus__muted">
                      Zone {incident.zoneId} · audit {incident.auditRecordId || 'pending'}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {activeTab === 'integrations' && (
            <section>
              <h2>Adapter-ready integration contracts</h2>
              <div className="surv-nexus__cards">
                {data.integrationContracts.map((contract) => (
                  <article key={contract.adapterId} className="surv-nexus__card">
                    <div className="surv-nexus__card-head">
                      <strong>{contract.label}</strong>
                      <span className={`surv-nexus__badge surv-nexus__badge--${statusTone(contract.status)}`}>
                        {contract.status}
                      </span>
                    </div>
                    <p>Domain: {contract.domain}</p>
                    <p className="surv-nexus__muted">v{contract.contractVersion} · {contract.endpointHint}</p>
                    {contract.requiresApproval ? <em>Governed approval required</em> : null}
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>

        <aside className="surv-nexus__rail">
          <h2>Related surfaces</h2>
          <ul className="surv-nexus__links">
            {SURVEILLANCE_NEXUS_ROUTES.map((link) => (
              <li key={link.id}>
                <Link to={link.route}>{link.label}</Link>
                <span className="surv-nexus__muted">{link.domain}</span>
              </li>
            ))}
          </ul>
          <h2>Governance</h2>
          <ul className="surv-nexus__links">
            <li>
              <Link to={CANONICAL_ROUTES.audit}>Audit trails</Link>
            </li>
            <li>
              <Link to={CANONICAL_ROUTES.workflows}>Approval workflows</Link>
            </li>
            <li>
              <Link to={CANONICAL_ROUTES.systemHealth}>System health</Link>
            </li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
