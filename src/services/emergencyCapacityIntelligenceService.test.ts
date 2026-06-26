import { describe, expect, it } from 'vitest';
import EmergencyCapacityIntelligenceService, {
  CAPACITY_RISK_LEVELS,
  getCapacityDashboard,
  getCapacityRecommendations,
  getCapacityRiskLevel,
  getCapacityScore,
  getCapacitySignals,
} from './emergencyCapacityIntelligenceService';

describe('EmergencyCapacityIntelligenceService', () => {
  it('calculates a bounded capacity score from operational pressure signals', () => {
    const score = getCapacityScore({
      currentCensus: 70,
      occupiedSpaces: 60,
      availableSpaces: 5,
      pendingAdmissions: 12,
      boardingPatients: 9,
      emsArrivals: 4,
      dischargeCandidates: 3,
    });

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(score).toBeGreaterThan(70);
  });

  it('maps capacity scores to Green, Yellow, Orange, and Red', () => {
    expect(getCapacityRiskLevel(20)).toBe(CAPACITY_RISK_LEVELS.GREEN);
    expect(getCapacityRiskLevel(55)).toBe(CAPACITY_RISK_LEVELS.YELLOW);
    expect(getCapacityRiskLevel(75)).toBe(CAPACITY_RISK_LEVELS.ORANGE);
    expect(getCapacityRiskLevel(90)).toBe(CAPACITY_RISK_LEVELS.RED);
  });

  it('tracks every required operational pressure signal', () => {
    expect(getCapacitySignals().map((signal) => signal.id)).toEqual([
      'currentCensus',
      'occupiedSpaces',
      'availableSpaces',
      'pendingAdmissions',
      'boardingPatients',
      'emsArrivals',
      'dischargeCandidates',
    ]);
  });

  it('generates recommendations and dashboard context for instant staff awareness', () => {
    const recommendations = getCapacityRecommendations();
    const dashboard = getCapacityDashboard();

    expect(recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'overloaded-queues', category: 'overloaded queues' }),
        expect.objectContaining({ id: 'boarding-relief', category: 'bottlenecks' }),
        expect.objectContaining({ id: 'admission-handoff', category: 'bottlenecks' }),
        expect.objectContaining({ id: 'ems-arrival-readiness', category: 'bottlenecks' }),
        expect.objectContaining({ id: 'discharge-acceleration', category: 'discharge opportunities' }),
      ])
    );
    expect(dashboard).toEqual(
      expect.objectContaining({
        engineId: 'capacity-engine',
        title: 'Capacity Engine',
        inputSchema: ['occupancy', 'boarding', 'pending admissions', 'discharge candidates', 'EMS arrivals'],
        output: 'Capacity Score',
        score: expect.any(Number),
        riskLevel: expect.stringMatching(/Green|Yellow|Orange|Red/),
        occupancyPercent: expect.any(Number),
        recommendationCategories: expect.objectContaining({
          dischargeOpportunities: expect.arrayContaining([
            expect.objectContaining({ category: 'discharge opportunities' }),
          ]),
          bottlenecks: expect.arrayContaining([
            expect.objectContaining({ category: 'bottlenecks' }),
          ]),
          overloadedQueues: expect.arrayContaining([
            expect.objectContaining({ category: 'overloaded queues' }),
          ]),
        }),
        summary: expect.stringMatching(/capacity posture/i),
      })
    );
    expect(EmergencyCapacityIntelligenceService.getCapacityDashboard().signals).toHaveLength(7);
  });
});
