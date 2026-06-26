import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { duplicateActionLabel } from '../../utils/patientDuplicateDetection';
import { RECEPTION_COPY } from '../reception/receptionCopy';
import './DuplicateReviewAlert.css';

export default function DuplicateReviewAlert({
  candidates = /** @type {any[]} */ ([]),
  acknowledged = false,
  onAcknowledge,
  onOpenPatient,
  onOpenVerification,
  onProvisionalIntake,
}) {
  if (!candidates.length) return null;

  const topCandidate = candidates[0];
  const copy = RECEPTION_COPY.duplicate;

  return (
    <div className="duplicate-review-alert" role="alert">
      <header className="duplicate-review-alert__header">
        <AlertTriangle size={16} aria-hidden />
        <div>
          <strong>{copy.alertTitle}</strong>
          <p>{copy.alertDescription}</p>
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
                {copy.openChart}
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
            {copy.openVerification}
          </button>
        ) : null}
        {onProvisionalIntake ? (
          <button type="button" onClick={() => onProvisionalIntake()}>
            {copy.identityPending}
          </button>
        ) : null}
        {onAcknowledge && !acknowledged ? (
          <button type="button" onClick={onAcknowledge}>
            {copy.notDuplicate}
          </button>
        ) : null}
      </footer>
    </div>
  );
}
