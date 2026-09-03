import React, { useMemo } from 'react';
import { buildFitToWaitAttentionSnapshot } from '../../services/fitToWaitPathway';
import FitToWaitBadge from './FitToWaitBadge';
import './FitToWaitAttentionStrip.css';

export default function FitToWaitAttentionStrip({
  patients = [] as any[],
  onSelectPatient,
  className = '',
}) {
  const snapshot = useMemo(() => buildFitToWaitAttentionSnapshot(patients), [patients]);

  if (!snapshot.needsAttentionCount) return null;

  return (
    <section
      className={['fit-to-wait-attention-strip', className].filter(Boolean).join(' ')}
      aria-label="Fit-to-sit / fit-to-wait seating review"
    >
      <header className="fit-to-wait-attention-strip__header">
        <div>
          <p className="fit-to-wait-attention-strip__eyebrow">Staff review</p>
          <h3>Fit-to-sit / fit-to-wait</h3>
          <p className="fit-to-wait-attention-strip__subtitle">
            Seating and waiting disposition requires staff classification — never auto-assigned from
            vitals or complaints.
          </p>
        </div>
        <div className="fit-to-wait-attention-strip__counts">
          <span data-tone={snapshot.immediateRoomCount ? 'critical' : 'stable'}>
            <strong>{snapshot.immediateRoomCount}</strong>
            <small>Room needed</small>
          </span>
          <span data-tone={snapshot.unclassifiedCount ? 'warning' : 'stable'}>
            <strong>{snapshot.unclassifiedCount}</strong>
            <small>Seating review</small>
          </span>
          {snapshot.reassessmentRequiredCount ? (
            <span data-tone="warning">
              <strong>{snapshot.reassessmentRequiredCount}</strong>
              <small>Reassess</small>
            </span>
          ) : null}
        </div>
      </header>

      <ul className="fit-to-wait-attention-strip__list">
        {snapshot.previewRows.map((row) => {
          const patient = patients.find((candidate) => candidate.id === row.patientId);
          return (
            <li key={row.patientId}>
              <button
                type="button"
                className="fit-to-wait-attention-strip__item"
                data-tone={row.tone}
                onClick={() => onSelectPatient?.(row.patientId)}
                disabled={!onSelectPatient}
              >
                <span>{row.displayName}</span>
                {patient ? <FitToWaitBadge patient={patient} compact /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
