import { useRef } from 'react';
import type { PatientDuplicateCandidate } from '../../utils/patientDuplicateDetection';
import { AiTruthLabel, patientDuplicateMatchTruthLabel } from '../ai/AiTruthLabel';
import useModalDialog from '../../hooks/useModalDialog';
import './ReceptionDuplicateConfirm.css';

export type ReceptionDuplicateConfirmProps = {
  open: boolean;
  candidates: PatientDuplicateCandidate[];
  onUseExisting: (patientId: string) => void;
  onCreateAnyway: () => void;
  onCancel: () => void;
};

/**
 * High-confidence duplicate gate — staff must choose link vs create.
 */
export default function ReceptionDuplicateConfirm({
  open,
  candidates,
  onUseExisting,
  onCreateAnyway,
  onCancel,
}: ReceptionDuplicateConfirmProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const isOpen = open && candidates.length > 0;

  // A safety-critical gate (link vs create a duplicate chart) that had no
  // keyboard dismissal at all and no focus containment, while claiming
  // aria-modal="true". Declared before the early return so the hook order stays
  // stable across open and closed renders.
  useModalDialog(dialogRef, { onClose: onCancel, enabled: isOpen });

  if (!isOpen) return null;
  const top = candidates[0];

  return (
    <div
      className="reception-dupe-confirm"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reception-dupe-title"
    >
      <div className="reception-dupe-confirm__panel">
        <header className="reception-dupe-confirm__header">
          <h2 id="reception-dupe-title">Possible existing patient</h2>
          <p>
            A chart looks like a match ({top.matchScore}% — {top.recommendedAction.replace(/_/g, ' ')}
            ). Confirm with the patient before creating a new record.
          </p>
          <AiTruthLabel {...patientDuplicateMatchTruthLabel()} compact />
        </header>
        <ul className="reception-dupe-confirm__list">
          {candidates.slice(0, 4).map((candidate) => (
            <li key={candidate.patientId}>
              <div className="reception-dupe-confirm__row">
                <div>
                  <strong>{candidate.displayName}</strong>
                  <small>
                    {candidate.matchScore}% · matched: {candidate.matchedFields.join(', ') || '—'}
                  </small>
                  <p className="reception-dupe-confirm__explain">{candidate.explanation}</p>
                </div>
                <button type="button" className="reception-dupe-confirm__use" onClick={() => onUseExisting(candidate.patientId)}>
                  Use this chart
                </button>
              </div>
            </li>
          ))}
        </ul>
        <footer className="reception-dupe-confirm__footer">
          <button type="button" className="reception-dupe-confirm__secondary" onClick={onCancel}>
            Back to form
          </button>
          <button type="button" className="reception-dupe-confirm__danger" onClick={onCreateAnyway}>
            Create new chart anyway
          </button>
        </footer>
      </div>
    </div>
  );
}
