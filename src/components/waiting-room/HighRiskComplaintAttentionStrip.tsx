import React, { useMemo } from 'react';
import { buildHighRiskComplaintBoardSummary } from '../../services/highRiskComplaintFlags';
import HighRiskComplaintFlagBadge from '../reception/HighRiskComplaintFlagBadge';
import './HighRiskComplaintAttentionStrip.css';

export default function HighRiskComplaintAttentionStrip({
  patients = [] as any[],
  onSelectPatient,
  className = '',
}) {
  const summary = useMemo(() => buildHighRiskComplaintBoardSummary(patients), [patients]);

  if (!summary.flaggedCount) return null;

  const previewPatients = summary.patients.slice(0, 4);

  return (
    <section
      className={['high-risk-complaint-strip', className].filter(Boolean).join(' ')}
      aria-label="High-risk complaint fast flags"
    >
      <header className="high-risk-complaint-strip__header">
        <div>
          <p className="high-risk-complaint-strip__eyebrow">Staff alert</p>
          <h3>High-risk complaint flags</h3>
          <p className="high-risk-complaint-strip__subtitle">
            Fast flags highlight urgency and route to rapid review — they do not autonomously triage.
          </p>
        </div>
        <div className="high-risk-complaint-strip__counts">
          <span data-tone={summary.rapidReviewCount ? 'critical' : 'warning'}>
            <strong>{summary.rapidReviewCount}</strong>
            <small>Rapid review</small>
          </span>
          <span>
            <strong>{summary.flaggedCount}</strong>
            <small>Flagged</small>
          </span>
        </div>
      </header>

      <ul className="high-risk-complaint-strip__list">
        {previewPatients.map((patient) => (
          <li key={patient.id}>
            <button
              type="button"
              className="high-risk-complaint-strip__item"
              onClick={() => onSelectPatient?.(patient.id)}
              disabled={!onSelectPatient}
            >
              <span>
                {[patient.firstName, patient.lastName].filter(Boolean).join(' ') || patient.mrn}
              </span>
              <HighRiskComplaintFlagBadge patient={patient} compact />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
