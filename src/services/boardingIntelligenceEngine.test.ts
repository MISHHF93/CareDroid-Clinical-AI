import { describe, expect, it } from 'vitest';
import BoardingIntelligenceEngine, {
  BED_PRESSURE_LEVELS,
  getBoardingDashboard,
  getBoardingMetrics,
  getBoardingRecommendations,
  getBoardingRiskScore,
  getLongestBoarders,
} from './boardingIntelligenceEngine';

describe('BoardingIntelligenceEngine', () => {
  it('tracks boarding count, time, pending beds, and bed pressure', () => {
    const metrics = getBoardingMetrics();

    expect(metrics).toEqual(
      expect.objectContaining({
        boardingCount: expect.any(Number),
        boardingTime: expect.any(Number),
        longestBoardingMinutes: expect.any(Number),
        pendingBeds: expect.any(Number),
        bedPressure: BED_PRESSURE_LEVELS.HIGH,
      })
    );
    expect(metrics.boardingCount).toBeGreaterThan(0);
  });

  it('sorts longest boarders by boarding duration', () => {
    const boarders = getLongestBoarders();

    expect(boarders).toHaveLength(3);
    expect(boarders[0].boardingMinutes).toBeGreaterThanOrEqual(boarders[1].boardingMinutes);
    expect(boarders[0]).toEqual(
      expect.objectContaining({
        patientLabel: expect.any(String),
        pendingBedType: expect.any(String),
      })
    );
  });

  it('generates a bounded boarding risk score and recommendations', () => {
    const score = getBoardingRiskScore();
    const recommendations = getBoardingRecommendations();

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'boarding-count-escalation' }),
        expect.objectContaining({ id: 'longest-boarder-review' }),
        expect.objectContaining({ id: 'pending-bed-pressure' }),
      ])
    );
  });

  it('returns a dashboard payload that makes boarding measurable', () => {
    const dashboard = getBoardingDashboard();

    expect(dashboard).toEqual(
      expect.objectContaining({
        score: expect.any(Number),
        metrics: expect.objectContaining({
          boardingCount: expect.any(Number),
          boardingTime: expect.any(Number),
          pendingBeds: expect.any(Number),
          bedPressure: expect.any(String),
        }),
        boarders: expect.any(Array),
        longestBoarders: expect.any(Array),
        safetyStatement: expect.stringMatching(/human-reviewed/i),
      })
    );
    expect(BoardingIntelligenceEngine.getBoardingDashboard().longestBoarders.length).toBeGreaterThan(0);
  });
});
