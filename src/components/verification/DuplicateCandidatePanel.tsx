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
                aria-keyshortcuts={selectable ? '1-9' : undefined}
              >
                <div>
                  <strong>{candidate.displayName}</strong>
                  <div className="duplicate-candidate-panel__match-info">
                    <span className="duplicate-candidate-panel__score">
                      {candidate.matchScore}%
                    </span>
                    <span
                      className={`duplicate-candidate-panel__action-label duplicate-candidate-panel__action-label--${candidate.recommendedAction.toLowerCase()}`}
                    >
                      {duplicateActionLabel(candidate.recommendedAction)}
                    </span>
                    {candidate.conflictingFields.length > 0 && (
                      <span className="duplicate-candidate-panel__conflicts">
                        Conflicts: {candidate.conflictingFields.join(', ')}
                      </span>
                    )}
                  </div>
                  <small>Matched: {candidate.matchedFields.join(', ') || 'none'}</small>
                </div>
                {onOpenPatient ? (
                  <button
                    type="button"
                    className="duplicate-candidate-panel__open"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenPatient(candidate.patientId);
                    }}
                    aria-label={`Open ${candidate.displayName}`}
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
          <AlertTriangle size={14} aria-hidden />
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
