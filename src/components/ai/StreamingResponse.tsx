/**
 * Interactive Intelligence — explicit stream-phase rendering.
 *
 * Never an indefinite spinner: while a request is active the current
 * `AiStreamState` is named on screen and announced once per transition via a
 * polite live region. Streamed text itself is NOT a live region — screen
 * readers hear phase changes, never token-by-token output.
 */
import {
  AI_STREAM_STATES,
  isTerminalStreamState,
  streamStateLabel,
  type AiStreamState,
} from '../../contracts/interactiveAi';
import './StreamingResponse.css';

export type StreamingResponseProps = {
  phase: AiStreamState;
  /** Streamed text accumulated so far (rendered, not announced). */
  text?: string;
  /** Shown while the request is active; omit to hide the cancel control. */
  onCancel?: () => void;
  /** Detail for failed / blocked / timed_out / insufficient_evidence. */
  errorMessage?: string;
  compact?: boolean;
};

const TERMINAL_TONE: Partial<Record<AiStreamState, 'good' | 'warn' | 'critical'>> = {
  completed: 'good',
  cancelled: 'warn',
  timed_out: 'warn',
  insufficient_evidence: 'warn',
  blocked: 'critical',
  failed: 'critical',
};

export function StreamingResponse({
  phase,
  text,
  onCancel,
  errorMessage,
  compact = false,
}: StreamingResponseProps) {
  const terminal = isTerminalStreamState(phase);
  const tone = terminal ? TERMINAL_TONE[phase] || 'warn' : 'active';
  const label = streamStateLabel(phase);

  return (
    <div
      className={[
        'cd-stream',
        compact ? 'cd-stream--compact' : '',
        `cd-stream--${tone}`,
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid="streaming-response"
      data-phase={phase}
    >
      <div className="cd-stream__statusline">
        <span
          className={`cd-stream__phase cd-stream__phase--${tone}`}
          role="status"
          aria-live="polite"
          data-testid="stream-phase"
        >
          {!terminal ? <span className="cd-stream__pulse" aria-hidden="true" /> : null}
          {label}
        </span>
        {!terminal && onCancel ? (
          <button
            type="button"
            className="cd-stream__cancel"
            onClick={onCancel}
            data-testid="stream-cancel"
          >
            Cancel
          </button>
        ) : null}
      </div>

      {text ? (
        // Deliberately not a live region: tokens must never be announced
        // individually (WCAG-safe streaming).
        <div className="cd-stream__text" data-testid="stream-text">
          {text}
        </div>
      ) : null}

      {terminal && errorMessage ? (
        <p className={`cd-stream__detail cd-stream__detail--${tone}`} data-testid="stream-detail">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

/** Exported for tests — every contract phase has a human label. */
export const ALL_STREAM_PHASES_FOR_TEST = AI_STREAM_STATES;

export default StreamingResponse;
