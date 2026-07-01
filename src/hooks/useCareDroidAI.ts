import { useCallback, useState } from 'react';
import { requestAiChiefStructured } from '../services/aiChiefOrchestrator';
import type { CareDroidAIRequest, CareDroidAIResponse } from '../../lib/ai/careDroidAI';

type CareDroidAIHookState = {
  response: CareDroidAIResponse | null;
  isLoading: boolean;
  error: string | null;
};

export function useCareDroidAI(initialRequest?: CareDroidAIRequest) {
  const [state, setState] = useState<CareDroidAIHookState>({
    response: null,
    isLoading: false,
    error: null,
  });

  const run = useCallback(
    async (nextRequest: CareDroidAIRequest | undefined = initialRequest) => {
      if (!nextRequest) {
        const message = 'CareDroid AI request is required.';
        setState((current) => ({ ...current, error: message }));
        throw new Error(message);
      }

      setState((current) => ({ ...current, isLoading: true, error: null }));
      const response = await requestAiChiefStructured(nextRequest);
      setState({
        response,
        isLoading: false,
        error: response.status === 'error' ? response.warnings[0] || 'AI request failed.' : null,
      });
      return response;
    },
    [initialRequest],
  );

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
