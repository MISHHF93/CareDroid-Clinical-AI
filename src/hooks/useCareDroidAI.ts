import { useCallback, useEffect, useRef, useState } from 'react';
import { invokeUnifiedAiStructuredByIntent } from '../services/careDroidUnifiedAiNode';
import type { CareDroidAIRequest, CareDroidAIResponse } from '../../lib/ai/careDroidAI';

type CareDroidAIHookState = {
  response: CareDroidAIResponse | null;
  isLoading: boolean;
  error: string | null;
};

/**
 * Generic CareDroid AI invocation hook: request -> { data, isLoading, error }.
 *
 * Currently has no callers, and that is not an oversight -- the only direct
 * callers of invokeUnifiedAiStructuredByIntent are services
 * (patientJourneyAiDecisionService, careDroidUnifiedAiNode), which have no React
 * state to manage. Kept because it is the obvious shape for the first component
 * that needs to run one structured intent and render its own loading/error.
 *
 * `run` is deliberately identity-stable. It reads `initialRequest` through a ref
 * instead of depending on it, because the natural call site passes an object
 * literal -- useCareDroidAI({ intent: 'triage_recommendation', ... }) -- which is
 * a new reference on every render. With `initialRequest` in the dependency array
 * `run` changed identity every render too, so the first
 * `useEffect(() => { run(); }, [run])` written against this hook would have
 * looped forever. That failure mode has already cost this repo an app-wide
 * infinite-render incident; no reason to leave the tripwire armed for whoever
 * wires this next.
 *
 * `isLoading` is cleared on both paths -- a rejected request used to leave it
 * stuck true, because the await had no catch and the state update after it never
 * ran, so a failed call would spin forever.
 */
export function useCareDroidAI(initialRequest?: CareDroidAIRequest) {
  const initialRequestRef = useRef(initialRequest);
  useEffect(() => {
    initialRequestRef.current = initialRequest;
  }, [initialRequest]);

  const [state, setState] = useState<CareDroidAIHookState>({
    response: null,
    isLoading: false,
    error: null,
  });

  const run = useCallback(async (nextRequest?: CareDroidAIRequest) => {
    const request = nextRequest ?? initialRequestRef.current;
    if (!request) {
      const message = 'CareDroid AI request is required.';
      setState((current) => ({ ...current, error: message }));
      throw new Error(message);
    }

    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      const response = await invokeUnifiedAiStructuredByIntent(request);
      setState({
        response,
        isLoading: false,
        error: response.status === 'error' ? response.warnings[0] || 'AI request failed.' : null,
      });
      return response;
    } catch (error) {
      setState({
        response: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'AI request failed.',
      });
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ response: null, isLoading: false, error: null });
  }, []);

  return {
    ...state,
    data: state.response?.data ?? null,
    run,
    reset,
  };
}

