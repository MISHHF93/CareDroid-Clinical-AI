/**
 * Architect Mode Stage G — critical workflows survive AI failure via abstention.
 */
import {
  createAiUnavailableAbstention,
  type AccountableRecommendation,
} from '../contracts/accountableAi';
import { ErrorCode } from '../contracts/results';
import { apiFailureToResultError } from './apiErrorHandling';

export function abstainFromAiFailure(
  error: unknown,
  options: { provider?: string; promptVersion?: string; requestId?: string } = {},
): AccountableRecommendation {
  const mapped = apiFailureToResultError(error);
  const reason =
    mapped.code === ErrorCode.AI_UNAVAILABLE || mapped.code === ErrorCode.DEPENDENCY_UNAVAILABLE
      ? mapped.message
      : `${mapped.code}: ${mapped.message}`;

  return createAiUnavailableAbstention({
    provider: options.provider,
    reason,
    promptVersion: options.promptVersion,
    requestId: options.requestId,
  });
}

/** True when callers should continue clinical workflow without AI content. */
export function shouldContinueWithoutAi(rec: AccountableRecommendation): boolean {
  return rec.safety.status === 'abstain' || rec.safety.status === 'escalate';
}
