import { Link } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useEmergencyStore } from '../../store/emergencyStore';
import { buildFullEmergencyCareJourneySnapshot } from '../../services/fullEmergencyCareJourneyService';
import { EmergencyRoutePage, MetricGrid } from './emergencyRouteShared';

type FullJourneyOperatingPageProps = Readonly<{
  view?: 'journey' | 'ed-readiness' | 'diagnostics' | 'handoffs' | 'reports';
}>;

const VIEW_COPY = {
  journey: {
    eyebrow: 'Command center',
    title: 'Full Emergency-Care Journey',
    description: 'One operating picture from emergency signal and 911 call through EMS, ED care, disposition, reporting, and analytics feedback.',
  },
  'ed-readiness': {
    eyebrow: 'Pre-arrival',
    title: 'ED Readiness',
    description: 'Prepare rooms, staff, equipment, specialty teams, lab, radiology, and pharmacy before the patient arrives.',
  },
  diagnostics: {
    eyebrow: 'Diagnostics',
    title: 'Diagnostics Coordination',
    description: 'Coordinate lab, imaging, ECG, pharmacy review, and consult workflows from the live ED operating state.',
  },
  handoffs: {
    eyebrow: 'Handoffs',
    title: 'Structured Handoffs',
    description: 'Track EMS-to-ED, ED-to-department, admission, transfer, and discharge handoff readiness.',
  },
  reports: {
    eyebrow: 'Reports',
    title: 'Operational Reports',
    description: 'Review response compliance, bottlenecks, outcomes, safety review signals, and analytics feedback loops.',
  },
} as const;

const VIEW_STAGE_IDS = {
  journey: [],
  'ed-readiness': ['hospital-pre-arrival', 'ed-readiness', 'patient-arrival'],
  diagnostics: ['diagnostics', 'treatment-observation'],
  handoffs: ['hospital-pre-arrival', 'disposition', 'handoff-reporting'],
  reports: ['outcome-tracking', 'analytics-feedback'],
} as const;

export default function FullJourneyOperatingPage({ view = 'journey' }: FullJourneyOperatingPageProps) {
  const patients = useEmergencyStore((state) => state.patients);
  const staff = useEmergencyStore((state) => state.staff);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const alerts = useEmergencyStore((state) => state.alerts);
  const capacity = useEmergencyStore((state) => state.capacity);
  const snapshot = buildFullEmergencyCareJourneySnapshot({
    patients,
    staff,
    emsArrivals,
    alerts,
    capacity,
  });
  const copy = VIEW_COPY[view];
  const selectedStageIds = VIEW_STAGE_IDS[view];
  const stages = selectedStageIds.length
    ? snapshot.stages.filter((stage) => selectedStageIds.includes(stage.id as never))
    : snapshot.stages;
  const activeServiceIds = new Set(stages.flatMap((stage) => stage.serviceModules));
  const services = snapshot.services.filter((service) => activeServiceIds.has(service.id));

  return (
    <EmergencyRoutePage eyebrow={copy.eyebrow} title={copy.title} description={copy.description}>
      <MetricGrid
        metrics={[
          { label: 'Active patients', value: snapshot.metrics.activePatients },
          { label: 'P1/P2 patients', value: snapshot.metrics.p1p2Patients, color: '#EF4444' },
          { label: 'Inbound EMS', value: snapshot.metrics.inboundEms, color: '#F59E0B' },
          { label: 'Critical alerts', value: snapshot.metrics.criticalAlerts, color: '#DC2626' },
          { label: 'Capacity band', value: snapshot.metrics.capacityBand },
          { label: '3-min breaches', value: snapshot.metrics.threeMinuteBreaches, color: snapshot.metrics.threeMinuteBreaches ? '#DC2626' : '#10B981' },
        ]}
      />

      <article className="emergency-route-card emergency-route-copilot-hint">
        <strong>{snapshot.principle}</strong>
        <p>{snapshot.mission} {snapshot.safety}</p>
      </article>

      <div className="emergency-route-stack">
        {stages.map((stage) => (
          <article key={stage.id} className="emergency-route-card emergency-route-queue-row">
            <div>
              <strong>
                {stage.order}. {stage.label}
              </strong>
              <div className="emergency-route-queue-row__patients">{stage.outcome}</div>
              <small className="emergency-route-queue-row__movement">
                Owners: {stage.ownerRoles.join(', ')} | Services: {stage.serviceModules.join(', ')}
              </small>
            </div>
            <Link to={stage.route} className="emergency-route-filter-banner__btn">
              Open
            </Link>
            <span className={`emergency-route-queue-row__oldest emergency-route-queue-row__oldest--${stage.status === 'attention' ? 'breached' : 'ok'}`}>
              {stage.status}
            </span>
          </article>
        ))}
      </div>

      <section className="emergency-route-card">
        <div className="emergency-route-section-card__header">
          <div>
            <strong>Connected SaaS Services</strong>
            <p className="emergency-route-section-card__lead">
              These services are reused or extended for this view. Every row points to a concrete implementation or route.
            </p>
          </div>
          <span className="emergency-route-journey-card__count">{services.length}</span>
        </div>
        <div className="emergency-route-chip-row">
          {services.map((service) => (
            <span key={service.id} className="emergency-route-action-chip" title={service.implementation}>
              {service.label} | {service.reuseStatus}
            </span>
          ))}
        </div>
      </section>

      <section className="emergency-route-card">
        <div className="emergency-route-section-card__header">
          <div>
            <strong>Next Review Surfaces</strong>
            <p className="emergency-route-section-card__lead">
              AI Chief, Alerts, Analytics, and Help carry the same journey map for decision support, reporting, and fallback procedures.
            </p>
          </div>
        </div>
        <div className="emergency-route-chip-row">
          <Link to={CANONICAL_ROUTES.emergencyCopilot} className="emergency-route-action-chip">AI Chief</Link>
          <Link to={CANONICAL_ROUTES.emergencyAlerts} className="emergency-route-action-chip">Critical Alerts</Link>
          <Link to={CANONICAL_ROUTES.emergencyAnalytics} className="emergency-route-action-chip">Analytics</Link>
          <Link to={CANONICAL_ROUTES.emergencyHelp} className="emergency-route-action-chip">Manual</Link>
        </div>
      </section>
    </EmergencyRoutePage>
  );
}
