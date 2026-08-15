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

/**
 * HEAL-209: BottleneckEvent.title/.description embed real patient PHI for
 * patient-flow-derived events, identified structurally here by the
 * presence of affectedPatientId -- title as a `<label> — <name>` pattern
 * (continuousPatientFlowEngine.ts's `Flow wait — ${patientDisplayName(patient)}`),
 * description as arbitrary freeform prose that can also embed a name (e.g.
 * bottleneckRegistry.ts's unacknowledged-critical-alert adapter builds
 * `${alert.title}: ${alert.message}` from whatever a clinical alert's own
 * text says, which routinely names the patient -- "Deterioration risk
 * flagged: Sarah Okafor has a deterioration risk flag..."). Since
 * description is free text, it can't be safely string-parsed for a name the
 * way title's fixed separator can; replace it outright instead. This panel
 * is shared by EmergencySettings.tsx (it_admin's own default landing page --
 * EMERGENCY_ROLE_DEFINITIONS.itAdmin explicitly excludes every patient
 * route, "no patient clinical data") and EmergencyAnalytics.tsx/
 * CommandDashboard.tsx (ed_manager/admin/charge_nurse, who DO have patient
 * access). Fails closed like every other PHI gate this session added
 * (HEAL-203/206).
 */
const REDACTED_BOTTLENECK_DESCRIPTION =
  'Patient-specific details are hidden for this role. A role with patient access can view specifics.';

function redactBottleneckContentForRole(
  event: BottleneckEvent,
  canViewPatients: boolean,
): { title: string; description: string } {
  if (canViewPatients || !event.affectedPatientId) {
    return { title: event.title, description: event.description };
  }
  const separatorIndex = event.title.indexOf(' — ');
  const title = separatorIndex === -1 ? event.title : event.title.slice(0, separatorIndex);
  return { title, description: REDACTED_BOTTLENECK_DESCRIPTION };
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

export function BottleneckImpactCard({
  event,
  canViewPatients = false,
}: {
  event: BottleneckEvent;
  canViewPatients?: boolean;
}) {
  const { title, description } = redactBottleneckContentForRole(event, canViewPatients);
  return (
    <article className="bottleneck-impact-card">
      <div className="bottleneck-impact-card__head">
        <BottleneckSeverityBadge severity={event.severity} />
        <span>{event.category.replace(/_/g, ' ')}</span>
      </div>
      <strong>{title}</strong>
      <p>{description}</p>
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
  canViewPatients = false,
}: {
  events: BottleneckEvent[];
  limit?: number;
  canViewPatients?: boolean;
}) {
  if (!events.length) {
    return <p className="bottleneck-list__empty">No active workflow or service bottlenecks detected.</p>;
  }

  return (
    <ul className="bottleneck-list" aria-label="Active bottlenecks">
      {events.slice(0, limit).map((event) => (
        <li key={event.id}>
          <BottleneckImpactCard event={event} canViewPatients={canViewPatients} />
        </li>
      ))}
    </ul>
  );
}

export function RootCauseSummaryPanel({
  registry,
  canViewPatients = false,
}: {
  registry: BottleneckRegistrySnapshot;
  canViewPatients?: boolean;
}) {
  const primary = registry.activeBottlenecks[0];
  // HEAL-209: registry.rootCauseSummary is pre-baked from raw
  // (unredacted) event.title strings at the bottleneckRegistry.ts
  // snapshot-build step, before this component ever sees canViewPatients
  // -- trusting it directly would re-leak patient names through this
  // panel even after BottleneckList/BottleneckImpactCard are gated.
  // Recompute the summary from the same top-3-events rule
  // (bottleneckRegistry.ts's own construction), through the redaction
  // helper, whenever any of those events is patient-identifying.
  const summary = registry.activeBottlenecks.some((event) => event.affectedPatientId)
    ? registry.activeBottlenecks
        .slice(0, 3)
        .map((event) => `${event.serviceName}: ${redactBottleneckContentForRole(event, canViewPatients).title}`)
        .join(' | ') || registry.rootCauseSummary
    : registry.rootCauseSummary;
  return (
    <section className="root-cause-summary-panel" aria-label="AI Chief bottleneck root cause summary">
      <header>
        <span>AI Chief</span>
        <h3>Root Cause Summary</h3>
      </header>
      <p>{summary}</p>
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
  canViewPatients = false,
}: {
  registry: BottleneckRegistrySnapshot;
  canViewPatients?: boolean;
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
          <BottleneckList events={registry.activeBottlenecks} canViewPatients={canViewPatients} />
        </div>
        <div>
          <h4>Service Health</h4>
          <ServiceDependencyMap services={registry.serviceHealth} />
        </div>
      </div>
      <RootCauseSummaryPanel registry={registry} canViewPatients={canViewPatients} />
    </section>
  );
}

