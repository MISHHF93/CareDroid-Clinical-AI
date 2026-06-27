import { apiFetch, getApiErrorMessage, parseApiResponse } from './apiClient';
import {
  runCareDroidAI,
  validateCareDroidAIResponse,
  type CareDroidAIRequest,
  type CareDroidAIResponse,
} from '../../lib/ai/careDroidAI';

export const CARE_DROID_AI_NODE_PATH = '/api/ai/node';

type CareDroidAIRequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export async function requestCareDroidAI(
  request: CareDroidAIRequest,
  options: CareDroidAIRequestOptions = {},
): Promise<CareDroidAIResponse> {
  try {
    const response = await apiFetch(CARE_DROID_AI_NODE_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: options.signal,
      timeoutMs: options.timeoutMs,
    });
    const data = await parseApiResponse(response, { fallback: null });

    if (response.ok && validateCareDroidAIResponse(data)) {
      return data;
    }

    if (response.ok && validateCareDroidAIResponse(data?.data)) {
      return data.data;
    }

    throw new Error(getApiErrorMessage(null, response));
  } catch (error) {
    const fallback = await runCareDroidAI({
      ...request,
      context: {
        ...(request.context || {}),
        fallback: 'frontend_local_careDroidAI_node',
      },
    });

    return {
      ...fallback,
      warnings: [
        ...fallback.warnings,
        `Backend AI node unavailable; safe local fallback used. ${getApiErrorMessage(error)}`,
      ],
    };
  }
}
