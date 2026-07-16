/**
 * Architect Mode Stage G — Accountable AI recommendation contract.
 *
 * Every clinical/operational AI recommendation must expose evidence, provenance,
 * confidence, uncertainty, model/prompt version, safety status, and human-review flag.
 * Deterministic calculators must NOT use this type — they remain pure functions.
 */

export type AccountableSafetyStatus = 'ok' | 'abstain' | 'escalate' | 'degraded';

export type AccountableEvidenceItem = {
  readonly sourceId: string;
  readonly title?: string;
  readonly citation: string;
  readonly score?: number;
  readonly url?: string;
  readonly publishedAt?: string;
  readonly outdated?: boolean;
};

export type AccountableModelInfo = {
  readonly provider: string;
  readonly name: string;
  readonly version?: string;
};

export type AccountableRecommendation<TContent = string> = {
  readonly content: TContent;
  readonly evidence: readonly AccountableEvidenceItem[];
  readonly provenance: {
    readonly retrievedAt: string;
    readonly corpusVersion?: number | string;
    readonly tenantId?: string;
    readonly requestId?: string;
  };
  /** 0..1 inclusive; absent only when safety is abstain/escalate */
  readonly confidence: number | null;
  readonly uncertainty: string;
  readonly model: AccountableModelInfo;
  readonly promptVersion: string;
  readonly safety: {
    readonly status: AccountableSafetyStatus;
    readonly reasons: readonly string[];
  };
  readonly humanReviewRequired: boolean;
};

export type AccountableRecommendationInput = {
  content: string;
  evidence?: readonly AccountableEvidenceItem[];
  provenance?: Partial<AccountableRecommendation['provenance']>;
  confidence?: number | null;
  uncertainty?: string;
  model: AccountableModelInfo;
  promptVersion: string;
  safetyStatus?: AccountableSafetyStatus;
  safetyReasons?: readonly string[];
  humanReviewRequired?: boolean;
  tenantId?: string;
  requestId?: string;
  corpusVersion?: number | string;
};

function clampConfidence(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Math.min(1, Math.max(0, value));
}

/**
 * Build a fully-formed accountable recommendation.
 * Abstain/escalate force humanReviewRequired and null confidence when not provided.
 */
export function createAccountableRecommendation(
  input: AccountableRecommendationInput,
): AccountableRecommendation {
  const safetyStatus = input.safetyStatus ?? 'ok';
  const forcesReview = safetyStatus === 'abstain' || safetyStatus === 'escalate';
  const confidence =
    forcesReview && (input.confidence === undefined || input.confidence === null)
      ? null
      : clampConfidence(input.confidence ?? 0.5);

  return {
    content: input.content,
    evidence: Object.freeze([...(input.evidence ?? [])]),
    provenance: {
      retrievedAt: input.provenance?.retrievedAt ?? new Date().toISOString(),
      corpusVersion: input.provenance?.corpusVersion ?? input.corpusVersion,
      tenantId: input.provenance?.tenantId ?? input.tenantId,
      requestId: input.provenance?.requestId ?? input.requestId,
    },
    confidence,
    uncertainty:
      input.uncertainty ??
      (forcesReview
        ? 'Model abstained or escalated; do not treat content as clinical advice.'
        : 'Confidence is model-estimated; verify against source evidence.'),
    model: {
      provider: input.model.provider,
      name: input.model.name,
      version: input.model.version,
    },
    promptVersion: input.promptVersion,
    safety: {
      status: safetyStatus,
      reasons: Object.freeze([...(input.safetyReasons ?? [])]),
    },
    humanReviewRequired: input.humanReviewRequired ?? forcesReview,
  };
}

/** True when the recommendation may be shown as clinical assist (not oracle). */
export function isAccountableAssistSafe(rec: AccountableRecommendation): boolean {
  return rec.safety.status === 'ok' || rec.safety.status === 'degraded';
}

/** Build an abstention when provider/RAG fails — critical workflows must continue. */
export function createAiUnavailableAbstention(options: {
  provider?: string;
  reason: string;
  promptVersion?: string;
  requestId?: string;
}): AccountableRecommendation {
  return createAccountableRecommendation({
    content: 'AI assistance is temporarily unavailable. Continue with standard clinical workflow.',
    evidence: [],
    confidence: null,
    uncertainty: options.reason,
    model: {
      provider: options.provider ?? 'none',
      name: 'unavailable',
    },
    promptVersion: options.promptVersion ?? 'n/a',
    safetyStatus: 'abstain',
    safetyReasons: [options.reason, 'AI_UNAVAILABLE'],
    humanReviewRequired: true,
    requestId: options.requestId,
  });
}
