import PatientCard from '../../components/PatientCard';
import { PageShell } from '../../components/ui/CareDroidPrimitives';
import { PatientFlag, PatientState } from '../../types/emergency';
import { resolveEdDataFreshness, resolveEdSourceLabel } from '../../utils/edDataSource';
import { shouldShowDeveloperApiBanners } from '../../config/practitionerCleanup.config';
import './emergency-route.css';

/** @deprecated Use emergency-route.css classes instead */
export const emergencyRouteStyles = {
  page: {},
  hero: {},
  eyebrow: {},
  title: {},
  description: {},
  card: {},
  muted: {},
};

const MATURITY_CHIP_LABELS = {
  demo: 'Demo',
  preview: 'Preview',
  planned: 'Planned',
};

export function MaturityChip({ maturity }) {
  if (!maturity || maturity === 'live' || !MATURITY_CHIP_LABELS[maturity]) return null;

  return (
    <span
      className={`emergency-route-maturity-chip emergency-route-maturity-chip--${maturity}`}
      aria-label={`${MATURITY_CHIP_LABELS[maturity]} surface`}
    >
      {MATURITY_CHIP_LABELS[maturity]}
    </span>
  );
}

export function FlowCapacityViewTabs({ activeView, onViewChange }) {
  const views = [
    { id: 'capacity', label: 'Capacity' },
    { id: 'boarding', label: 'Boarding' },
  ];

  return (
    <div className="emergency-route-view-tabs" role="tablist" aria-label="Flow and capacity views">
      {views.map((view) => (
        <button
          key={view.id}
          type="button"
          role="tab"
          aria-selected={activeView === view.id}
          className={`emergency-route-view-tabs__btn${
            activeView === view.id ? ' emergency-route-view-tabs__btn--active' : ''
          }`}
          onClick={() => onViewChange(view.id)}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}

export function EmergencyRoutePage({
  eyebrow,
  title,
  titleId,
  description,
  children,
  actions,
  maturity,
}) {
  const headerActions = (
    <>
      {actions}
      <MaturityChip maturity={maturity} />
    </>
  );

  return (
    <PageShell
      as="section"
      eyebrow={eyebrow}
      title={title}
      titleId={titleId}
      description={description}
      actions={actions || maturity ? headerActions : null}
      className="emergency-route-page cd-page-shell"
      headerClassName="emergency-route-page__hero"
      contentClassName="emergency-route-page__content"
      aria-label={title}
    >
      {children}
    </PageShell>
  );
}

export function MetricGrid({ metrics }) {
  return (
    <div className="emergency-route-metric-grid">
      {metrics.map((metric) => (
        <article
          key={metric.label}
          className="emergency-route-card emergency-route-metric-card"
          style={metric.color ? { '--metric-color': metric.color } : undefined}
        >
          <strong className="emergency-route-metric-card__value">{metric.value}</strong>
          <span className="emergency-route-metric-card__label">{metric.label}</span>
        </article>
      ))}
    </div>
  );
}

export function PatientGrid({ patients, emptyMessage }) {
  if (!patients.length) {
    return (
      <div role="status" className="emergency-route-card emergency-route-empty">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="emergency-route-patient-grid">
      {patients.map((patient) => (
        <PatientCard key={patient.id} patient={patient} />
      ))}
    </div>
  );
}

function dataFreshness(generatedAt) {
  return resolveEdDataFreshness(generatedAt);
}

export function ApiStateBanner({
  moduleState,
  fallbackText = 'Showing the last local CareDroid state. Verify against the current department record before operational decisions.',
}) {
  if (!shouldShowDeveloperApiBanners()) {
    return null;
  }

  if (moduleState.loading && !moduleState.data) {
    return (
      <div role="status" className="emergency-route-card emergency-route-banner">
        Loading department data...
      </div>
    );
  }

  if (moduleState.error) {
    return (
      <div role="alert" className="emergency-route-banner emergency-route-banner--error">
        {moduleState.error}. {fallbackText}
      </div>
    );
  }

  if (moduleState.isEmpty) {
    return (
      <div role="status" className="emergency-route-card emergency-route-empty">
        No active records are available for this module yet. Add or load department data before using this view for handoff decisions.
      </div>
    );
  }

  return null;
}

export function DataSourceNote({ moduleState }) {
  if (!shouldShowDeveloperApiBanners()) {
    return null;
  }

  const generatedAt = moduleState.data?.generatedAt;
  const source = moduleState.data?.source;
  const freshness = dataFreshness(generatedAt);
  const sourceLabel = resolveEdSourceLabel(source);
  return (
    <div
      role="status"
      title={freshness.stale ? 'Data may be stale. Validate against current department state.' : undefined}
      className={`emergency-route-data-source${freshness.stale ? ' emergency-route-data-source--stale' : ''}`}
    >
      Source: {sourceLabel} | {freshness.label}
      {freshness.stale ? ' | validate before operational decisions' : ''}
    </div>
  );
}

export function isHighRisk(patient) {
  return (
    patient.priority === 'P1' ||
    patient.priority === 'P2' ||
    patient.flags.includes(PatientFlag.HighRisk) ||
    patient.flags.includes(PatientFlag.DeteriorationRisk) ||
    patient.flags.includes(PatientFlag.SepsisAlert)
  );
}

export function isBoarding(patient) {
  return (
    patient.state === PatientState.Admission || patient.flags.includes(PatientFlag.PendingAdmission)
  );
}

export function displayPatientName(patient) {
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.name || patient.mrn;
}

const REASSESSMENT_ATTENTION_FLAGS = [
  PatientFlag.DeteriorationRisk,
  PatientFlag.SepsisAlert,
  PatientFlag.HighRisk,
  PatientFlag.ReassessmentDue,
];

export const QUEUE_MOVEMENT_STAGES = Object.freeze({
  Arrival: ['Arrival'],
  Registration: ['Arrival'],
  Triage: ['Triage'],
  Waiting: ['Waiting'],
  Assessment: ['Assessment'],
  Orders: ['Assessment'],
  Results: ['Results'],
  Admission: ['Admission'],
  Boarding: ['Admission'],
  Referral: ['Disposition', 'Admission'],
  Discharge: ['Disposition', 'Discharge'],
  Reassessment: ['Waiting', 'Assessment', 'Results', 'Disposition'],
});

export function needsReassessmentAttention(patient) {
  return REASSESSMENT_ATTENTION_FLAGS.some((flag) => patient.flags.includes(flag));
}

export function findUpgradeSignal(signals = [], capability) {
  return signals.find((signal) => signal.capability === capability) || null;
}