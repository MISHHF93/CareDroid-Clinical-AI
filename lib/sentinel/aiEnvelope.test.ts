import { describe, expect, it } from 'vitest';
import {
  assertHumanReviewOnly,
  buildRulesOnlyPrepChecklist,
  buildSentinelAiRecommendation,
  detectMissingPreArrivalFields,
  SentinelAiEnvelopeError,
} from './aiEnvelope';

describe('sentinel aiEnvelope', () => {
  it('requires evidence and model version', () => {
    expect(() =>
      buildSentinelAiRecommendation({
        id: 'r1',
        kind: 'summary',
        summary: 'test',
        recommendations: [],
        evidence: [],
        confidence: 0.5,
        modelId: 'm',
        modelVersion: '1',
      }),
    ).toThrow(SentinelAiEnvelopeError);
  });

  it('always sets requiresHumanReview true', () => {
    const rec = buildSentinelAiRecommendation({
      id: 'r1',
      kind: 'summary',
      summary: 'Inbound chest pain',
      recommendations: ['Prepare cardiac bay'],
      evidence: [{ claim: 'Complaint chest pain', sourceRef: 'ems.complaint' }],
      confidence: 0.7,
      modelId: 'sentinel-test',
      modelVersion: '1.0.0',
    });
    expect(rec.requiresHumanReview).toBe(true);
    assertHumanReviewOnly(rec);
  });

  it('detects missing pre-arrival fields', () => {
    const missing = detectMissingPreArrivalFields({
      unitId: 'M12',
      chiefComplaint: '',
      etaMinutes: null,
    });
    expect(missing).toContain('chiefComplaint');
    expect(missing).toContain('etaMinutes');
    expect(missing).toContain('priorityOrTriage');
  });

  it('builds rules-only checklist when AI degraded', () => {
    const rec = buildRulesOnlyPrepChecklist({
      id: 'prep-1',
      complaint: 'Stroke symptoms',
      riskFlags: ['stroke window'],
      missingFields: ['vitalsOrNarrative'],
    });
    expect(rec.sourceState).toBe('rules_only');
    expect(rec.requiresHumanReview).toBe(true);
    expect(rec.recommendations.some((r) => /stroke/i.test(r))).toBe(true);
  });
});
