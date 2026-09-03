import { useMemo } from 'react';
import type { Patient } from '../../types/emergency';
import {
  buildDiagnosticSafetyDashboardSnapshot,
  type DiagnosticRiskTier,
} from '../../services/diagnosticSafetyDashboardModel';
import { COPILOT_SAFETY_BOUNDED_DISCLAIMER } from '../../config/copilotSafety.config';
import { AiTruthLabel } from '../ai/AiTruthLabel';
import './DiagnosticSafetyDashboard.css';

type DiagnosticSafetyDashboardProps = {
  patients: Patient[];
  onSelectPatient?: (patientId: string) => void;
  className?: string;
};

const TIER_LABELS: Record<DiagnosticRiskTier, string> = {
  critical: 'Critical',
  high: 'High',
  moderate: 'Moderate',
  watch: 'Watch',
  stable: 'Stable',
};

export default function DiagnosticSafetyDashboard({
  patients,
  onSelectPatient,
  className = '',
}: DiagnosticSafetyDashboardProps) {
  const snapshot = useMemo(
    () => buildDiagnosticSafetyDashboardSnapshot(patients ?? []),
    [patients],
  );
  const entries = snapshot.entries ?? [];

  return (
    <section
      className={['diagnostic-safety-dashboard', className].filter(Boolean).join(' ')}
      aria-label="Diagnostic safety dashboard"
    >
      <header className="diagnostic-safety-dashboard__header">
        <div>
          <p className="diagnostic-safety-dashboard__eyebrow">Human review safety layer</p>
          <h2 className="diagnostic-safety-dashboard__title">Diagnostic Safety Dashboard</h2>
          <p className="diagnostic-safety-dashboard__subtitle">
            Patients sorted by combined clinical rule and anticipated-admission risk signals.
            {` ${COPILOT_SAFETY_BOUNDED_DISCLAIMER}`}
          </p>
          <AiTruthLabel
            state="Manual"
            sourceContext="Combined clinical-rule + anticipated-admission risk scoring — deterministic, not a trained model"
            reviewRequired
          />
        </div>
        <div className="diagnostic-safety-dashboard__tiers" aria-label="Risk tier counts">
          {(Object.keys(TIER_LABELS) as DiagnosticRiskTier[]).map((tier) =>
            snapshot.tierCounts[tier] > 0 ? (
              <span
                key={tier}
                className={`diagnostic-safety-dashboard__tier-chip diagnostic-safety-dashboard__tier-chip--${tier}`}
              >
                {TIER_LABELS[tier]} {snapshot.tierCounts[tier]}
              </span>
            ) : null,
          )}
        </div>
      </header>

      <div className="diagnostic-safety-dashboard__list" role="list">
        {entries.map((entry) => (
          <article
            key={entry.patientId}
            className={`diagnostic-safety-dashboard__row diagnostic-safety-dashboard__row--${entry.riskTier}`}
            role="listitem"
          >
            <span
              className={`diagnostic-safety-dashboard__tier-chip diagnostic-safety-dashboard__tier-chip--${entry.riskTier}`}
            >
              {TIER_LABELS[entry.riskTier]}
            </span>
            <div>
              <h3 className="diagnostic-safety-dashboard__name">
                {onSelectPatient ? (
                  <button
                    type="button"
                    onClick={() => onSelectPatient(entry.patientId)}
                    className="diagnostic-safety-dashboard__name-btn"
                  >
                    {entry.name}
                  </button>
                ) : (
                  entry.name
                )}
              </h3>
              <p className="diagnostic-safety-dashboard__meta">
                {entry.mrn} · {entry.priority} · {entry.state} · Score {entry.riskScore}
              </p>
              <p className="diagnostic-safety-dashboard__meta">{entry.chiefComplaint}</p>
              <div className="diagnostic-safety-dashboard__drivers">
                {(entry.riskDrivers ?? []).map((driver) => (
                  <span
                    key={`${entry.patientId}-${driver}`}
                    className="diagnostic-safety-dashboard__driver"
                  >
                    {driver}
                  </span>
                ))}
              </div>
            </div>
            <span className="diagnostic-safety-dashboard__meta">Review</span>
          </article>
        ))}
      </div>
    </section>
  );
}
