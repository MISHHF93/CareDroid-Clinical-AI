import type {
  BottleneckEvent,
  BottleneckRegistrySnapshot,
  BottleneckSeverity,
  ServiceHealth,
} from '../../services/bottleneckRegistry';
import './BottleneckPanels.css';

function severityLabel(severity: BottleneckSeverity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

export function BottleneckSeverityBadge({ severity }: { severity: BottleneckSeverity }) {
  return (
    <span className={`bottleneck-severity bottleneck-severity--${severity}`}>
      {severityLabel(severity)}
    </span>
  );
}

export function ThreeMinuteRiskIndicator({
  registry,
}: {
  registry: BottleneckRegistrySnapshot;
}) {
  const risk = registry.threeMinuteRiskProjection;
  return (
    <article className={`bottleneck-risk bottleneck-risk--${risk.status}`} aria-label="Three-minute risk projection">
      <span>3-minute target</span>
      <strong>{risk.status.replace(/_/g, ' ')}</strong>
      <small>{risk.summary}</small>
    </article>
  );
}

export function FallbackActionCard({ event }: { event?: BottleneckEvent }) {
  if (!event) return null;
  return (
    <article className="fallback-action-card" aria-label="Fallback action">
      <span>Fallback</span>
      <strong>{event.ownerRole.replace(/_/g, ' ')}</strong>
      <p>{event.fallbackAction}</p>
    </article>
  );
}

export function ServiceHealthCard({
  service,
  compact = true,
}: {
  service: ServiceHealth;
  compact?: boolean;
}) {
  const statusLabel =
    service.status === 'down'
      ? 'Offline'
      : service.status === 'degraded'
        ? 'Degraded'
        : service.status === 'unknown'
          ? 'Warning'
          : 'Healthy';

  return (
    <article
      className={[
        'service-health-card',
        `service-health-card--${service.status}`,
        compact ? 'service-health-card--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={`${service.serviceName} · ${service.latencyMs ?? 0}ms · ${Math.round((service.errorRate ?? 0) * 100)}% errors`}
    >
      <div className="service-health-card__head">
        <span className="service-health-card__status">{statusLabel}</span>
        <strong className="service-health-card__name">{service.serviceName}</strong>
      </div>
      {!compact ? (
        <>
          <small>
            {service.latencyMs ?? 0}ms latency · {Math.round((service.errorRate ?? 0) * 100)}% errors
          </small>
          <small>{service.fallbackAvailable ? 'Fallback available' : 'Fallback missing'}</small>
        </>
      ) : (
        <details className="service-health-card__details">
          <summary>Technical details</summary>
          <small>
            {service.latencyMs ?? 0}ms latency · {Math.round((service.errorRate ?? 0) * 100)}% errors
          </small>
          <small>{service.fallbackAvailable ? 'Fallback available' : 'Fallback missing'}</small>
        </details>
      )}
    </article>
  );
}

export function BottleneckImpactCard({ event }: { event: BottleneckEvent }) {
  return (
    <article className="bottleneck-impact-card">
      <div className="bottleneck-impact-card__head">
        <BottleneckSeverityBadge severity={event.severity} />
        <span>{event.category.replace(/_/g, ' ')}</span>
      </div>
      <strong>{event.title}</strong>
      <p>{event.description}</p>
      <small>
        Owner: {event.ownerRole.replace(/_/g, ' ')}
        {event.responseDeadline ? ` · deadline ${new Date(event.responseDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
      </small>
    </article>
  );
}

export function BottleneckList({
  events,
  limit = 5,
}: {
  events: BottleneckEvent[];
  limit?: number;
}) {
  if (!events.length) {
    return <p className="bottleneck-list__empty">No active workflow or service bottlenecks detected.</p>;
  }

  return (
    <ul className="bottleneck-list" aria-label="Active bottlenecks">
      {events.slice(0, limit).map((event) => (
        <li key={event.id}>
          <BottleneckImpactCard event={event} />
        </li>
      ))}
    </ul>
  );
}

export function RootCauseSummaryPanel({
  registry,
}: {
  registry: BottleneckRegistrySnapshot;
}) {
  const primary = registry.activeBottlenecks[0];
  return (
    <section className="root-cause-summary-panel" aria-label="AI Chief bottleneck root cause summary">
      <header>
        <span>AI Chief</span>
        <h3>Root Cause Summary</h3>
      </header>
      <p>{registry.rootCauseSummary}</p>
      <FallbackActionCard event={primary} />
    </section>
  );
}

export function ServiceDependencyMap({
  services,
}: {
  services: ServiceHealth[];
}) {
  return (
    <section className="service-dependency-map" aria-label="Service dependency map">
      {services.slice(0, 6).map((service) => (
        <ServiceHealthCard key={service.serviceName} service={service} />
      ))}
    </section>
  );
}

export function BottleneckCommandPanel({
  registry,
}: {
  registry: BottleneckRegistrySnapshot;
}) {
  return (
    <section className="bottleneck-command-panel" aria-label="Service health and active bottlenecks">
      <header>
        <div>
          <span>Service Health</span>
          <h3>Care Delay Bottlenecks</h3>
        </div>
        <ThreeMinuteRiskIndicator registry={registry} />
      </header>
      <div className="bottleneck-command-panel__grid">
        <div>
          <h4>Active Bottlenecks</h4>
          <BottleneckList events={registry.activeBottlenecks} />
        </div>
        <div>
          <h4>Service Health</h4>
          <ServiceDependencyMap services={registry.serviceHealth} />
        </div>
      </div>
      <RootCauseSummaryPanel registry={registry} />
    </section>
  );
}

