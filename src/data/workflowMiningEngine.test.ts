import { describe, expect, it } from 'vitest';
import {
  WORKFLOW_MINING_SIGNAL_TYPES,
  buildWorkflowMiningReport,
} from './workflowMiningEngine';

describe('workflowMiningEngine', () => {
  it('represents all workflow mining signal types', () => {
    const report = buildWorkflowMiningReport();

    expect(report.signalTypes).toEqual(
      expect.arrayContaining([
        'page_transition',
        'ai_launch',
        'workflow_launch',
        'tool_usage',
        'search_behavior',
      ]),
    );
    for (const type of WORKFLOW_MINING_SIGNAL_TYPES) {
      expect(report.signalCounts[type]).toBeGreaterThan(0);
    }
  });

  it('ranks most common user journeys by frequency', () => {
    const report = buildWorkflowMiningReport();

    expect(report.mostCommonUserJourneys[0]).toMatchObject({
      id: 'ed-triage-calculator-to-dashboard',
      frequency: 148,
    });
    expect(report.summary.topJourney.title).toBe('ED triage calculator to dashboard');
  });

  it('identifies friction, dead ends, and unnecessary clicks', () => {
    const report = buildWorkflowMiningReport();

    expect(report.friction.length).toBeGreaterThan(0);
    expect(report.deadEnds.length).toBeGreaterThan(0);
    expect(report.unnecessaryClicks.length).toBeGreaterThan(0);
    expect(report.recommendations.map((item) => item.recommendation)).toEqual(
      expect.arrayContaining([
        'Embed protocol search inside workflow builder',
        'Add related fleet and maintenance actions to Medical IoT alerts',
      ]),
    );
  });
});
