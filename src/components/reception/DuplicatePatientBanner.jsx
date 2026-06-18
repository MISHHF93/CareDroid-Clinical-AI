import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { duplicateActionLabel } from '../../utils/patientDuplicateDetection';
import './DuplicatePatientBanner.css';

export default function DuplicatePatientBanner({
  candidates = [],
  onOpenPatient,
  onContinueCreate,
}) {
  if (!candidates.length) return null;

  return (
    <section className="duplicate-patient-banner" aria-labelledby="duplicate-patient-banner-title">
      <header className="duplicate-patient-banner__header">
        <AlertTriangle size={18} aria-hidden />
        <div>
          <h2 id="duplicate-patient-banner-title">Possible duplicate patients</h2>
          <p>
            Matching uses the same MPI-style rules as Smart Intake. Link an existing chart before
            creating a new record.
          </p>
        </div>
      </header>

      <ul className="duplicate-patient-banner__list">
        {candidates.map((candidate) => (
          <li key={candidate.patientId}>
            <div className="duplicate-patient-banner__item">
              <div>
                <strong>{candidate.displayName}</strong>
                <span>
                  {candidate.matchScore}% · {duplicateActionLabel(candidate.recommendedAction)}
                </span>
                <small>
                  Matched: {candidate.matchedFields.join(', ') || 'none'}
                  {candidate.conflictingFields.length
                    ? ` · Conflicts: ${candidate.conflictingFields.join(', ')}`
                    : ''}
                </small>
              </div>
              <div className="duplicate-patient-banner__actions">
                <button type="button" onClick={() => onOpenPatient?.(candidate.patientId)}>
                  Open existing
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {onContinueCreate ? (
        <footer className="duplicate-patient-banner__footer">
          <button type="button" className="duplicate-patient-banner__continue" onClick={onContinueCreate}>
            No match — continue Smart Intake
          </button>
        </footer>
      ) : null}
    </section>
  );
}
