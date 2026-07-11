/**
 * Sentinel AI recommendation envelope builders and validators.
 * Every recommendation requires human review — no autonomous clinical decisions.
 */

import {
  SENTINEL_AI_DISCLAIMER,
  SENTINEL_ORCHESTRATOR_VERSION,
  type SentinelAiEvidence,
  type SentinelAiHumanReviewStatus,
  type SentinelAiRecommendation,
  type SentinelMissingField,
  SENTINEL_REQUIRED_PREARRIVAL_FIELDS,
} from './types';

export class SentinelAiEnvelopeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'SentinelAiEnvelopeError';
    this.code = code;
  }
}

export type BuildAiRecommendationInput = Readonly<{
  id: string;
  kind: string;
  summary: string;
  recommendations: readonly string[];
  evidence: readonly SentinelAiEvidence[];
  confidence: number;
  modelId: string;
  modelVersion: string;
  humanReviewStatus?: SentinelAiHumanReviewStatus;
  sourceState?: SentinelAiRecommendation['sourceState'];
  linkedEntityType?: string;
  linkedEntityId?: string;
  generatedAt?: string;
  disclaimer?: string;
}>;

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function buildSentinelAiRecommendation(
  input: BuildAiRecommendationInput,
): SentinelAiRecommendation {
  if (!input.id || !input.kind || !input.summary) {
    throw new SentinelAiEnvelopeError(
      'INVALID_ENVELOPE',
      'id, kind, and summary are required for Sentinel AI recommendations',
    );
  }
  if (!input.modelId || !input.modelVersion) {
    throw new SentinelAiEnvelopeError(
      'MISSING_MODEL_VERSION',
      'modelId and modelVersion are required for auditability',
    );
  }
  if (!Array.isArray(input.evidence) || input.evidence.length === 0) {
    throw new SentinelAiEnvelopeError(
      'MISSING_EVIDENCE',
      'At least one evidence item is required (grounded recommendations only)',
    );
  }
  for (const item of input.evidence) {
    if (!item.claim || !item.sourceRef) {
      throw new SentinelAiEnvelopeError(
        'INVALID_EVIDENCE',
        'Each evidence item requires claim and sourceRef',
      );
    }
  }

  return Object.freeze({
    id: input.id,
    kind: input.kind,
    summary: input.summary,
    recommendations: Object.freeze([...input.recommendations]),
    evidence: Object.freeze(input.evidence.map((e) => Object.freeze({ ...e }))),
    confidence: clampConfidence(input.confidence),
    modelId: input.modelId,
    modelVersion: input.modelVersion,
    orchestratorVersion: SENTINEL_ORCHESTRATOR_VERSION,
    requiresHumanReview: true as const,
    humanReviewStatus: input.humanReviewStatus ?? 'pending',
    disclaimer: input.disclaimer ?? SENTINEL_AI_DISCLAIMER,
    sourceState: input.sourceState ?? 'live',
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    linkedEntityType: input.linkedEntityType,
    linkedEntityId: input.linkedEntityId,
  });
}

export function assertHumanReviewOnly(rec: SentinelAiRecommendation): void {
  if (rec.requiresHumanReview !== true) {
    throw new SentinelAiEnvelopeError(
      'AUTONOMOUS_FORBIDDEN',
      'Sentinel AI recommendations must set requiresHumanReview: true',
    );
  }
}

export type PreArrivalFieldSnapshot = Readonly<{
  unitId?: string | null;
  chiefComplaint?: string | null;
  etaMinutes?: number | null;
  priorityOrTriage?: string | null;
  vitalsOrNarrative?: string | null;
}>;

/** Deterministic missing-data detection (not AI). */
export function detectMissingPreArrivalFields(
  snapshot: PreArrivalFieldSnapshot,
): readonly SentinelMissingField[] {
  const missing: SentinelMissingField[] = [];
  if (!snapshot.unitId || !String(snapshot.unitId).trim()) missing.push('unitId');
  if (!snapshot.chiefComplaint || !String(snapshot.chiefComplaint).trim()) {
    missing.push('chiefComplaint');
  }
  if (snapshot.etaMinutes == null || !Number.isFinite(Number(snapshot.etaMinutes))) {
    missing.push('etaMinutes');
  }
  if (!snapshot.priorityOrTriage || !String(snapshot.priorityOrTriage).trim()) {
    missing.push('priorityOrTriage');
  }
  if (!snapshot.vitalsOrNarrative || !String(snapshot.vitalsOrNarrative).trim()) {
    missing.push('vitalsOrNarrative');
  }
  return Object.freeze(missing);
}

export function buildRulesOnlyPrepChecklist(input: {
  id: string;
  complaint: string;
  riskFlags: readonly string[];
  missingFields: readonly string[];
}): SentinelAiRecommendation {
  const evidence: SentinelAiEvidence[] = [
    {
      claim: `Chief complaint: ${input.complaint || 'not provided'}`,
      sourceRef: 'prearrival.chiefComplaint',
    },
    ...input.riskFlags.map((flag, i) => ({
      claim: `Risk indicator: ${flag}`,
      sourceRef: `prearrival.riskFlags[${i}]`,
    })),
    ...input.missingFields.map((field) => ({
      claim: `Missing required field: ${field}`,
      sourceRef: `prearrival.missing.${field}`,
    })),
  ];
  if (evidence.length === 0) {
    evidence.push({
      claim: 'No pre-arrival context available; using generic ED prep checklist',
      sourceRef: 'sentinel.rules_fallback',
    });
  }

  const recommendations = [
    'Confirm bed and primary nurse assignment before bay arrival',
    'Review airway, breathing, circulation readiness for inbound acuity',
    'Prepare registration capture for unknown/provisional identity if needed',
  ];
  if (input.riskFlags.some((f) => /stroke|cva|nihss/i.test(f))) {
    recommendations.unshift('Notify stroke pathway owner for human activation decision');
  }
  if (input.riskFlags.some((f) => /stemi|chest|acs|cardiac/i.test(f))) {
    recommendations.unshift('Notify cardiac pathway owner for human activation decision');
  }
  if (input.riskFlags.some((f) => /trauma|mva|fall|penetrat/i.test(f))) {
    recommendations.unshift('Notify trauma pathway owner for human activation decision');
  }
  if (input.missingFields.length > 0) {
    recommendations.push(`Request missing EMS data: ${input.missingFields.join(', ')}`);
  }

  return buildSentinelAiRecommendation({
    id: input.id,
    kind: 'prep_checklist_rules',
    summary: 'Deterministic preparation checklist (AI unavailable or degraded)',
    recommendations,
    evidence,
    confidence: 0.55,
    modelId: 'sentinel-rules',
    modelVersion: '1.0.0',
    sourceState: 'rules_only',
  });
}

export { SENTINEL_REQUIRED_PREARRIVAL_FIELDS };
