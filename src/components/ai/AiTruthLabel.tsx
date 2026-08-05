import type { NativeAiSourceState } from '../../../lib/native-ai/types';
import type { EnhancementMaturity } from '../../config/edPlatformEnhancementRegistry';
import './AiTruthLabel.css';

/**
 * P0.4 release gate ("Truth labels & AI boundaries"): every AI-influenced
 * surface must carry a Demo/Manual/Stale/Live label, source context, a
 * review-required indicator, and prohibited-action copy. This repo already
 * has 5+ overlapping provenance vocabularies (NativeAiSourceState,
 * EnhancementMaturity, AccountableAi safety.status, DEMO_LIVE_STATES,
 * Sentinel sourceState) — this module is a thin, explicit normalization
 * layer over them, not a replacement. Surfaces that already render their
 * own compliant provenance UI (AccountableRecommendationCard) are left
 * alone; this is for the surfaces the P0.4 audit found had none.
 */

export type AiTruthLabelState = 'Live' | 'Manual' | 'Stale' | 'Demo';

export interface AiTruthLabelInfo {
  state: AiTruthLabelState;
  /** What is actually producing this output, in plain language. */
  sourceContext: string;
  reviewRequired: boolean;
  reviewCopy?: string;
  prohibitedActionCopy?: string;
}

export const DEFAULT_REVIEW_COPY =
  'Human review required — do not treat as an autonomous clinical decision.';

export const DEFAULT_PROHIBITED_ACTION_COPY =
  'Do not use in place of a validated clinical score, and do not act on this without clinician confirmation.';

const STATE_META: Record<AiTruthLabelState, { label: string; hint: string }> = {
  Live: { label: 'Live', hint: 'Backed by a currently running model or rules engine on real input.' },
  Manual: {
    label: 'Manual',
    hint: 'Deterministic or rule-based logic written by engineers — not a trained model.',
  },
  Stale: {
    label: 'Stale',
    hint: 'Was live but the data path is degraded, partial, or not currently authoritative.',
  },
  Demo: { label: 'Demo', hint: 'Sample, simulated, or placeholder output — not real patient inference.' },
};

/**
 * Normalizes lib/native-ai's `live | demo | simulated | shadow` vocabulary.
 *
 * IMPORTANT: in this codebase, `sourceState: 'live'` on a native-ai payload
 * means "this computation path is actively running on real patient data" —
 * it does NOT mean "backed by a trained/live AI model." Per
 * AI_CONFIGURATION_MAP.md, only 2 functions in this entire codebase are
 * backed by an actually-trained model (the NLU intent classifier and the
 * artifact-type router); everything else under lib/native-ai/ (triage
 * rules, clinical acuity scoring, admission heuristics, orientation
 * classification) is deterministic/rule-based despite names like
 * `predictAdmissionLikelihoodMl`. Defaulting 'live' to the 'Live' truth
 * state would silently reproduce the exact mislabeling this gate exists to
 * fix. So `backedByTrainedModel` defaults to false — callers must prove
 * they are one of the real exceptions to get 'Live' instead of 'Manual'.
 */
export function fromNativeAiSourceState(
  sourceState: NativeAiSourceState,
  input: { sourceContext: string; reviewRequired?: boolean; backedByTrainedModel?: boolean },
): AiTruthLabelInfo {
  const state: AiTruthLabelState =
    sourceState === 'demo' || sourceState === 'simulated'
      ? 'Demo'
      : sourceState === 'shadow'
        ? 'Stale'
        : input.backedByTrainedModel
          ? 'Live'
          : 'Manual'; // sourceState 'live' but not model-backed: a heuristic engine on real data

  return {
    state,
    sourceContext: input.sourceContext,
    reviewRequired: input.reviewRequired ?? true,
  };
}

/**
 * Normalizes edOperationalStandards' `live | partial | demo | planned |
 * missing` vocabulary. Same `backedByTrainedModel` caveat as
 * `fromNativeAiSourceState` above — `maturity: 'live'` here typically means
 * "computed from live occupancy/boarding data," not "ML-backed."
 */
export function fromEnhancementMaturity(
  maturity: EnhancementMaturity,
  input: { sourceContext: string; reviewRequired?: boolean; backedByTrainedModel?: boolean },
): AiTruthLabelInfo {
  const state: AiTruthLabelState =
    maturity === 'demo' || maturity === 'planned' || maturity === 'missing'
      ? 'Demo'
      : maturity === 'partial'
        ? 'Stale'
        : input.backedByTrainedModel
          ? 'Live'
          : 'Manual';

  return {
    state,
    sourceContext: input.sourceContext,
    reviewRequired: input.reviewRequired ?? true,
  };
}

export type AiTruthLabelProps = AiTruthLabelInfo & {
  compact?: boolean;
  className?: string;
};

export function AiTruthLabel({
  state,
  sourceContext,
  reviewRequired,
  reviewCopy,
  prohibitedActionCopy,
  compact = false,
  className = '',
}: AiTruthLabelProps) {
  const meta = STATE_META[state];
  const resolvedReviewCopy = reviewCopy || DEFAULT_REVIEW_COPY;
  const resolvedProhibitedCopy = prohibitedActionCopy || DEFAULT_PROHIBITED_ACTION_COPY;
  // Full detail is always in the tooltip/aria-label, even in compact mode,
  // so a tight badge layout never loses the review-required/prohibited copy.
  const fullDetail = [
    `${meta.label}: ${meta.hint}`,
    `Source: ${sourceContext}`,
    reviewRequired ? resolvedReviewCopy : null,
    resolvedProhibitedCopy,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={`cd-ai-truth-label cd-ai-truth-label--${state.toLowerCase()} ${compact ? 'cd-ai-truth-label--compact' : ''} ${className}`.trim()}
      data-testid="ai-truth-label"
      data-truth-state={state}
    >
      <span
        className="cd-ai-truth-label__chip"
        title={fullDetail}
        aria-label={fullDetail}
        data-testid="ai-truth-label-chip"
      >
        {meta.label}
      </span>
      {!compact ? (
        <span className="cd-ai-truth-label__context" data-testid="ai-truth-label-context">
          {sourceContext}
        </span>
      ) : null}
      {!compact && reviewRequired ? (
        <span
          className="cd-ai-truth-label__review"
          role="status"
          data-testid="ai-truth-label-review"
        >
          {resolvedReviewCopy}
        </span>
      ) : null}
      {!compact ? (
        <span
          className="cd-ai-truth-label__prohibited"
          data-testid="ai-truth-label-prohibited"
        >
          {resolvedProhibitedCopy}
        </span>
      ) : null}
    </span>
  );
}

export default AiTruthLabel;
