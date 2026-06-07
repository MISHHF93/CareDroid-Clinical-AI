import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ContextInsightCard from '../components/ContextInsightCard';
import { buildDigitalTwinIntelligence } from '../data/digitalTwinIntelligence';
import { buildDigitalTwinSnapshot } from '../data/platformOperatingSystem';
import { fetchFleetLiveTrackingSnapshot } from '../services/fleetTelemetryService';
import { fetchHospitalMapSnapshot } from '../services/hospitalMapService';
import { fetchMedicalIotSnapshot } from '../services/medicalIotService';
import './DigitalTwinIntelligence.css';

const SURFACE_LINKS = [
  { label: 'Digital Twin', path: '/digital-twin' },
  { label: 'Hospital Map', path: '/hospital-map' },
  { label: 'Medical IoT', path: '/medical-iot' },
  { label: 'Devices', path: '/devices' },
  { label: 'Fleet Map', path: '/fleet/map' },
];

function ScoreCard({ score }) {
  return (
    <article className={`twin-intel-score twin-intel-score--${score.band}`}>
      <p>{score.name}</p>
      <strong>{score.value}</strong>
      <span>{score.label}</span>
      <ul>
        {score.factors.slice(0, 3).map((factor) => (
          <li key={factor.label}>{factor.label}</li>
        ))}
      </ul>
    </article>
  );
}

function InsightCard({ insight }) {
  return (
    <ContextInsightCard
      title={`P${insight.priority}: ${insight.title}`}
      message={
        insight.relatedFactors.length
          ? `${insight.detail} Related: ${insight.relatedFactors.slice(0, 2).join(', ')}.`
          : insight.detail
      }
      source="Local operational twin"
      status={insight.severity === 'critical' || insight.severity === 'warning' ? 'action-required' : 'generated'}
      confidence={0.72}
      actionLabel="Review source"
      actionRoute={insight.route}
    />
  );
}

function DomainCard({ domain }) {
  return (
    <article className="twin-intel-domain-card">
      <div>
        <p>{domain.label}</p>
        <strong>{domain.count}</strong>
      </div>
      <span>{domain.riskCount} predictive blockers</span>
    </article>
  );
}

function QueueList({ title, items, empty, route }) {
  return (
    <section className="twin-intel-panel">
      <header>
        <div>
          <p className="twin-intel-eyebrow">Predictive queue</p>
          <h2>{title}</h2>
        </div>
        {route ? <Link to={route}>Open source</Link> : null}
      </header>
      {items.length ? (
        <ul className="twin-intel-queue">
          {items.slice(0, 8).map((item) => (
            <li key={`${title}-${item.id || item.label || item.title}`}>
              <strong>{item.label || item.title || item.name || item.id}</strong>
              <span>{item.status || item.severity || item.type || item.sourceDomain || 'watch'}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="twin-intel-empty">{empty}</p>
      )}
    </section>
  );
}

export default function DigitalTwinIntelligence() {
  const [snapshots, setSnapshots] = useState({
    digitalTwinSnapshot: buildDigitalTwinSnapshot(),
    hospitalMapSnapshot: {},
    medicalIotSnapshot: {},
    fleetSnapshot: {},
  });
  const [status, setStatus] = useState('Loading operational twin signals...');

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setStatus('Loading operational twin signals...');
      try {
        const [hospitalMapSnapshot, medicalIotSnapshot, fleetSnapshot] = await Promise.all([
          fetchHospitalMapSnapshot({ signal: controller.signal }),
          fetchMedicalIotSnapshot({ signal: controller.signal }),
          fetchFleetLiveTrackingSnapshot({ signal: controller.signal, delayMs: 0 }),
        ]);
        if (controller.signal.aborted) return;
        setSnapshots({
          digitalTwinSnapshot: buildDigitalTwinSnapshot(),
          hospitalMapSnapshot,
          medicalIotSnapshot,
          fleetSnapshot,
        });
        setStatus('Operational twin intelligence assembled from Hospital Map, Fleet, and IoT signals.');
      } catch (error) {
        if (controller.signal.aborted) return;
        setStatus(error?.message || 'Using local digital twin fallback signals.');
      }
    }
    load();
    return () => controller.abort();
  }, []);

  const intelligence = useMemo(() => buildDigitalTwinIntelligence(snapshots), [snapshots]);
  const domains = Object.values(intelligence.domains);
  const maintenanceItems = intelligence.domains.maintenance.items;
  const alertItems = intelligence.domains.alerts.items.filter((alert) => (alert.status || 'active') === 'active');
  const telemetryItems = intelligence.domains.telemetry.items.filter((item) =>
    ['offline', 'stale', 'abnormal', 'warning'].includes(item.status),
  );

  return (
    <main className="twin-intel-page">
      <section className="twin-intel-hero" aria-labelledby="digital-twin-intelligence-title">
        <div>
          <p className="twin-intel-eyebrow">Digital twin intelligence</p>
          <h1 id="digital-twin-intelligence-title">Predictive Operational Twin</h1>
          <p>
            Hospital Map, Fleet, and Medical IoT signals are combined into explainable health,
            risk, and readiness scores so operations can act before issues become incidents.
          </p>
          <p className="twin-intel-support-copy">
            Operational decision support only. Human teams must validate source data before
            dispatch, staffing, admission, discharge, or maintenance action.
          </p>
        </div>
        <nav className="twin-intel-surface-links" aria-label="Operational twin source surfaces">
          {SURFACE_LINKS.map((link) => (
            <Link key={link.path} to={link.path}>
              {link.label}
            </Link>
          ))}
        </nav>
      </section>

      <section className="twin-intel-context" aria-label="Digital twin context insight">
        <ContextInsightCard
          title="Operational twin source"
          message={status}
          source={/fallback|local|unable|unavailable/i.test(status) ? 'Fallback source' : 'Backend and local signals'}
          status={/fallback|local|unable|unavailable/i.test(status) ? 'unavailable' : 'generated'}
          actionLabel="Open Operations"
          actionRoute="/operations"
        />
      </section>

      <section className="twin-intel-scores" aria-label="Digital twin intelligence scores">
        <ScoreCard score={intelligence.scores.healthScore} />
        <ScoreCard score={intelligence.scores.riskScore} />
        <ScoreCard score={intelligence.scores.readinessScore} />
      </section>

      <section className="twin-intel-panel" aria-labelledby="predictive-insights-title">
        <header>
          <div>
            <p className="twin-intel-eyebrow">Predictive insights</p>
            <h2 id="predictive-insights-title">Before it becomes reactive</h2>
          </div>
          <span>{intelligence.riskBand} risk band</span>
        </header>
        <div className="twin-intel-insights">
          {intelligence.insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </section>

      <section className="twin-intel-panel" aria-labelledby="domain-breakdown-title">
        <header>
          <div>
            <p className="twin-intel-eyebrow">Operational domains</p>
            <h2 id="domain-breakdown-title">Rooms, devices, assets, telemetry, alerts, occupancy, maintenance</h2>
          </div>
        </header>
        <div className="twin-intel-domains">
          {domains.map((domain) => (
            <DomainCard key={domain.label} domain={domain} />
          ))}
        </div>
      </section>

      <section className="twin-intel-grid">
        <QueueList
          title="Alert queue"
          items={alertItems}
          empty="No active alerts detected across the operational twin."
          route="/notifications"
        />
        <QueueList
          title="Telemetry degradation"
          items={telemetryItems}
          empty="No degraded telemetry signals detected."
          route="/medical-iot"
        />
        <QueueList
          title="Maintenance readiness"
          items={maintenanceItems}
          empty="No maintenance readiness blockers detected."
          route="/devices"
        />
      </section>
    </main>
  );
}
