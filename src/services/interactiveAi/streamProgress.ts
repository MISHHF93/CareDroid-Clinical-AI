/**
 * Meaningful stream progress states for interactive AI — no indefinite spinner.
 */

import {
  AI_STREAM_STATES,
  isTerminalStreamState,
  streamStateLabel,
  type AiStreamState,
  type StreamProgressEvent,
} from '../../contracts/interactiveAi';

export type StreamProgressController = {
  requestId: string;
  correlationId: string;
  getState: () => AiStreamState;
  getHistory: () => StreamProgressEvent[];
  advance: (state: AiStreamState, message?: string, percent?: number) => StreamProgressEvent;
  cancel: () => StreamProgressEvent;
  fail: (message: string) => StreamProgressEvent;
  complete: (message?: string) => StreamProgressEvent;
  subscribe: (listener: (event: StreamProgressEvent) => void) => () => void;
};

const ORDER: AiStreamState[] = [...AI_STREAM_STATES];

export function createStreamProgressController(input: {
  requestId: string;
  correlationId: string;
}): StreamProgressController {
  let sequence = 0;
  let state: AiStreamState = 'validating_request';
  const history: StreamProgressEvent[] = [];
  const listeners = new Set<(event: StreamProgressEvent) => void>();

  const emit = (
    next: AiStreamState,
    message: string,
    percent?: number,
    cancellable = true,
  ): StreamProgressEvent => {
    if (isTerminalStreamState(state) && next !== state) {
      // Allow only cancel from non-terminal; ignore other advances after terminal.
      if (state !== 'cancelled') {
        return history[history.length - 1];
      }
    }
    state = next;
    const event: StreamProgressEvent = {
      requestId: input.requestId,
      correlationId: input.correlationId,
      state: next,
      message: message || streamStateLabel(next),
      percent,
      sequence: ++sequence,
      occurredAt: new Date().toISOString(),
      cancellable: cancellable && !isTerminalStreamState(next),
    };
    history.push(event);
    listeners.forEach((l) => l(event));
    return event;
  };

  // Seed initial state
  emit('validating_request', streamStateLabel('validating_request'), 5);

  return {
    requestId: input.requestId,
    correlationId: input.correlationId,
    getState: () => state,
    getHistory: () => [...history],
    advance: (next, message, percent) => {
      const idx = ORDER.indexOf(next);
      const cur = ORDER.indexOf(state);
      // Allow forward progress or terminal jumps
      if (!isTerminalStreamState(next) && idx < cur && !isTerminalStreamState(state)) {
        return history[history.length - 1];
      }
      return emit(next, message || streamStateLabel(next), percent);
    },
    cancel: () => emit('cancelled', 'Generation cancelled by user', undefined, false),
    fail: (message) => emit('failed', message, undefined, false),
    complete: (message) => emit('completed', message || streamStateLabel('completed'), 100, false),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Default progress path for a typical RAG-backed copilot answer. */
export async function runDefaultStreamProgress(
  controller: StreamProgressController,
  steps?: Partial<Record<AiStreamState, () => Promise<void> | void>>,
): Promise<void> {
  const path: AiStreamState[] = [
    'validating_request',
    'retrieving_evidence',
    'reranking_sources',
    'checking_safety',
    'preparing_response',
  ];
  let pct = 10;
  for (const step of path) {
    if (isTerminalStreamState(controller.getState())) return;
    controller.advance(step, streamStateLabel(step), pct);
    await steps?.[step]?.();
    pct += 15;
  }
}
