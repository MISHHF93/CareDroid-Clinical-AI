import { describe, expect, it } from 'vitest';
import {
  COPILOT_RECOMMENDATION_DOMAIN,
  auditCopilotRecommendationExposure,
  auditCopilotRecommendations,
  buildCopilotRecommendations,
  formatCopilotRecommendationsForPrompt,
  isActionableRecommendation,
  isGenericCopilotText,
  resolveCopilotQuickAction,
} from './copilotRecommendationModel';

const stressSnapshot = {
  capacityStatus: { score: 84, band: 'Red', updatedAt: '2026-06-17T12:00:00.000Z' },
  boardingStatus: { boarders: 3, risk: 'high' },
  reassessmentStatus: { due: 5, overdue: 2 },
  queueHealth: [
    {
      id: 'waiting-room',
      label: 'Waiting Room',
      count: 12,
      oldestWaitMinutes: 47,
      targetMinutes: 20,
      breached: true,
    },
  ],
};

describe('copilotRecommendationModel', () => {
  it('prioritizes queue before capacity, boarding, and reassessment', () => {
    const recommendations = buildCopilotRecommendations({
      centralSnapshot: stressSnapshot,
      primaryBottleneck: {
        id: 'waiting-room',
        label: 'Waiting Room',
        length: 12,
        longestWaitMinutes: 47,
        overdueCount: 4,
        isBottleneck: true,
        bottleneckSeverity: 'critical',
        bottleneckReason: '4 overdue in waiting room',
      },
    });

    expect(recommendations[0]?.domain).toBe(COPILOT_RECOMMENDATION_DOMAIN.QUEUE);
    expect(recommendations.length).toBeLessThanOrEqual(3);
    expect(recommendations.map((rec) => rec.domain)).toEqual([
      COPILOT_RECOMMENDATION_DOMAIN.QUEUE,
      COPILOT_RECOMMENDATION_DOMAIN.CAPACITY,
      COPILOT_RECOMMENDATION_DOMAIN.BOARDING,
    ]);
  });

  it('marks recommendations as actionable with routes', () => {
    const recommendations = buildCopilotRecommendations({ centralSnapshot: stressSnapshot });
    const audit = auditCopilotRecommendations(recommendations);

    expect(recommendations.every(isActionableRecommendation)).toBe(true);
    expect(audit.passesAudit).toBe(true);
    expect(audit.genericCount).toBe(0);
  });

  it('flags generic copilot phrasing', () => {
    expect(isGenericCopilotText('Continue clinical review with human oversight.')).toBe(true);
    expect(isGenericCopilotText('Open reassessment queue')).toBe(false);
  });

  it('resolves quick actions without generic fallback text', () => {
    const resolved = resolveCopilotQuickAction('Queue bottlenecks', {
      centralSnapshot: stressSnapshot,
      primaryBottleneck: {
        id: 'waiting-room',
        label: 'Waiting Room',
        length: 12,
        longestWaitMinutes: 47,
        overdueCount: 4,
        isBottleneck: true,
        bottleneckSeverity: 'critical',
      },
    });

    expect(resolved.handled).toBe(true);
    if (!resolved.handled) throw new Error('expected quick action to be handled');
    expect(resolved.response).toContain('[queue]');
    expect(isGenericCopilotText(resolved.response)).toBe(false);
  });

  it('formats prompt guidance from prioritized recommendations', () => {
    const recommendations = buildCopilotRecommendations({ centralSnapshot: stressSnapshot });
    const prompt = formatCopilotRecommendationsForPrompt(recommendations);
    expect(prompt).toContain('Prioritized actionable recommendations');
    expect(prompt).toContain('Do not repeat generic advice');
  });

  it('documents copilot recommendation exposure', () => {
    const exposure = auditCopilotRecommendationExposure();
    expect(exposure.priorityOrder[0]).toBe('queue');
    expect(exposure.quickActions).toContain('Queue bottlenecks');
  });
});
