import { describe, expect, it } from 'vitest';
import {
  TRACKMIND_MATURITY_DOMAIN,
  TRACKMIND_MATURITY_DOMAINS,
  TRACKMIND_MATURITY_LEVEL,
  auditTrackMindMaturity,
  buildTrackMindMaturityAssessment,
  getTrackMindMaturityLevel,
  levelToScore,
  scoreTrackMindDomain,
  scoreTrackMindMaturity,
} from './trackMindMaturityModel.js';

describe('trackMindMaturityModel', () => {
  it('defines nine maturity domains', () => {
    expect(TRACKMIND_MATURITY_DOMAINS).toHaveLength(9);
    const ids = TRACKMIND_MATURITY_DOMAINS.map((domain) => domain.id);
    expect(ids).toContain(TRACKMIND_MATURITY_DOMAIN.OPERATIONS);
    expect(ids).toContain(TRACKMIND_MATURITY_DOMAIN.EQUINE_WELFARE);
    expect(ids).toContain(TRACKMIND_MATURITY_DOMAIN.AI_GOVERNANCE);
    expect(ids).toContain(TRACKMIND_MATURITY_DOMAIN.DATA_QUALITY);
  });

  it('maps scores to five maturity levels', () => {
    expect(getTrackMindMaturityLevel(10).id).toBe(TRACKMIND_MATURITY_LEVEL.INITIAL);
    expect(getTrackMindMaturityLevel(30).id).toBe(TRACKMIND_MATURITY_LEVEL.EMERGING);
    expect(getTrackMindMaturityLevel(50).id).toBe(TRACKMIND_MATURITY_LEVEL.DEFINED);
    expect(getTrackMindMaturityLevel(70).id).toBe(TRACKMIND_MATURITY_LEVEL.MANAGED);
    expect(getTrackMindMaturityLevel(90).id).toBe(TRACKMIND_MATURITY_LEVEL.OPTIMIZING);
  });

  it('converts questionnaire levels to scores', () => {
    expect(levelToScore(1)).toBeGreaterThanOrEqual(0);
    expect(levelToScore(5)).toBeGreaterThanOrEqual(81);
    expect(levelToScore(3)).toBeGreaterThan(levelToScore(2));
  });

  it('scores all domains with platform signals', () => {
    const result = scoreTrackMindMaturity();
    expect(result.dimensions).toHaveLength(9);
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.overallLevel).toBeTruthy();
    expect(result.summary.lowestDimension).toBeTruthy();
    expect(result.summary.highestDimension).toBeTruthy();
  });

  it('blends questionnaire answers with platform signals', () => {
    const baseline = scoreTrackMindDomain(TRACKMIND_MATURITY_DOMAIN.OPERATIONS);
    const improved = scoreTrackMindDomain(TRACKMIND_MATURITY_DOMAIN.OPERATIONS, {
      answers: { [TRACKMIND_MATURITY_DOMAIN.OPERATIONS]: 5 },
    });
    expect(improved.score).toBeGreaterThanOrEqual(baseline.score);
  });

  it('produces a full audit artifact with improvements', () => {
    const audit = auditTrackMindMaturity();
    expect(audit.scores.overall).toBeGreaterThan(0);
    expect(Object.keys(audit.scores.dimensions)).toHaveLength(9);
    expect(audit.platformSignals.survivabilityKpis).toBeTruthy();
    expect(audit.prioritizedImprovements.length).toBeGreaterThan(0);
    expect(audit.summary.lowestDomain).toBeTruthy();
  });

  it('builds an organization assessment with recommendation tiers', () => {
    const assessment = buildTrackMindMaturityAssessment({
      organizationName: 'Demo Track',
      answers: {
        [TRACKMIND_MATURITY_DOMAIN.EQUINE_WELFARE]: 4,
        [TRACKMIND_MATURITY_DOMAIN.FACILITIES]: 3,
      },
    });
    expect(assessment.organizationName).toBe('Demo Track');
    expect(assessment.recommendations.immediate.length).toBeGreaterThan(0);
    expect(assessment.recommendations.nearTerm.length).toBeGreaterThan(0);
  });
});
