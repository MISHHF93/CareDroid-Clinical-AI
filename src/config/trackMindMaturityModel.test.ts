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
  TRACKMIND_DOMAIN_SCORE_PROVENANCE,
  TRACKMIND_SCORE_PROVENANCE,
} from './trackMindMaturityModel';

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
    if (!improved) throw new Error('expected scoreTrackMindDomain(improved) to return a result');
    if (!baseline) throw new Error('expected scoreTrackMindDomain(baseline) to return a result');
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

describe('score provenance', () => {
  // Five domains call a real audit; four return a constant (AI_GOVERNANCE is
  // literally `return 66`, and FACILITIES/FINANCE/EQUINE_WELFARE return
  // base + hardcodedList.length * 6). Any UI printing overallScore has to be
  // able to say how much of it is measured, so the split is part of the
  // contract rather than something a reader has to rediscover in the source.
  it('labels every domain as audited or static', () => {
    const result = scoreTrackMindMaturity();
    const values = Object.values(TRACKMIND_SCORE_PROVENANCE);
    for (const dimension of result.dimensions) {
      expect(values, `${dimension.id} has no provenance`).toContain(dimension.provenance);
      expect(TRACKMIND_DOMAIN_SCORE_PROVENANCE[dimension.id]).toBe(dimension.provenance);
    }
    expect(Object.keys(TRACKMIND_DOMAIN_SCORE_PROVENANCE)).toHaveLength(result.dimensions.length);
  });

  it('reports how much of the overall score is actually measured', () => {
    const { summary, dimensions } = scoreTrackMindMaturity();
    expect(summary.auditedDomainCount + summary.staticDomainCount).toBe(dimensions.length);
    expect(summary.auditedWeightShare).toBeGreaterThan(0);
    expect(summary.auditedWeightShare).toBeLessThanOrEqual(100);
  });

  it('does not let a domain claim audited without a scorer that reads real state', () => {
    // Guards the flip direction that matters: marking a domain audited is a
    // claim that its score moves with the platform. A static scorer returns the
    // same number for any input, so feeding it different signals proves nothing
    // moved -- which is exactly what must NOT be labelled audited.
    const withSignals = scoreTrackMindMaturity({
      signals: { productionReadiness: { securityControls: 10 }, safety: { incidents: 99 } },
    });
    for (const dimension of withSignals.dimensions) {
      if (dimension.provenance !== TRACKMIND_SCORE_PROVENANCE.STATIC) continue;
      const baseline = scoreTrackMindDomain(dimension.id);
      if (!baseline) throw new Error(`no baseline for ${dimension.id}`);
      expect(
        dimension.platformScore,
        `${dimension.id} is marked static but its score responded to signals -- ` +
          `if it now reads real state, mark it audited instead`,
      ).toBe(baseline.platformScore);
    }
  });
});
