import { apiFetchJson, getApiErrorMessage } from './apiClient';

export const AI_FEEDBACK_RATINGS = [
  'HELPFUL',
  'NOT_HELPFUL',
  'INCORRECT',
  'OUTDATED',
  'UNSAFE_CONCERN',
  'OTHER',
] as const;

export type AiFeedbackRating = (typeof AI_FEEDBACK_RATINGS)[number];

async function guardedJson(path: string, options: any = {}) {
  try {
    const { response, data } = await apiFetchJson(path, options);
    if (!response.ok) {
      return {
        ok: false,
        data: null,
        message: data?.error || data?.message || getApiErrorMessage(null, response),
      };
    }
    return { ok: true, data, message: data?.message || '' };
  } catch (error: any) {
    return { ok: false, data: null, message: getApiErrorMessage(error) };
  }
}

/**
 * Item 11 -- subjective user sentiment on one AI response, stored separately
 * from any accuracy/evaluation metric. Never treat a successful submission
 * here as a model-quality signal beyond "a user reacted this way."
 */
export async function submitAiFeedback(input: {
  runId: string;
  capabilityId?: string;
  rating: AiFeedbackRating;
  comment?: string;
}): Promise<{ ok: boolean; message: string }> {
  const result = await guardedJson('/api/ai-feedback', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  return { ok: result.ok, message: result.message };
}
