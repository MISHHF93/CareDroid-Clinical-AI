import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { submitAiFeedback, type AiFeedbackRating } from '../../services/aiFeedbackApi';
import './AiFeedbackControl.css';

const REFINEMENT_OPTIONS: Array<{ rating: AiFeedbackRating; label: string }> = [
  { rating: 'INCORRECT', label: 'Incorrect' },
  { rating: 'OUTDATED', label: 'Outdated' },
  { rating: 'UNSAFE_CONCERN', label: 'Unsafe concern' },
  { rating: 'OTHER', label: 'Other' },
];

type Stage = 'idle' | 'refining' | 'commenting' | 'submitting' | 'done';

/**
 * Item 11 -- context-appropriate feedback capture next to one AI response.
 * Progressive disclosure: a plain thumbs-up/down pair by default; a
 * negative reaction reveals more specific categories rather than cluttering
 * every message with all six ratings up front. Purely a UI affordance over
 * `submitAiFeedback()` -- see that service's own doc comment for why this
 * is never treated as a model-accuracy signal.
 */
export default function AiFeedbackControl({
  runId,
  capabilityId,
}: {
  runId?: string;
  capabilityId?: string;
}) {
  const [stage, setStage] = useState<Stage>('idle');
  const [comment, setComment] = useState('');

  if (!runId) return null;

  async function submit(rating: AiFeedbackRating, commentText?: string) {
    setStage('submitting');
    await submitAiFeedback({ runId: runId as string, capabilityId, rating, comment: commentText });
    setStage('done');
  }

  if (stage === 'done') {
    return <p className="ai-feedback-control__done">Thanks for the feedback.</p>;
  }

  if (stage === 'commenting') {
    return (
      <form
        className="ai-feedback-control__comment-form"
        onSubmit={(event) => {
          event.preventDefault();
          submit('OTHER', comment.trim() || undefined);
        }}
      >
        <label htmlFor={`ai-feedback-comment-${runId}`} className="ai-feedback-control__comment-label">
          What went wrong? (optional)
        </label>
        <textarea
          id={`ai-feedback-comment-${runId}`}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={2}
          className="ai-feedback-control__comment-input"
        />
        <button type="submit" className="ai-feedback-control__btn ai-feedback-control__btn--primary">
          Submit
        </button>
      </form>
    );
  }

  if (stage === 'refining') {
    return (
      <div className="ai-feedback-control__refine" role="group" aria-label="What was wrong with this response?">
        {REFINEMENT_OPTIONS.map((option) => (
          <button
            key={option.rating}
            type="button"
            className="ai-feedback-control__chip"
            onClick={() => {
              if (option.rating === 'OTHER') {
                setStage('commenting');
              } else {
                submit(option.rating);
              }
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="ai-feedback-control" role="group" aria-label="Was this response helpful?">
      <button
        type="button"
        className="ai-feedback-control__btn"
        aria-label="Helpful"
        onClick={() => submit('HELPFUL')}
      >
        <ThumbsUp size={13} strokeWidth={2} />
      </button>
      <button
        type="button"
        className="ai-feedback-control__btn"
        aria-label="Not helpful"
        onClick={() => setStage('refining')}
      >
        <ThumbsDown size={13} strokeWidth={2} />
      </button>
    </div>
  );
}
