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

/**
 * Normalizes AI Chief's `modelOrRuleId` field (src/config/aiChiefOrchestrationModel.ts).
 * Every real value populated anywhere in this codebase (grepped exhaustively)
 * is a literal rule id — 'rule-operational-baseline-v1', 'operational-workflow-v1'
 * — never a reference to either of the 2 real trained models this codebase
 * has (the NLU intent classifier and the artifact-type router, per
 * AI_CONFIGURATION_MAP.md). Defaults to 'Manual'; only reports 'Live' if the
 * id itself names one of those two real exceptions, so this stays correct
 * if AI Chief is ever wired to a real model later without needing a rewrite.
 */
export function fromAiChiefRecommendation(recommendation: {
  modelOrRuleId: string;
}): AiTruthLabelInfo {
  const backedByTrainedModel = /nlu-classifier|artifact-router/i.test(
    recommendation.modelOrRuleId,
  );

  return {
    state: backedByTrainedModel ? 'Live' : 'Manual',
    sourceContext: backedByTrainedModel
      ? 'AI Chief recommendation backed by a trained model'
      : 'AI Chief rule-based recommendation engine — not a trained model',
    reviewRequired: true,
  };
}

/**
 * Sentinel's AI recommendation envelope (lib/sentinel/aiEnvelope.ts,
 * SentinelAiRecommendation.sourceState: 'live' | 'degraded' | 'rules_only')
 * has the same trap as native-ai's sourceState. Read every real caller of
 * buildSentinelAiRecommendation: the one production path
 * (backend/src/modules/sentinel/sentinel-inbound.service.ts's
 * producePrepRecommendation, preferAi branch) sets modelId:
 * 'sentinel-grounded-rules' — self-describing as rules — while still
 * setting sourceState: 'live'; the fallback path
 * (buildRulesOnlyPrepChecklist) sets modelId: 'sentinel-rules',
 * sourceState: 'rules_only'. Neither is backed by a trained model.
 * The frontend's SentinelCommandSnapshot.aiRecommendations is typed as
 * `Record<string, unknown>[]` (not a guaranteed SentinelAiRecommendation
 * shape at the type level), so this deliberately does not attempt a
 * per-item runtime read of sourceState/modelId that the type system can't
 * back up — it reports the single, verified-true state for every real
 * code path that produces this data today.
 */
export function sentinelAiRecommendationsTruthLabel(): AiTruthLabelInfo {
  return {
    state: 'Manual',
    sourceContext: 'Sentinel AI recommendation engine — rule-based, not a trained model',
    reviewRequired: true,
  };
}

/**
 * HospitalCommandCenter.tsx's "AI recommendations" panel merges three
 * sources (src/services/hospitalCommandCenterModel.ts): AI Chief
 * recommendations (rule-based, confirmed via fromAiChiefRecommendation
 * above), patient-flow insights, and
 * mapUnifiedOperationalRecommendations() — which reads
 * UnifiedOperationalIntelligenceSnapshot.insights, itself deterministic
 * threshold/rule scoring, not model-backed (matches the same
 * AI_CONFIGURATION_MAP.md finding: only the NLU intent classifier and
 * artifact-type router are real trained models anywhere in this codebase).
 * The merge step (mapUnifiedOperationalRecommendations,
 * hospitalCommandCenterModel.ts) reshapes every source down to
 * {id, action, rationale, route} before this panel ever sees it, discarding
 * modelOrRuleId — so, same as Sentinel above, this reports the single
 * verified-true state for the panel rather than guessing per item against
 * data the type system doesn't back up.
 */
export function hospitalCommandCenterRecommendationsTruthLabel(): AiTruthLabelInfo {
  return {
    state: 'Manual',
    sourceContext: 'Operational intelligence recommendations — rule-based, not a trained model',
    reviewRequired: true,
  };
}

/**
 * src/engine/continuousPatientFlowEngine.ts's "AI operational recommendations"
 * (PatientFlowStatusPanel.tsx) and per-patient aiRecommendation guidance text
 * have no NativeAiSourceState field at all — read directly, the whole engine
 * is deterministic threshold/rule scoring over patient/staff/referral state
 * (bottleneckForPatient, resolveWhatHappensNext in
 * src/services/whatHappensNextGuidance.ts), with zero model call anywhere.
 * Matches the same AI_CONFIGURATION_MAP.md finding as every other helper in
 * this file: only the NLU intent classifier and artifact-type router are
 * real trained models in this codebase, so despite the section header
 * literally reading "AI operational recommendations," this is Manual.
 */
export function continuousPatientFlowRecommendationsTruthLabel(): AiTruthLabelInfo {
  return {
    state: 'Manual',
    sourceContext: 'Continuous patient flow engine — deterministic bottleneck/guidance rules, not a trained model',
    reviewRequired: true,
  };
}

/**
 * AiTriageAssistPanel.tsx's rationale list had a real overclaiming instance:
 * src/services/nativeAiTriageBridge.ts's enrichTriageAssistWithNativeAi()
 * (called unconditionally from buildClientTriageAssist(), so it runs on
 * every client-built triage assist) injects a rationale line that literally
 * reads "Native AI expert system suggests ... (NN% confidence)" -- with
 * nothing on the panel disclosing that inferTriageFromExpertSystem/
 * buildNativeAiPatientSnapshot are the same deterministic rule engines this
 * file's other helpers already classify Manual, not a trained model.
 * TriageAssistEnvelope.source ('rules' | 'rules+llm' | 'rules+oi') can't
 * distinguish this case, since the native-ai bridge deliberately leaves
 * `source` untouched (only lib/patient-orchestration's separate, real
 * mergeLlmTriageEnrichment sets 'rules+llm') -- so the panel detects this
 * bridge's contribution the same reliable way: by its own first-party
 * rationale marker string, the only place that exact text is ever written.
 */
export const NATIVE_AI_TRIAGE_RATIONALE_MARKER = 'Native AI expert system suggests';

export function nativeAiTriageBridgeTruthLabel(): AiTruthLabelInfo {
  return {
    state: 'Manual',
    sourceContext: 'Native-AI expert-system triage signal — rule-based inference, not a trained model',
    reviewRequired: true,
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
