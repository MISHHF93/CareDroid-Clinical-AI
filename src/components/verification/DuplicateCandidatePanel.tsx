import { AlertTriangle } from 'lucide-react';
import { duplicateActionLabel } from '../../utils/patientDuplicateDetection';
import './DuplicateCandidatePanel.css';

export default function DuplicateCandidatePanel({
  candidates = [] as any[],
  selectedCandidateId = null,
  onSelectCandidate = undefined,
  onOpenPatient,
  onContinueCreate,
  title = 'Patient match candidates',
  description = 'Ranked using MPI-style rules. Staff must confirm before linking or creating a record.',
  compact = false,
}) {
  if (!candidates.length) {
    return (
      <section
        className={`duplicate-candidate-panel${compact ? ' duplicate-candidate-panel--compact' : ''}`}
      >
        <header>
          <h3>{title}</h3>
          <p>{description}</p>
        </header>
        <p className="duplicate-candidate-panel__empty">
          No duplicate candidates for current identity evidence.
        </p>
      </section>
    );
  }

  const selectedCandidate = candidates.find(
    (candidate) => candidate.patientId === selectedCandidateId,
  );

  return (
    <section
      className={`duplicate-candidate-panel${compact ? ' duplicate-candidate-panel--compact' : ''}`}
      aria-labelledby="duplicate-candidate-panel-title"
    >
      <header>
        <h3 id="duplicate-candidate-panel-title">{title}</h3>
        <p>{description}</p>
      </header>

      <ul className="duplicate-candidate-panel__list">
        {candidates.map((candidate) => {
          const selectable = Boolean(onSelectCandidate);
          const selected = candidate.patientId === selectedCandidateId;
          const ItemTag = selectable ? 'button' : 'div';
          return (
            <li key={candidate.patientId}>
              <ItemTag
                type={selectable ? 'button' : undefined}
                className={[
                  'duplicate-candidate-panel__item',
                  selected ? 'duplicate-candidate-panel__item--selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={
                  selectable ? () => (onSelectCandidate as any)(candidate.patientId) : undefined
                }
              >
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
                {onOpenPatient ? (
                  <button
                    type="button"
                    className="duplicate-candidate-panel__open"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenPatient(candidate.patientId);
                    }}
                  >
                    Open
                  </button>
                ) : null}
              </ItemTag>
            </li>
          );
        })}
      </ul>

      {selectedCandidate ? (
        <div className="duplicate-candidate-panel__explanation">
          <AlertTriangle size={16} aria-hidden />
          <p>
            {selectedCandidate.displayName} is recommended for{' '}
            <strong>{duplicateActionLabel(selectedCandidate.recommendedAction)}</strong>. Manual
            review is required before linking.
          </p>
        </div>
      ) : null}

      {onContinueCreate ? (
        <footer className="duplicate-candidate-panel__footer">
          <button type="button" onClick={onContinueCreate}>
            No match — continue verification
          </button>
        </footer>
      ) : null}
    </section>
  );
}
