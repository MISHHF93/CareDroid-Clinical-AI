import PatientCard from '../../components/PatientCard';
import { PatientFlag, PatientState } from '../../types/emergency';

export const emergencyRouteStyles = {
  page: {
    minHeight: '100%',
    display: 'grid',
    alignContent: 'start',
    gap: 'var(--space-4, 16px)',
    padding: 'var(--space-4, 16px)',
    background: 'var(--color-background, #0A0E1A)',
    color: 'var(--color-text-primary, #F9FAFB)',
  },
  hero: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 'var(--space-4, 16px)',
    border: '1px solid var(--color-border-subtle, #1F2937)',
    borderRadius: 'var(--radius-xl, 16px)',
    background: 'var(--color-card, #172033)',
    padding: 'var(--space-4, 16px)',
    boxShadow: 'none',
  },
  eyebrow: {
    color: 'var(--status-info, #60A5FA)',
    fontSize: 'var(--font-size-xs, 12px)',
    fontWeight: 900,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  title: {
    margin: 'var(--space-1, 4px) 0 0',
    color: 'var(--color-text-primary, #F9FAFB)',
    fontSize: 'var(--font-size-2xl, 24px)',
    lineHeight: 1.05,
  },
  description: {
    color: 'var(--color-text-secondary, #9CA3AF)',
    fontSize: 'var(--font-size-sm, 14px)',
    margin: 'var(--space-1, 4px) 0 0',
    maxWidth: 860,
  },
  card: {
    border: '1px solid var(--color-border-subtle, #1F2937)',
    borderRadius: 'var(--radius-lg, 12px)',
    background: 'var(--color-surface, #111827)',
  },
  muted: {
    color: 'var(--color-text-muted, #6B7280)',
  },
};

export function EmergencyRoutePage({ eyebrow, title, description, children, actions }) {
  return (
    <section style={emergencyRouteStyles.page}>
      <header style={emergencyRouteStyles.hero}>
        <div>
          {eyebrow ? <span style={emergencyRouteStyles.eyebrow}>{eyebrow}</span> : null}
          <h1 style={emergencyRouteStyles.title}>{title}</h1>
          {description ? <p style={emergencyRouteStyles.description}>{description}</p> : null}
        </div>
        {actions ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}


export function MetricGrid({ metrics }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 12,
      }}
    >
      {metrics.map((metric) => (
        <article
          key={metric.label}
          style={{
            ...emergencyRouteStyles.card,
            display: 'grid',
            gap: 6,
            minWidth: 0,
            padding: 'var(--space-3, 12px)',
          }}
        >
          <strong
            style={{
              display: 'block',
              color: metric.color || 'var(--color-text-primary, #F9FAFB)',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 28,
              lineHeight: 1,
            }}
          >
            {metric.value}
          </strong>
          <span
            style={{
              display: 'block',
              color: 'var(--color-text-secondary, #9CA3AF)',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {metric.label}
          </span>
        </article>
      ))}
    </div>
  );
}

export function PatientGrid({ patients, emptyMessage }) {
  if (!patients.length) {
    return (
      <div
        role="status"
        style={{
          ...emergencyRouteStyles.card,
          borderStyle: 'dashed',
          color: 'var(--color-text-muted, #9CA3AF)',
          padding: 'var(--space-6, 24px)',
          textAlign: 'center',
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
        gap: 10,
      }}
    >
      {patients.map((patient) => (
        <PatientCard key={patient.id} patient={patient} />
      ))}
    </div>
  );
}

function dataFreshness(generatedAt) {
  if (!generatedAt) {
    return {
      label: 'latest local state',
      stale: false,
    };
  }

  const timestamp = new Date(generatedAt).getTime();
  if (!Number.isFinite(timestamp)) {
    return {
      label: 'latest local state',
      stale: false,
    };
  }

  const elapsedMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  const timeLabel = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (elapsedMinutes < 1) {
    return {
      label: `updated now at ${timeLabel}`,
      stale: false,
    };
  }

  return {
    label: `updated ${elapsedMinutes < 60 ? `${elapsedMinutes}m ago` : `${Math.round(elapsedMinutes / 60)}h ago`} at ${timeLabel}`,
    stale: elapsedMinutes >= 5,
  };
}

export function ApiStateBanner({
  moduleState,
  fallbackText = 'Showing the last local Emergency OS state. Verify against the current department record before operational decisions.',
}) {
  if (moduleState.loading && !moduleState.data) {
    return (
      <div
        role="status"
        style={{
          ...emergencyRouteStyles.card,
          color: 'var(--color-text-secondary, #9CA3AF)',
          padding: 'var(--space-3, 12px)',
        }}
      >
        Loading department data...
      </div>
    );
  }

  if (moduleState.error) {
    return (
      <div
        role="alert"
        style={{
          border: '1px solid color-mix(in srgb, var(--status-critical, #EF4444) 54%, var(--color-border-default, #7F1D1D))',
          borderRadius: 'var(--radius-lg, 12px)',
          background: 'color-mix(in srgb, var(--status-critical, #EF4444) 12%, var(--color-surface, #111827))',
          color: 'var(--status-critical, #FCA5A5)',
          padding: 'var(--space-3, 12px)',
        }}
      >
        {moduleState.error}. {fallbackText}
      </div>
    );
  }

  if (moduleState.isEmpty) {
    return (
      <div
        role="status"
        style={{
          ...emergencyRouteStyles.card,
          borderStyle: 'dashed',
          color: 'var(--color-text-muted, #9CA3AF)',
          padding: 'var(--space-3, 12px)',
        }}
      >
        No active records are available for this module yet. Add or load department data before using this view for handoff decisions.
      </div>
    );
  }

  return null;
}

export function DataSourceNote({ moduleState }) {
  const generatedAt = moduleState.data?.generatedAt;
  const source = moduleState.data?.source;
  const freshness = dataFreshness(generatedAt);
  const sourceLabel =
    !source || /fallback|demo|fixture|first-customer/i.test(source)
      ? 'walkthrough/local dataset - no live hospital integration'
      : source === 'backend'
        ? 'live Emergency OS feed'
        : source;
  return (
    <div
      role="status"
      title={freshness.stale ? 'Data may be stale. Validate against current department state.' : undefined}
      style={{
        color: freshness.stale
          ? 'var(--status-warning, #F59E0B)'
          : 'var(--color-text-muted, #6B7280)',
        fontSize: 12,
      }}
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
