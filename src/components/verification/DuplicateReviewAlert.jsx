import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { duplicateActionLabel } from '../../utils/patientDuplicateDetection';
import './DuplicateReviewAlert.css';

export default function DuplicateReviewAlert({
  candidates = [],
  acknowledged = false,
  onAcknowledge,
  onOpenPatient,
  onOpenVerification,
  onProvisionalIntake,
}) {
  if (!candidates.length) return null;

  const topCandidate = candidates[0];

  return (
    <div className="duplicate-review-alert" role="alert">
      <header className="duplicate-review-alert__header">
        <AlertTriangle size={16} aria-hidden />
        <div>
          <strong>Possible duplicate — verification required</strong>
          <p>Same MPI rules as Smart Intake. Open verification before creating a new chart.</p>
        </div>
      </header>

      <ul className="duplicate-review-alert__list">
        {candidates.slice(0, 3).map((candidate) => (
          <li key={candidate.patientId}>
            <span>
              {candidate.displayName} · {candidate.matchScore}% ·{' '}
              {duplicateActionLabel(candidate.recommendedAction)}
            </span>
            {onOpenPatient ? (
              <button type="button" onClick={() => onOpenPatient(candidate.patientId)}>
                Open
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      <footer className="duplicate-review-alert__actions">
        {onOpenVerification ? (
          <button
            type="button"
            className="duplicate-review-alert__primary"
            onClick={() => onOpenVerification(topCandidate?.patientId)}
          >
            Open verification
          </button>
        ) : null}
        {onProvisionalIntake ? (
          <button type="button" onClick={() => onProvisionalIntake()}>
            Identity pending — send to triage
          </button>
        ) : null}
        {onAcknowledge && !acknowledged ? (
          <button type="button" onClick={onAcknowledge}>
            Not a duplicate — continue
          </button>
        ) : null}
      </footer>
    </div>
  );
}
